import { useEffect, useState } from 'react';

/**
 * Hook to interface with Telegram WebApp SDK.
 * Falls back to mock data when running outside Telegram (dev mode).
 */
export function useTelegramWebApp() {
  const tg = window.Telegram?.WebApp;

  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [colorScheme, setColorScheme] = useState('dark');

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#0A0F1E');
      tg.setBackgroundColor('#0A0F1E');

      const initUser = tg.initDataUnsafe?.user;
      if (initUser) {
        setUser({
          id: String(initUser.id),
          name: [initUser.first_name, initUser.last_name].filter(Boolean).join(' '),
          username: initUser.username || null,
        });
      }

      setColorScheme(tg.colorScheme || 'dark');
      setIsReady(true);
    } else {
      // ── DEV MOCK ────────────────────────────────────────────
      console.warn('[TG] Running outside Telegram — using mock user');
      setUser({
        id: '999999999',
        name: 'Dev Foydalanuvchi',
        username: 'devuser',
      });
      setIsReady(true);
    }
  }, []);

  const showMainButton = (text, onClick) => {
    if (!tg) return;
    tg.MainButton.setText(text);
    tg.MainButton.show();
    tg.MainButton.onClick(onClick);
  };

  const hideMainButton = () => {
    if (!tg) return;
    tg.MainButton.hide();
    tg.MainButton.offClick();
  };

  const showBackButton = (onClick) => {
    if (!tg) return;
    tg.BackButton.show();
    tg.BackButton.onClick(onClick);
  };

  const hideBackButton = () => {
    if (!tg) return;
    tg.BackButton.hide();
    tg.BackButton.offClick();
  };

  const haptic = (type = 'light') => {
    tg?.HapticFeedback?.impactOccurred(type);
  };

  const close = () => {
    tg?.close();
  };

  return { tg, user, isReady, colorScheme, showMainButton, hideMainButton, showBackButton, hideBackButton, haptic, close };
}
