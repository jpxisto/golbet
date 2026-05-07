import { useState, useEffect } from 'react';
import { Users, Lock, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';
import OddButton from './OddButton';
import ApostaDrawer from './ApostaDrawer';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG = {
  fechado:    { label: 'Fechado',         cls: 'badge-fechado',    icon: <Lock size={9} /> },
  aberto:     { label: 'Apostas Abertas', cls: 'badge-aberto',     icon: <span className="pulse-dot" /> },
  encerrado:  { label: 'Encerrado',       cls: 'badge-encerrado',  icon: <Lock size={9} /> },
  finalizado: { label: 'Finalizado',      cls: 'badge-finalizado', icon: <CheckCircle size={9} /> },
};

export default function JogoCard({ jogo: jogoInicial, minhaAposta }) {
  const { usuario } = useAuth();
  const [jogo, setJogo] = useState(jogoInicial);
  const [drawer, setDrawer] = useState(null);

  useEffect(() => {
    if (jogo.status !== 'aberto') return;
    const iv = setInterval(async () => {
      try { const { data } = await axios.get(`/api/jogos/${jogo.id}`); setJogo(data); } catch {}
    }, 10000);
    return () => clearInterval(iv);
  }, [jogo.id, jogo.status]);

  useEffect(() => { setJogo(jogoInicial); }, [jogoInicial]);

  const st = STATUS_CONFIG[jogo.status] || STATUS_CONFIG.fechado;
  const aberto = jogo.status === 'aberto';
  const finalizado = jogo.status === 'finalizado';

  function dataFormatada() {
    if (!jogo.data_hora) return '';
    const d = new Date(jogo.data_hora);
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
      + ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const apostaAtual = minhaAposta;

  return (
    <>
      <div style={{
        background: 'linear-gradient(160deg, var(--bg-card) 0%, var(--bg-deep) 100%)',
        borderRadius: 14,
        border: `1px solid ${aberto ? 'rgba(0,194,100,0.3)' : 'rgba(0,194,100,0.1)'}`,
        marginBottom: 12,
        overflow: 'hidden',
        boxShadow: aberto ? '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,194,100,0.1)' : '0 4px 16px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.2s',
      }}>
        {/* Top bar */}
        <div style={{
          padding: '8px 14px',
          background: 'rgba(0,0,0,0.25)',
          borderBottom: '1px solid rgba(0,194,100,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--texto-muted)', fontWeight: 500 }}>
            <span style={{ color: '#FFD000', fontSize: 12 }}>🏆</span>
            Copa do Mundo Rolemberg
          </div>
          <span className={`badge ${st.cls}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {st.icon} {st.label}
          </span>
        </div>

        {/* Main content */}
        <div style={{ padding: '14px 14px 10px' }}>

          {/* Teams row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            {/* Team A */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 30, lineHeight: 1, marginBottom: 5 }}>{jogo.flag_a}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{jogo.time_a}</div>
            </div>

            {/* VS */}
            <div style={{ textAlign: 'center', padding: '0 8px', flexShrink: 0 }}>
              <div style={{
                fontSize: 11, fontWeight: 800, color: 'var(--texto-muted)',
                letterSpacing: '1px', background: 'rgba(0,0,0,0.25)',
                borderRadius: 6, padding: '4px 8px', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                VS
              </div>
              {jogo.data_hora && (
                <div style={{ fontSize: 10, color: 'var(--texto-muted)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                  <Clock size={9} />
                  {dataFormatada()}
                </div>
              )}
            </div>

            {/* Team B */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 30, lineHeight: 1, marginBottom: 5 }}>{jogo.flag_b}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{jogo.time_b}</div>
            </div>
          </div>

          {/* Resultado se finalizado */}
          {finalizado && jogo.resultado && (
            <div style={{
              textAlign: 'center', padding: '7px 12px', marginBottom: 10,
              background: 'rgba(0,194,100,0.1)', borderRadius: 8,
              border: '1px solid rgba(0,194,100,0.25)',
            }}>
              <span style={{ fontSize: 12, color: '#00C264', fontWeight: 700 }}>
                ✅ {jogo.resultado === 'A'
                  ? `${jogo.flag_a} ${jogo.time_a} venceu`
                  : jogo.resultado === 'B'
                  ? `${jogo.flag_b} ${jogo.time_b} venceu`
                  : '🤝 Empate'}
              </span>
            </div>
          )}

          {/* Botões de resultado */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <OddButton
              label={`${jogo.flag_a} ${jogo.time_a}`}
              selected={apostaAtual?.resultado === 'A'}
              disabled={!aberto || !usuario}
              onClick={() => setDrawer('A')}
            />
            <OddButton
              label="🤝 Empate"
              selected={apostaAtual?.resultado === 'empate'}
              disabled={!aberto || !usuario}
              onClick={() => setDrawer('empate')}
            />
            <OddButton
              label={`${jogo.flag_b} ${jogo.time_b}`}
              selected={apostaAtual?.resultado === 'B'}
              disabled={!aberto || !usuario}
              onClick={() => setDrawer('B')}
            />
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: 8, borderTop: '1px solid rgba(0,194,100,0.08)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--texto-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={11} />
              {jogo.num_apostadores || 0} apostadores
            </span>
            <span style={{ fontSize: 11, color: 'var(--texto-sec)', fontWeight: 600 }}>
              Pote: <span style={{ color: '#FFD000', fontWeight: 700 }}>R$ {Number(jogo.pote_total || 0).toFixed(2)}</span>
            </span>
          </div>

          {/* Aposta do usuário */}
          {apostaAtual && (
            <div style={{
              marginTop: 8, padding: '8px 12px',
              background: apostaAtual.status === 'ganhou'
                ? 'rgba(0,194,100,0.1)'
                : apostaAtual.status === 'perdeu'
                ? 'rgba(255,69,69,0.08)'
                : 'rgba(255,208,0,0.07)',
              borderRadius: 8,
              border: apostaAtual.status === 'ganhou'
                ? '1px solid rgba(0,194,100,0.25)'
                : apostaAtual.status === 'perdeu'
                ? '1px solid rgba(255,69,69,0.2)'
                : '1px solid rgba(255,208,0,0.2)',
              fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ color: 'var(--texto-sec)' }}>
                Seu palpite: <strong style={{ color: '#FFD000' }}>
                  {apostaAtual.resultado === 'A'
                    ? `${jogo.flag_a} ${jogo.time_a}`
                    : apostaAtual.resultado === 'B'
                    ? `${jogo.flag_b} ${jogo.time_b}`
                    : '🤝 Empate'}
                </strong>
              </span>
              <span>
                {apostaAtual.status === 'ganhou' && (
                  <span style={{ color: '#00C264', fontWeight: 700 }}>+R$ {Number(apostaAtual.premio).toFixed(2)} ✅</span>
                )}
                {apostaAtual.status === 'perdeu' && (
                  <span style={{ color: 'var(--vermelho)' }}>❌ -R$ {Number(apostaAtual.valor).toFixed(2)}</span>
                )}
                {apostaAtual.status === 'pendente' && (
                  <span style={{ color: '#FFD000' }}>R$ {Number(apostaAtual.valor).toFixed(2)}</span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {drawer && (
        <ApostaDrawer
          jogo={jogo}
          resultadoSelecionado={drawer}
          onClose={() => setDrawer(null)}
          onSucesso={() => setDrawer(null)}
        />
      )}
    </>
  );
}
