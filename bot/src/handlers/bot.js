const { Telegraf, Markup } = require('telegraf');
const { userQueries, orderQueries } = require('../services/db');
const { notifyUserOrderStatus } = require('../services/notify');
const { MINI_APP_URL, ADMIN_CHAT_ID } = require('../config');
const { broadcastSSE } = require('../api');

function registerHandlers(bot) {
  // ── /start ────────────────────────────────────────────────
  bot.start(async (ctx) => {
    const { id, first_name, last_name, username } = ctx.from;
    const name = [first_name, last_name].filter(Boolean).join(' ');

    userQueries.upsert.run({ telegram_id: String(id), name, username: username || null });

    await ctx.replyWithHTML(
      `<b>Assalomu alaykum, ${first_name}! 👋</b>\n\n` +
      `🍽 <b>Tashkent Cafe</b>ga xush kelibsiz!\n` +
      `Koreyadagi o'zbek ta'mi — har kuni toza va mazali.\n\n` +
      `Buyurtma berish uchun quyidagi tugmani bosing 👇`,
      Markup.keyboard([
        [Markup.button.webApp('🛒 Menyuni ko\'rish & Buyurtma berish', MINI_APP_URL)],
        [Markup.button.text('📋 Mening buyurtmalarim'), Markup.button.text('ℹ️ Yordam')],
      ]).resize()
    );
  });

  // ── /menu shortcut ────────────────────────────────────────
  bot.command('menu', (ctx) => {
    ctx.reply('Menyuni ochish uchun:', Markup.inlineKeyboard([
      [Markup.button.webApp('🛒 Menyuni ochish', MINI_APP_URL)],
    ]));
  });

  // ── Text: My Orders ───────────────────────────────────────
  bot.hears('📋 Mening buyurtmalarim', async (ctx) => {
    const user = userQueries.findByTelegramId.get(String(ctx.from.id));
    if (!user) return ctx.reply('Siz hali buyurtma bermadingiz.');

    const { getAll } = orderQueries;
    // Filter only user's orders (not using getAll which is admin)
    const { db } = require('../services/db');
    const myOrders = db.prepare(`
      SELECT o.* FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE u.telegram_id = ?
      ORDER BY o.created_at DESC
      LIMIT 5
    `).all(String(ctx.from.id));

    if (myOrders.length === 0) return ctx.reply('Hali buyurtma yo\'q.');

    const statusEmoji = { pending: '⏳', payment_uploaded: '🔍', ai_verified: '🤖', confirmed: '✅', rejected: '❌', delivered: '🎉' };
    const lines = myOrders.map(o =>
      `${statusEmoji[o.status] || '📦'} #${o.id} — ${Number(o.total).toLocaleString('ko-KR')}₩ (${o.mode === 'togo' ? 'Olib ketish' : 'Bozor'})\n   📅 ${o.created_at.slice(0, 16)}`
    );

    ctx.replyWithHTML(`<b>Sizning so'nggi buyurtmalaringiz:</b>\n\n${lines.join('\n\n')}`);
  });

  // ── Text: Help ─────────────────────────────────────────────
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

  // ── Admin: approve / reject callbacks ─────────────────────
  bot.action(/^approve_(\d+)$/, async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
      return ctx.answerCbQuery('❌ Ruxsat yo\'q');
    }

    const orderId = ctx.match[1];
    orderQueries.updateStatus.run({ status: 'confirmed', id: orderId });
    const order = orderQueries.getById.get(orderId);

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
      return ctx.answerCbQuery('❌ Ruxsat yo\'q');
    }

    const orderId = ctx.match[1];
    orderQueries.updateStatus.run({ status: 'rejected', id: orderId });
    const order = orderQueries.getById.get(orderId);

    await notifyUserOrderStatus(order.telegram_id, orderId, 'rejected');
    broadcastSSE('order_updated', { order });

    await ctx.editMessageText(
      ctx.callbackQuery.message.text + '\n\n❌ <b>RAD ETILDI</b>',
      { parse_mode: 'HTML' }
    );
    ctx.answerCbQuery('Buyurtma rad etildi');
  });

  // ── Admin: /admin command ─────────────────────────────────
  bot.command('admin', async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
      return ctx.reply('❌ Ruxsat yo\'q');
    }
    ctx.reply('🔐 Admin panel:', Markup.inlineKeyboard([
      [Markup.button.webApp('📊 Admin Dashboard', `${MINI_APP_URL}?admin=1`)],
    ]));
  });
}

module.exports = { registerHandlers };
