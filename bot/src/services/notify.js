const { ADMIN_CHAT_ID } = require('../config');

let botInstance = null;

/** Call this once after Telegraf bot is created */
function setBotInstance(bot) {
  botInstance = bot;
}

/** Format ₩ amount */
const won = (n) => `${Number(n).toLocaleString('ko-KR')}₩`;

/**
 * Notify admin about a new order.
 * Sends a message with inline buttons: Confirm / Reject
 */
async function notifyAdminNewOrder(order, items) {
  if (!botInstance || !ADMIN_CHAT_ID) {
    console.error("[NotifyAdmin] Bot instance or ADMIN_CHAT_ID missing:", { botInstance: !!botInstance, ADMIN_CHAT_ID });
    return;
  }

  const modeLabel = order.mode === 'togo' ? '🛍 Olib ketish' : '🌅 Bozorga (5:00 yetkazish)';
  const itemLines = items.map(i => `  • ${i.name_uz} ×${i.quantity} — ${won(i.price * i.quantity)}`).join('\\n');

  const text =
    `🔔 <b>Yangi buyurtma #${order.id}</b>\\n\\n` +
    `👤 Mijoz: ${order.user_name || "Noma'lum"}${order.username ? ' (@' + order.username + ')' : ''}\\n` +
    `📦 Rejim: ${modeLabel}\\n\\n` +
    `🍽 <b>Taomlar:</b>\\n${itemLines}\\n\\n` +
    `💰 Jami: <b>${won(order.total)}</b>\\n` +
    `📅 Vaqt: ${new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' })}`;

  try {
    await botInstance.telegram.sendMessage(ADMIN_CHAT_ID, text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Tasdiqlash', callback_data: `approve_${order.id}` },
            { text: '❌ Rad etish', callback_data: `reject_${order.id}` },
          ],
        ],
      },
    });
    console.log(`[NotifyAdmin] Successfully notified admin: ${ADMIN_CHAT_ID}`);
  } catch (err) {
    console.error(`[NotifyAdmin] Failed to send message to admin (${ADMIN_CHAT_ID}):`, err.message);
  }
}

/**
 * Notify admin about AI verification result for a payment screenshot.
 */
async function notifyAdminPaymentVerified(order, aiResult) {
  if (!botInstance || !ADMIN_CHAT_ID) {
    console.error("[NotifyAdminPayment] Bot instance or ADMIN_CHAT_ID missing");
    return;
  }

  const statusIcon = aiResult.verified ? '✅' : '⚠️';
  const statusText = aiResult.verified ? "AI tasdiqladi" : "Qo'lda tekshiring";

  const text =
    `${statusIcon} <b>Buyurtma #${order.id} — To'lov ${statusText}</b>\\n\\n` +
    `💰 Kutilgan summa: ${won(order.total)}\\n` +
    `🔍 Aniqlangan: ${aiResult.extractedAmount ? won(aiResult.extractedAmount) : 'topilmadi'}\\n` +
    `👤 Qabul qiluvchi: ${aiResult.extractedName || 'topilmadi'}\\n` +
    `📊 Ishonchlilik: ${Math.round((aiResult.confidence || 0) * 100)}%\\n`;

  try {
    await botInstance.telegram.sendMessage(ADMIN_CHAT_ID, text, {
      parse_mode: 'HTML',
      reply_markup: !aiResult.verified ? {
        inline_keyboard: [
          [
            { text: "✅ Qo'lda tasdiqlash", callback_data: `approve_${order.id}` },
            { text: "❌ Rad etish", callback_data: `reject_${order.id}` },
          ],
        ],
      } : undefined,
    });
  } catch (err) {
    console.error(`[NotifyAdminPayment] Failed to send message to admin (${ADMIN_CHAT_ID}):`, err.message);
  }
}

/**
 * Notify user about order status change.
 */
async function notifyUserOrderStatus(telegramId, orderId, status) {
  if (!botInstance) return;

  const messages = {
    confirmed: `✅ Buyurtmangiz #${orderId} qabul qilindi! Tayyor bo'lganda xabar beramiz.`,
    rejected: `❌ Buyurtmangiz #${orderId} rad etildi. Muammo uchun @admin bilan bog'laning.`,
    delivered: `🎉 Buyurtmangiz #${orderId} yetkazildi! Xaridingiz uchun rahmat! 🙏`,
  };

  const text = messages[status] || `📦 Buyurtma #${orderId} holati: ${status}`;

  try {
    await botInstance.telegram.sendMessage(telegramId, text);
  } catch (err) {
    console.error(`[Notify] Failed to notify user ${telegramId}:`, err.message);
  }
}

/**
 * Notify user to send a payment screenshot.
 */
async function notifyUserToSendScreenshot(telegramId, orderId, total, bankAccount, bankOwner) {
  if (!botInstance) return;

  const text = `🎉 Buyurtmangiz qabul qilindi! (ID: #${orderId})\n\n` +
               `Iltimos, to'lovni quyidagi hisob raqamiga amalga oshiring:\n\n` +
               `🏦 Bank/Raqam: <b>${bankAccount}</b>\n` +
               `👤 Qabul qiluvchi: <b>${bankOwner}</b>\n` +
               `💰 Summa: <b>${won(total)}</b>\n\n` +
               `📸 <b>To'lovni amalga oshirgach, chekni (skrinshotni) shu yerga (Botga) yuboring!</b>\n` +
               `Biz bot orqali avtomatik tasdiqlaymiz.`;

  try {
    await botInstance.telegram.sendMessage(telegramId, text, { parse_mode: 'HTML' });
  } catch (err) {
    console.error(`[Notify] Failed to ask user ${telegramId} for screenshot:`, err.message);
  }
}

module.exports = {
  setBotInstance,
  notifyAdminNewOrder,
  notifyAdminPaymentVerified,
  notifyUserOrderStatus,
  notifyUserToSendScreenshot,
};
