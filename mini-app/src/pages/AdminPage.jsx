import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import { getAdminOrders, updateOrderStatus, toggleSoldOut, getAnalytics, getMenu } from '../api';
import { useSSE } from '../hooks/useSSE';

const won = (n) => `${Number(n).toLocaleString('ko-KR')}₩`;

const STATUS_CONFIG = {
  pending:           { label: 'Kutmoqda',       color: '#F59E0B', emoji: '⏳' },
  payment_uploaded:  { label: 'Skrinshot bor',  color: '#38BDF8', emoji: '🔍' },
  ai_verified:       { label: 'AI tasdiqladi',  color: '#10B981', emoji: '🤖' },
  confirmed:         { label: 'Tasdiqlandi',    color: '#10B981', emoji: '✅' },
  rejected:          { label: 'Rad etildi',     color: '#F43F5E', emoji: '❌' },
  delivered:         { label: 'Yetkazildi',     color: '#8B5CF6', emoji: '🎉' },
};

// ── Admin password guard ──────────────────────────────────────
const ADMIN_PIN = '1234'; // Change in production!

function PinGate({ onSuccess }) {
  const [pin, setPin] = useState('');
  const check = () => {
    if (pin === ADMIN_PIN) onSuccess();
    else { setPin(''); toast.error('Noto\'g\'ri PIN'); }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '24px', gap: '20px' }}>
      <div style={{ fontSize: '52px' }}>🔐</div>
      <h2>Admin Panel</h2>
      <input
        type="password"
        className="input"
        placeholder="PIN kod kiriting"
        value={pin}
        onChange={e => setPin(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && check()}
        style={{ maxWidth: '280px', textAlign: 'center', fontSize: '20px', letterSpacing: '0.3em' }}
        autoFocus
      />
      <button className="btn btn-primary" onClick={check} style={{ maxWidth: '280px', width: '100%' }}>
        Kirish
      </button>
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('orders'); // 'orders' | 'menu' | 'analytics'
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Load data ─────────────────────────────────────────────
  const loadOrders = useCallback(() => {
    getAdminOrders().then(d => setOrders(d.orders || [])).catch(() => {});
  }, []);

  const loadMenu = useCallback(() => {
    getMenu().then(d => setMenuItems(d.items || [])).catch(() => {});
  }, []);

  const loadAnalytics = useCallback(() => {
    getAnalytics().then(d => setAnalytics(d)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    Promise.all([
      getAdminOrders().then(d => setOrders(d.orders || [])),
      getMenu().then(d => setMenuItems(d.items || [])),
      getAnalytics().then(d => setAnalytics(d)),
    ]).finally(() => setLoading(false));
  }, [authed]);

  // ── SSE real-time updates ─────────────────────────────────
  useSSE('/api/admin/stream', {
    new_order: (data) => {
      setOrders(prev => [{ ...data.order, items: data.items }, ...prev]);
      toast('🔔 Yangi buyurtma!', { icon: '🍽️', duration: 4000 });
    },
    order_updated: (data) => {
      setOrders(prev => prev.map(o => o.id === data.order?.id ? { ...o, ...data.order } : o));
    },
    menu_updated: (data) => {
      setMenuItems(prev => prev.map(i => i.id === data.item?.id ? data.item : i));
    },
  }, authed);

  // ── Actions ───────────────────────────────────────────────
  const handleStatus = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      toast.success(STATUS_CONFIG[status]?.label + ' ✓');
    } catch { toast.error('Xatolik'); }
  };

  const handleSoldOut = async (id, current) => {
    try {
      const result = await toggleSoldOut(id, !current);
      setMenuItems(prev => prev.map(i => i.id === id ? result.item : i));
      toast.success(result.item.is_sold_out ? '🚫 Sold Out' : '✅ Mavjud');
    } catch { toast.error('Xatolik'); }
  };

  if (!authed) return <PinGate onSuccess={() => setAuthed(true)} />;

  // ── Analytics chart data ──────────────────────────────────
  const chartData = analytics?.weekly?.reduce((acc, row) => {
    const existing = acc.find(r => r.date === row.date);
    if (existing) {
      existing[row.mode] = (existing[row.mode] || 0) + (row.revenue || 0);
    } else {
      acc.push({ date: row.date?.slice(5), [row.mode]: row.revenue || 0, orders: row.order_count });
    }
    return acc;
  }, []).reverse() || [];

  return (
    <div className="page">
      {/* ── Header ── */}
      <header className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2>📊 Admin Panel</h2>
          <span className="badge badge-success" style={{ animation: 'pulse-glow 2s infinite' }}>● LIVE</span>
        </div>
        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'orders', label: '📋 Buyurtmalar', count: orders.filter(o => !['confirmed','rejected','delivered'].includes(o.status)).length },
            { id: 'menu', label: '🍽 Menyu' },
            { id: 'analytics', label: '📈 Analitika' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '7px 14px',
                borderRadius: '999px',
                border: tab === t.id ? '1px solid var(--accent-gold)' : '1px solid var(--color-border)',
                background: tab === t.id ? 'rgba(255,216,64,0.12)' : 'var(--glass-bg-card)',
                color: tab === t.id ? 'var(--accent-gold)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {t.label}
              {t.count > 0 && (
                <span style={{ background: 'var(--accent-rose)', color: '#fff', borderRadius: '999px', padding: '1px 6px', fontSize: '10px' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div style={{ padding: '16px' }}>

        {/* ── ORDERS TAB ── */}
        <AnimatePresence mode="wait">
          {tab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>}
              {!loading && orders.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                  <div>Hali buyurtma yo'q</div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {orders.map((order, idx) => {
                  const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  return (
                    <motion.div
                      key={order.id}
                      className="glass-card"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      style={{ padding: '16px', overflow: 'hidden' }}
                    >
                      {/* Top row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <span style={{ fontWeight: 800, fontSize: '15px' }}>#{order.id}</span>
                          <span style={{
                            marginLeft: '8px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: order.mode === 'bozor' ? 'rgba(16,185,129,0.15)' : 'rgba(56,189,248,0.15)',
                            color: order.mode === 'bozor' ? 'var(--accent-emerald)' : 'var(--accent-sky)',
                          }}>
                            {order.mode === 'bozor' ? '🌅 Bozor' : '🛍 To Go'}
                          </span>
                        </div>
                        <span style={{ color: sc.color, fontSize: '12px', fontWeight: 600 }}>
                          {sc.emoji} {sc.label}
                        </span>
                      </div>

                      {/* User & items */}
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        👤 {order.user_name || 'Noma\'lum'}
                        {order.username ? ` (@${order.username})` : ''}
                      </div>

                      {order.items?.length > 0 && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.7 }}>
                          {order.items.map(i => `${i.name_uz} ×${i.quantity}`).join(' · ')}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-gold)' }}>{won(order.total)}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(order.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}
                        </span>
                      </div>

                      {/* AI badge */}
                      {order.payment_screenshot && (
                        <div style={{ marginBottom: '10px' }}>
                          <span className={`badge ${order.ai_verified ? 'badge-success' : 'badge-sky'}`} style={{ fontSize: '11px' }}>
                            {order.ai_verified ? '🤖 AI tasdiqladi' : '⏳ AI tekshirmoqda'}
                            {order.ai_amount ? ` · ${won(order.ai_amount)}` : ''}
                          </span>
                        </div>
                      )}

                      {/* Action buttons */}
                      {!['confirmed','rejected','delivered'].includes(order.status) && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-success"
                            style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                            onClick={() => handleStatus(order.id, 'confirmed')}
                          >
                            ✅ Tasdiqlash
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                            onClick={() => handleStatus(order.id, 'rejected')}
                          >
                            ❌ Rad etish
                          </button>
                          {order.status === 'confirmed' && (
                            <button
                              className="btn btn-secondary"
                              style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                              onClick={() => handleStatus(order.id, 'delivered')}
                            >
                              🎉 Yetkazildi
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── MENU TAB ── */}
          {tab === 'menu' && (
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {menuItems.map(item => (
                  <div
                    key={item.id}
                    className="glass-card-sm"
                    style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}
                  >
                    <span style={{ fontSize: '24px', flexShrink: 0 }}>{item.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{item.name_uz}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.category}</div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-gold)', flexShrink: 0 }}>
                      {won(item.price)}
                    </div>
                    <button
                      onClick={() => handleSoldOut(item.id, item.is_sold_out)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: item.is_sold_out ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)',
                        color: item.is_sold_out ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {item.is_sold_out ? '✅ Bor' : '🚫 Tugadi'}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── ANALYTICS TAB ── */}
          {tab === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Jami buyurtmalar', value: orders.length, emoji: '📦' },
                  { label: 'Tasdiqlangan', value: orders.filter(o => ['confirmed','delivered'].includes(o.status)).length, emoji: '✅' },
                  { label: 'To Go', value: orders.filter(o => o.mode === 'togo').length, emoji: '🛍' },
                  { label: 'Bozor', value: orders.filter(o => o.mode === 'bozor').length, emoji: '🌅' },
                ].map(card => (
                  <div key={card.label} className="glass-card-sm" style={{ padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{card.emoji}</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-gold)' }}>{card.value}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{card.label}</div>
                  </div>
                ))}
              </div>

              {/* Weekly revenue chart */}
              {chartData.length > 0 && (
                <div className="glass-card" style={{ padding: '20px 12px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '14px', paddingLeft: '8px' }}>📈 Haftalik daromad (₩)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fill: 'rgba(240,244,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{ background: '#0F1628', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', fontSize: '12px' }}
                        formatter={(v) => won(v)}
                        labelStyle={{ color: 'rgba(240,244,255,0.7)' }}
                      />
                      <Bar dataKey="togo"  fill="#38BDF8" radius={[4,4,0,0]} name="To Go" />
                      <Bar dataKey="bozor" fill="#10B981" radius={[4,4,0,0]} name="Bozor" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#38BDF8' }} />
                      To Go
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10B981' }} />
                      Bozor
                    </div>
                  </div>
                </div>
              )}

              {/* Top items */}
              {analytics?.topItems?.length > 0 && (
                <div className="glass-card" style={{ padding: '16px', marginTop: '12px' }}>
                  <h3 style={{ marginBottom: '14px', fontSize: '14px' }}>🏆 Eng ko'p buyurtmalar (7 kun)</h3>
                  {analytics.topItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '20px', fontWeight: 700 }}>#{idx + 1}</span>
                      <div style={{ flex: 1, fontSize: '13px' }}>{item.name_uz}</div>
                      <span className="badge badge-gold">{item.total_qty} ta</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-gold)', minWidth: '70px', textAlign: 'right' }}>
                        {won(item.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
