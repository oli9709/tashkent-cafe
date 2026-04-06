const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const { menuQueries, orderQueries, userQueries, createOrderTransaction } = require('./services/db');
const { verifyPaymentScreenshot } = require('./services/vision');
const { notifyAdminNewOrder, notifyAdminPaymentVerified } = require('./services/notify');
const { UPLOADS_DIR, BANK_ACCOUNT, BANK_OWNER } = require('./config');

// ── SSE clients list ──────────────────────────────────────────
const sseClients = new Set();

function broadcastSSE(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(message); } catch (_) { sseClients.delete(res); }
  }
}

// ── Upload config ─────────────────────────────────────────────
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `payment_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Images only'));
  },
});

// ── Router ────────────────────────────────────────────────────
const router = express.Router();
router.use(cors());
router.use(express.json());

// ─────────────────────────────────────────────────────────────
// MENU
// ─────────────────────────────────────────────────────────────
router.get('/menu', async (req, res) => {
  const items = await menuQueries.getAll();
  res.json({ ok: true, items });
});

// ─────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────

/** POST /api/orders — create a new order */
router.post('/orders', async (req, res) => {
  const { telegram_id, name, username, mode, items } = req.body;

  if (!telegram_id || !mode || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' });
  }
  if (!['togo', 'bozor'].includes(mode)) {
    return res.status(400).json({ ok: false, error: 'Invalid mode' });
  }

  // Upsert user
  await userQueries.upsert({ telegram_id, name: name || null, username: username || null });
  const user = await userQueries.findByTelegramId(telegram_id);

  // Validate items exist and not sold out
  const enrichedItems = [];
  for (const cartItem of items) {
    const menuItem = await menuQueries.getById(cartItem.id);
    if (!menuItem) return res.status(400).json({ ok: false, error: `Item ${cartItem.id} not found` });
    if (menuItem.is_sold_out) return res.status(400).json({ ok: false, error: `${menuItem.name_uz} tugadi (sold out)` });
    enrichedItems.push({
      id: menuItem.id,
      name_uz: menuItem.name_uz,
      quantity: cartItem.quantity || 1,
      price: menuItem.price,
    });
  }

  const total = enrichedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const orderId = await createOrderTransaction(user.id, mode, total, enrichedItems);

  // Fetch full order for notification
  const order = await orderQueries.getById(orderId);
  const orderItems = await orderQueries.getItemsByOrderId(orderId);

  // Notify admin
  await notifyAdminNewOrder(order, orderItems);
  // SSE broadcast
  broadcastSSE('new_order', { order, items: orderItems });

  // Update last_order_id for "My Regular Order"
  await userQueries.updateLastOrder(orderId, telegram_id);

  res.json({
    ok: true,
    order_id: orderId,
    total,
    mode,
    bank_account: mode === 'togo' ? BANK_ACCOUNT : null,
    bank_owner: mode === 'togo' ? BANK_OWNER : null,
    message: mode === 'bozor'
      ? "Buyurtmangiz qabul qilindi! Yetkazib berilganda naqd to'laysiz."
      : "To'lov skrinshotini yuboring!",
  });
});

/** POST /api/orders/:id/payment — upload payment screenshot */
router.post('/orders/:id/payment', upload.single('screenshot'), async (req, res) => {
  const { id } = req.params;
  const { telegram_id } = req.body;

  if (!req.file) return res.status(400).json({ ok: false, error: 'Screenshot required' });

  const order = await orderQueries.getById(id);
  if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });
  if (String(order.telegram_id) !== String(telegram_id)) return res.status(403).json({ ok: false, error: 'Forbidden' });

  const screenshotPath = req.file.path;
  await orderQueries.updatePayment({ screenshot: screenshotPath, id });

  // Run AI verification asynchronously
  verifyPaymentScreenshot(screenshotPath, order.total).then(async (aiResult) => {
    await orderQueries.updateAiResult({
      ai_verified: aiResult.verified ? 1 : 0,
      ai_amount: aiResult.extractedAmount,
      ai_confidence: aiResult.confidence,
      id,
    });

    const updatedOrder = await orderQueries.getById(id);
    await notifyAdminPaymentVerified(updatedOrder, aiResult);
    broadcastSSE('order_updated', { order: updatedOrder, ai: aiResult });
  }).catch(err => console.error('[API] Vision error:', err));

  res.json({ ok: true, message: 'Screenshot qabul qilindi. AI tekshirmoqda...' });
});

/** GET /api/orders/my-last — last successful order for "My Regular Order" */
router.get('/orders/my-last', async (req, res) => {
  const { telegram_id } = req.query;
  if (!telegram_id) return res.status(400).json({ ok: false });

  const order = await orderQueries.getLastSuccessful(telegram_id);
  if (!order) return res.json({ ok: true, order: null });

  const items = await orderQueries.getItemsByOrderId(order.id);
  res.json({ ok: true, order, items });
});

// ─────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────

/** GET /api/admin/orders */
router.get('/admin/orders', async (req, res) => {
  const orders = await orderQueries.getAll();
  const result = await Promise.all(orders.map(async o => ({
    ...o,
    items: await orderQueries.getItemsByOrderId(o.id),
  })));
  res.json({ ok: true, orders: result });
});

/** PUT /api/admin/orders/:id/status */
router.put('/admin/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ['confirmed', 'rejected', 'delivered', 'pending'];
  if (!allowed.includes(status)) return res.status(400).json({ ok: false, error: 'Invalid status' });

  await orderQueries.updateStatus({ status, id });
  const order = await orderQueries.getById(id);

  broadcastSSE('order_updated', { order });

  // Notify user
  const { notifyUserOrderStatus } = require('./services/notify');
  await notifyUserOrderStatus(order.telegram_id, id, status);

  res.json({ ok: true, order });
});

/** PUT /api/admin/menu/:id/sold-out */
router.put('/admin/menu/:id/sold-out', async (req, res) => {
  const { id } = req.params;
  const { is_sold_out } = req.body;

  await menuQueries.toggleSoldOut(is_sold_out ? 1 : 0, id);
  const item = await menuQueries.getById(id);

  broadcastSSE('menu_updated', { item });
  res.json({ ok: true, item });
});

/** GET /api/admin/analytics */
router.get('/admin/analytics', async (req, res) => {
  const weekly = await orderQueries.getWeeklyAnalytics();
  const topItems = await orderQueries.getTopItems();
  res.json({ ok: true, weekly, topItems });
});

/** GET /api/admin/stream — Server-Sent Events */
router.get('/admin/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send initial ping
  res.write(`event: connected\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);

  sseClients.add(res);
  console.log(`[SSE] Client connected. Total: ${sseClients.size}`);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    try { res.write(`:heartbeat\n\n`); } catch (_) { clearInterval(heartbeat); }
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
    console.log(`[SSE] Client disconnected. Total: ${sseClients.size}`);
  });
});

/** GET /api/admin/payment-image/:filename */
router.get('/admin/payment-image/:filename', (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false });
  res.sendFile(path.resolve(filePath));
});

module.exports = { router, broadcastSSE };
