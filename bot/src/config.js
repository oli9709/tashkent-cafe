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
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://iznzvrtzijkgklketlkc.supabase.co',
  SUPABASE_KEY: process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6bnp2cnR6aWprZ2tsa2V0bGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTI5NjAsImV4cCI6MjA5MDk4ODk2MH0.2Qh10rRktGcVf8ILhkIYJoIZ-Wmw_PgyLZEZzxOljm0',
};
