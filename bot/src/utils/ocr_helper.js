/**
 * ocr_helper.js — Gemini OCR Moduli
 * ─────────────────────────────────────────────────────────────────
 * Google Gemini 1.5 Flash modelidan foydalanib to'lov chekini
 * tahlil qiladi va strukturlangan JSON javob qaytaradi.
 *
 * Qaytariladigan format:
 *   { amount: number, recipient_name: string }
 *
 * Muhit o'zgaruvchilari (Hugging Face Secrets orqali):
 *   GEMINI_API_KEY — Google AI Studio dan olingan kalit
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Gemini API ni ishga tushirish ────────────────────────────────
// Kalit process.env orqali o'qiladi (Hugging Face Variables & Secrets)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Model nomi — Flash versiya tezroq va arzonroq
const MODEL_NAME = 'gemini-1.5-flash';

/**
 * Gemini Flash klientini lazy-init bilan yaratuvchi funksiya.
 * Kalit bo'lmasa xato qiladi (deploy vaqtida aniq ko'rinsin).
 */
function getGeminiClient() {
  if (!GEMINI_API_KEY) {
    throw new Error(
      '[OCR] GEMINI_API_KEY muhit o\'zgaruvchisi o\'rnatilmagan! ' +
      'Hugging Face → Settings → Variables and Secrets bo\'limiga qo\'shing.'
    );
  }
  return new GoogleGenerativeAI(GEMINI_API_KEY);
}

/**
 * verifyReceipt(imageBuffer)
 * ─────────────────────────────────────────────────────────────────
 * To'lov cheki rasmini Gemini 1.5 Flash ga yuborib,
 * summa va qabul qiluvchi ismini ajratib oladi.
 *
 * @param {Buffer} imageBuffer — rasm fayli Buffer ko'rinishida
 * @param {string} [mimeType='image/jpeg'] — rasm MIME turi
 * @returns {Promise<{ amount: number, recipient_name: string }>}
 * @throws {Error} API xatosi yoki JSON parse muvaffaqiyatsiz bo'lsa
 */
async function verifyReceipt(imageBuffer, mimeType = 'image/jpeg') {
  // 1. Gemini klientini va modelini olish
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  // 2. Rasmni Base64 ga o'tkazish (Gemini inline data formatida talab qiladi)
  const imageBase64 = imageBuffer.toString('base64');

  // 3. Promptni tuzish — faqat JSON qaytarishni buyuramiz
  const prompt = `
Siz to'lov cheki (bank o'tkazma screenshoti) tahlilchisisiz.
Quyidagi rasmni ko'rib chiqib, faqat quyidagi JSON formatida javob bering.
Boshqa hech qanday matn, izoh yoki belgisiz — faqat sof JSON:

{"amount": <raqam, butun son>, "recipient_name": "<qabul qiluvchi ismi>"}

Qoidalar:
- "amount" — o'tkazilgan summa (faqat raqam, vergul va belgilarsiz)
- "recipient_name" — pul o'tkazilgan shaxs yoki tashkilot nomi
- Agar summa topilmasa, amount = 0
- Agar ism topilmasa, recipient_name = "Noma'lum"
- JSON dan tashqari hech narsa yozmang
`;

  // 4. Gemini ga so'rov yuborish (multimodal: matn + rasm)
  let responseText = '';
  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
    ]);

    responseText = result.response.text().trim();
    console.log('[OCR] Gemini xom javobi:', responseText);
  } catch (apiError) {
    console.error('[OCR] Gemini API xatosi:', apiError.message);
    throw new Error(`Gemini API xatosi: ${apiError.message}`);
  }

  // 5. JSON ni ajratib olish (model ba'zida markdown kod bloki qo'shishi mumkin)
  const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) {
    console.error('[OCR] JSON topilmadi. Xom javob:', responseText);
    // Fallback: xatoni bildirmasdan, nol qiymat qaytaramiz
    return { amount: 0, recipient_name: "Noma'lum" };
  }

  // 6. Parse va validatsiya
  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error('[OCR] JSON parse xatosi:', parseError.message, '| Matn:', jsonMatch[0]);
    return { amount: 0, recipient_name: "Noma'lum" };
  }

  // 7. Tip tekshiruvi va normalizatsiya
  const amount = typeof parsed.amount === 'number'
    ? Math.round(parsed.amount)          // butun songa yaxlitlash
    : parseInt(String(parsed.amount).replace(/[^0-9]/g, ''), 10) || 0;

  const recipient_name = typeof parsed.recipient_name === 'string'
    ? parsed.recipient_name.trim() || "Noma'lum"
    : "Noma'lum";

  console.log(`[OCR] Natija: summa=${amount}, qabul qiluvchi="${recipient_name}"`);

  return { amount, recipient_name };
}

module.exports = { verifyReceipt };
