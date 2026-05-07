import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Trophy, Lock, Clock, Users, Zap, ChevronDown, ChevronUp, X } from 'lucide-react';

// ── Componente de cada Mercado ─────────────────────────────────────────────────
function MercadoCard({ mercado, minhasApostas, onApostar }) {
  // minhasApostas: { [opcao]: aposta } — pode ser objeto vazio
  const { usuario } = useAuth();
  const aberto = mercado.status === 'aberto';
  const finalizado = !!mercado.resultado;
  const [expandido, setExpandido] = useState(false);

  const temApostas = Object.keys(minhasApostas).length > 0;

  const badgeStyle = aberto
    ? { color: '#00C264', background: 'rgba(0,194,100,0.12)', border: '1px solid rgba(0,194,100,0.25)' }
    : finalizado
    ? { color: '#FFD000', background: 'rgba(255,208,0,0.1)', border: '1px solid rgba(255,208,0,0.25)' }
    : { color: 'var(--texto-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' };

  const badgeLabel = aberto ? '🟢 Aberto' : finalizado ? '✅ Finalizado' : '🔒 Encerrado';

  return (
    <div style={{
      background: 'linear-gradient(160deg, var(--bg-card) 0%, var(--bg-deep) 100%)',
      borderRadius: 14,
      border: `1px solid ${aberto ? 'rgba(0,194,100,0.3)' : 'rgba(0,194,100,0.1)'}`,
      marginBottom: 14,
      overflow: 'hidden',
      boxShadow: aberto ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.3)',
    }}>
      {/* Topo */}
      <div style={{
        padding: '8px 14px',
        background: 'rgba(0,0,0,0.25)',
        borderBottom: '1px solid rgba(0,194,100,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--texto-muted)', fontWeight: 500 }}>
          <Trophy size={11} style={{ color: '#FFD000' }} />
          Longo Prazo
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 10px', ...badgeStyle }}>
          {badgeLabel}
        </span>
      </div>

      {/* Título e informações */}
      <div style={{ padding: '14px 14px 0' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px', lineHeight: 1.3 }}>
          {mercado.titulo}
        </h3>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--texto-muted)', marginBottom: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Users size={10} /> {mercado.num_apostadores || 0} apostas
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Trophy size={10} style={{ color: '#FFD000' }} />
            Pote: <strong style={{ color: '#FFD000', marginLeft: 2 }}>R$ {Number(mercado.pote_total || 0).toFixed(2)}</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock size={10} />
            {new Date(mercado.criado_em).toLocaleDateString('pt-BR')}
          </span>
        </div>

        {/* Resultado do mercado finalizado */}
        {finalizado && (
          <div style={{
            marginBottom: 12, padding: '8px 12px',
            background: 'rgba(0,194,100,0.1)', borderRadius: 8,
            border: '1px solid rgba(0,194,100,0.25)',
          }}>
            <span style={{ fontSize: 13, color: '#00C264', fontWeight: 700 }}>
              🏆 Campeão: {mercado.resultado}
            </span>
          </div>
        )}

        {/* Apostas existentes do usuário (pode ser mais de uma) */}
        {temApostas && (
          <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.values(minhasApostas).map(aposta => (
              <div key={aposta.id} style={{
                padding: '8px 12px', borderRadius: 8,
                background: aposta.status === 'ganhou'
                  ? 'rgba(0,194,100,0.1)'
                  : aposta.status === 'perdeu'
                  ? 'rgba(255,69,69,0.08)'
                  : 'rgba(255,208,0,0.07)',
                border: aposta.status === 'ganhou'
                  ? '1px solid rgba(0,194,100,0.25)'
                  : aposta.status === 'perdeu'
                  ? '1px solid rgba(255,69,69,0.2)'
                  : '1px solid rgba(255,208,0,0.2)',
                fontSize: 12,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ color: 'var(--texto-sec)' }}>
                  Seu palpite: <strong style={{ color: '#FFD000' }}>{aposta.opcao_escolhida}</strong>
                  {' · '}R$ {Number(aposta.valor).toFixed(2)}
                </span>
                <span>
                  {aposta.status === 'ganhou' && (
                    <span style={{ color: '#00C264', fontWeight: 700 }}>+R$ {Number(aposta.premio).toFixed(2)} ✅</span>
                  )}
                  {aposta.status === 'perdeu' && (
                    <span style={{ color: 'var(--vermelho)' }}>❌ Não acertou</span>
                  )}
                  {aposta.status === 'pendente' && (
                    <span style={{ color: '#FFD000' }}>⏳ Aguardando</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Botão expandir/recolher opções */}
        <button
          onClick={() => setExpandido(v => !v)}
          style={{
            width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,194,100,0.12)',
            borderRadius: 8, color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
            padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif', marginBottom: 10,
          }}
        >
          <span>{expandido ? 'Ocultar opções' : `Ver ${mercado.opcoes.length} opções`}</span>
          {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Lista de opções */}
        {expandido && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {mercado.opcoes.map(opcao => {
              const apostaOpcao = minhasApostas[opcao]; // aposta nesta opção específica (ou undefined)
              const eSelecionada = !!apostaOpcao;
              const eVencedora = finalizado && mercado.resultado === opcao;
              const podeApostar = aberto && usuario;

              return (
                <button
                  key={opcao}
                  disabled={!podeApostar}
                  onClick={() => podeApostar && onApostar(mercado, opcao, apostaOpcao?.valor)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 8,
                    cursor: !podeApostar ? 'default' : 'pointer',
                    background: eSelecionada
                      ? 'linear-gradient(135deg, rgba(255,208,0,0.18) 0%, rgba(255,208,0,0.08) 100%)'
                      : eVencedora
                      ? 'rgba(0,194,100,0.12)'
                      : 'rgba(0,0,0,0.25)',
                    border: eSelecionada
                      ? '2px solid rgba(255,208,0,0.5)'
                      : eVencedora
                      ? '1px solid rgba(0,194,100,0.4)'
                      : '1px solid rgba(0,194,100,0.12)',
                    opacity: (!aberto && !eSelecionada && !eVencedora) ? 0.5 : 1,
                    transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: eSelecionada || eVencedora ? 700 : 500, color: eSelecionada ? '#FFD000' : eVencedora ? '#00C264' : '#fff' }}>
                    {eVencedora && '🏆 '}
                    {eSelecionada && '✓ '}
                    {opcao}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {eSelecionada && (
                      <span style={{ fontSize: 11, color: '#FFD000', fontWeight: 600 }}>
                        R$ {Number(apostaOpcao.valor).toFixed(2)}
                        {aberto && <span style={{ color: 'rgba(255,208,0,0.6)', marginLeft: 4 }}>· editar</span>}
                      </span>
                    )}
                    {podeApostar && !eSelecionada && (
                      <span style={{ fontSize: 11, color: 'rgba(0,194,100,0.8)', fontWeight: 600 }}>Apostar →</span>
                    )}
                    {eVencedora && !eSelecionada && (
                      <span style={{ fontSize: 11, color: '#00C264', fontWeight: 600 }}>Vencedor</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Drawer de confirmação de aposta ───────────────────────────────────────────
function ApostaLongoPrazoDrawer({ mercado, opcaoSelecionada, valorInicial, onClose, onSucesso }) {
  const { usuario, saldo, fetchSaldo, addToast } = useAuth();
  const [valor, setValor] = useState(valorInicial ? String(valorInicial) : '');
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);
  const modoEdicao = !!valorInicial;

  if (!mercado || !opcaoSelecionada) return null;

  const valorNum = parseFloat(valor) || 0;
  const saldoEfetivo = modoEdicao ? saldo + (valorInicial || 0) : saldo;
  const saldoInsuficiente = valorNum > saldoEfetivo;
  const valorInvalido = valorNum < 5 || saldoInsuficiente;

  async function confirmarAposta() {
    setLoading(true);
    try {
      await axios.post(`/api/longo-prazo/${mercado.id}/apostar`, {
        apostador_id: usuario.id,
        opcao_escolhida: opcaoSelecionada,
        valor: valorNum,
      });
      fetchSaldo();
      addToast(
        modoEdicao
          ? `Aposta em "${opcaoSelecionada}" atualizada para R$ ${valorNum.toFixed(2)}! ✅`
          : `Aposta de R$ ${valorNum.toFixed(2)} em "${opcaoSelecionada}" registrada! 🎯`,
        'sucesso'
      );
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
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200,
        backdropFilter: 'blur(3px)', animation: 'fadeIn 0.2s ease',
      }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0,
        width: 360, maxWidth: '95vw',
        background: 'linear-gradient(180deg, #002318 0%, #001612 100%)',
        borderLeft: '1px solid rgba(0,194,100,0.2)',
        zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '-12px 0 60px rgba(0,0,0,0.7)',
        animation: 'drawerIn 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid rgba(0,194,100,0.12)', background: 'rgba(0,0,0,0.2)',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{modoEdicao ? 'Editar Aposta' : 'Aposta Longo Prazo'}</div>
            <div style={{ fontSize: 11, color: 'var(--texto-muted)', marginTop: 2 }}>Copa do Mundo Rolemberg</div>
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
          {/* Mercado */}
          <div style={{
            background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '12px 16px',
            border: '1px solid rgba(0,194,100,0.1)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: 'var(--texto-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mercado</div>
            <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>{mercado.titulo}</div>
          </div>

          {/* Opção escolhida */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,208,0,0.12) 0%, rgba(255,208,0,0.06) 100%)',
            border: '2px solid rgba(255,208,0,0.4)', borderRadius: 10, padding: '14px 16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: 'var(--texto-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Seu Palpite</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#FFD000', letterSpacing: '-0.3px' }}>
              🏆 {opcaoSelecionada}
            </div>
          </div>

          {/* Info pote */}
          <div style={{ fontSize: 12, color: 'var(--texto-muted)', textAlign: 'center' }}>
            Pote atual: <strong style={{ color: '#FFD000' }}>R$ {Number(mercado.pote_total || 0).toFixed(2)}</strong>
            {' · '}
            {mercado.num_apostadores || 0} apostas
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
                max={saldoEfetivo}
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
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
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
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
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
              <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--texto-sec)', marginBottom: 4, lineHeight: 1.5 }}>
                Confirmar <strong style={{ color: '#FFD000' }}>R$ {valorNum.toFixed(2)}</strong> em{' '}
                <strong style={{ color: '#fff' }}>{opcaoSelecionada}</strong>?
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

// ── Página principal ───────────────────────────────────────────────────────────
export default function LongoPrazo() {
  const { usuario } = useAuth();
  const [mercados, setMercados] = useState([]);
  const [minhasApostas, setMinhasApostas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(null); // { mercado, opcao, valorInicial? }

  const fetchData = useCallback(async () => {
    try {
      const [mercadosRes, apostasRes] = await Promise.all([
        axios.get('/api/longo-prazo'),
        usuario ? axios.get(`/api/longo-prazo/minhas/${usuario.id}`) : Promise.resolve({ data: [] }),
      ]);
      setMercados(mercadosRes.data);
      setMinhasApostas(apostasRes.data);
    } catch {}
    setLoading(false);
  }, [usuario?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Mapa de apostas por mercado: { [mercado_id]: { [opcao]: aposta } }
  const apostaMap = {};
  minhasApostas.forEach(a => {
    if (!apostaMap[a.mercado_id]) apostaMap[a.mercado_id] = {};
    apostaMap[a.mercado_id][a.opcao_escolhida] = a;
  });

  const abertos = mercados.filter(m => m.status === 'aberto').length;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(0,194,100,0.2)', borderTopColor: '#00C264', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ color: 'var(--texto-muted)', fontSize: 13 }}>Carregando mercados...</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      {/* Drawer de aposta */}
      {drawer && (
        <ApostaLongoPrazoDrawer
          mercado={drawer.mercado}
          opcaoSelecionada={drawer.opcao}
          valorInicial={drawer.valorInicial}
          onClose={() => setDrawer(null)}
          onSucesso={() => { setDrawer(null); fetchData(); }}
        />
      )}

      {/* Hero banner */}
      <div style={{
        background: 'linear-gradient(135deg, #002B1C 0%, #001F14 100%)',
        borderRadius: 14, border: '1px solid rgba(0,194,100,0.15)',
        padding: '18px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,208,0,0.07) 0%, transparent 70%)' }} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Trophy size={18} style={{ color: '#FFD000' }} />
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px' }}>
              Apostas de Longo Prazo
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--texto-muted)' }}>
            Aposte em mais de uma opção por mercado
          </p>
        </div>
        {abertos > 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: 'rgba(0,194,100,0.12)', border: '1px solid rgba(0,194,100,0.25)',
            borderRadius: 10, padding: '8px 14px', flexShrink: 0,
          }}>
            <span className="pulse-dot" style={{ marginBottom: 4 }} />
            <span style={{ fontSize: 22, fontWeight: 900, color: '#00C264', lineHeight: 1 }}>{abertos}</span>
            <span style={{ fontSize: 10, color: 'var(--texto-muted)', fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {abertos === 1 ? 'Aberto' : 'Abertos'}
            </span>
          </div>
        )}
      </div>

      {/* Banner login */}
      {!usuario && (
        <div style={{
          marginBottom: 18, padding: '12px 16px',
          background: 'linear-gradient(135deg, rgba(255,208,0,0.08) 0%, rgba(255,208,0,0.04) 100%)',
          border: '1px solid rgba(255,208,0,0.2)',
          borderRadius: 10, fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Zap size={16} style={{ color: '#FFD000', flexShrink: 0 }} />
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>
            <a href="/login" style={{ color: '#FFD000', fontWeight: 700, textDecoration: 'none' }}>Faça login</a>
            {' '}para apostar nos mercados de longo prazo
          </span>
        </div>
      )}

      {/* Mercados */}
      {mercados.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 20px',
          color: 'var(--texto-muted)',
          background: 'rgba(0,0,0,0.2)', borderRadius: 12,
          border: '1px solid rgba(0,194,100,0.08)',
        }}>
          <Lock size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: 14 }}>Nenhum mercado disponível no momento</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.6 }}>O admin criará os mercados em breve</p>
        </div>
      ) : (
        mercados.map(mercado => (
          <MercadoCard
            key={mercado.id}
            mercado={mercado}
            minhasApostas={apostaMap[mercado.id] || {}}
            onApostar={(m, opcao, valorExistente) => setDrawer({ mercado: m, opcao, valorInicial: valorExistente })}
          />
        ))
      )}
    </div>
  );
}
