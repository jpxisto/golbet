export default function OddButton({ label, selected, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        padding: '10px 6px',
        borderRadius: 8,
        background: selected
          ? 'linear-gradient(135deg, #FFD000 0%, #E6A800 100%)'
          : 'linear-gradient(135deg, #002B1C 0%, #001F14 100%)',
        border: selected
          ? '2px solid #FFD000'
          : '1.5px solid rgba(0,194,100,0.2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        minWidth: 72,
        flex: 1,
        transition: 'all 0.15s',
        fontFamily: 'Inter, sans-serif',
        boxShadow: selected ? '0 4px 16px rgba(255,208,0,0.3)' : 'none',
        transform: selected ? 'translateY(-1px)' : 'none',
      }}
    >
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        color: selected ? '#000' : 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        lineHeight: 1.2,
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        padding: '0 2px',
      }}>
        {label}
      </span>
      {selected && (
        <span style={{ fontSize: 9, color: '#000', fontWeight: 800, letterSpacing: '0.5px', marginTop: 1 }}>
          ✓ ESCOLHIDO
        </span>
      )}
    </button>
  );
}
