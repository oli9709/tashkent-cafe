const { Telegraf, Markup } = require('telegraf');
const { userQueries, orderQueries, supabase } = require('../services/db');
const { notifyUserOrderStatus, notifyAdminPaymentVerified } = require('../services/notify');
const { MINI_APP_URL, ADMIN_CHAT_ID } = require('../config');
const { broadcastSSE } = require('../api');
const { verifyReceipt } = require('../utils/ocr_helper');
const axios = require('axios');

function registerHandlers(bot) {
  bot.start(async (ctx) => {
    const { id, first_name, last_name, username } = ctx.from;
    const name = [first_name, last_name].filter(Boolean).join(' ');

    await userQueries.upsert({ telegram_id: String(id), name, username: username || null });

    await ctx.replyWithHTML(
      `<b>Assalomu alaykum, ${first_name}! 👋</b>\n\n` +
      `🍽 <b>Tashkent Cafe</b>ga xush kelibsiz!\n` +
      `Koreyadagi o'zbek ta'mi — har kuni toza va mazali.\n\n` +
      `Buyurtma berish uchun quyidagi tugmani bosing 👇`,
      Markup.keyboard([
        [Markup.button.webApp("🛒 Menyuni ko'rish & Buyurtma berish", MINI_APP_URL)],
        [Markup.button.text('📋 Mening buyurtmalarim'), Markup.button.text('ℹ️ Yordam')],
      ]).resize()
    );
  });

  bot.command('menu', (ctx) => {
    ctx.reply('Menyuni ochish uchun:', Markup.inlineKeyboard([
      [Markup.button.webApp('🛒 Menyuni ochish', MINI_APP_URL)],
    ]));
  });

  bot.hears('📋 Mening buyurtmalarim', async (ctx) => {
    const user = await userQueries.findByTelegramId(String(ctx.from.id));
    if (!user) return ctx.reply('Siz hali buyurtma bermadingiz.');

    const { data: myOrders } = await supabase.from('orders')
      .select('*, users!inner(telegram_id)')
      .eq('users.telegram_id', String(ctx.from.id))
      .order('created_at', { ascending: false })
      .limit(5);

    if (!myOrders || myOrders.length === 0) return ctx.reply("Hali buyurtma yo'q.");

    const statusEmoji = { pending: '⏳', payment_uploaded: '🔍', ai_verified: '🤖', confirmed: '✅', rejected: '❌', delivered: '🎉' };
    const lines = myOrders.map(o =>
      `${statusEmoji[o.status] || '📦'} #${o.id} — ${Number(o.total).toLocaleString('ko-KR')}₩ (${o.mode === 'togo' ? 'Olib ketish' : 'Bozor'})\n   📅 ${o.created_at.slice(0, 16).replace('T', ' ')}`
    );

    ctx.replyWithHTML(`<b>Sizning so'nggi buyurtmalaringiz:</b>\n\n${lines.join('\n\n')}`);
  });

  bot.hears('ℹ️ Yordam', (ctx) => {
    ctx.replyWithHTML(
      `<b>Tashkent Cafe — Yordam</b>\n\n` +
      `🛍 <b>Olib ketish (To Go):</b>\n` +
      `Buyurtma bering → Bank orqali to'lang → Skrinshot yuboring\n\n` +
      `🌅 <b>Bozorga yetkazish:</b>\n` +
      `Har kuni soat 5:00-6:00 oralig'ida yetkaziladi.\n` +
      `To'lov yetkazib berilganda naqd pulda.\n\n` +
      `📞 Muammo bo'lsa: @tashkentcafe_admin`
    );
  });

  bot.action(/^approve_(\d+)$/, async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
      return ctx.answerCbQuery("❌ Ruxsat yo'q");
    }

    const orderId = ctx.match[1];
    await orderQueries.updateStatus({ status: 'confirmed', id: orderId });
    const order = await orderQueries.getById(orderId);

    await notifyUserOrderStatus(order.telegram_id, orderId, 'confirmed');
    broadcastSSE('order_updated', { order });

    await ctx.editMessageText(
      ctx.callbackQuery.message.text + '\n\n✅ <b>TASDIQLANDI</b>',
      { parse_mode: 'HTML' }
    );
    ctx.answerCbQuery('✅ Buyurtma tasdiqlandi!');
  });

  bot.action(/^reject_(\d+)$/, async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
      return ctx.answerCbQuery("❌ Ruxsat yo'q");
    }

    const orderId = ctx.match[1];
    await orderQueries.updateStatus({ status: 'rejected', id: orderId });
    const order = await orderQueries.getById(orderId);

    await notifyUserOrderStatus(order.telegram_id, orderId, 'rejected');
    broadcastSSE('order_updated', { order });

    await ctx.editMessageText(
      ctx.callbackQuery.message.text + '\n\n❌ <b>RAD ETILDI</b>',
      { parse_mode: 'HTML' }
    );
    ctx.answerCbQuery('Buyurtma rad etildi');
  });

  bot.command('admin', async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
      return ctx.reply("❌ Ruxsat yo'q");
    }
    ctx.reply('🔐 Admin panel:', Markup.inlineKeyboard([
      [Markup.button.webApp('📊 Admin Dashboard', `${MINI_APP_URL}?admin=1`)],
    ]));
  });

  bot.on('photo', async (ctx) => {
    try {
      // Eng so'nggi to'lov kutilayotgan (pending) buyurtmani topish
      const { data: pendingOrder } = await supabase.from('orders')
        .select('*, users!inner(telegram_id)')
        .eq('users.telegram_id', String(ctx.from.id))
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!pendingOrder) {
        return ctx.reply("Sizda hozirda to'lov kutilayotgan buyurtma yo'q.\nYangi buyurtma berish uchun Menyuga kiring.");
      }

      const orderId = pendingOrder.id;
      const expectedAmount = pendingOrder.total;
      await ctx.reply("📸 Skrinshot qabul qilindi. AI tasdiqlamoqda... Iltimos kuting ⏳");

      // Telegramdan rasmni olish
      const photo = ctx.message.photo.pop();
      const fileLink = await ctx.telegram.getFileLink(photo.file_id);
      const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(response.data);

      // AI bilan verification
      const aiResult = await verifyReceipt(imageBuffer, 'image/jpeg');

      const amountTolerance = 500;
      const isVerified = Math.abs(aiResult.amount - expectedAmount) <= amountTolerance 
                         && aiResult.amount > 0;

      await orderQueries.updateAiResult({
        ai_verified: isVerified ? 1 : 0,
        ai_amount: aiResult.amount,
        ai_confidence: 1.0,
        id: orderId,
      });

      if (isVerified) {
        // AI tasdiqladi -> statusni 'payment_uploaded' yoki 'ai_verified' qilib Adminga jo'natamiz
        await orderQueries.updateStatus({ status: 'ai_verified', id: orderId });
        await ctx.reply("✅ To'lov cheki AI tomonidan tasdiqlandi! Adminga yuborildi. Kuting...");
        
        // Adminga bildirishnoma
        const updatedOrder = await orderQueries.getById(orderId);
        const aiNotifyData = {
          verified: isVerified,
          extractedAmount: aiResult.amount,
          extractedName: aiResult.recipient_name,
          confidence: 1.0
        };

        await notifyAdminPaymentVerified(updatedOrder, aiNotifyData);
        broadcastSSE('order_updated', { order: updatedOrder, ai: aiNotifyData });
      } else {
        // Xato bo'lsa -> Qayta so'rash
        await ctx.reply(`❌ Skrinshotdagi summa mos kelmadi!\n\nKutilgan summa: ${Number(expectedAmount).toLocaleString('ko-KR')}₩\nO'qilgan summa: ${Number(aiResult.amount).toLocaleString('ko-KR')}₩\n\nIltimos, dori/raqamlari aniq tushgan to'g'ri chekni qayta yuboring. 📸`);
      }
      
    } catch (error) {
      console.error("[Bot Photo Handler] Error:", error.message);
      ctx.reply("❌ Skrinshotni o'qishda xatolik yuz berdi. Iltimos adminga murojaat qiling.");
    }
  });
}

module.exports = { registerHandlers };
