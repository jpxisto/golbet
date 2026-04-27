import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function ApostaDrawer({ jogo, resultadoSelecionado, odd, onClose, onSucesso }) {
  const { usuario, saldo, fetchSaldo, addToast } = useAuth();
  const [valor, setValor] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!jogo || !resultadoSelecionado) return null;

  const nomeResultado = resultadoSelecionado === 'A' ? jogo.time_a : resultadoSelecionado === 'B' ? jogo.time_b : 'Empate';
  const flagResultado = resultadoSelecionado === 'A' ? jogo.flag_a : resultadoSelecionado === 'B' ? jogo.flag_b : '🤝';
  const valorNum = parseFloat(valor) || 0;
  const premioEstimado = valorNum * (odd || 0);
  const saldoInsuficiente = valorNum > saldo;
  const valorInvalido = valorNum < 5 || saldoInsuficiente;

  async function confirmarAposta() {
    setLoading(true);
    try {
      const { data } = await axios.post(`/api/jogos/${jogo.id}/apostar`, {
        apostador_id: usuario.id,
        resultado: resultadoSelecionado,
        valor: valorNum,
      });
      fetchSaldo();
      addToast(`Aposta de R$ ${valorNum.toFixed(2)} registrada! 🎯`, 'sucesso');
      onSucesso();
      onClose();
    } catch (e) {
      addToast(e.response?.data?.erro || 'Erro ao fazer aposta', 'erro');
    }
    setLoading(false);
    setConfirmando(false);
  }

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 340, maxWidth: '95vw',
        background: '#004A35', borderLeft: '2px solid #00874F',
        zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
        animation: 'drawerIn 0.25s ease',
      }}>
        <style>{`@keyframes drawerIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,135,79,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Fazer Aposta</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#B0BEC5', cursor: 'pointer', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Jogo */}
          <div style={{ background: '#003D2B', borderRadius: 8, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#B0BEC5', marginBottom: 8 }}>🏆 Copa do Mundo Rolemberg</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {jogo.flag_a} {jogo.time_a} <span style={{ color: '#B0BEC5', fontWeight: 400 }}>vs</span> {jogo.time_b} {jogo.flag_b}
            </div>
          </div>

          {/* Resultado selecionado */}
          <div style={{ background: 'rgba(245,208,32,0.15)', border: '2px solid #F5D020', borderRadius: 8, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#B0BEC5', marginBottom: 4 }}>Seu palpite</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#F5D020' }}>
              {flagResultado} {nomeResultado}
            </div>
            <div style={{ fontSize: 13, color: '#B0BEC5', marginTop: 4 }}>
              Odd estimada: <strong style={{ color: '#F5D020' }}>×{(odd || 0).toFixed(2)}</strong>
            </div>
          </div>

          {/* Aviso odd */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.3)', borderRadius: 6, padding: 10 }}>
            <AlertTriangle size={14} style={{ color: '#E53935', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: '#B0BEC5' }}>Odd estimada — pode mudar até o encerramento das apostas</span>
          </div>

          {/* Valor */}
          <div>
            <label style={{ fontSize: 13, color: '#B0BEC5', display: 'block', marginBottom: 6 }}>Valor da aposta</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#B0BEC5', fontSize: 14 }}>R$</span>
              <input
                className="input-golbet"
                style={{ paddingLeft: 36 }}
                type="number"
                min={5}
                max={saldo}
                step={1}
                value={valor}
                onChange={e => setValor(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div style={{ fontSize: 12, color: saldoInsuficiente ? '#E53935' : '#B0BEC5', marginTop: 4 }}>
              Saldo disponível: R$ {Number(saldo).toFixed(2)}
            </div>
            {valorNum >= 5 && !saldoInsuficiente && (
              <div style={{ fontSize: 13, color: '#43A047', marginTop: 6 }}>
                Prêmio estimado: <strong>R$ {premioEstimado.toFixed(2)}</strong>
              </div>
            )}
          </div>

          {/* Botões rápidos */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[10, 20, 50].filter(v => v <= saldo).map(v => (
              <button key={v} onClick={() => setValor(String(v))} style={{
                flex: 1, padding: '6px 0', background: 'rgba(0,135,79,0.3)', border: '1px solid #00874F',
                borderRadius: 6, color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
                R$ {v}
              </button>
            ))}
            <button onClick={() => setValor(String(Math.floor(saldo)))} style={{
              flex: 1, padding: '6px 0', background: 'rgba(0,135,79,0.3)', border: '1px solid #00874F',
              borderRadius: 6, color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>
              MAX
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: 20, borderTop: '1px solid rgba(0,135,79,0.4)' }}>
          {!confirmando ? (
            <button
              className="btn-amarelo"
              style={{ width: '100%', fontSize: 15, padding: '13px 0' }}
              disabled={valorInvalido || valorNum === 0}
              onClick={() => setConfirmando(true)}
            >
              FAZER APOSTA
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ textAlign: 'center', fontSize: 13, color: '#B0BEC5', marginBottom: 4 }}>
                Confirmar aposta de <strong style={{ color: '#F5D020' }}>R$ {valorNum.toFixed(2)}</strong> em <strong>{nomeResultado}</strong>?
              </div>
              <button className="btn-amarelo" style={{ width: '100%' }} onClick={confirmarAposta} disabled={loading}>
                {loading ? 'Processando...' : '✅ CONFIRMAR'}
              </button>
              <button onClick={() => setConfirmando(false)} style={{
                width: '100%', padding: '10px 0', background: 'transparent', border: '1px solid #B0BEC5',
                borderRadius: 6, color: '#B0BEC5', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
