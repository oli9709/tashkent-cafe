const axios = require('axios');
const fs = require('fs');
const { GOOGLE_VISION_API_KEY, PAYMENT_RECIPIENT } = require('../config');

/**
 * Analyse a payment screenshot using Google Cloud Vision API.
 * Falls back to a mock result when no API key is configured.
 *
 * @param {string} imagePath — absolute path to the uploaded image
 * @param {number} expectedAmount — expected total in KRW (₩)
 * @returns {{ verified: boolean, extractedAmount: number|null, extractedName: string|null, confidence: number, rawText: string }}
 */
async function verifyPaymentScreenshot(imagePath, expectedAmount) {
  if (!GOOGLE_VISION_API_KEY) {
    console.warn('[Vision] No API key — using MOCK verification');
    return mockVerification(expectedAmount);
  }

  try {
    const imageBase64 = fs.readFileSync(imagePath).toString('base64');

    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        requests: [
          {
            image: { content: imageBase64 },
            features: [
              { type: 'TEXT_DETECTION', maxResults: 1 },
              { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
            ],
          },
        ],
      },
      { timeout: 15000 }
    );

    const annotation = response.data?.responses?.[0]?.fullTextAnnotation;
    if (!annotation) {
      return { verified: false, extractedAmount: null, extractedName: null, confidence: 0, rawText: '' };
    }

    const rawText = annotation.text || '';
    return parsePaymentText(rawText, expectedAmount);
  } catch (err) {
    console.error('[Vision] API error:', err.message);
    // Return unverified, let admin manually check
    return { verified: false, extractedAmount: null, extractedName: null, confidence: 0, rawText: '', error: err.message };
  }
}

/**
 * Parse Korean bank transfer / Toss / KakaoBank success screen text.
 * Extracts amount and recipient name.
 */
function parsePaymentText(rawText, expectedAmount) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  // ── Extract Amount ──
  // Korean banking apps show amounts like: 8,500원  /  ₩8,500  /  8500
  const amountPatterns = [
    /(\d{1,3}(?:,\d{3})*)\s*원/g,   // 8,500원
    /₩\s*(\d{1,3}(?:,\d{3})*)/g,    // ₩8,500
    /(\d{4,7})/g,                    // bare number like 8500
  ];

  let extractedAmount = null;
  for (const pattern of amountPatterns) {
    const matches = [...rawText.matchAll(pattern)];
    if (matches.length > 0) {
      // Pick the number closest to expectedAmount
      const candidates = matches.map(m => parseInt(m[1].replace(/,/g, ''), 10));
      extractedAmount = candidates.reduce((best, cur) =>
        Math.abs(cur - expectedAmount) < Math.abs(best - expectedAmount) ? cur : best
      );
      if (extractedAmount > 0) break;
    }
  }

  // ── Extract Recipient Name ──
  // Look for PAYMENT_RECIPIENT keyword in surrounding lines
  const recipientLine = lines.find(
    l => l.includes(PAYMENT_RECIPIENT) || l.toLowerCase().includes('tashkent')
  );
  const extractedName = recipientLine || null;

  // ── Verify ──
  const amountTolerance = 500; // ±500₩ allowed
  const amountMatch = extractedAmount !== null && Math.abs(extractedAmount - expectedAmount) <= amountTolerance;
  const nameMatch = !!extractedName;

  const confidence = (amountMatch ? 0.6 : 0) + (nameMatch ? 0.4 : 0);
  const verified = amountMatch; // amount is mandatory; name is advisory

  return {
    verified,
    extractedAmount,
    extractedName,
    confidence,
    rawText: rawText.slice(0, 500), // truncate for DB storage
  };
}

/** Mock result used during development (no Vision API key) */
function mockVerification(expectedAmount) {
  return {
    verified: true,
    extractedAmount: expectedAmount,
    extractedName: 'Tashkent Cafe (MOCK)',
    confidence: 0.9,
    rawText: '[MOCK] No Vision API key configured. Auto-approved for development.',
  };
}

module.exports = { verifyPaymentScreenshot };
