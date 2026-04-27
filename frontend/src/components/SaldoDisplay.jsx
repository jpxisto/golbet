import { useAuth } from '../context/AuthContext';

export default function SaldoDisplay() {
  const { saldo } = useAuth();
  return (
    <span style={{
      background: 'rgba(245,208,32,0.15)',
      border: '1px solid #F5D020',
      borderRadius: 20,
      padding: '4px 14px',
      fontWeight: 700,
      fontSize: 14,
      color: '#F5D020',
      whiteSpace: 'nowrap',
    }}>
      💰 R$ {Number(saldo).toFixed(2)}
    </span>
  );
}
