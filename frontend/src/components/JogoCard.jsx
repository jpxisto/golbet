import { useState, useEffect } from 'react';
import { Trophy, Users, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import OddButton from './OddButton';
import ApostaDrawer from './ApostaDrawer';
import { useAuth } from '../context/AuthContext';

const STATUS_LABEL = {
  fechado: { label: 'Fechado', color: '#757575' },
  aberto: { label: '● APOSTAS ABERTAS', color: '#43A047' },
  encerrado: { label: 'Encerrado', color: '#F57C00' },
  finalizado: { label: 'Finalizado', color: '#1976D2' },
};

const RESULTADO_LABEL = { A: 'time_a', empate: 'Empate', B: 'time_b' };

export default function JogoCard({ jogo: jogoInicial, minhaAposta }) {
  const { usuario } = useAuth();
  const [jogo, setJogo] = useState(jogoInicial);
  const [drawer, setDrawer] = useState(null); // resultado selecionado p/ abrir drawer
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (jogo.status !== 'aberto') return;
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(`/api/jogos/${jogo.id}`);
        setJogo(data);
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [jogo.id, jogo.status]);

  useEffect(() => { setJogo(jogoInicial); }, [jogoInicial]);

  const st = STATUS_LABEL[jogo.status] || STATUS_LABEL.fechado;
  const aberto = jogo.status === 'aberto';

  function dataFormatada() {
    if (!jogo.data_hora) return '';
    const d = new Date(jogo.data_hora);
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const apostaAtual = minhaAposta;

  return (
    <>
      <div className="card-golbet" style={{ marginBottom: 12 }}>
        {/* Header do card */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#B0BEC5' }}>
            <Trophy size={13} style={{ color: '#F5D020' }} />
            Copa do Mundo Rolemberg
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, color: st.color,
            background: `${st.color}22`, padding: '2px 8px', borderRadius: 10,
          }}>
            {st.label}
          </span>
        </div>

        <div style={{ fontSize: 12, color: '#B0BEC5', marginBottom: 12 }}>{dataFormatada()}</div>

        {/* Odds */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <OddButton
            label={`${jogo.flag_a} ${jogo.time_a}`}
            odd={jogo.odd_a || 0}
            selected={apostaAtual?.resultado === 'A'}
            disabled={!aberto || !usuario}
            onClick={() => setDrawer('A')}
          />
          <OddButton
            label="🤝 Empate"
            odd={jogo.odd_empate || 0}
            selected={apostaAtual?.resultado === 'empate'}
            disabled={!aberto || !usuario}
            onClick={() => setDrawer('empate')}
          />
          <OddButton
            label={`${jogo.flag_b} ${jogo.time_b}`}
            odd={jogo.odd_b || 0}
            selected={apostaAtual?.resultado === 'B'}
            disabled={!aberto || !usuario}
            onClick={() => setDrawer('B')}
          />
        </div>

        {/* Resultado se finalizado */}
        {jogo.status === 'finalizado' && jogo.resultado && (
          <div style={{ textAlign: 'center', padding: '6px 0', marginBottom: 8, background: 'rgba(67,160,71,0.15)', borderRadius: 6 }}>
            <span style={{ fontSize: 13, color: '#43A047', fontWeight: 700 }}>
              Resultado: {jogo.resultado === 'A' ? `${jogo.flag_a} ${jogo.time_a}` : jogo.resultado === 'B' ? `${jogo.flag_b} ${jogo.time_b}` : '🤝 Empate'}
            </span>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid rgba(0,135,79,0.3)' }}>
          <span style={{ fontSize: 12, color: '#B0BEC5', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={12} />
            {jogo.num_apostadores || 0} apostadores · Pote: <strong style={{ color: '#fff' }}> R$ {Number(jogo.pote_total || 0).toFixed(2)}</strong>
          </span>
          {aberto && (
            <span style={{ fontSize: 11, color: '#F57C00', display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={11} /> Odd estimada
            </span>
          )}
        </div>

        {/* Aposta do usuário */}
        {apostaAtual && (
          <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(245,208,32,0.1)', borderRadius: 6, border: '1px solid rgba(245,208,32,0.3)', fontSize: 12 }}>
            Sua aposta: <strong style={{ color: '#F5D020' }}>
              {apostaAtual.resultado === 'A' ? `${jogo.flag_a} ${jogo.time_a}` : apostaAtual.resultado === 'B' ? `${jogo.flag_b} ${jogo.time_b}` : '🤝 Empate'}
            </strong> · R$ {Number(apostaAtual.valor).toFixed(2)}
            {apostaAtual.status === 'ganhou' && <span style={{ color: '#43A047', marginLeft: 6 }}>✅ +R$ {Number(apostaAtual.premio).toFixed(2)}</span>}
            {apostaAtual.status === 'perdeu' && <span style={{ color: '#E53935', marginLeft: 6 }}>❌</span>}
          </div>
        )}
      </div>

      {drawer && (
        <ApostaDrawer
          jogo={jogo}
          resultadoSelecionado={drawer}
          odd={drawer === 'A' ? jogo.odd_a : drawer === 'B' ? jogo.odd_b : jogo.odd_empate}
          onClose={() => setDrawer(null)}
          onSucesso={() => { setRefresh(r => r + 1); setDrawer(null); }}
        />
      )}
    </>
  );
}
