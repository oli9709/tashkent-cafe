import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import PaymentPage from './pages/PaymentPage';
import SuccessPage from './pages/SuccessPage';
import AdminPage from './pages/AdminPage';
import './styles/globals.css';

function AnimatedRoutes() {
  const location = useLocation();
  const isAdmin = new URLSearchParams(location.search).get('admin') === '1';

  if (isAdmin) return <AdminPage />;

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/"        element={<MenuPage />} />
        <Route path="/cart"    element={<CartPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/admin"   element={<AdminPage />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(15, 22, 40, 0.95)',
            color: '#F0F4FF',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '14px',
            backdropFilter: 'blur(20px)',
            fontFamily: "'Inter', sans-serif",
            fontSize: '14px',
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          },
          success: {
            iconTheme: { primary: '#10B981', secondary: '#F0F4FF' },
          },
          error: {
            iconTheme: { primary: '#F43F5E', secondary: '#F0F4FF' },
          },
        }}
      />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
