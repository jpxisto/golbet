import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SaldoDisplay from './SaldoDisplay';

function GolbetLogo({ fontSize = 22 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1 }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {/* Soccer ball with motion lines */}
        <svg width={fontSize * 1.3} height={fontSize * 1.1} viewBox="0 0 32 28" fill="none">
          <line x1="2" y1="20" x2="14" y2="14" stroke="#00C264" strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>
          <line x1="0" y1="24" x2="12" y2="18" stroke="#00C264" strokeWidth="1.5" strokeLinecap="round" opacity="0.35"/>
          <circle cx="20" cy="12" r="9" fill="#fff"/>
          <circle cx="20" cy="12" r="9" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5"/>
          <path d="M20 5 L22.5 9 L27 9.5 L23.8 13 L24.8 17.5 L20 15 L15.2 17.5 L16.2 13 L13 9.5 L17.5 9 Z" fill="#1a1a1a" opacity="0.75"/>
        </svg>
      </div>
      <span style={{ fontSize, fontStyle: 'italic', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1 }}>
        <span style={{ color: '#fff' }}>Gol</span>
        <span style={{ color: '#FFD000' }}>bet</span>
      </span>
    </div>
  );
}

export default function Header({ sidebarOpen, setSidebarOpen, isMobile }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header style={{
      background: 'linear-gradient(180deg, #001F16 0%, #002318 100%)',
      borderBottom: '1px solid rgba(0, 194, 100, 0.2)',
      padding: '0 16px',
      height: 58,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
    }}>

      {/* Left: hamburger + logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', padding: 6, borderRadius: 6 }}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <GolbetLogo fontSize={22} />
        </Link>
        <span style={{
          display: 'none',
          fontSize: 10, color: 'rgba(255,208,0,0.7)',
          fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
          borderLeft: '1px solid rgba(0,194,100,0.2)', paddingLeft: 10, marginLeft: 2,
          lineHeight: 1.2,
          '@media(min-width:500px)': { display: 'block' }
        }}>
          Apostas & Palpites
        </span>
      </div>

      {/* Right */}
      {usuario && (
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8 }}>
          {/* Saldo */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,194,100,0.2)',
            borderRadius: 8, padding: isMobile ? '5px 8px' : '5px 10px',
          }}>
            <Wallet size={13} style={{ color: '#FFD000' }} />
            <SaldoDisplay />
          </div>

          {/* Nome — oculto em mobile para economizar espaço */}
          {!isMobile && (
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'rgba(255,208,0,0.1)', border: '1px solid rgba(255,208,0,0.2)',
              borderRadius: 8, padding: '5px 10px',
              fontSize: 13, fontWeight: 700, color: '#FFD000',
              maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {usuario.nome.split(' ')[0]}
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Sair"
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex',
              padding: 7, borderRadius: 8, transition: 'all 0.15s',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </header>
  );
}
