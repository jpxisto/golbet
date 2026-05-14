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
      padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

const TIPO_LABEL = {
  jogo:        { icon: '⚽', label: 'Resultado do Jogo' },
  extra:       { icon: '📊', label: 'Mercado Extra' },
  longo_prazo: { icon: '🏆', label: 'Longo Prazo' },
  artilheiro:  { icon: '🥇', label: 'Artilheiro' },
};

const OPC_LABEL_EXTRA = { sim: 'Sim', nao: 'Não', mais: 'Mais gols', menos: 'Menos gols' };
const EXTRA_TIPO_LABEL = { ambos_marcam: 'Ambos Marcam', mais_menos: 'Mais/Menos Gols', penaltis: 'Pênaltis' };

function getPalpiteLabel(a) {
  if (a.tipo === 'jogo') {
    if (a.opcao_escolhida === 'A') return `${a.flag_a} ${a.time_a}`;
    if (a.opcao_escolhida === 'B') return `${a.flag_b} ${a.time_b}`;
    return '🤝 Empate';
  }
  if (a.tipo === 'extra') return OPC_LABEL_EXTRA[a.opcao_escolhida] || a.opcao_escolhida;
  if (a.tipo === 'longo_prazo') return a.opcao_escolhida;
  if (a.tipo === 'artilheiro') {
    if (a.opcao_escolhida === 'A') return a.jogador_a || `${a.flag_a} ${a.time_a}`;
    if (a.opcao_escolhida === 'B') return a.jogador_b || `${a.flag_b} ${a.time_b}`;
    return '🤝 Empate';
  }
  return a.opcao_escolhida;
}

function getContextLabel(a) {
  if (a.tipo === 'jogo') return `${a.flag_a} ${a.time_a} vs ${a.time_b} ${a.flag_b}`;
  if (a.tipo === 'extra') {
    const tipoLabel = EXTRA_TIPO_LABEL[a.extra_tipo] || a.extra_tipo;
    const linha = a.extra_tipo === 'mais_menos' ? ` ${a.linha}` : '';
    return `${tipoLabel}${linha} — ${a.flag_a} ${a.time_a} vs ${a.time_b} ${a.flag_b}`;
  }
  if (a.tipo === 'longo_prazo') return a.titulo || 'Mercado de Longo Prazo';
  if (a.tipo === 'artilheiro') return `Artilheiro — ${a.flag_a} ${a.time_a} vs ${a.time_b} ${a.flag_b}`;
  return '';
}

