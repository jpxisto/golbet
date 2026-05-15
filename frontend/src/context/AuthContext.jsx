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
  const [notificacoes, setNotificacoes] = useState([]);
  const [notifsNaoLidas, setNotifsNaoLidas] = useState(0);

  const fetchSaldo = useCallback(async () => {
    if (!usuario?.id) return;
    try {
      const { data } = await axios.get(`/api/apostadores/${usuario.id}/saldo`);
      setSaldo(data.saldo);
    } catch {}
  }, [usuario?.id]);

  const fetchNotificacoes = useCallback(async () => {
    if (!usuario?.id) return;
    try {
      const { data } = await axios.get(`/api/apostadores/${usuario.id}/notificacoes`);
      const novas = data.filter(n => !n.lida);
      // Show toast for new wins
      if (novas.length > notifsNaoLidas && notifsNaoLidas >= 0) {
        const novissimas = novas.slice(0, novas.length - notifsNaoLidas);
        novissimas.forEach(n => {
          if (n.tipo === 'vitoria') addToast(n.mensagem, 'sucesso');
        });
      }
      setNotificacoes(data);
      setNotifsNaoLidas(novas.length);
    } catch {}
  }, [usuario?.id, notifsNaoLidas]);

  const marcarNotificacoesLidas = useCallback(async () => {
    if (!usuario?.id) return;
    try {
      await axios.patch(`/api/apostadores/${usuario.id}/notificacoes/ler`);
      setNotifsNaoLidas(0);
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: 1 })));
    } catch {}
  }, [usuario?.id]);

  useEffect(() => {
    fetchSaldo();
    fetchNotificacoes();
    const interval = setInterval(() => { fetchSaldo(); fetchNotificacoes(); }, 15000);
    return () => clearInterval(interval);
  }, [fetchSaldo, fetchNotificacoes]);

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
    <AuthContext.Provider value={{ usuario, saldo, setSaldo, login, logout, fetchSaldo, toasts, addToast, removeToast, notificacoes, notifsNaoLidas, marcarNotificacoesLidas }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
