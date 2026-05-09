import { useState } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function ApostaDrawer({ jogo, resultadoSelecionado, onClose, onSucesso, valorInicial, modoEdicao }) {
  const { usuario, saldo, fetchSaldo, addToast } = useAuth();
  const [valor, setValor] = useState(valorInicial ? String(valorInicial) : '');
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!jogo || !resultadoSelecionado) return null;

  const nomeResultado = resultadoSelecionado === 'A' ? jogo.time_a : resultadoSelecionado === 'B' ? jogo.time_b : 'Empate';
  const flagResultado = resultadoSelecionado === 'A' ? jogo.flag_a : resultadoSelecionado === 'B' ? jogo.flag_b : '🤝';
  const valorNum = parseFloat(valor) || 0;
  // Em modo edição, o saldo efetivo inclui o valor já apostado (será devolvido)
  const saldoEfetivo = modoEdicao ? saldo + (valorInicial || 0) : saldo;
  const saldoInsuficiente = valorNum > saldoEfetivo;
  const valorInvalido = valorNum < 5 || saldoInsuficiente;

  async function confirmarAposta() {
    setLoading(true);
    try {
      await axios.post(`/api/jogos/${jogo.id}/apostar`, {
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
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200,
        backdropFilter: 'blur(3px)', animation: 'fadeIn 0.2s ease',
      }} />

      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0,
        width: 380, maxWidth: '96vw',
        background: 'linear-gradient(180deg, #002318 0%, #001612 100%)',
        borderLeft: '1px solid rgba(0,194,100,0.22)',
        zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '-16px 0 64px rgba(0,0,0,0.75)',
        animation: 'drawerIn 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid rgba(0,194,100,0.12)',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{modoEdicao ? 'Editar Aposta' : 'Fazer Aposta'}</div>
            <div style={{ fontSize: 11, color: 'var(--texto-muted)', marginTop: 2 }}>Copa do Mundo Rolemberg</div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex',
            borderRadius: 8, padding: 7, transition: 'all 0.15s',
          }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Jogo */}
          <div style={{
            background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '12px 16px',
            border: '1px solid rgba(0,194,100,0.1)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px' }}>
              {jogo.flag_a} {jogo.time_a}
              <span style={{ color: 'var(--texto-muted)', fontWeight: 400, fontSize: 13, margin: '0 8px' }}>vs</span>
              {jogo.time_b} {jogo.flag_b}
            </div>
          </div>

          {/* Palpite escolhido */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,208,0,0.14) 0%, rgba(255,208,0,0.06) 100%)',
            border: '2px solid rgba(255,208,0,0.45)',
            borderRadius: 12, padding: '16px 16px', textAlign: 'center',
            boxShadow: '0 4px 20px rgba(255,208,0,0.12)',
          }}>
            <div style={{ fontSize: 10, color: 'rgba(255,208,0,0.6)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Seu Palpite</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#FFD000', letterSpacing: '-0.5px', lineHeight: 1.15 }}>
              {flagResultado} {nomeResultado}
            </div>
          </div>

          {/* Valor */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--texto-sec)', display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Valor da Aposta
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-muted)', fontSize: 14, fontWeight: 700 }}>R$</span>
              <input
                className="input-golbet"
                style={{ paddingLeft: 38, fontSize: 16, fontWeight: 700 }}
                type="number"
                min={5}
                max={saldo}
                step={0.01}
                value={valor}
                onChange={e => setValor(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div style={{ fontSize: 12, color: saldoInsuficiente ? 'var(--vermelho)' : 'var(--texto-muted)', marginTop: 6 }}>
              {saldoInsuficiente ? '⚠️ Saldo insuficiente' : `Saldo disponível: R$ ${Number(saldoEfetivo).toFixed(2)}`}
            </div>
          </div>

          {/* Valores rápidos */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--texto-muted)', display: 'block', marginBottom: 6, fontWeight: 600, letterSpacing: '0.5px' }}>
              VALORES RÁPIDOS
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[10, 20, 50].filter(v => v <= saldoEfetivo).map(v => (
                <button key={v} onClick={() => setValor(String(v))} style={{
                  flex: 1, padding: '8px 0',
                  background: valor === String(v) ? 'rgba(255,208,0,0.15)' : 'rgba(0,0,0,0.3)',
                  border: valor === String(v) ? '1.5px solid rgba(255,208,0,0.4)' : '1px solid rgba(0,194,100,0.15)',
                  borderRadius: 7, color: valor === String(v) ? '#FFD000' : 'rgba(255,255,255,0.6)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}>
                  R$ {v}
                </button>
              ))}
              {saldoEfetivo >= 5 && (
                <button onClick={() => setValor(String(Math.floor(saldoEfetivo)))} style={{
                  flex: 1, padding: '8px 0',
                  background: valor === String(Math.floor(saldoEfetivo)) ? 'rgba(255,208,0,0.15)' : 'rgba(0,0,0,0.3)',
                  border: valor === String(Math.floor(saldoEfetivo)) ? '1.5px solid rgba(255,208,0,0.4)' : '1px solid rgba(0,194,100,0.15)',
                  borderRadius: 7, color: valor === String(Math.floor(saldoEfetivo)) ? '#FFD000' : 'rgba(255,255,255,0.6)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}>
                  MAX
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 18px', borderTop: '1px solid rgba(0,194,100,0.12)', background: 'rgba(0,0,0,0.2)' }}>
          {!confirmando ? (
            <button
              className="btn-amarelo"
              style={{ width: '100%', fontSize: 15, padding: '14px 0', letterSpacing: '0.5px' }}
              disabled={valorInvalido || valorNum === 0}
              onClick={() => setConfirmando(true)}
            >
              {modoEdicao ? 'ALTERAR APOSTA' : 'FAZER APOSTA'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                textAlign: 'center', fontSize: 13, color: 'var(--texto-sec)',
                marginBottom: 4, lineHeight: 1.5,
              }}>
                Confirmar <strong style={{ color: '#FFD000' }}>R$ {valorNum.toFixed(2)}</strong> em{' '}
                <strong style={{ color: '#fff' }}>{nomeResultado}</strong>?
              </div>
              <button className="btn-amarelo" style={{ width: '100%', padding: '13px 0' }} onClick={confirmarAposta} disabled={loading}>
                {loading ? 'Processando...' : modoEdicao ? '✅ CONFIRMAR ALTERAÇÃO' : '✅ CONFIRMAR APOSTA'}
              </button>
              <button className="btn-ghost" style={{ width: '100%', padding: '11px 0' }} onClick={() => setConfirmando(false)}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