export default function MeusPalpites() {
  const { usuario } = useAuth();
  const [apostas, setApostas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [filtro, setFiltro] = useState('todos');

  useEffect(() => {
    if (!usuario) return;
    axios.get(`/api/apostadores/minhas-apostas/${usuario.id}`)
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
      <div className="spinner" />
      <span style={{ color: 'var(--texto-muted)', fontSize: 13 }}>Carregando palpites...</span>
    </div>
  );

  const apostasVisiveis = filtro === 'todos' ? apostas : apostas.filter(a => a.tipo === filtro);

  const total         = apostas.length;
  const ganhos        = apostas.filter(a => a.status === 'ganhou').length;
  const totalGanho    = apostas.filter(a => a.status === 'ganhou').reduce((s, a) => s + (a.premio || 0), 0);
  const totalApostado = apostas.reduce((s, a) => s + a.valor, 0);

  const FILTROS = [
    { val: 'todos',        label: 'Todos' },
    { val: 'jogo',         label: '⚽ Jogos' },
    { val: 'extra',        label: '📊 Extras' },
    { val: 'artilheiro',   label: '🥇 Artilheiro' },
    { val: 'longo_prazo',  label: '🏆 Longo Prazo' },
  ];

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <BookOpen size={22} style={{ color: '#FFD000' }} />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Meus Palpites</h1>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Total de apostas',  val: total,                             color: '#fff'    },
          { label: 'Total apostado',    val: `R$ ${totalApostado.toFixed(2)}`,  color: '#FFD000' },
          { label: 'Apostas ganhas',    val: ganhos,                            color: '#00C264' },
          { label: 'Total em prêmios',  val: `R$ ${totalGanho.toFixed(2)}`,     color: '#00C264' },
        ].map(item => (
          <div key={item.label} className="card-golbet" style={{ textAlign: 'center', padding: '12px 10px' }}>
            <div style={{ fontSize: 11, color: 'var(--texto-muted)', marginBottom: 4, lineHeight: 1.3 }}>{item.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: item.color, letterSpacing: '-0.3px' }}>{item.val}</div>
          </div>
        ))}
      </div>

      {/* Filtros por tipo */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {FILTROS.map(f => (
          <button key={f.val} onClick={() => setFiltro(f.val)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
            fontWeight: filtro === f.val ? 800 : 600, fontFamily: 'inherit',
            background: filtro === f.val ? '#FFD000' : 'rgba(0,0,0,0.3)',
            color: filtro === f.val ? '#000' : 'rgba(255,255,255,0.55)',
            border: filtro === f.val ? '1.5px solid #FFD000' : '1px solid rgba(0,194,100,0.15)',
            transition: 'all 0.15s',
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {apostasVisiveis.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 20px',
          background: 'rgba(0,0,0,0.2)', borderRadius: 12,
          border: '1px solid rgba(0,194,100,0.08)',
          color: 'var(--texto-muted)',
        }}>
          <BookOpen size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: 14 }}>
            {filtro === 'todos' ? 'Você ainda não fez nenhuma aposta.' : 'Nenhuma aposta nesta categoria.'}
          </p>
        </div>
      ) : (
        apostasVisiveis.map(a => {
          const palpiteLabel = getPalpiteLabel(a);
          const contextLabel = getContextLabel(a);
          const tipoInfo = TIPO_LABEL[a.tipo] || { icon: '🎯', label: a.tipo };

          return (
            <div key={`${a.tipo}-${a.id}`} className="card-golbet" style={{ marginBottom: 10, padding: '14px 14px 12px' }}>

              {/* Tipo badge + status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
                  color: 'var(--texto-muted)', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {tipoInfo.icon} {tipoInfo.label}
                </span>
                <StatusBadge status={a.status} />
              </div>

              {/* Contexto (jogo ou título) */}
              <div style={{
                fontWeight: 700, fontSize: 13, lineHeight: 1.4, marginBottom: 8,
                color: 'var(--texto-sec)',
              }}>
                {contextLabel}
              </div>

              {/* Palpite + valor */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', borderRadius: 8, marginBottom: 8, gap: 8,
                background: a.status === 'ganhou'
                  ? 'rgba(0,194,100,0.08)' : a.status === 'perdeu'
                  ? 'rgba(255,69,69,0.06)' : 'rgba(255,208,0,0.06)',
                border: a.status === 'ganhou'
                  ? '1px solid rgba(0,194,100,0.2)' : a.status === 'perdeu'
                  ? '1px solid rgba(255,69,69,0.15)' : '1px solid rgba(255,208,0,0.15)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--texto-sec)', minWidth: 0, flex: 1 }}>
                  Palpite:{' '}
                  <strong style={{
                    color: '#FFD000', display: 'inline-block',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    verticalAlign: 'middle', maxWidth: '100%',
                  }}>
                    {palpiteLabel}
                  </strong>
                </span>
                <span style={{
                  fontSize: 14, fontWeight: 800, flexShrink: 0,
                  color: a.status === 'ganhou' ? '#00C264' : a.status === 'perdeu' ? '#FF4545' : '#FFD000',
                }}>
                  {a.status === 'ganhou'
                    ? `+R$ ${Number(a.premio).toFixed(2)}`
                    : `R$ ${Number(a.valor).toFixed(2)}`}
                </span>
              </div>

              {/* Expandir detalhes */}
              <button
                onClick={() => setExpandido(expandido === `${a.tipo}-${a.id}` ? null : `${a.tipo}-${a.id}`)}
                style={{
                  background: 'none', border: 'none', color: 'var(--texto-muted)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontFamily: 'inherit', padding: 0,
                }}
              >
                {expandido === `${a.tipo}-${a.id}` ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {expandido === `${a.tipo}-${a.id}` ? 'Menos detalhes' : 'Ver detalhes'}
              </button>

              {expandido === `${a.tipo}-${a.id}` && (
                <div style={{
                  marginTop: 10, paddingTop: 10,
                  borderTop: '1px solid rgba(0,194,100,0.1)',
                  fontSize: 12, color: 'var(--texto-muted)',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <div>Status: <strong style={{ color: '#fff' }}>{a.contexto_status}</strong></div>
                    <div>Pote: <strong style={{ color: '#fff' }}>R$ {Number(a.pote_total || 0).toFixed(2)}</strong></div>
                    {a.status === 'ganhou' && (
                      <div style={{ gridColumn: '1/-1' }}>
                        Prêmio recebido: <strong style={{ color: '#00C264' }}>R$ {Number(a.premio).toFixed(2)}</strong>
                      </div>
                    )}
                    <div style={{ gridColumn: '1/-1' }}>
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
