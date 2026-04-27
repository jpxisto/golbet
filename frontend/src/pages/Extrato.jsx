import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FileText } from 'lucide-react';

const TIPO_LABEL = {
  deposito: { icon: '💳', color: '#43A047', label: 'Depósito' },
  aposta: { icon: '🎯', color: '#E53935', label: 'Aposta' },
  premio: { icon: '🏆', color: '#43A047', label: 'Prêmio' },
  saque: { icon: '💸', color: '#E53935', label: 'Saque' },
};

export default function Extrato() {
  const { usuario } = useAuth();
  const [movs, setMovs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    axios.get(`/api/apostadores/${usuario.id}/extrato`)
      .then(r => setMovs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [usuario?.id]);

  if (!usuario) return <div style={{ padding: 40, textAlign: 'center', color: '#B0BEC5' }}>Faça login para ver o extrato.</div>;
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#B0BEC5' }}>Carregando...</div>;

  return (
    <div style={{ maxWidth: 750, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <FileText size={22} style={{ color: '#F5D020' }} />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Extrato</h1>
      </div>

      {movs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#B0BEC5' }}>Nenhuma movimentação ainda.</div>
      ) : (
        <div className="card-golbet" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 100px 100px', gap: 8, padding: '10px 16px', background: '#003D2B', fontSize: 12, fontWeight: 700, color: '#B0BEC5', borderBottom: '1px solid rgba(0,135,79,0.3)' }}>
            <span>Data</span>
            <span>Descrição</span>
            <span style={{ textAlign: 'right' }}>Valor</span>
            <span style={{ textAlign: 'right' }}>Saldo</span>
          </div>

          {[...movs].reverse().map((m, i) => {
            const t = TIPO_LABEL[m.tipo] || {};
            const positivo = m.valor >= 0;
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '90px 1fr 100px 100px', gap: 8, padding: '11px 16px',
                borderBottom: i < movs.length - 1 ? '1px solid rgba(0,135,79,0.2)' : 'none',
                fontSize: 13, alignItems: 'center',
                background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.1)',
              }}>
                <span style={{ color: '#B0BEC5', fontSize: 12 }}>
                  {new Date(m.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  <br />
                  <span style={{ fontSize: 11 }}>{new Date(m.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
                <span style={{ color: '#fff' }}>
                  {t.icon} {m.descricao}
                  {m.status === 'pendente' && <span style={{ color: '#F57C00', fontSize: 11, marginLeft: 6 }}>⏳</span>}
                </span>
                <span style={{ textAlign: 'right', fontWeight: 700, color: positivo ? '#43A047' : '#E53935' }}>
                  {positivo ? '+' : ''}R$ {Math.abs(m.valor).toFixed(2)}
                </span>
                <span style={{ textAlign: 'right', color: '#fff', fontWeight: 600 }}>
                  R$ {Number(m.saldo || 0).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
