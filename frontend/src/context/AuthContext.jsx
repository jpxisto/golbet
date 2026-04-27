import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try { return JSON.parse(localStorage.getItem('golbet_usuario')) || null; }
    catch { return null; }
  });
  const [saldo, setSaldo] = useState(0);
  const [toasts, setToasts] = useState([]);

  const fetchSaldo = useCallback(async () => {
    if (!usuario?.id) return;
    try {
      const { data } = await axios.get(`/api/apostadores/${usuario.id}/saldo`);
      setSaldo(data.saldo);
    } catch {}
  }, [usuario?.id]);

  useEffect(() => {
    fetchSaldo();
    const interval = setInterval(fetchSaldo, 10000);
    return () => clearInterval(interval);
  }, [fetchSaldo]);

  function login(userData) {
    setUsuario(userData);
    setSaldo(userData.saldo || 0);
    localStorage.setItem('golbet_usuario', JSON.stringify(userData));
  }

  function logout() {
    setUsuario(null);
    setSaldo(0);
    localStorage.removeItem('golbet_usuario');
    localStorage.removeItem('golbet_admin');
  }

  function addToast(msg, tipo = 'sucesso') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, tipo }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  function removeToast(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  return (
    <AuthContext.Provider value={{ usuario, saldo, setSaldo, login, logout, fetchSaldo, toasts, addToast, removeToast }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
