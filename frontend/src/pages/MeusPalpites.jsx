import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    pendente: { label: '⏳ Aguardando', color: '#F57C00', bg: 'rgba(245,124,0,0.15)' },
    ganhou: { label: '✅ Ganhou', color: '#43A047', bg: 'rgba(67,160,71,0.15)' },
    perdeu: { label: '❌ Perdeu', color: '#E53935', bg: 'rgba(229,57,53,0.15)' },
  };
  const s = map[status] || map.pendente;
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color: s.color, background: s.bg, padding: '3px 10px', borderRadius: 10 }}>
      {s.label}
    </span>
  );
}

export default function MeusPalpites() {
  const { usuario } = useAuth();
  const [apostas, setApostas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null);

  useEffect(() => {
    if (!usuario) return;
    axios.get(`/api/jogos/apostas/minhas/${usuario.id}`)
      .then(r => setApostas(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [usuario?.id]);

  if (!usuario) return <div style={{ padding: 40, textAlign: 'center', color: '#B0BEC5' }}>Faça login para ver seus palpites.</div>;
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#B0BEC5' }}>Carregando...</div>;

  const total = apostas.length;
  const ganhos = apostas.filter(a => a.status === 'ganhou').length;
  const perdas = apostas.filter(a => a.status === 'perdeu').length;
  const totalGanho = apostas.filter(a => a.status === 'ganhou').reduce((s, a) => s + (a.premio || 0), 0);
  const totalApostado = apostas.reduce((s, a) => s + a.valor, 0);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <BookOpen size={22} style={{ color: '#F5D020' }} />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Meus Palpites</h1>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Total de apostas', val: total, color: '#fff' },
          { label: 'Apostado', val: `R$ ${totalApostado.toFixed(2)}`, color: '#F5D020' },
          { label: 'Ganhos', val: `${ganhos}`, color: '#43A047' },
          { label: 'Prêmios', val: `R$ ${totalGanho.toFixed(2)}`, color: '#43A047' },
        ].map(item => (
          <div key={item.label} className="card-golbet" style={{ textAlign: 'center', padding: '12px 10px' }}>
            <div style={{ fontSize: 11, color: '#B0BEC5', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.val}</div>
          </div>
        ))}
      </div>

      {apostas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#B0BEC5' }}>Você ainda não fez nenhuma aposta.</div>
      ) : (
        apostas.map(a => (
          <div key={a.id} className="card-golbet" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {a.flag_a} {a.time_a} vs {a.time_b} {a.flag_b}
                </div>
                <div style={{ fontSize: 12, color: '#B0BEC5', marginTop: 2 }}>
                  Palpite: <strong style={{ color: '#F5D020' }}>
                    {a.resultado === 'A' ? `${a.flag_a} ${a.time_a}` : a.resultado === 'B' ? `${a.flag_b} ${a.time_b}` : '🤝 Empate'}
                  </strong>
                  {' '}· R$ {Number(a.valor).toFixed(2)}
                </div>
                {a.status === 'ganhou' && (
                  <div style={{ fontSize: 13, color: '#43A047', fontWeight: 700, marginTop: 4 }}>
                    +R$ {Number(a.premio).toFixed(2)} 🎉
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <StatusBadge status={a.status} />
                <button onClick={() => setExpandido(expandido === a.id ? null : a.id)} style={{
                  background: 'none', border: 'none', color: '#B0BEC5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                }}>
                  {expandido === a.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  Detalhes
                </button>
              </div>
            </div>

            {expandido === a.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,135,79,0.3)', fontSize: 13, color: '#B0BEC5' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>Status do jogo: <strong style={{ color: '#fff' }}>{a.jogo_status}</strong></div>
                  <div>Pote total: <strong style={{ color: '#fff' }}>R$ {Number(a.pote_total || 0).toFixed(2)}</strong></div>
                  {a.odd_final && <div>Odd final: <strong style={{ color: '#F5D020' }}>×{Number(a.odd_final).toFixed(2)}</strong></div>}
                  {a.premio > 0 && <div>Prêmio: <strong style={{ color: '#43A047' }}>R$ {Number(a.premio).toFixed(2)}</strong></div>}
                  <div>Data: <strong style={{ color: '#fff' }}>{new Date(a.criado_em).toLocaleString('pt-BR')}</strong></div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
