import { Bot, webhookCallback } from "https://esm.sh/grammy@1.34.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// ── Environment Variables ──────────────────────────────────
const BOT_TOKEN = Deno.env.get("BOT_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const BANK_ACCOUNT = Deno.env.get("BANK_ACCOUNT") || "";
const BANK_OWNER = Deno.env.get("BANK_OWNER") || "";

// ── Initialize Bot & DB ────────────────────────────────────
const bot = new Bot(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── AI OCR Helper ──────────────────────────────────────────
async function verifyReceiptWithAI(buffer: ArrayBuffer) {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{
      parts: [
        { text: "Siz to'lov cheki tahlilchisisiz. Faqat JSON formatida javob bering: {\"amount\": raqam, \"recipient\": \"ism\"}. Summani raqam sifatida ajrating." },
        { inline_data: { mime_type: "image/jpeg", data: base64 } }
      ]
    }]
  };

  try {
    const res = await fetch(url, { method: "POST", body: JSON.stringify(payload) });
    const json = await res.json();
    const text = json.candidates[0].content.parts[0].text;
    const cleanJson = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error("AI OCR Error:", err);
    return { amount: 0, recipient: "Unknown" };
  }
}

// ── Notification Helpers ─────────────────────────────────────
async function notifyAdmin(order: any, items: any[]) {
  const adminId = Deno.env.get("ADMIN_CHAT_ID");
  if (!adminId) return;

  const itemsList = items.map(i => `• ${i.name_uz} x${i.quantity}`).join("\n");
  const text = `🆕 YANNGI BUYURTMA (#${order.id})\n\n` +
               `👤 Mijoz ID: ${order.user_id}\n` +
               `📍 Rejim: ${order.mode === "togo" ? "Olib ketish" : "Bozor"}\n` +
               `💰 Umumiy: ${order.total}₩\n\n` +
               `🍱 Taomlar:\n${itemsList}\n\n` +
               `Status: ${order.status}`;
  
  await bot.api.sendMessage(adminId, text);
}

// ── Bot Handlers ───────────────────────────────────────────

bot.command("start", (ctx) => {
  return ctx.reply(
    "🇺🇿 Tashkent Cafe botiga xush kelibsiz!\n\n" +
    "🍴 Taom buyurtma qilish uchun Mini App-ni oching.\n" +
    "💳 To'lovni amalga oshirgach, chekni shu yerga rasm qilib yuboring.",
    {
      reply_markup: {
        inline_keyboard: [[{ text: "🍴 Menyu", web_app: { url: Deno.env.get("MINI_APP_URL") || "" } }]]
      }
    }
  );
});

// Handle payment screenshots from Telegram
bot.on("message:photo", async (ctx) => {
  const photo = ctx.message.photo.pop();
  if (!photo) return;
  const telegramId = ctx.from.id;

  try {
    const { data: user } = await supabase.from("users").select("id").eq("telegram_id", telegramId).single();
    if (!user) return ctx.reply("Siz hali ro'yxatdan o'tmagansiz (Mini App orqali buyurtma bering).");

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!order) return ctx.reply("Sizda to'lov kutilayotgan buyurtma topilmadi.");

    await ctx.reply("🖼 Chek qabul qilindi. AI tizimi tekshirmoqda...");

    const file = await ctx.api.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();

    const fileName = `${telegramId}/${Date.now()}.jpg`;
    await supabase.storage.from("payments").upload(fileName, arrayBuffer, { contentType: "image/jpeg" });

    const aiResult = await verifyReceiptWithAI(arrayBuffer);
    const isVerified = Math.abs(aiResult.amount - order.total) <= 500;

    await supabase.from("orders").update({
      payment_screenshot: fileName,
      ai_amount: aiResult.amount,
      ai_verified: isVerified,
      status: isVerified ? "confirmed" : "payment_uploaded"
    }).eq("id", order.id);

    if (isVerified) {
      await ctx.reply(`✅ To'lov tasdiqlandi! (${aiResult.amount}₩)\nBuyurtmangiz tayyorlanmoqda.`);
    } else {
      await ctx.reply(`⚠️ Summa mos kelmadi. Kutilgan: ${order.total}₩, Topilgan: ${aiResult.amount}₩. Admin tekshiradi.`);
    }
  } catch (err) {
    console.error(err);
    await ctx.reply("Xatolik yuz berdi.");
  }
});

// ── API Handlers ───────────────────────────────────────────

async function handleApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace("/telegram-bot/api", "").replace("/api", "");
  
  // CORS Headers
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  });

  if (req.method === "OPTIONS") return new Response(null, { headers });

  try {
    // 1. GET /menu
    if (path === "/menu" && req.method === "GET") {
      const { data } = await supabase.from("menu").select("*").order("category");
      return new Response(JSON.stringify({ ok: true, items: data }), { headers });
    }

    // 2. POST /orders
    if (path === "/orders" && req.method === "POST") {
      const body = await req.json();
      const { telegram_id, name, username, mode, items } = body;

      // Upsert user
      const { data: user } = await supabase.from("users").upsert(
        { telegram_id, name, username },
        { onConflict: "telegram_id" }
      ).select().single();

      if (!user) throw new Error("User creation failed");

      const total = items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
      
      const { data: order, error: orderErr } = await supabase.from("orders").insert({
        user_id: user.id,
        mode,
        total,
        status: "pending"
      }).select().single();

      if (orderErr) throw orderErr;

      // Insert items
      const orderItems = items.map((i: any) => ({
        order_id: order.id,
        menu_item_id: i.id,
        name_uz: i.name_uz,
        quantity: i.quantity,
        price: i.price
      }));
      await supabase.from("order_items").insert(orderItems);

      // Notify
      await notifyAdmin(order, orderItems);
      
      if (mode === "togo") {
        await bot.api.sendMessage(telegram_id, 
          `💰 Buyurtma qabul qilindi (#${order.id})\n\n` +
          `Summa: ${total}₩\n` +
          `Bank: ${BANK_ACCOUNT}\n` +
          `Ega: ${BANK_OWNER}\n\n` +
          `Iltimos, to'lov skrinshotini shu yerga rasm qilib yuboring.`
        );
      }

      return new Response(JSON.stringify({ ok: true, order_id: order.id, total }), { headers });
    }

    // 3. GET /orders/my-last
    if (path === "/orders/my-last" && req.method === "GET") {
      const telegramId = url.searchParams.get("telegram_id");
      const { data: user } = await supabase.from("users").select("id").eq("telegram_id", telegramId).single();
      if (!user) return new Response(JSON.stringify({ ok: true, order: null }), { headers });

      const { data: order } = await supabase.from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(JSON.stringify({ ok: true, order, items: order?.order_items || [] }), { headers });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
  } catch (err: any) {
    console.error("API Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

// ── Main Entry ──────────────────────────────────────────────
const telegramHandler = webhookCallback(bot, "std/http");

Deno.serve(async (req) => {
  const url = new URL(req.url);
  
  // Route to API if path contains /api
  if (url.pathname.includes("/api")) {
    return await handleApi(req);
  }

  // Otherwise handle as Telegram Webhook
  if (req.method === "POST") {
    return await telegramHandler(req);
  }

  return new Response("Tashkent Cafe Bot is running...");
});
