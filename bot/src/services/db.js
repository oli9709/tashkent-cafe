const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { DB_PATH } = require('../config');

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ──────────────────────────────────────────────────────────────
// SCHEMA
// ──────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id   TEXT    UNIQUE NOT NULL,
    name          TEXT,
    username      TEXT,
    last_order_id INTEGER,
    created_at    TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (last_order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name_uz     TEXT NOT NULL,
    name_ko     TEXT,
    price       INTEGER NOT NULL,
    category    TEXT NOT NULL,
    emoji       TEXT DEFAULT '🍽️',
    image_url   TEXT,
    description TEXT,
    is_sold_out INTEGER DEFAULT 0,
    sort_order  INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER NOT NULL,
    mode                TEXT NOT NULL CHECK(mode IN ('togo','bozor')),
    status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK(status IN ('pending','payment_uploaded','ai_verified','confirmed','rejected','delivered')),
    total               INTEGER NOT NULL,
    payment_screenshot  TEXT,
    ai_verified         INTEGER DEFAULT 0,
    ai_amount           INTEGER,
    ai_confidence       REAL,
    admin_note          TEXT,
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id  INTEGER NOT NULL,
    item_id   INTEGER NOT NULL,
    name_uz   TEXT NOT NULL,
    quantity  INTEGER NOT NULL DEFAULT 1,
    price     INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (item_id)  REFERENCES menu_items(id)
  );

  CREATE INDEX IF NOT EXISTS idx_orders_user    ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_order_items    ON order_items(order_id);
`);

// ──────────────────────────────────────────────────────────────
// USER QUERIES
// ──────────────────────────────────────────────────────────────
const userQueries = {
  upsert: db.prepare(`
    INSERT INTO users (telegram_id, name, username)
    VALUES (@telegram_id, @name, @username)
    ON CONFLICT(telegram_id) DO UPDATE SET
      name = excluded.name,
      username = excluded.username
  `),

  findByTelegramId: db.prepare(`
    SELECT * FROM users WHERE telegram_id = ?
  `),

  updateLastOrder: db.prepare(`
    UPDATE users SET last_order_id = ? WHERE telegram_id = ?
  `),

  getAllBozorUsers: db.prepare(`
    SELECT DISTINCT u.telegram_id, u.name
    FROM users u
    JOIN orders o ON o.user_id = u.id
    WHERE o.mode = 'bozor'
      AND DATE(o.created_at) = DATE('now')
      AND o.status NOT IN ('rejected', 'delivered')
  `),
};

// ──────────────────────────────────────────────────────────────
// MENU QUERIES
// ──────────────────────────────────────────────────────────────
const menuQueries = {
  getAll: db.prepare(`
    SELECT * FROM menu_items ORDER BY sort_order, category, id
  `),

  getById: db.prepare(`SELECT * FROM menu_items WHERE id = ?`),

  toggleSoldOut: db.prepare(`
    UPDATE menu_items SET is_sold_out = ? WHERE id = ?
  `),

  update: db.prepare(`
    UPDATE menu_items
    SET name_uz = @name_uz, name_ko = @name_ko, price = @price,
        category = @category, emoji = @emoji, description = @description,
        is_sold_out = @is_sold_out
    WHERE id = @id
  `),
};

// ──────────────────────────────────────────────────────────────
// ORDER QUERIES
// ──────────────────────────────────────────────────────────────
const orderQueries = {
  create: db.prepare(`
    INSERT INTO orders (user_id, mode, total)
    VALUES (@user_id, @mode, @total)
  `),

  addItem: db.prepare(`
    INSERT INTO order_items (order_id, item_id, name_uz, quantity, price)
    VALUES (@order_id, @item_id, @name_uz, @quantity, @price)
  `),

  updateStatus: db.prepare(`
    UPDATE orders
    SET status = @status, updated_at = datetime('now')
    WHERE id = @id
  `),

  updatePayment: db.prepare(`
    UPDATE orders
    SET payment_screenshot = @screenshot,
        status = 'payment_uploaded',
        updated_at = datetime('now')
    WHERE id = @id
  `),

  updateAiResult: db.prepare(`
    UPDATE orders
    SET ai_verified = @ai_verified,
        ai_amount = @ai_amount,
        ai_confidence = @ai_confidence,
        status = CASE WHEN @ai_verified = 1 THEN 'ai_verified' ELSE 'payment_uploaded' END,
        updated_at = datetime('now')
    WHERE id = @id
  `),

  getById: db.prepare(`
    SELECT o.*, u.telegram_id, u.name as user_name, u.username
    FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE o.id = ?
  `),

  getItemsByOrderId: db.prepare(`
    SELECT * FROM order_items WHERE order_id = ?
  `),

  getLastSuccessful: db.prepare(`
    SELECT o.*, u.telegram_id
    FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE u.telegram_id = ?
      AND o.status IN ('confirmed', 'delivered', 'ai_verified')
    ORDER BY o.created_at DESC
    LIMIT 1
  `),

  getAll: db.prepare(`
    SELECT o.*, u.name as user_name, u.username, u.telegram_id
    FROM orders o
    JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
    LIMIT 100
  `),

  getWeeklyAnalytics: db.prepare(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as order_count,
      SUM(total) as revenue,
      mode,
      SUM(CASE WHEN status IN ('confirmed','delivered','ai_verified') THEN 1 ELSE 0 END) as confirmed_count
    FROM orders
    WHERE created_at >= DATE('now', '-7 days')
    GROUP BY DATE(created_at), mode
    ORDER BY date DESC
  `),

  getTopItems: db.prepare(`
    SELECT oi.name_uz, SUM(oi.quantity) as total_qty, SUM(oi.quantity * oi.price) as revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= DATE('now', '-7 days')
      AND o.status IN ('confirmed','delivered','ai_verified')
    GROUP BY oi.item_id
    ORDER BY total_qty DESC
    LIMIT 10
  `),
};

// ──────────────────────────────────────────────────────────────
// TRANSACTIONS
// ──────────────────────────────────────────────────────────────
const createOrderTransaction = db.transaction((userId, mode, total, items) => {
  const orderResult = orderQueries.create.run({ user_id: userId, mode, total });
  const orderId = orderResult.lastInsertRowid;

  for (const item of items) {
    orderQueries.addItem.run({
      order_id: orderId,
      item_id: item.id,
      name_uz: item.name_uz,
      quantity: item.quantity,
      price: item.price,
    });
  }

  return orderId;
});

module.exports = {
  db,
  userQueries,
  menuQueries,
  orderQueries,
  createOrderTransaction,
};
