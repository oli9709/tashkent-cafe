const cron = require('node-cron');
const { userQueries } = require('./db');
const { notifyUserOrderStatus } = require('./notify');
const { BOZOR_REMINDER_CRON } = require('../config');

let botInstance = null;

function setBotInstance(bot) {
  botInstance = bot;
}

function startScheduler() {
  // ─── 6:00 AM KST — Bozor buyurtma reminder ───
  cron.schedule(
    BOZOR_REMINDER_CRON,
    async () => {
      console.log('[Scheduler] 🌅 6:00 AM — Sending bozor reminders...');

      if (!botInstance) {
        console.warn('[Scheduler] Bot not initialized');
        return;
      }

      try {
        const bozorUsers = await userQueries.getAllBozorUsers();
        console.log(`[Scheduler] Found ${bozorUsers.length} bozor users today`);

        for (const user of bozorUsers) {
          try {
            await botInstance.telegram.sendMessage(
              user.telegram_id,
              `🌅 Salom, ${user.name || 'do\'stim'}!\n\n` +
              `Bugungi bozorga buyurtmangiz yetkazilmoqda.\n` +
              `🧾 To'lov yetkazib berilganda naqd pulda.\n\n` +
              `Savolingiz bo'lsa, adminga murojaat qiling.`,
            );
          } catch (err) {
            console.error(`[Scheduler] Failed to notify ${user.telegram_id}:`, err.message);
          }
        }
      } catch (err) {
        console.error('[Scheduler] Bozor reminder error:', err);
      }
    },
    {
      timezone: 'Asia/Seoul',
    }
  );

  console.log(`[Scheduler] ✅ Bozor 6:00 AM cron started (KST) — pattern: ${BOZOR_REMINDER_CRON}`);
}

/**
 * Keep-alive mechanism to prevent server from sleeping
 */
function startKeepAlive() {
  const { MINI_APP_URL } = require('../config');
  // Hugging Face or other hosting URL
  const url = MINI_APP_URL.replace('/mini-app', '').replace(/\/$/, '') + '/health';
  
  // Every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const axios = require('axios');
      await axios.get(url);
      console.log(`[Keep-Alive] 💓 Ping sent to ${url}`);
    } catch (err) {
      console.error(`[Keep-Alive] 💔 Ping failed:`, err.message);
    }
  });
  console.log(`[Keep-Alive] 🚀 Monitoring started for: ${url}`);
}

module.exports = { startScheduler, setBotInstance, startKeepAlive };
