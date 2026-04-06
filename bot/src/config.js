require('dotenv').config();

/**
 * config.js — Loyiha sozlamalari
 * ─────────────────────────────────────────────────────────────────
 * Barcha maxfiy ma'lumotlar process.env orqali o'qiladi.
 * Hugging Face da: Settings → Variables and Secrets
 * Lokal da: .env faylidan (dotenv orqali)
 * ─────────────────────────────────────────────────────────────────
 */
module.exports = {
  // ── Telegram Bot ──────────────────────────────────────────────
  // Hugging Face Secret: BOT_TOKEN
  BOT_TOKEN: process.env.BOT_TOKEN,

  // ── Mini App URL ──────────────────────────────────────────────
  MINI_APP_URL: process.env.MINI_APP_URL || 'https://your-mini-app.vercel.app',

  // ── Admin Telegram ID ─────────────────────────────────────────
  // Hugging Face Variable: ADMIN_CHAT_ID
  ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID,

  // ── Server Port ───────────────────────────────────────────────
  // Hugging Face Spaces standart porti: 7860
  // Lokal ishlatish uchun: PORT=3001 npm run dev
  PORT: parseInt(process.env.PORT) || 7860,

  // ── Gemini AI (OCR uchun) ─────────────────────────────────────
  // Hugging Face Secret: GEMINI_API_KEY
  // Google AI Studio: https://makersuite.google.com/app/apikey
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || null,

  // ── To'lov Ma'lumotlari ───────────────────────────────────────
  // Hugging Face Variable: PAYMENT_RECIPIENT, BANK_ACCOUNT, BANK_OWNER
  PAYMENT_RECIPIENT: process.env.PAYMENT_RECIPIENT || 'Tashkent',
  BANK_ACCOUNT: process.env.BANK_ACCOUNT || '3333-01-XXXXXXX',
  BANK_OWNER: process.env.BANK_OWNER || 'Oshxona',

  // ── Fayl Yo'llari ─────────────────────────────────────────────
  DB_PATH: process.env.DB_PATH || './data/cafe.db',
  UPLOADS_DIR: process.env.UPLOADS_DIR || './uploads',

  // ── Cron Jadvali ─────────────────────────────────────────────
  BOZOR_REMINDER_CRON: process.env.BOZOR_REMINDER_CRON || '0 6 * * *',

  // ── Supabase (Firebase o'rniga) ───────────────────────────────
  // Hugging Face Secret: SUPABASE_URL, SUPABASE_KEY
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://iznzvrtzijkgklketlkc.supabase.co',
  SUPABASE_KEY: process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6bnp2cnR6aWprZ2tsa2V0bGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTI5NjAsImV4cCI6MjA5MDk4ODk2MH0.2Qh10rRktGcVf8ILhkIYJoIZ-Wmw_PgyLZEZzxOljm0',
};
