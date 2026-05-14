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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column', gap: 12 }} role="status" aria-label="Carregando ranking">
      <div className="spinner" />
      <span style={{ color: 'var(--texto-muted)', fontSize: 13 }}>Carregando ranking...</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Trophy size={32} style={{ color: '#FFD000', marginBottom: 8 }} />
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900 }}>Ranking de Palpiteiros</h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--texto-muted)' }}>3 pontos por acerto em qualquer mercado</p>
      </div>

      {ranking.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: 'rgba(0,0,0,0.2)', borderRadius: 14,
          border: '1px solid rgba(0,194,100,0.08)',
        }}>
          <Trophy size={36} style={{ color: 'rgba(255,208,0,0.2)', marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 14, color: 'var(--texto-muted)' }}>Nenhum apostador pontuou ainda.</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>As pontuações aparecem após os resultados serem definidos.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Pódio top 3 — disposição 2º / 1º / 3º com alturas distintas */}
          {ranking.length >= 3 && (() => {
            // Reordena: [2º, 1º, 3º] para visual de pódio
            const podio = [ranking[1], ranking[0], ranking[2]];
            const alturas = [96, 128, 80]; // 2º, 1º, 3º
            const medalhas = ['🥈', '🥇', '🥉'];
            const idx = [1, 0, 2]; // índice original para MEDALHAS
            return (
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'flex-end' }}>
                {podio.map((r, col) => {
                  const orig = idx[col]; // 0=1º,1=2º,2=3º
                  const isFirst = orig === 0;
                  return (
                    <div key={r.nome} style={{
                      flex: 1, textAlign: 'center',
                      paddingTop: alturas[col] === 128 ? 20 : alturas[col] === 96 ? 14 : 10,
                      paddingBottom: 16,
                      paddingLeft: 8, paddingRight: 8,
                      borderRadius: 12,
                      background: isFirst
                        ? 'linear-gradient(160deg, rgba(255,208,0,0.13) 0%, rgba(0,0,0,0.35) 100%)'
                        : 'rgba(0,0,0,0.25)',
                      border: isFirst
                        ? '1.5px solid rgba(255,208,0,0.35)'
                        : '1px solid rgba(0,194,100,0.12)',
                      boxShadow: isFirst ? '0 8px 32px rgba(255,208,0,0.1)' : 'none',
                    }}>
                      <div style={{ fontSize: isFirst ? 36 : 26, marginBottom: 6, lineHeight: 1 }}>{medalhas[col]}</div>
                      <div style={{
                        fontSize: isFirst ? 13 : 11, fontWeight: 800,
                        color: isFirst ? '#FFD000' : '#fff',
                        marginBottom: 8, lineHeight: 1.3,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {r.nome.split(' ').slice(0, 2).join(' ')}
                      </div>
                      <div style={{ fontSize: isFirst ? 28 : 20, fontWeight: 900, color: isFirst ? '#FFD000' : 'var(--texto-sec)', lineHeight: 1 }}>
                        {r.pontos}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--texto-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>pts</div>
                      <div style={{ fontSize: 10, color: 'var(--texto-muted)', marginTop: 6 }}>
                        {r.taxa_acerto}% acerto
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

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
