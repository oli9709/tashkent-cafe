import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { uploadPayment } from '../api';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import useCartStore from '../store/cartStore';

const won = (n) => `${Number(n).toLocaleString('ko-KR')}₩`;

export default function PaymentPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user, haptic } = useTelegramWebApp();
  const { clear } = useCartStore();

  const { orderId, total, bankAccount, bankOwner } = state || {};

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) { toast.error("Iltimos, skrinshot tanlang"); return; }
    if (!user?.id) { toast.error("Foydalanuvchi topilmadi"); return; }

    setUploading(true);
    haptic?.('medium');

    try {
      await uploadPayment(orderId, file, user.id);
      setUploaded(true);
      haptic?.('success');
      
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.showAlert('✅ Skrinshot yuborildi! Admin tasdiqlashini kuting.', () => {
          clear();
          tg.close();
        });
      } else {
        toast.success('✅ Skrinshot yuborildi!');
        clear();
        setTimeout(() => navigate('/'), 2000);
      }

    } catch (err) {
      const msg = "Yuklashda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.";
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.showAlert(msg);
      } else {
        toast.error(msg);
      }
      haptic?.('error');
    } finally {
      setUploading(false);
    }
  };

  /* ── Success screen ── */
  if (uploaded) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>✅</div>
        </motion.div>
        <h2 style={{ marginBottom: '10px' }}>Skrinshot qabul qilindi!</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '28px' }}>
          To'lovingiz <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>AI tomonidan tekshirilmoqda</span>.
          Natija tez orada yuboriladi.
        </p>
        <div className="glass-card-sm" style={{ padding: '14px 20px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🤖</span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Google Cloud Vision API orqali avtomatik tekshiriladi
          </span>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/')}>🏠 Bosh sahifaga</button>
      </div>
    );
  }

  return (
    <div className="page">
      {/* ── Header ── */}
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/cart')}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '22px', cursor: 'pointer', padding: '4px' }}
          >←</button>
          <h2>💳 To'lov</h2>
        </div>
      </header>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── Bank details ── */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '20px',
            border: '1px solid rgba(255,216,64,0.25)',
            background: 'rgba(255,216,64,0.04)',
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Bank ma'lumotlari
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Hisob raqami</span>
              <button
                onClick={() => { navigator.clipboard?.writeText(bankAccount); toast.success('Nusxalandi!', { duration: 1500 }); }}
                style={{
                  background: 'rgba(255,216,64,0.12)',
                  border: '1px solid rgba(255,216,64,0.3)',
                  borderRadius: '8px',
                  color: 'var(--accent-gold)',
                  fontSize: '14px',
                  fontWeight: 700,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  letterSpacing: '0.02em',
                }}
              >
                {bankAccount} 📋
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Qabul qiluvchi</span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{bankOwner}</span>
            </div>

            <div className="divider" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>To'lov summasi</span>
              <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-gold)' }}>{won(total)}</span>
            </div>
          </div>

          <div style={{
            marginTop: '14px',
            padding: '10px 12px',
            background: 'rgba(56,189,248,0.08)',
            border: '1px solid rgba(56,189,248,0.2)',
            borderRadius: '10px',
            fontSize: '12px',
            color: 'var(--accent-sky)',
            lineHeight: 1.6,
          }}>
            💡 Toss yoki KakaoBank orqali aynan <strong>{won(total)}</strong> ni yuboring
          </div>
        </motion.div>

        {/* ── Screenshot upload ── */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ padding: '20px' }}
        >
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            To'lov skrinshoti
          </div>

          {/* Upload area */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <AnimatePresence mode="wait">
            {!preview ? (
              <motion.button
                key="upload-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => fileRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '36px 20px',
                  border: '2px dashed var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--glass-bg-card)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: '40px' }}>📸</span>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Skrinshot yuklash</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>To'lov qilinganidan so'ngi tasvirni tanlang</span>
              </motion.button>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{ position: 'relative' }}
              >
                <img
                  src={preview}
                  alt="To'lov skrinshoti"
                  style={{
                    width: '100%',
                    maxHeight: '280px',
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(16,185,129,0.4)',
                  }}
                />
                <button
                  onClick={() => { setFile(null); setPreview(null); }}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(10,15,30,0.8)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── AI info ── */}
        <div className="glass-card-sm" style={{ padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '20px' }}>🤖</span>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Skrinshot <strong style={{ color: 'var(--text-primary)' }}>Google Cloud Vision AI</strong> orqali avtomatik tekshiriladi.
            Summa va qabul qiluvchi ism taqqoslanadi.
          </div>
        </div>

        {/* ── Submit button ── */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="btn btn-success btn-full"
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{ fontSize: '16px', padding: '16px' }}
        >
          {uploading
            ? <><div className="spinner" style={{ width: '18px', height: '18px', borderTopColor: '#fff' }} /> Yuklanmoqda...</>
            : '📤 Skrinshot yuborish'
          }
        </motion.button>

      </div>
    </div>
  );
}
