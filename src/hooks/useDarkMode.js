import { useEffect, useState } from 'react';

export default function useDarkMode() {
  const getInitialMode = () => {
    if (typeof window === 'undefined') return 'light';
    
    // Se estiver no dashboard do Personal, sempre começar com modo claro
    if (window.location.pathname.includes('/personal/dashboard')) {
      return 'light';
    }
    
    const persisted = localStorage.getItem('theme');
    if (persisted) return persisted;
    return 'light'; // Light como padrão
  };

  const [theme, setTheme] = useState(getInitialMode);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return [theme, toggleTheme];
} 