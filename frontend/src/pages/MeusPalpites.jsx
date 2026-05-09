import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    pendente: { label: '⏳ Aguardando', color: '#FF8C00', bg: 'rgba(255,140,0,0.12)',  border: 'rgba(255,140,0,0.25)'  },
    ganhou:   { label: '✅ Ganhou',     color: '#00C264', bg: 'rgba(0,194,100,0.12)',  border: 'rgba(0,194,100,0.25)'  },
    perdeu:   { label: '❌ Perdeu',     color: '#FF4545', bg: 'rgba(255,69,69,0.1)',   border: 'rgba(255,69,69,0.2)'   },
  };
  const s = map[status] || map.pendente;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: s.color,
      background: s.bg, border: `1px solid ${s.border}`,
      padding: '3px 10px', borderRadius: 20,
      whiteSpace: 'nowrap',
    }}>
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

  if (!usuario) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--texto-muted)' }}>
      Faça login para ver seus palpites.
    </div>
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(0,194,100,0.2)', borderTopColor: '#00C264', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ color: 'var(--texto-muted)', fontSize: 13 }}>Carregando palpites...</span>
    </div>
  );

  const total        = apostas.length;
  const ganhos       = apostas.filter(a => a.status === 'ganhou').length;
  const totalGanho   = apostas.filter(a => a.status === 'ganhou').reduce((s, a) => s + (a.premio || 0), 0);
  const totalApostado = apostas.reduce((s, a) => s + a.valor, 0);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <BookOpen size={22} style={{ color: '#FFD000' }} />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Meus Palpites</h1>
      </div>

      {/* Resumo — 2×2 no mobile, 4 em linha no desktop */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10, marginBottom: 20,
      }}>
        {[
          { label: 'Total de apostas',  val: total,                              color: '#fff'    },
          { label: 'Total apostado',    val: `R$ ${totalApostado.toFixed(2)}`,   color: '#FFD000' },
          { label: 'Apostas ganhas',    val: ganhos,                             color: '#00C264' },
          { label: 'Total em prêmios',  val: `R$ ${totalGanho.toFixed(2)}`,      color: '#00C264' },
        ].map(item => (
          <div key={item.label} className="card-golbet" style={{ textAlign: 'center', padding: '12px 10px' }}>
            <div style={{ fontSize: 11, color: 'var(--texto-muted)', marginBottom: 4, lineHeight: 1.3 }}>{item.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: item.color, letterSpacing: '-0.3px' }}>{item.val}</div>
          </div>
        ))}
      </div>

      {apostas.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 20px',
          background: 'rgba(0,0,0,0.2)', borderRadius: 12,
          border: '1px solid rgba(0,194,100,0.08)',
          color: 'var(--texto-muted)',
        }}>
          <BookOpen size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: 14 }}>Você ainda não fez nenhuma aposta.</p>
        </div>
      ) : (
        apostas.map(a => {
          const palpiteLabel = a.resultado === 'A'
            ? `${a.flag_a} ${a.time_a}`
            : a.resultado === 'B'
            ? `${a.flag_b} ${a.time_b}`
            : '🤝 Empate';

          return (
            <div key={a.id} className="card-golbet" style={{ marginBottom: 10, padding: '14px 14px 12px' }}>

              {/* Linha principal: jogo + status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                {/* Jogo */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700, fontSize: 14, lineHeight: 1.3,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {a.flag_a} {a.time_a}
                    <span style={{ color: 'var(--texto-muted)', fontWeight: 400, fontSize: 12, margin: '0 5px' }}>vs</span>
                    {a.time_b} {a.flag_b}
                  </div>
                </div>
                {/* Badge */}
                <div style={{ flexShrink: 0 }}>
                  <StatusBadge status={a.status} />
                </div>
              </div>

              {/* Palpite + valor */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px',
                background: a.status === 'ganhou'
                  ? 'rgba(0,194,100,0.08)'
                  : a.status === 'perdeu'
                  ? 'rgba(255,69,69,0.06)'
                  : 'rgba(255,208,0,0.06)',
                borderRadius: 8,
                border: a.status === 'ganhou'
                  ? '1px solid rgba(0,194,100,0.2)'
                  : a.status === 'perdeu'
                  ? '1px solid rgba(255,69,69,0.15)'
                  : '1px solid rgba(255,208,0,0.15)',
                marginBottom: 8,
                gap: 8,
              }}>
                <span style={{ fontSize: 13, color: 'var(--texto-sec)', minWidth: 0, flex: 1 }}>
                  Palpite:{' '}
                  <strong style={{ color: '#FFD000', display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                    {palpiteLabel}
                  </strong>
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, flexShrink: 0,
                  color: a.status === 'ganhou' ? '#00C264' : a.status === 'perdeu' ? '#FF4545' : '#FFD000',
                }}>
                  {a.status === 'ganhou'
                    ? `+R$ ${Number(a.premio).toFixed(2)}`
                    : `R$ ${Number(a.valor).toFixed(2)}`}
                </span>
              </div>

              {/* Expandir detalhes */}
              <button
                onClick={() => setExpandido(expandido === a.id ? null : a.id)}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--texto-muted)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontFamily: 'inherit', padding: 0,
                }}
              >
                {expandido === a.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {expandido === a.id ? 'Menos detalhes' : 'Ver detalhes'}
              </button>

              {expandido === a.id && (
                <div style={{
                  marginTop: 10, paddingTop: 10,
                  borderTop: '1px solid rgba(0,194,100,0.1)',
                  fontSize: 12, color: 'var(--texto-muted)',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <div>Status do jogo: <strong style={{ color: '#fff' }}>{a.jogo_status}</strong></div>
                    <div>Pote: <strong style={{ color: '#fff' }}>R$ {Number(a.pote_total || 0).toFixed(2)}</strong></div>
                    {a.premio > 0 && <div>Prêmio recebido: <strong style={{ color: '#00C264' }}>R$ {Number(a.premio).toFixed(2)}</strong></div>}
                    <div style={{ gridColumn: '1 / -1' }}>
                      Data: <strong style={{ color: '#fff' }}>{new Date(a.criado_em).toLocaleString('pt-BR')}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
