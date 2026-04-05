/**
 * Database seed script — run once to populate initial menu
 * Usage: node src/seed.js
 */
require('dotenv').config();
const { db } = require('./services/db');

const MENU = [
  // ─── Birinchi taomlar ──────────────────────────────
  { name_uz: "Sho'rva",       name_ko: '슈르파',     price: 10000, category: 'Birinchi taom', emoji: '🍲', description: "Go'shtli va sabzavotli sho'rva", sort_order: 1 },
  { name_uz: "Chuchvara",      name_ko: '추치바라',   price: 9000,  category: 'Birinchi taom', emoji: '🥣', description: "Qaynatma chuchvara", sort_order: 2 },

  // ─── Ikkinchi taomlar ──────────────────────────────
  { name_uz: "Qozon kabob",    name_ko: '가잔 카봅',   price: 12000, category: 'Ikkinchi taom', emoji: '🥩', description: "Go'sht va qovurilgan kartoshka", sort_order: 10 },
  { name_uz: "Achiq go'sht", name_ko: '아치크 고시트',price: 12000, category: 'Ikkinchi taom', emoji: '🥘', description: "Achchiq va mazali go'sht qovurmasi", sort_order: 11 },
  { name_uz: "Xonim",          name_ko: '호님',       price: 10000, category: 'Ikkinchi taom', emoji: '🥟', description: "Bug'da pishgan, sabzavotli xamir taom", sort_order: 12 },
  { name_uz: "Non kabob",      name_ko: '논 카봅',     price: 6000,  category: 'Ikkinchi taom', emoji: '🥙', description: "Non ichida qovurilgan go'sht", sort_order: 13 },
  { name_uz: "Lavash",         name_ko: '라바쉬',     price: 6000,  category: 'Ikkinchi taom', emoji: '🌯', description: "Go'shtli lavash", sort_order: 14 },

  // ─── Somsa va Pishiriqlar ─────────────────────────
  { name_uz: "Somsa (tovuqli)",name_ko: '치킨 삼사',   price: 3000,  category: 'Non & Pishiriq', emoji: '🥐', description: "Tovuq go'shtidan somsa", sort_order: 20 },
  { name_uz: "Somsa (go'shtli)",name_ko: '고기 삼사',price: 4000,  category: 'Non & Pishiriq', emoji: '🥐', description: "Mol go'shtidan somsa", sort_order: 21 },

  // ─── Shirinliklar ──────────────────────────────────
  { name_uz: "Medoviy tort",   name_ko: '꿀 케이크',   price: 6000,  category: 'Shirinliklar',   emoji: '🍰', description: "Asalli mazali tort", sort_order: 30 },
  { name_uz: "Kremli tort",    name_ko: '크림 케이크', price: 7000,  category: 'Shirinliklar',   emoji: '🎂', description: "Yumshoq kremli biskvit", sort_order: 31 },
  { name_uz: "Shokoladli tort",name_ko: '초코 케이크', price: 7000,  category: 'Shirinliklar',   emoji: '🍫', description: "Asl shokoladli tort", sort_order: 32 }
];

const insert = db.prepare(`
  INSERT INTO menu_items (name_uz, name_ko, price, category, emoji, description, sort_order)
  VALUES (@name_uz, @name_ko, @price, @category, @emoji, @description, @sort_order)
`);

const insertMany = db.transaction((items) => {
  // Clear existing items
  db.prepare('DELETE FROM menu_items').run();
  for (const item of items) {
    insert.run(item);
  }
});

insertMany(MENU);
console.log("\\nMenyuni ko'rish uchun: GET http://localhost:3001/api/menu\\n");
