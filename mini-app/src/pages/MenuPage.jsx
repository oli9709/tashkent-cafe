import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { getMenu, getLastOrder } from '../api';
import useCartStore from '../store/cartStore';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';

const CATEGORIES = ['Hammasi', 'Birinchi taom', 'Ikkinchi taom', 'Non & Pishiriq', 'Ichimlik'];

const won = (n) => `${Number(n).toLocaleString('ko-KR')}₩`;

export default function MenuPage() {
  const navigate = useNavigate();
  const { user } = useTelegramWebApp();
  const { items: cartItems, addItem, count, total, loadFromLastOrder } = useCartStore();

  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('Hammasi');
  const [lastOrder, setLastOrder] = useState(null);
  const [showRepeatBanner, setShowRepeatBanner] = useState(false);

  // ── Fetch menu ─────────────────────────────────────────
  useEffect(() => {
    getMenu()
      .then(data => setMenu(data.items || []))
      .catch(() => toast.error("Menyu yuklashda xatolik"))
      .finally(() => setLoading(false));
  }, []);

  // ── Fetch last order ───────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    getLastOrder(user.id).then(data => {
      if (data.order && data.items?.length > 0) {
        setLastOrder(data);
        setShowRepeatBanner(true);
      }
    }).catch(() => {});
  }, [user?.id]);

  // ── Filtered items ─────────────────────────────────────
  const filtered = useMemo(() =>
    category === 'Hammasi' ? menu : menu.filter(i => i.category === category),
    [menu, category]
  );

  const handleAdd = (item) => {
    if (item.is_sold_out) return;
    addItem({ id: item.id, name_uz: item.name_uz, price: item.price, emoji: item.emoji });
    toast.success(`${item.emoji} Savatga qo'shildi!`, { duration: 1500 });
  };

  const handleRepeatLast = () => {
    if (!lastOrder?.items) return;
    loadFromLastOrder(lastOrder.items);
    setShowRepeatBanner(false);
    toast.success('✨ Oxirgi buyurtma savatga qo\'shildi!');
  };

  const getItemQty = (id) => cartItems.find(i => i.id === id)?.quantity || 0;

  return (
    <div className="page">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '26px' }}>🍽️</span>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.01em' }}>Tashkent Cafe</h1>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Koreyadagi o'zbek ta'mi</p>
              </div>
            </div>
          </div>
          {user && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
              👋 {user.name?.split(' ')[0]}
            </div>
          )}
        </div>

        {/* Category filter tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                border: category === cat ? '1px solid var(--accent-gold)' : '1px solid var(--color-border)',
                background: category === cat ? 'rgba(255,216,64,0.12)' : 'var(--glass-bg-card)',
                color: category === cat ? 'var(--accent-gold)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <div style={{ padding: '16px' }}>
        {/* ── "My Regular Order" Banner ──────────────────── */}
        <AnimatePresence>
          {showRepeatBanner && lastOrder && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ duration: 0.3 }}
              className="glass-card"
              style={{
                padding: '14px 16px',
                marginBottom: '16px',
                border: '1px solid rgba(255,216,64,0.3)',
                background: 'rgba(255,216,64,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '28px', flexShrink: 0 }}>⚡</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-gold)' }}>
                  Odatiy buyurtmangizni takrorlash?
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {lastOrder.items.length} ta taom — {won(lastOrder.order.total)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={handleRepeatLast}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '8px 14px', fontSize: '12px' }}
                >
                  Ha, qo'sh
                </button>
                <button
                  onClick={() => setShowRepeatBanner(false)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '8px 10px', fontSize: '16px' }}
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Loading skeleton ──────────────────────────── */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card" style={{ height: '200px', opacity: 0.4 + i * 0.05 }} />
            ))}
          </div>
        )}

        {/* ── Menu Grid ─────────────────────────────────── */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <AnimatePresence mode="popLayout">
              {filtered.map((item, idx) => {
                const qty = getItemQty(item.id);
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2, delay: idx * 0.04 }}
                    className="glass-card"
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: item.is_sold_out ? 'default' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    onClick={() => handleAdd(item)}
                  >
                    {/* Emoji display */}
                    <div style={{
                      height: '90px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '52px',
                      background: 'rgba(255,255,255,0.03)',
                    }}>
                      {item.emoji}
                    </div>

                    {/* Info */}
                    <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.3 }}>{item.name_uz}</div>
                      {item.name_ko && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.name_ko}</div>
                      )}
                      {item.description && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {item.description}
                        </div>
                      )}
                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-gold)' }}>
                          {won(item.price)}
                        </span>
                        {qty > 0 && (
                          <span style={{
                            background: 'var(--accent-gold)',
                            color: '#0A0F1E',
                            borderRadius: '999px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 800,
                          }}>
                            ×{qty}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sold out overlay */}
                    {item.is_sold_out && (
                      <div className="sold-out-overlay">
                        <span className="badge badge-danger" style={{ fontSize: '13px', padding: '6px 14px' }}>
                          🚫 Tugadi
                        </span>
                      </div>
                    )}

                    {/* Hover shine */}
                    {!item.is_sold_out && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(135deg, rgba(255,216,64,0.05) 0%, transparent 60%)',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        pointerEvents: 'none',
                        borderRadius: 'inherit',
                      }} className="card-shine" />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🍽️</div>
            <div>Bu kategoriyada taom yo'q</div>
          </div>
        )}
      </div>

      {/* ── Bottom Cart Button ────────────────────────────── */}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            className="bottom-nav"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
          >
            <button
              className="btn btn-primary btn-full"
              onClick={() => navigate('/cart')}
              style={{ fontSize: '15px' }}
            >
              <span>🛒 Savatni ko'rish</span>
              <span style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '999px',
                padding: '3px 10px',
                fontSize: '13px',
              }}>
                {count} ta · {won(total)}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
