import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FileText, TrendingUp, TrendingDown } from 'lucide-react';

const TIPO_CFG = {
  deposito: { icon: '💳', cor: '#00C264', sinal: '+', label: 'Depósito'   },
  aposta:   { icon: '🎯', cor: '#FF4545', sinal: '-', label: 'Aposta'     },
  premio:   { icon: '🏆', cor: '#00C264', sinal: '+', label: 'Prêmio'     },
  saque:    { icon: '💸', cor: '#FF8C00', sinal: '-', label: 'Saque'      },
};

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 640);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

export default function Extrato() {
  const { usuario } = useAuth();
  const isMobile = useIsMobile();
  const [movs, setMovs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    axios.get(`/api/apostadores/${usuario.id}/extrato`)
      .then(r => setMovs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [usuario?.id]);

  if (!usuario) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--texto-muted)' }}>
      Faça login para ver o extrato.
    </div>
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column', gap: 12 }}>
      <div className="spinner" />
      <span style={{ color: 'var(--texto-muted)', fontSize: 13 }}>Carregando extrato...</span>
    </div>
  );

  const listaOrdenada = [...movs].reverse();

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <FileText size={22} style={{ color: '#FFD000' }} />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Extrato</h1>
      </div>

      {movs.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 20px',
          background: 'rgba(0,0,0,0.2)', borderRadius: 12,
          border: '1px solid rgba(0,194,100,0.08)',
          color: 'var(--texto-muted)',
        }}>
          <FileText size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: 14 }}>Nenhuma movimentação ainda.</p>
        </div>
      ) : isMobile ? (
        /* ��─ Layout mobile: um card por transação ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {listaOrdenada.map((m, i) => {
            const t = TIPO_CFG[m.tipo] || { icon: '•', cor: '#fff', sinal: '', label: m.tipo };
            const positivo = m.valor >= 0;
            const data = new Date(m.data);
            return (
              <div key={i} style={{
                background: 'linear-gradient(160deg, var(--bg-card) 0%, var(--bg-deep) 100%)',
                border: '1px solid rgba(0,194,100,0.1)',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                {/* Ícone */}
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: positivo ? 'rgba(0,194,100,0.12)' : 'rgba(255,69,69,0.1)',
                  border: `1px solid ${positivo ? 'rgba(0,194,100,0.2)' : 'rgba(255,69,69,0.15)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>
                  {t.icon}
                </div>

                {/* Descrição */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.descricao}
                    {m.status === 'pendente' && <span style={{ color: '#FF8C00', fontSize: 12, marginLeft: 6 }}>⏳</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--texto-muted)', marginTop: 2 }}>
                    {data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    {' '}·{' '}
                    {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Valores */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontSize: 15, fontWeight: 800,
                    color: positivo ? '#00C264' : '#FF4545',
                    letterSpacing: '-0.3px',
                  }}>
                    {positivo ? '+' : '-'}R${Math.abs(m.valor).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--texto-muted)', marginTop: 2 }}>
                    Saldo: <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>R${Number(m.saldo || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Layout desktop: tabela ── */
        <div className="card-golbet" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '100px 1fr 110px 110px',
            gap: 8, padding: '10px 16px',
            background: 'rgba(0,0,0,0.3)',
            fontSize: 11, fontWeight: 700, color: 'var(--texto-muted)',
            borderBottom: '1px solid rgba(0,194,100,0.12)',
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            <span>Data</span>
            <span>Descrição</span>
            <span style={{ textAlign: 'right' }}>Valor</span>
            <span style={{ textAlign: 'right' }}>Saldo</span>
          </div>

          {listaOrdenada.map((m, i) => {
            const t = TIPO_CFG[m.tipo] || { icon: '•', cor: '#fff', sinal: '' };
            const positivo = m.valor >= 0;
            const data = new Date(m.data);
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '100px 1fr 110px 110px',
                gap: 8, padding: '12px 16px',
                borderBottom: i < listaOrdenada.length - 1 ? '1px solid rgba(0,194,100,0.08)' : 'none',
                fontSize: 13, alignItems: 'center',
                background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.1)',
              }}>
                <span style={{ color: 'var(--texto-muted)', fontSize: 12 }}>
                  {data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  <br />
                  <span style={{ fontSize: 11 }}>
                    {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </span>
                <span style={{ color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.icon} {m.descricao}
                  {m.status === 'pendente' && <span style={{ color: '#FF8C00', fontSize: 11, marginLeft: 6 }}>⏳</span>}
                </span>
                <span style={{ textAlign: 'right', fontWeight: 700, color: positivo ? '#00C264' : '#FF4545' }}>
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
