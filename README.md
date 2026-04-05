# 🍽️ Tashkent Cafe — Buyurtma Avtomatlashtirish Tizimi

Koreyadagi "Tashkent Cafe" oshxonasi uchun to'liq buyurtma avtomatlashtirish tizimi.

---

## 📋 Loyiha Tuzilishi

```
oshxona-bot/
├── bot/          ← Telegram Bot (Node.js + Telegraf.js + Express API)
└── mini-app/     ← Telegram Mini App (React + Vite)
```

---

## 🚀 Ishga Tushirish

### 1. Bot (Backend)

```bash
cd bot
cp .env.example .env
# .env faylini to'ldiring (BOT_TOKEN, ADMIN_CHAT_ID, ...)

npm install
npm run seed      # Menyuni bazaga yozish
npm run dev       # Ishga tushirish (nodemon)
```

Bot `http://localhost:3001` da ishga tushadi.

### 2. Mini App (Frontend)

```bash
cd mini-app
npm install
npm run dev       # Vite dev server: http://localhost:5173
```

---

## ⚙️ Muhit o'zgaruvchilari (`.env`)

| O'zgaruvchi | Tavsif |
|-------------|--------|
| `BOT_TOKEN` | @BotFather dan olingan token |
| `ADMIN_CHAT_ID` | Admin Telegram ID (@userinfobot dan) |
| `MINI_APP_URL` | Mini App hosting URL (HTTPS kerak) |
| `GOOGLE_VISION_API_KEY` | Google Cloud Vision API key (ixtiyoriy) |
| `BANK_ACCOUNT` | KakaoBank / Toss hisob raqami |
| `BANK_OWNER` | Bank hisob egasi ismi |
| `PORT` | API server port (default: 3001) |

> ℹ️ `GOOGLE_VISION_API_KEY` bo'lmasa, tizim **mock** rejimida ishlaydi (to'lovlar avtomatik tasdiqlanadi).

---

## 🤖 Bot Buyruqlari

| Buyruq | Tavsif |
|--------|--------|
| `/start` | Mini App tugmasi bilan salomlashish |
| `/menu` | Mini App inline tugmasi |
| `/admin` | Admin dashboard (faqat admin) |
| 📋 Mening buyurtmalarim | Oxirgi 5 buyurtma |

---

## 📡 API Endpoints

| Method | URL | Tavsif |
|--------|-----|--------|
| GET | `/api/menu` | Barcha menyu |
| POST | `/api/orders` | Yangi buyurtma |
| POST | `/api/orders/:id/payment` | Skrinshot yuklash |
| GET | `/api/orders/my-last` | Oxirgi buyurtma |
| GET | `/api/admin/orders` | Admin: barcha buyurtmalar |
| PUT | `/api/admin/orders/:id/status` | Holat o'zgartirish |
| PUT | `/api/admin/menu/:id/sold-out` | Sold Out toggle |
| GET | `/api/admin/analytics` | Haftalik analitika |
| GET | `/api/admin/stream` | SSE real-time |

---

## 🎨 Funksiyalar

### ✅ Amalga oshirilgan
- **Glassmorphism UI** — zamonaviy qorong'i dizayn
- **Menyu** — kategoriyalar, emoji, narxlar (₩)
- **Savat** — miqdor nazorati, umumiy summa
- **2 xil rejim** — "Olib ketish" va "Bozorga"
- **Bank to'lovi** — hisob nusxalash, skrinshot yuklash
- **AI Verifikatsiya** — Google Cloud Vision (yoki mock)
- **"Mening odatiy buyurtmam"** — 1 ta klikda takrorlash
- **Admin Dashboard** — real-time SSE, Sold Out toggle
- **Haftalik analitika** — Recharts grafik
- **Cron scheduler** — 6:00 AM KST eslatma

---

## 🔧 Texnologiyalar

| Qism | Texnologiya |
|------|------------|
| Bot | Telegraf.js v4 |
| API | Express.js |
| DB | better-sqlite3 |
| AI | Google Cloud Vision API |
| Scheduler | node-cron |
| Frontend | React 18 + Vite |
| State | Zustand |
| Animation | Framer Motion |
| Charts | Recharts |
| Upload | Multer |

---

## 📞 Admin

Admin Telegram ID ni bilish uchun: [@userinfobot](https://t.me/userinfobot)

Admin panel PIN: `1234` (ishga tushirishdan oldin `AdminPage.jsx` da o'zgartiring)
