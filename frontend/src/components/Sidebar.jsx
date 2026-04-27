import { NavLink } from 'react-router-dom';
import { Trophy, BookOpen, FileText, PlusCircle, MinusCircle, ShieldCheck, X } from 'lucide-react';

const links = [
  { to: '/', icon: <Trophy size={18} />, label: 'Jogos' },
  { to: '/palpites', icon: <BookOpen size={18} />, label: 'Meus Palpites' },
  { to: '/extrato', icon: <FileText size={18} />, label: 'Extrato' },
  { to: '/depositar', icon: <PlusCircle size={18} />, label: 'Depositar' },
  { to: '/sacar', icon: <MinusCircle size={18} />, label: 'Sacar' },
];

export default function Sidebar({ open, onClose, isMobile }) {
  const admin = localStorage.getItem('golbet_admin');
  const isVisible = !isMobile || open;

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 98 }}
        />
      )}

      <aside style={{
        width: 240,
        background: '#00563F',
        borderRight: '1px solid rgba(0,135,79,0.4)',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 8,
        position: 'fixed',
        top: 60,
        left: 0,
        bottom: 0,
        zIndex: 99,
        transform: isVisible ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        boxShadow: isMobile && open ? '4px 0 20px rgba(0,0,0,0.3)' : 'none',
      }}>
        {/* Close button on mobile */}
        {isMobile && open && (
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#B0BEC5', cursor: 'pointer', display: 'flex' }}>
            <X size={20} />
          </button>
        )}

        <nav style={{ flex: 1, paddingTop: 8 }}>
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              onClick={isMobile ? onClose : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 20px',
                color: isActive ? '#F5D020' : '#fff',
                textDecoration: 'none',
                fontWeight: isActive ? 700 : 400,
                fontSize: 14,
                background: isActive ? 'rgba(245,208,32,0.1)' : 'transparent',
                borderLeft: isActive ? '3px solid #F5D020' : '3px solid transparent',
                transition: 'all 0.15s',
              })}
            >
              {l.icon}
              {l.label}
            </NavLink>
          ))}
        </nav>

        {admin && (
          <div style={{ padding: 16, borderTop: '1px solid rgba(0,135,79,0.3)' }}>
            <NavLink
              to="/admin"
              onClick={isMobile ? onClose : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: isActive ? '#F5D020' : '#B0BEC5',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600,
              })}
            >
              <ShieldCheck size={16} />
              Painel Admin
            </NavLink>
          </div>
        )}
      </aside>
    </>
  );
}
