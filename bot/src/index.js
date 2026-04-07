require('dotenv').config();

const express = require('express');
const path = require('path');
const { Telegraf } = require('telegraf');

const { BOT_TOKEN, PORT, UPLOADS_DIR } = require('./config');
const { router } = require('./api');
const { setBotInstance } = require('./services/notify');
const { startScheduler, setBotInstance: setSchedulerBot, startKeepAlive } = require('./services/scheduler');
const { registerHandlers } = require('./handlers/bot');

// ── Validate required env ──────────────────────────────────
if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN') {
  console.error('❌ BOT_TOKEN is not set! Copy .env.example → .env and fill in your token.');
  process.exit(1);
}

// ── Setup Express ──────────────────────────────────────────
const app = express();
app.use(express.json());

// Serve uploaded payment screenshots
app.use('/uploads', express.static(path.resolve(UPLOADS_DIR)));

// API routes
app.use('/api', router);

// Health check
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── Setup Telegraf Bot ─────────────────────────────────────
const bot = new Telegraf(BOT_TOKEN);

// Register command & action handlers
registerHandlers(bot);

// Pass bot instance to notification & scheduler services
setBotInstance(bot);
setSchedulerBot(bot);

// ── Error handling ─────────────────────────────────────────
bot.catch((err, ctx) => {
  console.error(`[Bot] Error for update ${ctx.updateType}:`, err);
});

process.on('unhandledRejection', (err) => {
  console.error('[Process] Unhandled rejection:', err);
});

// ── Start everything ───────────────────────────────────────
async function main() {
  // Start Express server
  app.listen(PORT, () => {
    console.log(`\n🚀 Tashkent Cafe API running at http://localhost:${PORT}`);
    console.log(`📡 Admin SSE stream: http://localhost:${PORT}/api/admin/stream`);
  });

  // Start cron scheduler
  startScheduler();

  // Start keep-alive monitor
  startKeepAlive();

  // Launch bot (long-polling)
  await bot.launch();
  console.log('🤖 Telegram bot started (long-polling)');
  console.log('✅ System ready!\n');
}

main().catch((err) => {
  console.error('❌ Fatal startup error:', err);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
