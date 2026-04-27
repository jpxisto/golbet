export default function OddButton({ label, odd, selected, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '10px 8px',
        borderRadius: 6,
        background: selected ? '#c9a800' : '#F5D020',
        border: selected ? '2px solid #fff' : '2px solid transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        minWidth: 80,
        flex: 1,
        transition: 'all 0.15s',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, color: '#003D2B', textAlign: 'center', lineHeight: 1.2 }}>
        {label}
      </span>
      <span style={{ fontSize: 16, fontWeight: 800, color: '#000' }}>
        {odd > 0 ? `×${odd.toFixed(2)}` : '—'}
      </span>
      {selected && <span style={{ fontSize: 10, color: '#003D2B', fontWeight: 700 }}>✅ ESCOLHIDO</span>}
    </button>
  );
}
