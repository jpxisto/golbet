import { NavLink } from 'react-router-dom';
import { Trophy, BookOpen, FileText, PlusCircle, MinusCircle, ShieldCheck, X, Clock } from 'lucide-react';

const links = [
  { to: '/', icon: <Trophy size={17} />, label: 'Jogos' },
  { to: '/longo-prazo', icon: <Clock size={17} />, label: 'Longo Prazo' },
  { to: '/palpites', icon: <BookOpen size={17} />, label: 'Meus Palpites' },
  { to: '/extrato', icon: <FileText size={17} />, label: 'Extrato' },
  { to: '/depositar', icon: <PlusCircle size={17} />, label: 'Depositar' },
  { to: '/sacar', icon: <MinusCircle size={17} />, label: 'Sacar' },
];

export default function Sidebar({ open, onClose, isMobile }) {
  const admin = localStorage.getItem('golbet_admin');
  const isVisible = !isMobile || open;

  return (
    <>
      {isMobile && open && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 98, backdropFilter: 'blur(2px)' }} />
      )}

      <aside style={{
        width: 220,
        background: 'linear-gradient(180deg, #001F16 0%, #001A12 100%)',
        borderRight: '1px solid rgba(0,194,100,0.12)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 58,
        left: 0,
        bottom: 0,
        zIndex: 99,
        transform: isVisible ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: isMobile && open ? '6px 0 32px rgba(0,0,0,0.5)' : 'none',
      }}>
        {isMobile && open && (
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(255,255,255,0.07)', border: 'none',
            color: '#fff', cursor: 'pointer', display: 'flex',
            borderRadius: 6, padding: 5,
          }}>
            <X size={16} />
          </button>
        )}

        {/* Nav label */}
        <div style={{ padding: '18px 16px 8px', fontSize: 10, fontWeight: 700, color: 'var(--texto-muted)', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
          Menu
        </div>

        <nav style={{ flex: 1 }}>
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              onClick={isMobile ? onClose : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '13px 16px',
                color: isActive ? '#FFD000' : 'rgba(255,255,255,0.65)',
                textDecoration: 'none',
                fontWeight: isActive ? 700 : 500,
                fontSize: 13.5,
                background: isActive ? 'rgba(255,208,0,0.07)' : 'transparent',
                borderLeft: isActive ? '3px solid #FFD000' : '3px solid transparent',
                transition: 'all 0.15s',
                margin: '1px 0',
              })}
            >
              <span style={{ opacity: 0.8 }}>{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Admin link */}
        {admin && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(0,194,100,0.1)' }}>
            <NavLink
              to="/admin"
              onClick={isMobile ? onClose : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: isActive ? '#FFD000' : 'rgba(255,255,255,0.4)',
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: 600,
                padding: '8px 0',
              })}
            >
              <ShieldCheck size={15} />
              Painel Admin
            </NavLink>
          </div>
        )}

        {/* Footer brand */}
        <div style={{ padding: '10px 16px 16px', borderTop: '1px solid rgba(0,194,100,0.08)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>
            GolBet
          </div>
        </div>
      </aside>
    </>
  );
}
