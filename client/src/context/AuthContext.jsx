import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { http } from '../api/http.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('purc_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [theme, setTheme] = useState(() => localStorage.getItem('purc_theme') || 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('purc_theme', theme);
  }, [theme]);

  useEffect(() => {
    const token = localStorage.getItem('purc_token');
    if (!token) return undefined;

    let active = true;
    http.get('/auth/me')
      .then(({ data }) => {
        if (!active) return;
        localStorage.setItem('purc_user', JSON.stringify(data.user));
        setUser(data.user);
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem('purc_token');
        localStorage.removeItem('purc_user');
        setUser(null);
      });

    return () => {
      active = false;
    };
  }, []);

  async function login(email, password) {
    const { data } = await http.post('/auth/login', { email, password });
    localStorage.setItem('purc_token', data.token);
    localStorage.setItem('purc_user', JSON.stringify(data.user));
    setUser(data.user);
  }

  async function register(payload) {
    const { data } = await http.post('/auth/register', payload);
    localStorage.setItem('purc_token', data.token);
    localStorage.setItem('purc_user', JSON.stringify(data.user));
    setUser(data.user);
  }

  async function updateProfile(payload) {
    const { data } = await http.patch('/auth/profile', payload);
    if (data.token) localStorage.setItem('purc_token', data.token);
    localStorage.setItem('purc_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('purc_token');
    localStorage.removeItem('purc_user');
    setUser(null);
  }

  const value = useMemo(() => ({ user, login, register, logout, updateProfile, theme, setTheme }), [user, theme]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
