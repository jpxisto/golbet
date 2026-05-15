import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import Home from './pages/Home';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import MeusPalpites from './pages/MeusPalpites';
import LongoPrazo from './pages/LongoPrazo';
import Extrato from './pages/Extrato';
import Deposito from './pages/Deposito';
import Saque from './pages/Saque';
import Ranking from './pages/Ranking';
import Regras from './pages/Regras';
import Admin from './pages/Admin';

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

function AppShell() {
  const { usuario } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  // Fecha o sidebar automaticamente ao navegar (mobile)
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  if (!usuario) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} />
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar — overlay on mobile, fixed on desktop */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} isMobile={isMobile} />

        {/* Spacer so content doesn't go under fixed sidebar on desktop */}
        {!isMobile && <div style={{ width: 220, flexShrink: 0 }} />}

        <main
          className={isMobile ? 'with-bottom-nav' : ''}
          style={{
            flex: 1,
            padding: isMobile ? '14px 12px' : '24px 20px',
            minWidth: 0,
            overflowX: 'hidden',
          }}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/longo-prazo" element={<LongoPrazo />} />
            <Route path="/palpites" element={<MeusPalpites />} />
            <Route path="/extrato" element={<Extrato />} />
            <Route path="/depositar" element={<Deposito />} />
            <Route path="/sacar" element={<Saque />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/regras" element={<Regras />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/cadastro" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Bottom navigation — mobile only */}
      {isMobile && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toast />
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
