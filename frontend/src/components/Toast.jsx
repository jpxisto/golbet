import { useAuth } from '../context/AuthContext';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function Toast() {
  const { toasts, removeToast } = useAuth();

  const icons = { sucesso: <CheckCircle size={18} />, erro: <AlertCircle size={18} />, info: <Info size={18} /> };
  const colors = { sucesso: '#43A047', erro: '#E53935', info: '#1976D2' };

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: '#1a2e24',
          border: `1px solid ${colors[t.tipo] || colors.sucesso}`,
          borderLeft: `4px solid ${colors[t.tipo] || colors.sucesso}`,
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minWidth: 280,
          maxWidth: 360,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          animation: 'slideIn 0.2s ease',
          color: '#fff',
          fontSize: 14,
        }}>
          <span style={{ color: colors[t.tipo] || colors.sucesso, flexShrink: 0 }}>{icons[t.tipo] || icons.sucesso}</span>
          <span style={{ flex: 1 }}>{t.msg}</span>
          <button onClick={() => removeToast(t.id)} style={{ background: 'none', border: 'none', color: '#B0BEC5', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
      ))}
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }`}</style>
    </div>
  );
}
