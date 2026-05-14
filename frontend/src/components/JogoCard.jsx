import { useState, useEffect } from 'react';
import { Users, Lock, CheckCircle, Clock, X } from 'lucide-react';
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

// ── Drawer de aposta no artilheiro ─────────────────────────────────────────────
function ArtilheiroDrawer({ jogo, mercadoArt, opcaoSelecionada, valorInicial, onClose, onSucesso }) {
  const { usuario, saldo, fetchSaldo, addToast } = useAuth();
  const [valor, setValor] = useState(valorInicial ? String(valorInicial) : '');
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);
  const modoEdicao = !!valorInicial;

  if (!jogo || !opcaoSelecionada) return null;

  // Usa nome do jogador se definido, senão nome do time
  const nomeOpcao = opcaoSelecionada === 'A'
    ? (mercadoArt?.jogador_a || `${jogo.flag_a} ${jogo.time_a}`)
    : opcaoSelecionada === 'B'
    ? (mercadoArt?.jogador_b || `${jogo.flag_b} ${jogo.time_b}`)
    : '🤝 Empate';
  const valorNum = parseFloat(valor) || 0;
  const saldoEfetivo = modoEdicao ? saldo + (valorInicial || 0) : saldo;
  const saldoInsuficiente = valorNum > saldoEfetivo;
  const valorInvalido = valorNum < 5 || saldoInsuficiente;

  async function confirmar() {
    setLoading(true);
    try {
      await axios.post('/api/artilheiros/apostar', {
        jogo_id: jogo.id,
        apostador_id: usuario.id,
        opcao_escolhida: opcaoSelecionada,
        valor: valorNum,
      });
      fetchSaldo();
      addToast(`Artilheiro: R$ ${valorNum.toFixed(2)} em "${nomeOpcao}" registrado! ⚽`, 'sucesso');
      onSucesso();
      onClose();
    } catch (e) {
      addToast(e.response?.data?.erro || 'Erro ao apostar no artilheiro', 'erro');
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
          borderBottom: '1px solid rgba(0,194,100,0.12)', background: 'rgba(0,0,0,0.2)',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>⚽ {modoEdicao ? 'Editar Artilheiro' : 'Artilheiro'}</div>
            <div style={{ fontSize: 11, color: 'var(--texto-muted)', marginTop: 2 }}>
              {jogo.flag_a} {jogo.time_a} vs {jogo.time_b} {jogo.flag_b}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex',
            borderRadius: 8, padding: 7,
          }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Opção escolhida */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,208,0,0.12) 0%, rgba(255,208,0,0.06) 100%)',
            border: '2px solid rgba(255,208,0,0.4)', borderRadius: 10, padding: '14px 16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: 'var(--texto-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quem marca mais</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#FFD000', letterSpacing: '-0.5px' }}>
              {nomeOpcao}
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
                type="number" min={5} max={saldoEfetivo} step={0.01}
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
            <label style={{ fontSize: 11, color: 'var(--texto-muted)', display: 'block', marginBottom: 6, fontWeight: 600, letterSpacing: '0.5px' }}>VALORES RÁPIDOS</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[10, 20, 50].filter(v => v <= saldoEfetivo).map(v => (
                <button key={v} onClick={() => setValor(String(v))} style={{
                  flex: 1, padding: '8px 0',
                  background: valor === String(v) ? 'rgba(255,208,0,0.15)' : 'rgba(0,0,0,0.3)',
                  border: valor === String(v) ? '1.5px solid rgba(255,208,0,0.4)' : '1px solid rgba(0,194,100,0.15)',
                  borderRadius: 7, color: valor === String(v) ? '#FFD000' : 'rgba(255,255,255,0.6)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}>R$ {v}</button>
              ))}
              {saldoEfetivo >= 5 && (
                <button onClick={() => setValor(String(Math.floor(saldoEfetivo)))} style={{
                  flex: 1, padding: '8px 0',
                  background: valor === String(Math.floor(saldoEfetivo)) ? 'rgba(255,208,0,0.15)' : 'rgba(0,0,0,0.3)',
                  border: valor === String(Math.floor(saldoEfetivo)) ? '1.5px solid rgba(255,208,0,0.4)' : '1px solid rgba(0,194,100,0.15)',
                  borderRadius: 7, color: valor === String(Math.floor(saldoEfetivo)) ? '#FFD000' : 'rgba(255,255,255,0.6)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}>MAX</button>
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
              {modoEdicao ? 'ALTERAR APOSTA' : 'APOSTAR NO ARTILHEIRO'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--texto-sec)', marginBottom: 4, lineHeight: 1.5 }}>
                Confirmar <strong style={{ color: '#FFD000' }}>R$ {valorNum.toFixed(2)}</strong> em{' '}
                <strong style={{ color: '#fff' }}>{nomeOpcao}</strong>?
              </div>
              <button className="btn-amarelo" style={{ width: '100%', padding: '13px 0' }} onClick={confirmar} disabled={loading}>
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

// ── Card do jogo ───────────────────────────────────────────────────────────────
// ── Seção mercados extras inline ──────────────────────────────────────────────
function MercadosExtras({ jogo, usuario, onAposta }) {
  const [mercados, setMercados] = useState([]);

  async function fetchExtras() {
    try {
      const { data } = await axios.get(`/api/extras/jogo/${jogo.id}`, {
        headers: usuario ? { 'apostador-id': usuario.id } : {},
      });
      setMercados(data);
    } catch {}
  }

  useEffect(() => { fetchExtras(); }, [jogo.id, usuario?.id]);
  useEffect(() => {
    const iv = setInterval(fetchExtras, 60000);
    return () => clearInterval(iv);
  }, [jogo.id, usuario?.id]);

  if (mercados.length === 0) return null;

  const LABELS = {
    ambos_marcam: '⚽ Ambos Marcam?',
    mais_menos: '📊 Mais/Menos Gols',
    penaltis: '🎯 Pênaltis?',
  };
  const OPC_LABELS = {
    sim: 'Sim', nao: 'Não', mais: 'Mais', menos: 'Menos',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
      {mercados.map(m => {
        const aberto = m.status === 'aberto';
        const linhaLabel = m.tipo === 'mais_menos' ? ` (${m.linha})` : '';
        return (
          <div key={m.id} style={{
            borderRadius: 8, border: '1px solid rgba(0,194,100,0.12)',
            background: 'rgba(0,0,0,0.18)', padding: '8px 10px',
          }}>
            <div style={{ fontSize: 10, color: 'var(--texto-muted)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {LABELS[m.tipo] || m.tipo}{linhaLabel}
              {m.resultado && <span style={{ color: '#00C264', marginLeft: 6 }}>Resultado: {OPC_LABELS[m.resultado]}</span>}
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {m.opcoes.map(opc => {
                const selected = m.minhaAposta?.opcao_escolhida === opc;
                const vencedor = m.resultado === opc;
                const total = m.totais?.[opc] || 0;
                return (
                  <button key={opc}
                    disabled={!aberto || !usuario}
                    onClick={() => aberto && usuario && onAposta(m, opc)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 7, cursor: (!aberto || !usuario) ? 'default' : 'pointer',
                      background: selected ? 'linear-gradient(135deg, rgba(255,208,0,0.18),rgba(255,208,0,0.08))' : vencedor ? 'rgba(0,194,100,0.12)' : 'rgba(0,0,0,0.25)',
                      border: selected ? '2px solid rgba(255,208,0,0.5)' : vencedor ? '1px solid rgba(0,194,100,0.4)' : '1px solid rgba(0,194,100,0.12)',
                      color: selected ? '#FFD000' : vencedor ? '#00C264' : 'rgba(255,255,255,0.7)',
                      fontSize: 11, fontWeight: selected || vencedor ? 700 : 500, fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                  >
                    {vencedor ? '✅ ' : selected ? '✓ ' : ''}{OPC_LABELS[opc]}
                    {total > 0 && <span style={{ display: 'block', fontSize: 9, opacity: 0.6, marginTop: 2 }}>R$ {total.toFixed(0)}</span>}
                  </button>
                );
              })}
            </div>
            {m.minhaAposta && (
              <div style={{ fontSize: 10, color: 'rgba(255,208,0,0.8)', marginTop: 4 }}>
                Sua aposta: <strong>{OPC_LABELS[m.minhaAposta.opcao_escolhida]}</strong> · R$ {Number(m.minhaAposta.valor).toFixed(2)}
                {m.minhaAposta.status === 'ganhou' && <span style={{ color: '#00C264' }}> +R$ {Number(m.minhaAposta.premio).toFixed(2)} ✅</span>}
                {m.minhaAposta.status === 'perdeu' && <span style={{ color: 'var(--vermelho)' }}> ❌</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Drawer genérico para extras ───────────────────────────────────────────────
function ExtrasDrawer({ jogo, mercado, opcaoSelecionada, onClose, onSucesso }) {
  const { usuario, saldo, fetchSaldo, addToast } = useAuth();
  const valorInicial = mercado.minhaAposta?.opcao_escolhida === opcaoSelecionada ? mercado.minhaAposta?.valor : null;
  const [valor, setValor] = useState(valorInicial ? String(valorInicial) : '');
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);
  const modoEdicao = !!valorInicial;

  const OPC_LABELS = { sim: 'Sim', nao: 'Não', mais: 'Mais', menos: 'Menos' };
  const TIPO_LABELS = { ambos_marcam: 'Ambos Marcam', mais_menos: 'Mais/Menos Gols', penaltis: 'Pênaltis' };

  const valorNum = parseFloat(valor) || 0;
  const saldoEfetivo = modoEdicao ? saldo + (valorInicial || 0) : saldo;
  const saldoInsuficiente = valorNum > saldoEfetivo;
  const valorInvalido = valorNum < 5 || saldoInsuficiente;

  async function confirmar() {
    setLoading(true);
    try {
      await axios.post('/api/extras/apostar', {
        mercado_id: mercado.id,
        apostador_id: usuario.id,
        opcao_escolhida: opcaoSelecionada,
        valor: valorNum,
      });
      fetchSaldo();
      addToast(`${TIPO_LABELS[mercado.tipo]}: R$ ${valorNum.toFixed(2)} em "${OPC_LABELS[opcaoSelecionada]}" registrado!`, 'sucesso');
      onSucesso();
      onClose();
    } catch (e) {
      addToast(e.response?.data?.erro || 'Erro ao apostar', 'erro');
    }
    setLoading(false);
    setConfirmando(false);
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, backdropFilter: 'blur(3px)' }} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 380, maxWidth: '96vw',
        background: 'linear-gradient(180deg, #002318 0%, #001612 100%)',
        borderLeft: '1px solid rgba(0,194,100,0.22)', zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '-16px 0 64px rgba(0,0,0,0.75)', animation: 'drawerIn 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,194,100,0.12)', background: 'rgba(0,0,0,0.2)' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{TIPO_LABELS[mercado.tipo]}</div>
            <div style={{ fontSize: 11, color: 'var(--texto-muted)', marginTop: 2 }}>{jogo.flag_a} {jogo.time_a} vs {jogo.time_b} {jogo.flag_b}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', borderRadius: 8, padding: 7 }}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(255,208,0,0.12) 0%, rgba(255,208,0,0.06) 100%)', border: '2px solid rgba(255,208,0,0.4)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--texto-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Sua escolha</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#FFD000' }}>{OPC_LABELS[opcaoSelecionada]}</div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--texto-sec)', display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-muted)', fontSize: 14, fontWeight: 700 }}>R$</span>
              <input className="input-golbet" style={{ paddingLeft: 38, fontSize: 16, fontWeight: 700 }} type="number" min={5} max={saldoEfetivo} step={0.01} value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" />
            </div>
            <div style={{ fontSize: 12, color: saldoInsuficiente ? 'var(--vermelho)' : 'var(--texto-muted)', marginTop: 6 }}>
              {saldoInsuficiente ? 'Saldo insuficiente' : `Saldo: R$ ${Number(saldoEfetivo).toFixed(2)}`}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[10, 20, 50].filter(v => v <= saldoEfetivo).map(v => (
                <button key={v} onClick={() => setValor(String(v))} style={{ flex: 1, padding: '8px 0', background: valor === String(v) ? 'rgba(255,208,0,0.15)' : 'rgba(0,0,0,0.3)', border: valor === String(v) ? '1.5px solid rgba(255,208,0,0.4)' : '1px solid rgba(0,194,100,0.15)', borderRadius: 7, color: valor === String(v) ? '#FFD000' : 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>R$ {v}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 18px', borderTop: '1px solid rgba(0,194,100,0.12)', background: 'rgba(0,0,0,0.2)' }}>
          {!confirmando ? (
            <button className="btn-amarelo" style={{ width: '100%', fontSize: 15, padding: '14px 0' }} disabled={valorInvalido || valorNum === 0} onClick={() => setConfirmando(true)}>
              {modoEdicao ? 'ALTERAR APOSTA' : 'CONFIRMAR APOSTA'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--texto-sec)', marginBottom: 4 }}>
                Confirmar <strong style={{ color: '#FFD000' }}>R$ {valorNum.toFixed(2)}</strong> em <strong style={{ color: '#fff' }}>{OPC_LABELS[opcaoSelecionada]}</strong>?
              </div>
              <button className="btn-amarelo" style={{ width: '100%', padding: '13px 0' }} onClick={confirmar} disabled={loading}>{loading ? 'Processando...' : '✅ CONFIRMAR'}</button>
              <button className="btn-ghost" style={{ width: '100%', padding: '11px 0' }} onClick={() => setConfirmando(false)}>Cancelar</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Card do jogo ───────────────────────────────────────────────────────────────
export default function JogoCard({ jogo: jogoInicial, minhaAposta }) {
  const { usuario } = useAuth();
  const [jogo, setJogo] = useState(jogoInicial);
  const [drawer, setDrawer] = useState(null);
  const [artilheiro, setArtilheiro] = useState(null); // { mercado, minhaAposta }
  const [drawerArt, setDrawerArt] = useState(null);   // 'A' | 'empate' | 'B'
  const [drawerExtras, setDrawerExtras] = useState(null); // { mercado, opcao }

  // Busca mercado artilheiro
  async function fetchArtilheiro() {
    try {
      const { data } = await axios.get(`/api/artilheiros/${jogo.id}`, {
        headers: usuario ? { 'apostador-id': usuario.id } : {},
      });
      setArtilheiro(data);
    } catch {}
  }

  useEffect(() => { fetchArtilheiro(); }, [jogo.id, usuario?.id]);

  // Poll artilheiro a cada 60s independente do status do jogo
  // (para clientes verem nomes de jogadores e resultados assim que o admin atualizar)
  useEffect(() => {
    const iv = setInterval(fetchArtilheiro, 60000);
    return () => clearInterval(iv);
  }, [jogo.id, usuario?.id]);

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
        marginBottom: 14,
        overflow: 'hidden',
        boxShadow: aberto
          ? '0 6px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,194,100,0.1)'
          : '0 4px 16px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.25s',
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
            GolBet
          </div>
          <span className={`badge ${st.cls}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {st.icon} {st.label}
          </span>
        </div>

        {/* Main content */}
        <div style={{ padding: '16px 14px 12px' }}>

          {/* Teams row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16 }}>
            {/* Team A */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 6 }}>{jogo.flag_a}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.2px' }}>{jogo.time_a}</div>
            </div>

            {/* VS */}
            <div style={{ textAlign: 'center', padding: '0 6px', flexShrink: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 900, color: 'var(--texto-sec)',
                letterSpacing: '1.5px', background: 'rgba(0,0,0,0.3)',
                borderRadius: 7, padding: '5px 10px', border: '1px solid rgba(255,255,255,0.08)',
              }}>
                VS
              </div>
              {jogo.data_hora && (
                <div style={{ fontSize: 10, color: 'var(--texto-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                  <Clock size={9} />
                  {dataFormatada()}
                </div>
              )}
            </div>

            {/* Team B */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 6 }}>{jogo.flag_b}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.2px' }}>{jogo.time_b}</div>
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

          {/* Seção Artilheiro */}
          {artilheiro && artilheiro.mercado && (() => {
            const art = artilheiro.mercado;
            // Labels dos botões — usa nome do jogador se definido, senão nome do time
            const labelA = art.jogador_a || `${jogo.flag_a} ${jogo.time_a}`;
            const labelB = art.jogador_b || `${jogo.flag_b} ${jogo.time_b}`;
            const opcoes = [
              { key: 'A', label: labelA },
              { key: 'empate', label: '🤝 Empate' },
              { key: 'B', label: labelB },
            ];
            // Label da aposta existente do usuário
            const labelAposta = artilheiro.minhaAposta
              ? artilheiro.minhaAposta.opcao_escolhida === 'A' ? labelA
                : artilheiro.minhaAposta.opcao_escolhida === 'B' ? labelB
                : '🤝 Empate'
              : null;
            // Label do resultado
            const labelResultado = art.resultado === 'A' ? labelA : art.resultado === 'B' ? labelB : '🤝 Empate';

            return (
              <div style={{ marginBottom: 10, borderRadius: 10, border: '1px solid rgba(0,194,100,0.15)', background: 'rgba(0,0,0,0.22)', overflow: 'hidden' }}>
                <div style={{
                  padding: '7px 12px',
                  borderBottom: '1px solid rgba(0,194,100,0.1)',
                  background: 'rgba(0,0,0,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 12 }}>⚽</span>
                  <span style={{ fontSize: 10, color: 'var(--texto-sec)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Artilheiro — quem marca mais?
                  </span>
                </div>
                <div style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
                  {opcoes.map(({ key, label }) => {
                    const artAberto = art.status === 'aberto';
                    const minha = artilheiro.minhaAposta;
                    const selected = minha?.opcao_escolhida === key;
                    const vencedor = art.resultado === key;
                    return (
                      <button
                        key={key}
                        disabled={!artAberto || !usuario}
                        onClick={() => artAberto && usuario && setDrawerArt(key)}
                        style={{
                          flex: 1, padding: '7px 4px', borderRadius: 7,
                          cursor: (!artAberto || !usuario) ? 'default' : 'pointer',
                          background: selected
                            ? 'linear-gradient(135deg, rgba(255,208,0,0.18),rgba(255,208,0,0.08))'
                            : vencedor ? 'rgba(0,194,100,0.12)' : 'rgba(0,0,0,0.25)',
                          border: selected ? '2px solid rgba(255,208,0,0.5)' : vencedor ? '1px solid rgba(0,194,100,0.4)' : '1px solid rgba(0,194,100,0.12)',
                          color: selected ? '#FFD000' : vencedor ? '#00C264' : 'rgba(255,255,255,0.7)',
                          fontSize: 10, fontWeight: selected || vencedor ? 700 : 500,
                          transition: 'all 0.15s', fontFamily: 'inherit',
                          lineHeight: 1.3,
                        }}
                      >
                        {vencedor && !selected ? '✅ ' : selected ? '✓ ' : ''}{label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  {artilheiro.minhaAposta ? (
                    <span style={{ fontSize: 10, color: 'rgba(255,208,0,0.8)' }}>
                      Sua aposta: <strong>{labelAposta}</strong>
                      {' · '}R$ {Number(artilheiro.minhaAposta.valor).toFixed(2)}
                      {artilheiro.minhaAposta.status === 'ganhou' && <span style={{ color: '#00C264' }}> +R$ {Number(artilheiro.minhaAposta.premio).toFixed(2)} ✅</span>}
                      {artilheiro.minhaAposta.status === 'perdeu' && <span style={{ color: 'var(--vermelho)' }}> ❌</span>}
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, color: 'var(--texto-muted)' }}>
                      {art.status === 'aberto' ? (usuario ? 'Clique para apostar' : 'Faça login para apostar') : art.resultado ? `Artilheiro: ${labelResultado}` : 'Apostas encerradas'}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: 'var(--texto-muted)' }}>
                    Pote: <span style={{ color: '#FFD000', fontWeight: 700 }}>R$ {Number(art.pote_total || 0).toFixed(2)}</span>
                  </span>
                </div>
                </div>{/* end padding div */}
              </div>
            );
          })()}

          {/* Mercados Extras */}
          <MercadosExtras jogo={jogo} usuario={usuario} onAposta={(m, opc) => setDrawerExtras({ mercado: m, opcao: opc })} />

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: 10, borderTop: '1px solid rgba(0,194,100,0.08)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--texto-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={11} />
              {jogo.num_apostadores || 0} apostadores
            </span>
            <span style={{ fontSize: 12, color: 'var(--texto-sec)', fontWeight: 600, display: 'flex', alignItems: 'baseline', gap: 4 }}>
              Pote:
              <span style={{ color: '#FFD000', fontWeight: 800, fontSize: 14, letterSpacing: '-0.3px' }}>
                R$ {Number(jogo.pote_total || 0).toFixed(2)}
              </span>
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

      {/* Drawer do resultado do jogo */}
      {drawer && (
        <ApostaDrawer
          jogo={jogo}
          resultadoSelecionado={drawer}
          onClose={() => setDrawer(null)}
          onSucesso={() => setDrawer(null)}
          valorInicial={apostaAtual?.resultado === drawer ? apostaAtual?.valor : undefined}
          modoEdicao={apostaAtual?.resultado === drawer}
        />
      )}

      {/* Drawer do artilheiro */}
      {drawerArt && (
        <ArtilheiroDrawer
          jogo={jogo}
          mercadoArt={artilheiro?.mercado}
          opcaoSelecionada={drawerArt}
          valorInicial={artilheiro?.minhaAposta?.opcao_escolhida === drawerArt ? artilheiro?.minhaAposta?.valor : undefined}
          onClose={() => setDrawerArt(null)}
          onSucesso={() => { setDrawerArt(null); fetchArtilheiro(); }}
        />
      )}

      {/* Drawer de mercados extras */}
      {drawerExtras && (
        <ExtrasDrawer
          jogo={jogo}
          mercado={drawerExtras.mercado}
          opcaoSelecionada={drawerExtras.opcao}
          onClose={() => setDrawerExtras(null)}
          onSucesso={() => setDrawerExtras(null)}
        />
      )}
    </>
  );
}
