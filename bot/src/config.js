require('dotenv').config();

module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  MINI_APP_URL: process.env.MINI_APP_URL || 'https://your-mini-app.vercel.app',
  ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID,
  PORT: parseInt(process.env.PORT) || 3001,
  GOOGLE_VISION_API_KEY: process.env.GOOGLE_VISION_API_KEY || null,
  PAYMENT_RECIPIENT: process.env.PAYMENT_RECIPIENT || 'Tashkent',
  BANK_ACCOUNT: process.env.BANK_ACCOUNT || '3333-01-XXXXXXX',
  BANK_OWNER: process.env.BANK_OWNER || 'Oshxona',
  DB_PATH: process.env.DB_PATH || './data/cafe.db',
  UPLOADS_DIR: process.env.UPLOADS_DIR || './uploads',
  BOZOR_REMINDER_CRON: process.env.BOZOR_REMINDER_CRON || '0 6 * * *',
};
