import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import { 
  getAdminOrders, 
  updateOrderStatus, 
  toggleSoldOut, 
  getAnalytics, 
  getMenu,
  toggleShopStatus,
  triggerBroadcast
} from '../api';
import { useSSE } from '../hooks/useSSE';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';

const won = (n) => `${Number(n).toLocaleString('ko-KR')}₩`;

const STATUS_CONFIG = {
  pending:           { label: 'Kutmoqda',       color: '#F59E0B', emoji: '⏳' },
  payment_uploaded:  { label: 'Skrinshot bor',  color: '#38BDF8', emoji: '🔍' },
  ai_verified:       { label: 'AI tasdiqladi',  color: '#10B981', emoji: '🤖' },
  confirmed:         { label: 'Tasdiqlandi',    color: '#10B981', emoji: '✅' },
  rejected:          { label: 'Rad etildi',     color: '#F43F5E', emoji: '❌' },
  delivered:         { label: 'Yetkazildi',     color: '#8B5CF6', emoji: '🎉' },
};

export default function AdminPage() {
  const { user, tg } = useTelegramWebApp();
  const ADMIN_ID = import.meta.env.VITE_ADMIN_ID || "999999999";
  
  const [tab, setTab] = useState('orders'); // 'orders' | 'menu' | 'analytics' | 'settings'
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [settings, setSettings] = useState({ is_open: true, closed_message: "" });
  const [loading, setLoading] = useState(true);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  const isActuallyAdmin = user?.id?.toString() === ADMIN_ID;

  // ── Load data ─────────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, menuRes, analyticsRes] = await Promise.all([
        getAdminOrders(),
        getMenu(),
        getAnalytics(),
      ]);
      setOrders(ordersRes.orders || []);
      setMenuItems(menuRes.items || []);
      setSettings(menuRes.settings || { is_open: true, closed_message: "" });
      setAnalytics(analyticsRes);
    } catch (err) {
      toast.error("Ma'lumot yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isActuallyAdmin) {
      loadInitialData();
    }
  }, [isActuallyAdmin, loadInitialData]);

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
      await toggleSoldOut(id, !current);
      setMenuItems(prev => prev.map(i => i.id === id ? { ...i, is_sold_out: !current } : i));
      toast.success(!current ? '🚫 Sold Out' : '✅ Mavjud');
    } catch { toast.error('Xatolik'); }
  };

  const handleToggleShop = async () => {
    const newState = !settings.is_open;
    try {
      await toggleShopStatus(newState);
      setSettings(prev => ({ ...prev, is_open: newState }));
      tg?.showAlert(newState ? "✅ Oshxona ochildi!" : "🔴 Oshxona yopildi!");
    } catch { toast.error('Xatolik yuz berdi'); }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return toast.error("Xabar matnini kiriting");
    
    tg?.showConfirm("Barcha foydalanuvchilarga xabar yuborilsinmi?", async (yes) => {
      if (!yes) return;
      
      setBroadcasting(true);
      try {
        const res = await triggerBroadcast(broadcastMessage);
        tg?.showAlert(`📢 Xabar yuborildi!\n\nMuvaffaqiyatli: ${res.successCount}\nXatolik: ${res.failureCount}`);
        setBroadcastMessage("");
      } catch {
        toast.error("Xabar yuborishda xatolik");
      } finally {
        setBroadcasting(false);
      }
    });
  };

  if (!isActuallyAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '24px' }}>
        <div style={{ fontSize: '52px' }}>🚫</div>
        <h2>Siz admin emassiz</h2>
        <button className="btn btn-primary" onClick={() => window.location.href = '/'}>
          Bosh sahifaga qaytish
        </button>
      </div>
    );
  }

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
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { id: 'orders', label: '📋 Buyurtmalar', count: orders.filter(o => !['confirmed','rejected','delivered'].includes(o.status)).length },
            { id: 'menu', label: '🍽 Menyu' },
            { id: 'analytics', label: '📈 Analitika' },
            { id: 'settings', label: '⚙️ Sozlamalar' },
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
                whiteSpace: 'nowrap'
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

        <AnimatePresence mode="wait">
          {/* ── ORDERS TAB ── */}
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

                      {order.payment_screenshot && (
                        <div style={{ marginBottom: '10px' }}>
                          <span className={`badge ${order.ai_verified ? 'badge-success' : 'badge-sky'}`} style={{ fontSize: '11px' }}>
                            {order.ai_verified ? '🤖 AI tasdiqladi' : '⏳ AI tekshirmoqda'}
                            {order.ai_amount ? ` · ${won(order.ai_amount)}` : ''}
                          </span>
                        </div>
                      )}

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
                        </div>
                      )}
                      {order.status === 'confirmed' && (
                        <button
                          className="btn btn-secondary"
                          style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                          onClick={() => handleStatus(order.id, 'delivered')}
                        >
                          🎉 Yetkazildi
                        </button>
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
                    style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', opacity: item.is_sold_out ? 0.6 : 1 }}
                  >
                    <span style={{ fontSize: '24px', flexShrink: 0 }}>{item.emoji || '🍽️'}</span>
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
                        background: !item.is_sold_out ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)',
                        color: !item.is_sold_out ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {item.is_sold_out ? '🚫 Tugadi' : '✅ Bor'}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── ANALYTICS TAB ── */}
          {tab === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Tasdiqlanganlar', value: orders.filter(o => ['confirmed','delivered'].includes(o.status)).length, emoji: '✅' },
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
                </div>
              )}

              {analytics?.topItems?.length > 0 && (
                <div className="glass-card" style={{ padding: '16px', marginTop: '12px' }}>
                  <h3 style={{ marginBottom: '14px', fontSize: '14px' }}>🏆 Eng ko'p buyurtmalar (7 kun)</h3>
                  {analytics.topItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '20px', fontWeight: 700 }}>#{idx + 1}</span>
                      <div style={{ flex: 1, fontSize: '13px' }}>{item.name_uz}</div>
                      <span className="badge badge-gold">{item.total_qty} ta</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── SETTINGS TAB ── */}
          {tab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Shop Control */}
                <div className="glass-card" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>🏬 Oshxona holati</h3>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: settings.is_open ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                        Hozir: {settings.is_open ? "OCHIQ" : "YOPIQ"}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Mijozlar buyurtma berish imkoniyati
                      </div>
                    </div>
                    <button 
                      onClick={handleToggleShop}
                      className={settings.is_open ? "btn btn-danger" : "btn btn-success"}
                      style={{ padding: '10px 20px', fontSize: '13px' }}
                    >
                      {settings.is_open ? "Yopish 🔴" : "Ochish ✅"}
                    </button>
                  </div>
                </div>

                {/* Broadcast Tool */}
                <div className="glass-card" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>📢 Xabar yuborish</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Barcha foydalanuvchilarga ommaviy xabar yuborish.
                  </p>
                  <textarea 
                    className="input"
                    rows="4"
                    placeholder="Xabar matni..."
                    value={broadcastMessage}
                    onChange={e => setBroadcastMessage(e.target.value)}
                    style={{ marginBottom: '16px', fontSize: '14px', resize: 'none' }}
                  />
                  <button 
                    className="btn btn-primary btn-full"
                    onClick={handleBroadcast}
                    disabled={broadcasting || !broadcastMessage.trim()}
                    style={{ background: 'var(--accent-sky)' }}
                  >
                    {broadcasting ? "Yuborilmoqda..." : "Barchaga yuborish 🚀"}
                  </button>
                </div>
                
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                   <button className="btn btn-secondary" onClick={() => window.location.href = '/'}>
                      Tizimdan chiqish
                   </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
