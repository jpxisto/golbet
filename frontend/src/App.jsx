import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import Home from './pages/Home';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import MeusPalpites from './pages/MeusPalpites';
import Extrato from './pages/Extrato';
import Deposito from './pages/Deposito';
import Saque from './pages/Saque';
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
      <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Desktop sidebar — always rendered, shown via position */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} isMobile={isMobile} />

        {/* Spacer so content doesn't go under fixed sidebar on desktop */}
        {!isMobile && <div style={{ width: 240, flexShrink: 0 }} />}

        <main style={{ flex: 1, padding: '24px 20px', minWidth: 0, overflowX: 'hidden' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/palpites" element={<MeusPalpites />} />
            <Route path="/extrato" element={<Extrato />} />
            <Route path="/depositar" element={<Deposito />} />
            <Route path="/sacar" element={<Saque />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/cadastro" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
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
