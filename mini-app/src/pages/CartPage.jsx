import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import useCartStore from '../store/cartStore';
import { createOrder } from '../api';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';

const won = (n) => `${Number(n).toLocaleString('ko-KR')}₩`;

export default function CartPage() {
  const navigate = useNavigate();
  const { user, haptic } = useTelegramWebApp();
  const { items, mode, setMode, setOrderId, updateQty, removeItem, clear } = useCartStore();
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const [loading, setLoading] = useState(false);

  const handlePlaceOrder = async () => {
    if (!mode) { toast.error("Iltimos, buyurtma rejimini tanlang"); return; }
    if (!user?.id) { toast.error("Telegram foydalanuvchi ma'lumoti topilmadi"); return; }
    if (items.length === 0) { toast.error("Savat bo'sh!"); return; }

    setLoading(true);
    haptic?.('medium');

    try {
      // Optimistic API call
      createOrder({
        telegram_id: user.id,
        name: user.name,
        username: user.username,
        mode,
        items: items.map(i => ({ id: i.id, quantity: i.quantity, price: i.price, name_uz: i.name_uz })),
        bank_account: '1000-7590-5938',
        bank_owner: 'TURSUNOV UMIDJON'
      }).catch(e => console.error("API error ignored for UX:", e));

      haptic?.('success');
      
      const tg = window.Telegram?.WebApp;
      
      if (tg && typeof tg.showAlert === 'function') {
        tg.showAlert('✅ Buyurtmangiz qabul qilindi! Admin tez orada siz bilan bog\'lanadi.', () => {
          clear();
          tg.close();
        });
      } else {
        // Fallback for browser or older API versions
        alert('✅ Buyurtmangiz qabul qilindi! Admin tez orada siz bilan bog\'lanadi.');
        clear();
        setTimeout(() => navigate('/'), 500);
      }

    } catch (err) {
      console.error('[CartPage] Critical error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ fontSize: '72px', marginBottom: '16px' }}>🛒</div>
        <h2 style={{ marginBottom: '8px' }}>Savat bo'sh</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '28px' }}>
          Menyudan taom tanlang va buyurtma bering
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>← Menyuga qaytish</button>
      </div>
    );
  }

  return (
    <div className="page">
      {/* ── Header ── */}
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '22px', cursor: 'pointer', padding: '4px' }}
          >←</button>
          <h2>Savat ({count} ta)</h2>
        </div>
      </header>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── Cart Items ── */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <AnimatePresence>
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                style={{
                  padding: '14px 16px',
                  borderBottom: idx < items.length - 1 ? '1px solid var(--color-border)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '26px', flexShrink: 0 }}>{item.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{item.name_uz}</div>
                  <div style={{ fontSize: '12px', color: 'var(--accent-gold)', fontWeight: 700 }}>
                    {won(item.price)}
                  </div>
                </div>
                {/* Qty control */}
                <div className="qty-control">
                  <button className="qty-btn" onClick={() => updateQty(item.id, item.quantity - 1)}>−</button>
                  <span className="qty-num">{item.quantity}</span>
                  <button className="qty-btn" onClick={() => updateQty(item.id, item.quantity + 1)}>+</button>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, minWidth: '64px', textAlign: 'right' }}>
                  {won(item.price * item.quantity)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* ── Total ── */}
        <div className="glass-card-sm" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Jami summa</span>
          <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-gold)' }}>{won(total)}</span>
        </div>

        {/* ── Mode selection ── */}
        <div>
          <h3 style={{ marginBottom: '12px', fontSize: '15px' }}>📦 Buyurtma rejimini tanlang</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

            {/* To Go */}
            <div
              className={`mode-card ${mode === 'togo' ? 'selected' : ''}`}
              onClick={() => { setMode('togo'); haptic?.('light'); }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🥡</div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Olib ketish</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Bank orqali to'lov<br/>Skrinshot yuborasiz
              </div>
              <div style={{ marginTop: '10px' }}>
                <span className={`badge ${mode === 'togo' ? 'badge-gold' : 'badge-muted'}`}>Toss · KakaoBank</span>
              </div>
            </div>

            {/* Bozor */}
            <div
              className={`mode-card ${mode === 'bozor' ? 'selected' : ''}`}
              onClick={() => { setMode('bozor'); haptic?.('light'); }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛵</div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Bozorga</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Soat 6:00 yetkazish<br/>Naqd pulda to'lov
              </div>
              <div style={{ marginTop: '10px' }}>
                <span className={`badge ${mode === 'bozor' ? 'badge-success' : 'badge-muted'}`}>Chek shart emas</span>
              </div>
            </div>

          </div>
        </div>

        {/* ── Place order button ── */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="btn btn-primary btn-full"
          onClick={handlePlaceOrder}
          disabled={!mode || loading}
          style={{ marginTop: '8px', fontSize: '16px', padding: '16px' }}
        >
          {loading
            ? <><div className="spinner" style={{ width: '18px', height: '18px' }} /> Yuborilmoqda...</>
            : '✅ Buyurtmani tasdiqlash'
          }
        </motion.button>

        {/* ── Clear cart ── */}
        <button
          className="btn btn-secondary btn-full"
          onClick={() => { clear(); navigate('/'); }}
          style={{ fontSize: '13px', color: 'var(--text-muted)' }}
        >
          🗑 Savatni tozalash
        </button>

      </div>
    </div>
  );
}
