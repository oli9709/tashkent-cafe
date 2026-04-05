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
        const bozorUsers = userQueries.getAllBozorUsers.all();
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

module.exports = { startScheduler, setBotInstance };
