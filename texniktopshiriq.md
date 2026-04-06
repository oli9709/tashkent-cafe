📑 Texnik Topshiriq: "Tashkent Cafe" Smart Order System
1. Loyiha konsepsiyasi
Tashkent Cafe mijozlari uchun Telegram orqali ovqat buyurtma qilish va to'lovlarni avtomatik nazorat qilish tizimi. Tizim ikki xil stsenariyda ishlaydi: "Olib ketish" (To Go) va "Bozorga yetkazib berish" (Cash).

2. Tizim arxitekturasi
Platforma: Telegram Mini App (TMA) + Telegram Bot.

Texnologiyalar: Node.js, Firebase (Firestore, Storage, Hosting), Google Cloud Vision API (OCR).

Dizayn stili: Modern Glassmorphism (Vanilla CSS).

3. Foydalanuvchi funksiyalari (Mijoz)
🛒 Buyurtma berish (Menu)
Visual Menyu: Rasmli, narxi va tavsifi bor taomlar ro'yxati.

Savat (Cart): Bir nechta taomni tanlash va miqdorini belgilash.

"Mening odatiy buyurtmam": Foydalanuvchining oxirgi muvaffaqiyatli buyurtmasini bir bosishda qayta savatga qo'shish (Quick Re-order).

💳 Checkout (To'lov va Yetkazib berish)
"Olib ketish" (To Go):

To'lov usuli: Bank o'tkazmasi (Toss/KakaoBank).

Majburiy qadam: To'lov chekining skrinshotini yuklash.

AI Verifikatsiya: Google Vision API orqali chekdagi summa va ismni avtomatik tekshirish.

"Bozorga" (Ertalabki 6:00):

To'lov usuli: Naqd pul (Chek talab qilinmaydi).

Manzil: Bozor ichidagi do'kon/nuqta raqami.

4. Admin funksiyalari (Oshxona/Boshqaruv)
Live Order Dashboard: Kelib tushgan buyurtmalarni real vaqtda ko'rish.

Status Management: Yangi -> Tayyorlanmoqda -> Tayyor -> Yetkazildi. (Har bir o'zgarishda mijozga push-xabar boradi).

Inventory Control: Taomlarni bir tugma bilan "Sold Out" (Tugadi) holatiga o'tkazish.

Haftalik Analitika: Yakshanba kungi avtomatik hisobot (Jami tushum, eng ko'p sotilgan taomlar, naqd va bank tushumlari ajratilgan holda).

5. Ma'lumotlar bazasi sxemasi (Firestore)
users: uid, telegram_id, name, address, favorite_order.

products: id, name, price, image_url, category, is_available.

orders: id, user_id, items[], total_price, type (To Go/Bozor), payment_status, timestamp.

6. Xavfsizlik va Nazorat
Agar AI chekni 3 marta taniy olmasa, buyurtma avtomatik ravishda "Admin tasdiqlovi" (Manual Check) holatiga o'tadi.

Mijoz faqat ish vaqtida (masalan, 6:00 dan 22:00 gacha) buyurtma bera oladi.