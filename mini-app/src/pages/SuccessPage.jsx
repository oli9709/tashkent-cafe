import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const won = (n) => `${Number(n).toLocaleString('ko-KR')}₩`;

export default function SuccessPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { orderId, mode, total } = state || {};

  return (
    <div
      className="page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
        minHeight: '100dvh',
      }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 10, stiffness: 150 }}
        style={{ fontSize: '90px', marginBottom: '24px' }}
      >
        {mode === 'bozor' ? '🌅' : '✅'}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h1 style={{ marginBottom: '12px' }}>
          {mode === 'bozor' ? 'Buyurtma qabul qilindi!' : 'Rahmat!'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '28px' }}>
          {mode === 'bozor'
            ? <>Buyurtmangiz #<strong style={{ color: 'var(--accent-gold)' }}>{orderId}</strong> ro'yxatga qo'shildi.<br />
               Soat <strong>5:00–6:00</strong> da bozorga yetkazamiz.<br />
               To'lov yetkazib berilganda <strong>naqd pulda</strong>.</>
            : <>Buyurtmangiz #<strong style={{ color: 'var(--accent-gold)' }}>{orderId}</strong> qabul qilindi.<br />
               Admin tez orada tasdiqlaydi va tayyor bo'lganini bildiradi.</>
          }
        </p>

        <div
          className="glass-card-sm"
          style={{
            padding: '14px 20px',
            marginBottom: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '22px' }}>💰</span>
          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-gold)' }}>
            {won(total)}
          </span>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="btn btn-primary"
        onClick={() => navigate('/')}
        style={{ minWidth: '240px' }}
      >
        🏠 Menyuga qaytish
      </motion.button>
    </div>
  );
}
