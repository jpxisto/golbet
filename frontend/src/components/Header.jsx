import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SaldoDisplay from './SaldoDisplay';

export default function Header({ sidebarOpen, setSidebarOpen }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header style={{
      background: '#00563F',
      borderBottom: '2px solid #00874F',
      padding: '0 20px',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
    }}>
      {/* Left: hamburger + logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: 4 }}
          className="md:hidden"
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" stroke="#F5D020" strokeWidth="2" fill="#006B4E"/>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#006B4E"/>
              <path d="M12 4.5l2.1 4.3 4.7.68-3.4 3.32.8 4.7L12 15l-4.2 2.5.8-4.7L5.2 9.48l4.7-.68z" fill="#F5D020"/>
            </svg>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>GolBet</span>
          </div>
          <span style={{ fontSize: 10, color: '#F5D020', fontWeight: 600, letterSpacing: '0.5px' }}>Copa do Mundo Rolemberg</span>
        </Link>
      </div>

      {/* Right: saldo + user */}
      {usuario && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SaldoDisplay />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#B0BEC5', fontSize: 13 }}>
            <User size={15} />
            <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {usuario.nome.split(' ')[0]}
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            style={{ background: 'none', border: 'none', color: '#B0BEC5', cursor: 'pointer', display: 'flex', padding: 4 }}
          >
            <LogOut size={18} />
          </button>
        </div>
      )}
    </header>
  );
}
