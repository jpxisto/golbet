import { useState } from 'react';

export default function OddButton({ label, selected, onClick, disabled }) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => !disabled && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      className={`odd-btn${selected ? ' odd-btn-selected' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        padding: '11px 6px',
        borderRadius: 9,
        background: selected
          ? 'linear-gradient(135deg, #FFD000 0%, #E6A800 100%)'
          : 'linear-gradient(135deg, #002B1C 0%, #001F14 100%)',
        border: selected
          ? '2px solid #FFD000'
          : '1.5px solid rgba(0,194,100,0.2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        minWidth: 0,
        flex: 1,
        transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'Inter, sans-serif',
        boxShadow: selected
          ? '0 4px 20px rgba(255,208,0,0.4), 0 0 0 1px rgba(255,208,0,0.15)'
          : 'none',
        transform: selected
          ? 'translateY(-2px)'
          : pressed
          ? 'scale(0.94)'
          : 'none',
      }}
    >
      <span style={{
        fontSize: 11,
        fontWeight: selected ? 800 : 600,
        color: selected ? '#000' : 'rgba(255,255,255,0.65)',
        textAlign: 'center',
        lineHeight: 1.2,
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        padding: '0 2px',
        letterSpacing: selected ? '-0.2px' : '0',
      }}>
        {label}
      </span>
      {selected && (
        <span style={{
          fontSize: 9,
          color: '#000',
          fontWeight: 900,
          letterSpacing: '0.8px',
          marginTop: 2,
          textTransform: 'uppercase',
        }}>
          ✓ ESCOLHIDO
        </span>
      )}
    </button>
  );
}
