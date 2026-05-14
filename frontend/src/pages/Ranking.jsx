import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, Medal, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MEDALHAS = ['🥇', '🥈', '🥉'];

export default function Ranking() {
  const { usuario } = useAuth();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/apostadores/ranking')
      .then(r => setRanking(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: '#B0BEC5', textAlign: 'center', padding: 40 }}>Carregando ranking...</div>;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Trophy size={32} style={{ color: '#FFD000', marginBottom: 8 }} />
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900 }}>Ranking de Palpiteiros</h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--texto-muted)' }}>3 pontos por acerto em qualquer mercado</p>
      </div>

      {ranking.length === 0 ? (
        <div className="card-golbet" style={{ textAlign: 'center', padding: 32, color: 'var(--texto-muted)' }}>
          Nenhum apostador pontuou ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Top 3 podium */}
          {ranking.length >= 3 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {ranking.slice(0, 3).map((r, i) => (
                <div key={r.nome} className="card-golbet" style={{
                  flex: 1, textAlign: 'center', padding: '16px 8px',
                  border: i === 0 ? '2px solid rgba(255,208,0,0.4)' : '1px solid rgba(0,194,100,0.15)',
                  background: i === 0 ? 'linear-gradient(160deg, rgba(255,208,0,0.08) 0%, rgba(0,0,0,0.3) 100%)' : undefined,
                }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{MEDALHAS[i]}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4, lineHeight: 1.2 }}>
                    {r.nome}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#FFD000' }}>{r.pontos}</div>
                  <div style={{ fontSize: 10, color: 'var(--texto-muted)' }}>pontos</div>
                  <div style={{ fontSize: 10, color: 'var(--texto-muted)', marginTop: 4 }}>
                    {r.vitorias}V / {r.total_apostas}A ({r.taxa_acerto}%)
                  </div>
                  {r.total_premio > 0 && (
                    <div style={{ fontSize: 11, color: '#00C264', fontWeight: 600, marginTop: 2 }}>
                      R$ {Number(r.total_premio).toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Rest of ranking */}
          {ranking.slice(ranking.length >= 3 ? 3 : 0).map((r) => {
            const isMe = usuario && r.nome.toLowerCase() === usuario.nome?.toLowerCase();
            return (
              <div key={r.nome} className="card-golbet" style={{
                display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12,
                border: isMe ? '1.5px solid rgba(255,208,0,0.35)' : undefined,
                background: isMe ? 'rgba(255,208,0,0.04)' : undefined,
              }}>
                {/* Position */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,194,100,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: 'var(--texto-sec)', flexShrink: 0,
                }}>
                  {r.posicao}
                </div>

                {/* Name and stats */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isMe ? '#FFD000' : '#fff' }}>
                    {r.nome} {isMe && <span style={{ fontSize: 10, color: 'var(--texto-muted)' }}>(você)</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--texto-muted)' }}>
                    {r.vitorias} vitórias / {r.total_apostas} apostas · {r.taxa_acerto}% acerto
                  </div>
                </div>

                {/* Points */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#FFD000' }}>{r.pontos}</div>
                  <div style={{ fontSize: 9, color: 'var(--texto-muted)', textTransform: 'uppercase' }}>pts</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
