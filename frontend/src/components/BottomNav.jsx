import { NavLink } from 'react-router-dom';
import { Trophy, Clock, BookOpen, FileText, Wallet } from 'lucide-react';

const TABS = [
  { to: '/',            icon: Trophy,   label: 'Jogos'      },
  { to: '/longo-prazo', icon: Clock,    label: 'Longo Prazo'},
  { to: '/palpites',    icon: BookOpen, label: 'Palpites'   },
  { to: '/extrato',     icon: FileText, label: 'Extrato'    },
  { to: '/depositar',   icon: Wallet,   label: 'Carteira'   },
];

export default function BottomNav() {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 150,
      background: 'linear-gradient(180deg, #001A12 0%, #001612 100%)',
      borderTop: '1px solid rgba(0,194,100,0.18)',
      display: 'flex',
      alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom)',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
    }}>
      {TABS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            padding: '10px 4px 10px',
            textDecoration: 'none',
            color: isActive ? '#FFD000' : 'rgba(255,255,255,0.4)',
            fontSize: 10,
            fontWeight: isActive ? 700 : 500,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: isActive ? '-0.1px' : '0',
            transition: 'color 0.15s, transform 0.1s',
            position: 'relative',
          })}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 28,
                  height: 2,
                  borderRadius: '0 0 3px 3px',
                  background: '#FFD000',
                  boxShadow: '0 0 8px rgba(255,208,0,0.5)',
                }} />
              )}
              <Icon
                size={isActive ? 21 : 20}
                style={{
                  color: isActive ? '#FFD000' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.15s',
                }}
                strokeWidth={isActive ? 2.5 : 1.75}
              />
              <span style={{
                color: isActive ? '#FFD000' : 'rgba(255,255,255,0.4)',
                lineHeight: 1,
              }}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
