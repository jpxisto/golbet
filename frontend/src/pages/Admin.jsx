import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ShieldCheck, Users, DollarSign, Trophy, ChevronDown, ChevronUp } from 'lucide-react';

const ABA = { dashboard: 'Dashboard', financeiro: 'Financeiro', depositos: 'Depósitos', saques: 'Saques', jogos: 'Jogos', longoplazo: 'Longo Prazo', apostadores: 'Apostadores' };

function useAdmin() {
  const [senha] = useState(() => localStorage.getItem('golbet_admin') || '');
  return { headers: { 'x-admin-senha': senha } };
}

// ─── Login ────────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [senha, setSenha] = useState('');
  const [err, setErr] = useState('');

  async function handle(e) {
    e.preventDefault();
    try {
      await axios.post('/api/admin/login', { senha });
      localStorage.setItem('golbet_admin', senha);
      onLogin(senha);
    } catch { setErr('Senha incorreta'); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#003D2B' }}>
      <div className="card-golbet" style={{ padding: 32, width: 340 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <ShieldCheck size={40} style={{ color: '#F5D020' }} />
          <h2 style={{ margin: '8px 0 0' }}>Painel Admin</h2>
        </div>
        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input className="input-golbet" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Senha do admin" required />
          {err && <p style={{ color: '#E53935', fontSize: 13, margin: 0 }}>{err}</p>}
          <button className="btn-amarelo" type="submit" style={{ padding: '12px 0' }}>ENTRAR</button>
        </form>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard() {
  const { headers } = useAdmin();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios.get('/api/admin/stats', { headers }).then(r => setStats(r.data)).catch(() => {});
    const iv = setInterval(() => axios.get('/api/admin/stats', { headers }).then(r => setStats(r.data)).catch(() => {}), 15000);
    return () => clearInterval(iv);
  }, []);

  if (!stats) return <div style={{ color: '#B0BEC5' }}>Carregando...</div>;

  const cards = [
    { label: 'Total arrecadado', val: `R$ ${Number(stats.totalArrecadado).toFixed(2)}`, icon: <DollarSign size={20} />, color: '#F5D020' },
    { label: 'Depósitos pendentes', val: stats.depositosPendentes, icon: <DollarSign size={20} />, color: stats.depositosPendentes > 0 ? '#E53935' : '#43A047', badge: stats.depositosPendentes > 0 },
    { label: 'Saques pendentes', val: stats.saquesPendentes, icon: <DollarSign size={20} />, color: stats.saquesPendentes > 0 ? '#F57C00' : '#43A047', badge: stats.saquesPendentes > 0 },
    { label: 'Total apostadores', val: stats.totalApostadores, icon: <Users size={20} />, color: '#1976D2' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
      {cards.map(c => (
        <div key={c.label} className="card-golbet" style={{ textAlign: 'center', padding: '16px 12px', position: 'relative' }}>
          {c.badge && (
            <span style={{ position: 'absolute', top: 8, right: 8, background: c.color, color: '#fff', borderRadius: '50%', width: 20, height: 20, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {c.val}
            </span>
          )}
          <div style={{ color: c.color, marginBottom: 6 }}>{c.icon}</div>
          <div style={{ fontSize: 11, color: '#B0BEC5', marginBottom: 4 }}>{c.label}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.badge ? '🔴 ' + c.val : c.val}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Depósitos ────────────────────────────────────────────────────────────────
function GestaoDepositos() {
  const { headers } = useAdmin();
  const [deps, setDeps] = useState([]);
  const [filtro, setFiltro] = useState('pendente');
  const [motivo, setMotivo] = useState({});

  const fetch = useCallback(() => {
    axios.get(`/api/admin/depositos?status=${filtro}`, { headers }).then(r => setDeps(r.data)).catch(() => {});
  }, [filtro]);

  useEffect(() => { fetch(); }, [fetch]);

  async function aprovar(id) {
    await axios.patch(`/api/admin/depositos/${id}/aprovar`, {}, { headers });
    fetch();
  }
  async function rejeitar(id) {
    if (!motivo[id]) return alert('Informe o motivo');
    await axios.patch(`/api/admin/depositos/${id}/rejeitar`, { motivo: motivo[id] }, { headers });
    fetch();
  }

  const cores = { pendente: '#F57C00', aprovado: '#43A047', rejeitado: '#E53935' };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['pendente', 'aprovado', 'rejeitado'].map(f => (
          <button key={f} onClick={() => setFiltro(f)} className="btn-verde" style={{ background: filtro === f ? '#F5D020' : undefined, color: filtro === f ? '#000' : '#fff', padding: '6px 14px', fontSize: 13 }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {deps.length === 0 && <p style={{ color: '#B0BEC5' }}>Nenhum depósito {filtro}.</p>}
      {deps.map(d => (
        <div key={d.id} className="card-golbet" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{d.nome} · {d.telefone}</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>Valor: <strong style={{ color: '#F5D020' }}>R$ {Number(d.valor).toFixed(2)}</strong></div>
              <div style={{ fontSize: 12, color: '#B0BEC5' }}>{new Date(d.criado_em).toLocaleString('pt-BR')}</div>
              {d.comprovante_info && <div style={{ fontSize: 13, color: '#B0BEC5', marginTop: 4 }}>Obs: "{d.comprovante_info}"</div>}
              {d.motivo_rejeicao && <div style={{ fontSize: 12, color: '#E53935', marginTop: 4 }}>Motivo: {d.motivo_rejeicao}</div>}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: cores[d.status], background: `${cores[d.status]}22`, padding: '3px 10px', borderRadius: 10, whiteSpace: 'nowrap' }}>
              {d.status === 'pendente' ? '⏳ PENDENTE' : d.status === 'aprovado' ? '✅ APROVADO' : '❌ REJEITADO'}
            </span>
          </div>
          {filtro === 'pendente' && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn-verde" style={{ padding: '7px 16px', fontSize: 13 }} onClick={() => aprovar(d.id)}>✅ Aprovar</button>
              <input className="input-golbet" style={{ flex: 1, minWidth: 140 }} placeholder="Motivo da rejeição" value={motivo[d.id] || ''} onChange={e => setMotivo({ ...motivo, [d.id]: e.target.value })} />
              <button onClick={() => rejeitar(d.id)} style={{ background: '#E53935', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>❌ Rejeitar</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Saques ───────────────────────────────────────────────────────────────────
function GestaoSaques() {
  const { headers } = useAdmin();
  const [saques, setSaques] = useState([]);
  const [filtro, setFiltro] = useState('pendente');
  const [obs, setObs] = useState({});
  const [motivo, setMotivo] = useState({});

  const fetch = useCallback(() => {
    axios.get(`/api/admin/saques?status=${filtro}`, { headers }).then(r => setSaques(r.data)).catch(() => {});
  }, [filtro]);

  useEffect(() => { fetch(); }, [fetch]);

  const TIPOS_LABEL = { cpf: 'CPF', telefone: 'Telefone', email: 'E-mail', aleatoria: 'Aleatória' };
  const cores = { pendente: '#F57C00', pago: '#43A047', rejeitado: '#E53935' };

  async function pagar(id) {
    await axios.patch(`/api/admin/saques/${id}/pagar`, { observacao: obs[id] || '' }, { headers });
    fetch();
  }
  async function rejeitar(id) {
    if (!motivo[id]) return alert('Informe o motivo');
    await axios.patch(`/api/admin/saques/${id}/rejeitar`, { motivo: motivo[id] }, { headers });
    fetch();
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['pendente', 'pago', 'rejeitado'].map(f => (
          <button key={f} onClick={() => setFiltro(f)} className="btn-verde" style={{ background: filtro === f ? '#F5D020' : undefined, color: filtro === f ? '#000' : '#fff', padding: '6px 14px', fontSize: 13 }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {saques.length === 0 && <p style={{ color: '#B0BEC5' }}>Nenhum saque {filtro}.</p>}
      {saques.map(s => (
        <div key={s.id} className="card-golbet" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{s.nome} · {s.telefone}</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>Valor: <strong style={{ color: '#F5D020' }}>R$ {Number(s.valor).toFixed(2)}</strong></div>
              <div style={{ fontSize: 13, color: '#B0BEC5', marginTop: 2 }}>Chave Pix: <strong style={{ color: '#fff' }}>{s.chave_pix_cliente}</strong> ({TIPOS_LABEL[s.tipo_pix] || s.tipo_pix})</div>
              <div style={{ fontSize: 12, color: '#B0BEC5' }}>{new Date(s.criado_em).toLocaleString('pt-BR')}</div>
              {s.motivo_rejeicao && <div style={{ fontSize: 12, color: '#E53935', marginTop: 4 }}>Motivo: {s.motivo_rejeicao}</div>}
              {s.observacao && <div style={{ fontSize: 12, color: '#B0BEC5', marginTop: 2 }}>Obs: {s.observacao}</div>}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: cores[s.status], background: `${cores[s.status]}22`, padding: '3px 10px', borderRadius: 10, whiteSpace: 'nowrap' }}>
              {s.status === 'pendente' ? '⏳ PENDENTE' : s.status === 'pago' ? '✅ PAGO' : '❌ REJEITADO'}
            </span>
          </div>
          {filtro === 'pendente' && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input className="input-golbet" style={{ flex: 1, minWidth: 140 }} placeholder="Observação (opcional)" value={obs[s.id] || ''} onChange={e => setObs({ ...obs, [s.id]: e.target.value })} />
              <button className="btn-verde" style={{ padding: '7px 16px', fontSize: 13 }} onClick={() => pagar(s.id)}>✅ Pago</button>
              <input className="input-golbet" style={{ flex: 1, minWidth: 140 }} placeholder="Motivo da rejeição" value={motivo[s.id] || ''} onChange={e => setMotivo({ ...motivo, [s.id]: e.target.value })} />
              <button onClick={() => rejeitar(s.id)} style={{ background: '#E53935', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>❌ Rejeitar</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Jogos ────────────────────────────────────────────────────────────────────
const BANDEIRAS = [
  { flag: '🇧🇷', nome: 'Brasil' },
  { flag: '🇦🇷', nome: 'Argentina' },
  { flag: '🇩🇪', nome: 'Alemanha' },
  { flag: '🇪🇸', nome: 'Espanha' },
  { flag: '🇫🇷', nome: 'França' },
  { flag: '🇳🇱', nome: 'Holanda' },
  { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', nome: 'Inglaterra' },
  { flag: '🇵🇹', nome: 'Portugal' },
];
const STATUS_COLOR = { fechado: '#757575', aberto: '#43A047', encerrado: '#F57C00', finalizado: '#1976D2' };
const STATUS_LABEL = { fechado: '⚪ FECHADO', aberto: '🟢 ABERTO', encerrado: '🔒 ENCERRADO', finalizado: '✅ FINALIZADO' };

const JOGO_VAZIO = { time_a: '', flag_a: '🇧🇷', time_b: '', flag_b: '🇩🇪', data_hora: '', visivel: true };

function ModalJogo({ jogo, onSalvar, onFechar, headers }) {
  const editando = !!jogo?.id;
  const [form, setForm] = useState(editando ? {
    time_a: jogo.time_a, flag_a: jogo.flag_a,
    time_b: jogo.time_b, flag_b: jogo.flag_b,
    data_hora: jogo.data_hora ? new Date(jogo.data_hora).toISOString().slice(0, 16) : '',
    visivel: jogo.visivel !== 0,
  } : { ...JOGO_VAZIO });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // ── Mercados Extras ──
  const [extrasExistentes, setExtrasExistentes] = useState([]);
  const [extras, setExtras] = useState({ ambos_marcam: false, mais_menos: false, penaltis: false });
  const [linhaGols, setLinhaGols] = useState('2.5');

  // ── Artilheiro ──
  const [artilheiroExistente, setArtilheiroExistente] = useState(null);
  const [artilheiroAtivo, setArtilheiroAtivo] = useState(false);
  const [jogadorA, setJogadorA] = useState('');
  const [jogadorB, setJogadorB] = useState('');

  useEffect(() => {
    if (!editando) return;
    // Carregar extras
    axios.get(`/api/extras/jogo/${jogo.id}`).then(r => {
      setExtrasExistentes(r.data);
      const mapa = {};
      let linha = '2.5';
      r.data.forEach(m => {
        mapa[m.tipo] = true;
        if (m.tipo === 'mais_menos') linha = String(m.linha ?? 2.5);
      });
      setExtras(prev => ({ ...prev, ...mapa }));
      setLinhaGols(linha);
    }).catch(() => {});
    // Carregar artilheiro
    axios.get(`/api/artilheiros/${jogo.id}`).then(r => {
      if (r.data?.mercado) {
        setArtilheiroExistente(r.data.mercado);
        setArtilheiroAtivo(true);
        setJogadorA(r.data.mercado.jogador_a || '');
        setJogadorB(r.data.mercado.jogador_b || '');
      }
    }).catch(() => {});
  }, [jogo?.id]);

  function toggleExtra(tipo) {
    const existente = extrasExistentes.find(e => e.tipo === tipo);
    if (!extras[tipo] === false && existente && existente.pote_total > 0) {
      if (!window.confirm(`Este mercado tem R$ ${Number(existente.pote_total).toFixed(2)} apostados. Remover vai devolver os saldos. Continuar?`)) return;
    }
    setExtras(prev => ({ ...prev, [tipo]: !prev[tipo] }));
  }

  async function salvar() {
    if (!form.time_a.trim() || !form.time_b.trim()) return setErro('Informe os dois times');
    setSalvando(true);
    setErro('');
    try {
      let jogoId;
      if (editando) {
        await axios.put(`/api/admin/jogos/${jogo.id}`, form, { headers });
        jogoId = jogo.id;
      } else {
        const r = await axios.post('/api/admin/jogos', form, { headers });
        jogoId = r.data.id;
      }

      // Sincronizar extras
      for (const tipo of ['ambos_marcam', 'mais_menos', 'penaltis']) {
        const ativo = extras[tipo];
        const existente = extrasExistentes.find(e => e.tipo === tipo);
        if (ativo && !existente) {
          await axios.post('/api/extras/admin/criar', {
            jogo_id: jogoId, tipo,
            linha: tipo === 'mais_menos' ? parseFloat(linhaGols) || 2.5 : null,
          }, { headers });
        } else if (ativo && existente && tipo === 'mais_menos') {
          const novaLinha = parseFloat(linhaGols) || 2.5;
          if (novaLinha !== existente.linha) {
            await axios.patch(`/api/extras/admin/${existente.id}`, { linha: novaLinha }, { headers });
          }
        } else if (!ativo && existente) {
          await axios.delete(`/api/extras/admin/${existente.id}`, { headers });
        }
      }

      // Sincronizar artilheiro
      if (artilheiroAtivo && !artilheiroExistente) {
        // Criar
        await axios.post('/api/artilheiros/admin/criar', {
          jogo_id: jogoId,
          jogador_a: jogadorA.trim() || null,
          jogador_b: jogadorB.trim() || null,
        }, { headers });
      } else if (artilheiroAtivo && artilheiroExistente && !artilheiroExistente.resultado) {
        // Atualizar jogadores se mudou
        const jaA = artilheiroExistente.jogador_a || '';
        const jaB = artilheiroExistente.jogador_b || '';
        if (jogadorA.trim() !== jaA || jogadorB.trim() !== jaB) {
          await axios.patch(`/api/artilheiros/admin/${artilheiroExistente.id}/jogadores`, {
            jogador_a: jogadorA.trim() || null,
            jogador_b: jogadorB.trim() || null,
          }, { headers });
        }
      } else if (!artilheiroAtivo && artilheiroExistente && !artilheiroExistente.resultado) {
        // Remover
        const pote = Number(artilheiroExistente.pote_total || 0);
        if (pote > 0) {
          if (!window.confirm(`O mercado Artilheiro tem R$ ${pote.toFixed(2)} apostados. Remover vai devolver os saldos. Continuar?`)) {
            setSalvando(false);
            return;
          }
        }
        await axios.delete(`/api/artilheiros/admin/${artilheiroExistente.id}`, { headers });
      }

      onSalvar();
    } catch (e) {
      setErro(e.response?.data?.erro || 'Erro ao salvar');
    }
    setSalvando(false);
  }

  const inp = (field, label, placeholder, type = 'text') => (
    <div>
      <label style={{ fontSize: 12, color: '#B0BEC5', display: 'block', marginBottom: 4 }}>{label}</label>
      <input className="input-golbet" type={type} value={form[field]} placeholder={placeholder}
        onChange={e => setForm({ ...form, [field]: e.target.value })} />
    </div>
  );

  const flagSel = (flagField, nameField, label) => (
    <div>
      <label style={{ fontSize: 12, color: '#B0BEC5', display: 'block', marginBottom: 4 }}>{label}</label>
      <select value={form[flagField]} onChange={e => {
        const sel = BANDEIRAS.find(b => b.flag === e.target.value);
        setForm(prev => ({ ...prev, [flagField]: e.target.value, [nameField]: sel ? sel.nome : prev[nameField] }));
      }}
        style={{ background: '#003D2B', color: '#fff', border: '1px solid #00874F', borderRadius: 6, padding: '9px 10px', fontFamily: 'Inter, sans-serif', fontSize: 15, width: '100%' }}>
        {BANDEIRAS.map(b => <option key={b.flag} value={b.flag}>{b.flag} {b.nome}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card-golbet" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>{editando ? '✏️ Editar Jogo' : '➕ Novo Jogo'}</h3>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', color: '#B0BEC5', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Time A */}
          <div style={{ padding: '12px 14px', background: '#003D2B', borderRadius: 8, border: '1px solid rgba(0,135,79,0.4)' }}>
            <div style={{ fontSize: 12, color: '#F5D020', fontWeight: 700, marginBottom: 10 }}>TIME A (Casa)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {flagSel('flag_a', 'time_a', 'Selecionar país')}
              {inp('time_a', 'Nome do time', 'Ex: Brasil')}
            </div>
          </div>

          {/* VS divider */}
          <div style={{ textAlign: 'center', color: '#B0BEC5', fontWeight: 700, fontSize: 13 }}>VS</div>

          {/* Time B */}
          <div style={{ padding: '12px 14px', background: '#003D2B', borderRadius: 8, border: '1px solid rgba(0,135,79,0.4)' }}>
            <div style={{ fontSize: 12, color: '#F5D020', fontWeight: 700, marginBottom: 10 }}>TIME B (Visitante)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {flagSel('flag_b', 'time_b', 'Selecionar país')}
              {inp('time_b', 'Nome do time', 'Ex: Alemanha')}
            </div>
          </div>

          {/* Data/hora */}
          {inp('data_hora', 'Data e hora', '', 'datetime-local')}

          {/* Visibilidade */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#003D2B', borderRadius: 8, border: '1px solid rgba(0,135,79,0.4)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Visível para jogadores</div>
              <div style={{ fontSize: 12, color: '#B0BEC5' }}>Quando ativo, o jogo aparece na tela inicial</div>
            </div>
            <button onClick={() => setForm({ ...form, visivel: !form.visivel })} style={{
              width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
              background: form.visivel ? '#43A047' : '#757575',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3, left: form.visivel ? 25 : 3,
                transition: 'left 0.2s',
              }} />
            </button>
          </div>

          {/* ── Mercados Extras ── */}
          <div style={{ padding: '12px 14px', background: '#003D2B', borderRadius: 8, border: '1px solid rgba(0,135,79,0.4)' }}>
            <div style={{ fontSize: 12, color: '#F5D020', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📊 Mercados Extras
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Ambos Marcam */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>⚽ Ambos Marcam?</div>
                    <div style={{ fontSize: 11, color: '#B0BEC5' }}>Os dois times marcam pelo menos 1 gol</div>
                  </div>
                  <button onClick={() => toggleExtra('ambos_marcam')} style={{
                    width: 42, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                    background: extras.ambos_marcam ? '#43A047' : '#555', position: 'relative',
                    transition: 'background 0.2s', flexShrink: 0,
                  }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: extras.ambos_marcam ? 23 : 3, transition: 'left 0.2s' }} />
                  </button>
                </div>
              </div>

              {/* Mais/Menos Gols */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>📊 Mais/Menos Gols</div>
                    <div style={{ fontSize: 11, color: '#B0BEC5' }}>Total de gols acima ou abaixo da linha</div>
                  </div>
                  <button onClick={() => toggleExtra('mais_menos')} style={{
                    width: 42, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                    background: extras.mais_menos ? '#43A047' : '#555', position: 'relative',
                    transition: 'background 0.2s', flexShrink: 0,
                  }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: extras.mais_menos ? 23 : 3, transition: 'left 0.2s' }} />
                  </button>
                </div>
                {extras.mais_menos && (
                  <div style={{ marginTop: 8 }}>
                    <label style={{ fontSize: 11, color: '#B0BEC5', display: 'block', marginBottom: 4 }}>
                      Linha de gols — apostadores escolhem se o total será mais ou menos que este valor
                    </label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {['0.5','1.5','2.5','3.5','4.5'].map(v => (
                        <button key={v} onClick={() => setLinhaGols(v)} style={{
                          padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
                          background: linhaGols === v ? '#F5D020' : 'rgba(255,255,255,0.08)',
                          color: linhaGols === v ? '#003D2B' : '#fff',
                        }}>{v}</button>
                      ))}
                      <input
                        type="number" min={0.5} max={9.5} step={0.5}
                        value={linhaGols}
                        onChange={e => setLinhaGols(e.target.value)}
                        className="input-golbet"
                        style={{ width: 70, fontSize: 14, fontWeight: 700, padding: '6px 10px' }}
                        placeholder="outro"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Pênaltis */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>🎯 Pênaltis?</div>
                    <div style={{ fontSize: 11, color: '#B0BEC5' }}>A partida terá disputa de pênaltis</div>
                  </div>
                  <button onClick={() => toggleExtra('penaltis')} style={{
                    width: 42, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                    background: extras.penaltis ? '#43A047' : '#555', position: 'relative',
                    transition: 'background 0.2s', flexShrink: 0,
                  }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: extras.penaltis ? 23 : 3, transition: 'left 0.2s' }} />
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* ── Artilheiro ── */}
          <div style={{ padding: '12px 14px', background: '#003D2B', borderRadius: 8, border: artilheiroAtivo ? '1px solid rgba(245,208,32,0.35)' : '1px solid rgba(0,135,79,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: artilheiroAtivo ? 12 : 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>⚽ Mercado Artilheiro</div>
                <div style={{ fontSize: 11, color: '#B0BEC5' }}>Quem vai marcar mais gols na partida</div>
              </div>
              <button
                onClick={() => {
                  if (artilheiroAtivo && artilheiroExistente?.resultado) return; // já finalizado
                  setArtilheiroAtivo(v => !v);
                }}
                disabled={!!artilheiroExistente?.resultado}
                style={{
                  width: 42, height: 22, borderRadius: 11, border: 'none', cursor: artilheiroExistente?.resultado ? 'not-allowed' : 'pointer',
                  background: artilheiroAtivo ? '#F5D020' : '#555', position: 'relative',
                  transition: 'background 0.2s', flexShrink: 0, opacity: artilheiroExistente?.resultado ? 0.5 : 1,
                }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: artilheiroAtivo ? '#003D2B' : '#fff', position: 'absolute', top: 3, left: artilheiroAtivo ? 23 : 3, transition: 'left 0.2s' }} />
              </button>
            </div>
            {artilheiroAtivo && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {artilheiroExistente?.resultado && (
                  <div style={{ fontSize: 11, color: '#43A047', fontWeight: 600 }}>
                    ✅ Finalizado — não é possível editar
                  </div>
                )}
                {!artilheiroExistente?.resultado && (
                  <>
                    <div style={{ fontSize: 11, color: '#B0BEC5' }}>
                      Nomes dos jogadores (opcional — deixe em branco para usar o nome do time)
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <label style={{ fontSize: 10, color: '#B0BEC5', display: 'block', marginBottom: 3 }}>
                          {form.flag_a} {form.time_a || 'Time A'}
                        </label>
                        <input
                          className="input-golbet"
                          style={{ fontSize: 13, padding: '6px 10px' }}
                          value={jogadorA}
                          onChange={e => setJogadorA(e.target.value)}
                          placeholder={`Ex: Neymar`}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <label style={{ fontSize: 10, color: '#B0BEC5', display: 'block', marginBottom: 3 }}>
                          {form.flag_b} {form.time_b || 'Time B'}
                        </label>
                        <input
                          className="input-golbet"
                          style={{ fontSize: 13, padding: '6px 10px' }}
                          value={jogadorB}
                          onChange={e => setJogadorB(e.target.value)}
                          placeholder={`Ex: Mbappé`}
                        />
                      </div>
                    </div>
                    {artilheiroExistente && (
                      <div style={{ fontSize: 11, color: '#B0BEC5' }}>
                        Pote atual: <strong style={{ color: '#F5D020' }}>R$ {Number(artilheiroExistente.pote_total || 0).toFixed(2)}</strong>
                        {' · '}{artilheiroExistente.num_apostas || 0} apostas
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {erro && <div style={{ color: '#E53935', fontSize: 13 }}>{erro}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="btn-amarelo" style={{ flex: 1, padding: '11px 0' }} onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : editando ? '💾 Salvar Alterações' : '✅ Criar Jogo'}
            </button>
            <button onClick={onFechar} style={{ flex: 1, padding: '11px 0', background: 'transparent', border: '1px solid #B0BEC5', borderRadius: 6, color: '#B0BEC5', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GestaoJogos() {
  const { headers } = useAdmin();
  const [jogos, setJogos] = useState([]);
  const [resultado, setResultado] = useState({});
  const [relatorio, setRelatorio] = useState(null);
  const [modalJogo, setModalJogo] = useState(null); // null | 'novo' | jogo{...}
  const [artilheiros, setArtilheiros] = useState({}); // { [jogo_id]: mercado }
  const [resultadoArt, setResultadoArt] = useState({});
  const [relatorioArt, setRelatorioArt] = useState(null);

  const fetchJogos = useCallback(() => {
    axios.get('/api/admin/jogos', { headers }).then(r => setJogos(r.data)).catch(() => {});
  }, []);

  const fetchArtilheiros = useCallback(() => {
    axios.get('/api/artilheiros/admin/lista', { headers })
      .then(r => {
        const map = {};
        r.data.forEach(m => { map[m.jogo_id] = m; });
        setArtilheiros(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchJogos(); fetchArtilheiros(); }, [fetchJogos, fetchArtilheiros]);

  async function mudarStatus(id, status) {
    await axios.patch(`/api/admin/jogos/${id}/status`, { status }, { headers });

    if (status === 'encerrado') {
      // Fechar artilheiro
      const art = artilheiros[id];
      if (art && !art.resultado && art.status === 'aberto') {
        try { await axios.patch(`/api/artilheiros/admin/${art.id}/status`, { status: 'fechado' }, { headers }); } catch {}
      }
      // Fechar todos os mercados extras do jogo
      try {
        const extrasRes = await axios.get(`/api/extras/jogo/${id}`);
        for (const e of extrasRes.data) {
          if (e.status === 'aberto') {
            await axios.patch(`/api/extras/admin/${e.id}`, { status: 'fechado' }, { headers });
          }
        }
      } catch {}
    }

    if (status === 'aberto') {
      // Reabrir artilheiro se existir e não finalizado
      const art = artilheiros[id];
      if (art && !art.resultado && art.status === 'fechado') {
        try { await axios.patch(`/api/artilheiros/admin/${art.id}/status`, { status: 'aberto' }, { headers }); } catch {}
      }
      // Reabrir extras
      try {
        const extrasRes = await axios.get(`/api/extras/jogo/${id}`);
        for (const e of extrasRes.data) {
          if (!e.resultado && e.status === 'fechado') {
            await axios.patch(`/api/extras/admin/${e.id}`, { status: 'aberto' }, { headers });
          }
        }
      } catch {}
    }

    fetchJogos();
    fetchArtilheiros();
  }
  async function finalizar(id) {
    if (!resultado[id]) return alert('Selecione o resultado');
    await axios.patch(`/api/admin/jogos/${id}/finalizar`, { resultado: resultado[id] }, { headers });
    fetchJogos();
  }
  async function toggleVisivel(id, atual) {
    await axios.patch(`/api/admin/jogos/${id}/visivel`, { visivel: !atual }, { headers });
    fetchJogos();
  }
  async function apagarJogo(id, nomeJogo) {
    if (!window.confirm(`Apagar o jogo "${nomeJogo}"?\nEsta ação não pode ser desfeita.`)) return;
    try {
      await axios.delete(`/api/admin/jogos/${id}`, { headers });
      fetchJogos();
    } catch (e) {
      alert(e.response?.data?.erro || 'Erro ao apagar jogo');
    }
  }
  async function verRelatorio(id) {
    const r = await axios.get(`/api/admin/jogos/${id}/relatorio`, { headers });
    setRelatorio(r.data);
  }

  async function mudarStatusArt(id, status) {
    try {
      await axios.patch(`/api/artilheiros/admin/${id}/status`, { status }, { headers });
      fetchArtilheiros();
    } catch (e) { alert(e.response?.data?.erro || 'Erro ao alterar status'); }
  }
  async function finalizarArtilheiro(id, labelA, labelB) {
    if (!resultadoArt[id]) return alert('Selecione o resultado');
    const nomeResultado = resultadoArt[id] === 'A' ? labelA : resultadoArt[id] === 'B' ? labelB : '🤝 Empate';
    if (!window.confirm(`Confirmar artilheiro: "${nomeResultado}"?`)) return;
    try {
      await axios.patch(`/api/artilheiros/admin/${id}/finalizar`, { resultado: resultadoArt[id] }, { headers });
      fetchArtilheiros();
    } catch (e) { alert(e.response?.data?.erro || 'Erro ao finalizar'); }
  }
  async function deletarArtilheiro(id) {
    if (!window.confirm('Apagar mercado artilheiro? Saldos serão devolvidos.')) return;
    try {
      await axios.delete(`/api/artilheiros/admin/${id}`, { headers });
      fetchArtilheiros();
    } catch (e) { alert(e.response?.data?.erro || 'Erro ao deletar'); }
  }
  async function verRelatorioArt(id) {
    const r = await axios.get(`/api/artilheiros/admin/${id}/apostas`, { headers });
    setRelatorioArt(r.data);
  }

  return (
    <div>
      {/* Modal criar/editar */}
      {modalJogo !== null && (
        <ModalJogo
          jogo={modalJogo === 'novo' ? null : modalJogo}
          headers={headers}
          onSalvar={() => { setModalJogo(null); fetchJogos(); }}
          onFechar={() => setModalJogo(null)}
        />
      )}

      {/* Modal relatório */}
      {relatorio && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card-golbet" style={{ maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Relatório: {relatorio.jogo.flag_a} {relatorio.jogo.time_a} vs {relatorio.jogo.time_b} {relatorio.jogo.flag_b}</h3>
              <button onClick={() => setRelatorio(null)} style={{ background: 'none', border: 'none', color: '#B0BEC5', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            {relatorio.jogo.resultado && (
              <div style={{ background: 'rgba(67,160,71,0.15)', border: '1px solid #43A047', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 14 }}>
                Resultado: <strong>{relatorio.jogo.resultado === 'A' ? `${relatorio.jogo.flag_a} ${relatorio.jogo.time_a}` : relatorio.jogo.resultado === 'B' ? `${relatorio.jogo.flag_b} ${relatorio.jogo.time_b}` : '🤝 Empate'}</strong>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: 13 }}>
              <div>Pote total: <strong>R$ {Number(relatorio.poteTotal).toFixed(2)}</strong></div>
              <div>Taxa casa (10%): <strong style={{ color: '#E53935' }}>R$ {Number(relatorio.taxaCasa).toFixed(2)}</strong></div>
              <div>Pote prêmios: <strong style={{ color: '#43A047' }}>R$ {Number(relatorio.potePremios).toFixed(2)}</strong></div>
            </div>
            <div style={{ fontSize: 13, marginBottom: 12 }}>
              <div>Apostado em {relatorio.jogo.flag_a} {relatorio.jogo.time_a}: <strong>R$ {Number(relatorio.por_resultado.A).toFixed(2)}</strong></div>
              <div>Apostado em Empate: <strong>R$ {Number(relatorio.por_resultado.empate).toFixed(2)}</strong></div>
              <div>Apostado em {relatorio.jogo.flag_b} {relatorio.jogo.time_b}: <strong>R$ {Number(relatorio.por_resultado.B).toFixed(2)}</strong></div>
            </div>
            {relatorio.apostas.length > 0 && (
              <>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Apostadores:</div>
                {relatorio.apostas.map(a => (
                  <div key={a.id} style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px solid rgba(0,135,79,0.2)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{a.nome} — {a.resultado === 'A' ? relatorio.jogo.time_a : a.resultado === 'B' ? relatorio.jogo.time_b : 'Empate'} · R$ {Number(a.valor).toFixed(2)}</span>
                    {a.status === 'ganhou' && <span style={{ color: '#43A047', fontWeight: 700 }}>+R$ {Number(a.premio).toFixed(2)}</span>}
                    {a.status === 'perdeu' && <span style={{ color: '#E53935' }}>❌</span>}
                    {a.status === 'pendente' && <span style={{ color: '#F57C00' }}>⏳</span>}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal relatório artilheiro */}
      {relatorioArt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card-golbet" style={{ maxWidth: 480, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>⚽ Artilheiro: {relatorioArt.jogo?.flag_a} {relatorioArt.jogo?.time_a} vs {relatorioArt.jogo?.time_b} {relatorioArt.jogo?.flag_b}</h3>
              <button onClick={() => setRelatorioArt(null)} style={{ background: 'none', border: 'none', color: '#B0BEC5', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            {relatorioArt.mercado?.resultado && (
              <div style={{ background: 'rgba(67,160,71,0.15)', border: '1px solid #43A047', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 14 }}>
                Resultado: <strong>{relatorioArt.mercado.resultado === 'A' ? (relatorioArt.mercado.jogador_a || `${relatorioArt.jogo?.flag_a} ${relatorioArt.jogo?.time_a}`) : relatorioArt.mercado.resultado === 'B' ? (relatorioArt.mercado.jogador_b || `${relatorioArt.jogo?.flag_b} ${relatorioArt.jogo?.time_b}`) : '🤝 Empate'}</strong>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14, fontSize: 13 }}>
              <div>Pote total: <strong>R$ {Number(relatorioArt.mercado?.pote_total || 0).toFixed(2)}</strong></div>
              <div>Taxa casa: <strong style={{ color: '#E53935' }}>R$ {Number(relatorioArt.mercado?.taxa_casa || 0).toFixed(2)}</strong></div>
            </div>
            {relatorioArt.apostas?.length > 0 ? (
              <>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>Apostadores:</div>
                {relatorioArt.apostas.map(a => (
                  <div key={a.id} style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid rgba(0,135,79,0.2)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{a.nome} — <strong style={{ color: '#FFD000' }}>{a.opcao_escolhida === 'A' ? (relatorioArt.mercado?.jogador_a || `${relatorioArt.jogo?.flag_a} ${relatorioArt.jogo?.time_a}`) : a.opcao_escolhida === 'B' ? (relatorioArt.mercado?.jogador_b || `${relatorioArt.jogo?.flag_b} ${relatorioArt.jogo?.time_b}`) : '🤝 Empate'}</strong> · R$ {Number(a.valor).toFixed(2)}</span>
                    <span>
                      {a.status === 'ganhou' && <span style={{ color: '#43A047', fontWeight: 700 }}>+R$ {Number(a.premio).toFixed(2)} ✅</span>}
                      {a.status === 'perdeu' && <span style={{ color: '#E53935' }}>❌</span>}
                      {a.status === 'pendente' && <span style={{ color: '#F57C00' }}>⏳</span>}
                    </span>
                  </div>
                ))}
              </>
            ) : <p style={{ color: '#B0BEC5', fontSize: 13 }}>Nenhuma aposta ainda.</p>}
          </div>
        </div>
      )}

      {/* Botão novo jogo */}
      <div style={{ marginBottom: 16 }}>
        <button className="btn-amarelo" style={{ padding: '9px 20px', fontSize: 14 }} onClick={() => setModalJogo('novo')}>
          ➕ Novo Jogo
        </button>
      </div>

      {jogos.length === 0 && <p style={{ color: '#B0BEC5' }}>Nenhum jogo cadastrado.</p>}

      {jogos.map(j => (
        <div key={j.id} className="card-golbet" style={{ marginBottom: 10, opacity: j.visivel ? 1 : 0.65, borderColor: j.visivel ? 'rgba(0,135,79,0.3)' : 'rgba(117,117,117,0.3)' }}>
          {/* Linha topo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{j.flag_a} {j.time_a} vs {j.time_b} {j.flag_b}</div>
              <div style={{ fontSize: 12, color: '#B0BEC5', marginTop: 2 }}>
                {j.data_hora ? new Date(j.data_hora).toLocaleString('pt-BR') : 'Sem data'} · {j.num_apostas} apostas · Pote: R$ {Number(j.pote_total).toFixed(2)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Badge visível */}
              <button onClick={() => toggleVisivel(j.id, !!j.visivel)} title={j.visivel ? 'Clique para ocultar' : 'Clique para exibir'} style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10, cursor: 'pointer', border: 'none', fontFamily: 'Inter, sans-serif',
                color: j.visivel ? '#43A047' : '#757575', background: j.visivel ? 'rgba(67,160,71,0.15)' : 'rgba(117,117,117,0.15)',
              }}>
                {j.visivel ? '👁 Visível' : '🙈 Oculto'}
              </button>
              {/* Badge status */}
              <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[j.status], background: `${STATUS_COLOR[j.status]}22`, padding: '3px 10px', borderRadius: 10 }}>
                {STATUS_LABEL[j.status] || j.status.toUpperCase()}
              </span>
              {/* Editar */}
              <button onClick={() => setModalJogo(j)} style={{
                background: 'rgba(245,208,32,0.15)', border: '1px solid rgba(245,208,32,0.4)', borderRadius: 6,
                color: '#F5D020', cursor: 'pointer', padding: '4px 10px', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600,
              }}>
                ✏️ Editar
              </button>
              {/* Apagar */}
              {j.status !== 'aberto' && (
                <button onClick={() => apagarJogo(j.id, `${j.time_a} vs ${j.time_b}`)} style={{
                  background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.4)', borderRadius: 6,
                  color: '#E53935', cursor: 'pointer', padding: '4px 10px', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600,
                }}>
                  🗑️
                </button>
              )}
            </div>
          </div>

          {/* Ações de status */}
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {j.status === 'fechado' && (
              <button className="btn-verde" style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => mudarStatus(j.id, 'aberto')}>🟢 Abrir para Apostas</button>
            )}
            {j.status === 'aberto' && (
              <button className="btn-verde" style={{ fontSize: 13, padding: '6px 14px', background: '#F57C00' }} onClick={() => mudarStatus(j.id, 'encerrado')}>🔒 Fechar Mercado</button>
            )}
            {j.status === 'encerrado' && (
              <>
                <button className="btn-verde" style={{ fontSize: 13, padding: '6px 14px', background: '#1565C0' }} onClick={() => mudarStatus(j.id, 'aberto')}>
                  🔓 Reabrir Mercado
                </button>
                <select value={resultado[j.id] || ''} onChange={e => setResultado({ ...resultado, [j.id]: e.target.value })}
                  style={{ background: '#003D2B', color: '#fff', border: '1px solid #00874F', borderRadius: 6, padding: '6px 10px', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
                  <option value="">Selecionar resultado</option>
                  <option value="A">{j.flag_a} {j.time_a} venceu</option>
                  <option value="empate">🤝 Empate</option>
                  <option value="B">{j.flag_b} {j.time_b} venceu</option>
                </select>
                <button className="btn-amarelo" style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => finalizar(j.id)}>Confirmar resultado</button>
              </>
            )}
            {j.status === 'finalizado' && (
              <button className="btn-verde" style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => verRelatorio(j.id)}>Ver relatório</button>
            )}
          </div>

          {/* ⚽ Mercado Artilheiro — só exibe quando existe; criação/edição via modal */}
          {(() => {
            const art = artilheiros[j.id];
            if (!art) return (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,135,79,0.12)' }}>
                <span style={{ fontSize: 11, color: 'rgba(176,190,197,0.5)' }}>⚽ Sem artilheiro — ative no ✏️ Editar</span>
              </div>
            );
            const labelA = art.jogador_a || `${j.flag_a} ${j.time_a}`;
            const labelB = art.jogador_b || `${j.flag_b} ${j.time_b}`;
            return (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,135,79,0.15)' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: art.resultado ? 0 : 6 }}>
                  <span style={{ fontSize: 11, color: '#B0BEC5', fontWeight: 600 }}>⚽ Artilheiro</span>
                  <span style={{ fontSize: 11, color: '#B0BEC5' }}>
                    Pote: <strong style={{ color: '#F5D020' }}>R$ {Number(art.pote_total || 0).toFixed(2)}</strong>
                    {' · '}{art.num_apostas || 0} apostas
                  </span>
                  {art.resultado && (
                    <span style={{ fontSize: 11, color: '#43A047', fontWeight: 700 }}>
                      ✅ {art.resultado === 'A' ? labelA : art.resultado === 'B' ? labelB : '🤝 Empate'}
                    </span>
                  )}
                  <button onClick={() => verRelatorioArt(art.id)} style={{ background: 'rgba(25,118,210,0.15)', border: '1px solid rgba(25,118,210,0.3)', borderRadius: 5, color: '#42A5F5', cursor: 'pointer', padding: '3px 8px', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                    📊 Apostas
                  </button>
                </div>

                {!art.resultado && art.status === 'fechado' && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button onClick={() => mudarStatusArt(art.id, 'aberto')} style={{ background: 'rgba(67,160,71,0.15)', border: '1px solid rgba(67,160,71,0.3)', borderRadius: 5, color: '#43A047', cursor: 'pointer', padding: '3px 8px', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                      🟢 Reabrir Artilheiro
                    </button>
                    <select value={resultadoArt[art.id] || ''} onChange={e => setResultadoArt({ ...resultadoArt, [art.id]: e.target.value })}
                      style={{ background: '#003D2B', color: '#fff', border: '1px solid #00874F', borderRadius: 5, padding: '3px 8px', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                      <option value="">Selecionar artilheiro...</option>
                      <option value="A">{labelA}</option>
                      <option value="empate">🤝 Empate</option>
                      <option value="B">{labelB}</option>
                    </select>
                    <button onClick={() => finalizarArtilheiro(art.id, labelA, labelB)} className="btn-amarelo" style={{ fontSize: 11, padding: '3px 10px' }}>🏆 Finalizar</button>
                    <button onClick={() => deletarArtilheiro(art.id)} style={{ background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.3)', borderRadius: 5, color: '#E53935', cursor: 'pointer', padding: '3px 8px', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ))}
    </div>
  );
}

// ─── Apostadores ──────────────────────────────────────────────────────────────
function GestaoApostadores() {
  const { headers } = useAdmin();
  const [lista, setLista] = useState([]);
  const [expandido, setExpandido] = useState(null);
  const [busca, setBusca] = useState('');

  // Reset de senha
  const [resetId, setResetId]     = useState(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [resetMsg, setResetMsg]   = useState({});

  // Ajuste de saldo
  const [ajusteId, setAjusteId]     = useState(null);
  const [ajusteValor, setAjusteValor] = useState('');
  const [ajusteMotivo, setAjusteMotivo] = useState('');
  const [ajusteMsg, setAjusteMsg]   = useState({});

  const fetchLista = useCallback(() => {
    axios.get('/api/admin/apostadores', { headers }).then(r => setLista(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchLista(); }, [fetchLista]);

  async function resetarSenha(id) {
    if (!novaSenha || novaSenha.length < 4) return setResetMsg({ [id]: '⚠️ Mínimo 4 caracteres' });
    try {
      const r = await axios.patch(`/api/admin/apostadores/${id}/resetar-senha`, { nova_senha: novaSenha }, { headers });
      setResetMsg({ [id]: `✅ Senha de "${r.data.nome}" redefinida!` });
      setNovaSenha('');
      setResetId(null);
    } catch (e) {
      setResetMsg({ [id]: '❌ ' + (e.response?.data?.erro || 'Erro') });
    }
  }

  async function ajustarSaldo(id) {
    const num = parseFloat(ajusteValor);
    if (!num || isNaN(num)) return setAjusteMsg({ [id]: '⚠️ Valor inválido' });
    if (!ajusteMotivo.trim()) return setAjusteMsg({ [id]: '⚠️ Informe o motivo' });
    try {
      const r = await axios.patch(`/api/admin/apostadores/${id}/ajustar-saldo`, { valor: num, motivo: ajusteMotivo }, { headers });
      setAjusteMsg({ [id]: `✅ Saldo de "${r.data.nome}" → R$ ${Number(r.data.novo_saldo).toFixed(2)}` });
      setAjusteValor('');
      setAjusteMotivo('');
      setAjusteId(null);
      fetchLista();
    } catch (e) {
      setAjusteMsg({ [id]: '❌ ' + (e.response?.data?.erro || 'Erro') });
    }
  }

  const filtrados = lista.filter(a =>
    !busca || a.nome.toLowerCase().includes(busca.toLowerCase()) || (a.telefone || '').includes(busca)
  );

  return (
    <div>
      {/* Busca */}
      <input
        className="input-golbet"
        placeholder="🔍 Buscar por nome ou telefone..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        style={{ marginBottom: 14, width: '100%', maxWidth: 340 }}
      />

      {filtrados.length === 0 && <p style={{ color: '#B0BEC5' }}>Nenhum apostador encontrado.</p>}

      {filtrados.map(a => {
        const aberto = expandido === a.id;
        return (
          <div key={a.id} className="card-golbet" style={{ marginBottom: 10 }}>
            {/* Linha principal */}
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: 10 }}
              onClick={() => { setExpandido(aberto ? null : a.id); setResetId(null); setAjusteId(null); }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{a.nome}</div>
                <div style={{ fontSize: 12, color: '#B0BEC5', marginTop: 2 }}>{a.telefone || 'sem telefone'} · cadastrado {new Date(a.criado_em).toLocaleDateString('pt-BR')}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#F5D020' }}>R$ {Number(a.saldo).toFixed(2)}</div>
                <div style={{ fontSize: 11, color: '#B0BEC5' }}>saldo</div>
              </div>
              {aberto ? <ChevronUp size={16} style={{ color: '#B0BEC5', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: '#B0BEC5', flexShrink: 0 }} />}
            </div>

            {/* Detalhes expandidos */}
            {aberto && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(0,194,100,0.1)' }}>
                {/* Estatísticas */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: 'Total depositado', val: `R$ ${Number(a.total_depositado).toFixed(2)}`, color: '#43A047' },
                    { label: 'Total apostado',   val: `R$ ${Number(a.total_apostado).toFixed(2)}`,   color: '#E53935' },
                    { label: 'Total ganho',      val: `R$ ${Number(a.total_ganho).toFixed(2)}`,      color: '#43A047' },
                    { label: 'Total sacado',     val: `R$ ${Number(a.total_sacado).toFixed(2)}`,     color: '#B0BEC5' },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 11, color: '#B0BEC5', marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.val}</div>
                    </div>
                  ))}
                </div>

                {/* Botões de ação */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <button
                    onClick={() => { setResetId(resetId === a.id ? null : a.id); setAjusteId(null); setNovaSenha(''); }}
                    style={{ padding: '7px 14px', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      background: resetId === a.id ? '#1565C0' : 'rgba(21,101,192,0.2)',
                      color: '#90CAF9', border: '1px solid rgba(21,101,192,0.4)' }}
                  >
                    🔑 Redefinir senha
                  </button>
                  <button
                    onClick={() => { setAjusteId(ajusteId === a.id ? null : a.id); setResetId(null); setAjusteValor(''); setAjusteMotivo(''); }}
                    style={{ padding: '7px 14px', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      background: ajusteId === a.id ? '#E65100' : 'rgba(230,81,0,0.15)',
                      color: '#FFCC80', border: '1px solid rgba(230,81,0,0.35)' }}
                  >
                    💰 Ajustar saldo
                  </button>
                </div>

                {/* Form: reset de senha */}
                {resetId === a.id && (
                  <div style={{ background: 'rgba(21,101,192,0.1)', border: '1px solid rgba(21,101,192,0.3)', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                    <div style={{ fontSize: 13, color: '#90CAF9', fontWeight: 700, marginBottom: 10 }}>🔑 Nova senha para {a.nome}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <input
                        className="input-golbet"
                        type="text"
                        placeholder="Nova senha (mín. 4 caracteres)"
                        value={novaSenha}
                        onChange={e => setNovaSenha(e.target.value)}
                        style={{ flex: 1, minWidth: 180 }}
                        onKeyDown={e => e.key === 'Enter' && resetarSenha(a.id)}
                      />
                      <button
                        onClick={() => resetarSenha(a.id)}
                        style={{ padding: '8px 16px', background: '#1565C0', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
                      >
                        Salvar
                      </button>
                    </div>
                    {resetMsg[a.id] && <div style={{ marginTop: 8, fontSize: 13, color: resetMsg[a.id].startsWith('✅') ? '#43A047' : '#E53935' }}>{resetMsg[a.id]}</div>}
                  </div>
                )}

                {/* Form: ajuste de saldo */}
                {ajusteId === a.id && (
                  <div style={{ background: 'rgba(230,81,0,0.08)', border: '1px solid rgba(230,81,0,0.3)', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                    <div style={{ fontSize: 13, color: '#FFCC80', fontWeight: 700, marginBottom: 10 }}>💰 Ajustar saldo de {a.nome} (saldo atual: R$ {Number(a.saldo).toFixed(2)})</div>
                    <div style={{ fontSize: 12, color: '#B0BEC5', marginBottom: 8 }}>Use valor positivo para crédito, negativo para débito. Ex: 50 ou -20</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <input
                        className="input-golbet"
                        type="number"
                        step="0.01"
                        placeholder="Valor (+50 ou -20)"
                        value={ajusteValor}
                        onChange={e => setAjusteValor(e.target.value)}
                        style={{ flex: 1, minWidth: 130 }}
                      />
                      <input
                        className="input-golbet"
                        type="text"
                        placeholder="Motivo (ex: bônus, correção)"
                        value={ajusteMotivo}
                        onChange={e => setAjusteMotivo(e.target.value)}
                        style={{ flex: 2, minWidth: 180 }}
                        onKeyDown={e => e.key === 'Enter' && ajustarSaldo(a.id)}
                      />
                      <button
                        onClick={() => ajustarSaldo(a.id)}
                        style={{ padding: '8px 16px', background: '#E65100', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
                      >
                        Aplicar
                      </button>
                    </div>
                    {ajusteMsg[a.id] && <div style={{ fontSize: 13, color: ajusteMsg[a.id].startsWith('✅') ? '#43A047' : '#E53935' }}>{ajusteMsg[a.id]}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Longo Prazo (admin) ──────────────────────────────────────────────────────
function GestaoLongoPrazo() {
  const { headers } = useAdmin();
  const [mercados, setMercados] = useState([]);
  const [relatório, setRelatorio] = useState(null);
  const [novoForm, setNovoForm] = useState({ titulo: '', opcoes: '' });
  const [criando, setCriando] = useState(false);
  const [resultado, setResultado] = useState({});
  const [finalizando, setFinalizando] = useState({});

  const fetchMercados = useCallback(() => {
    axios.get('/api/admin/longo-prazo/mercados', { headers })
      .then(r => setMercados(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchMercados(); }, [fetchMercados]);

  async function criarMercado(e) {
    e.preventDefault();
    const opcoes = novoForm.opcoes.split('\n').map(o => o.trim()).filter(Boolean);
    if (!novoForm.titulo.trim() || opcoes.length < 2) {
      return alert('Informe o título e pelo menos 2 opções (uma por linha)');
    }
    try {
      await axios.post('/api/admin/longo-prazo/mercados', { titulo: novoForm.titulo, opcoes }, { headers });
      setNovoForm({ titulo: '', opcoes: '' });
      setCriando(false);
      fetchMercados();
    } catch (e) {
      alert(e.response?.data?.erro || 'Erro ao criar mercado');
    }
  }

  async function alterarStatus(id, status) {
    try {
      await axios.patch(`/api/admin/longo-prazo/mercados/${id}/status`, { status }, { headers });
      fetchMercados();
    } catch (e) {
      alert(e.response?.data?.erro || 'Erro ao alterar status');
    }
  }

  async function finalizarMercado(id) {
    if (!resultado[id]) return alert('Selecione o resultado vencedor');
    if (!window.confirm(`Confirmar "${resultado[id]}" como vencedor? Isso distribuirá os prêmios e não pode ser desfeito.`)) return;
    setFinalizando(f => ({ ...f, [id]: true }));
    try {
      await axios.patch(`/api/admin/longo-prazo/mercados/${id}/finalizar`, { resultado: resultado[id] }, { headers });
      fetchMercados();
    } catch (e) {
      alert(e.response?.data?.erro || 'Erro ao finalizar');
    }
    setFinalizando(f => ({ ...f, [id]: false }));
  }

  async function apagarMercado(id, titulo) {
    if (!window.confirm(`Apagar o mercado "${titulo}"? Os saldos serão devolvidos aos apostadores.`)) return;
    try {
      await axios.delete(`/api/admin/longo-prazo/mercados/${id}`, { headers });
      fetchMercados();
    } catch (e) {
      alert(e.response?.data?.erro || 'Erro ao apagar');
    }
  }

  async function verApostas(id) {
    const r = await axios.get(`/api/admin/longo-prazo/mercados/${id}/apostas`, { headers });
    setRelatorio(r.data);
  }

  const STATUS_COR = { aberto: '#43A047', fechado: '#757575' };
  const STATUS_LABEL_LP = { aberto: '🟢 ABERTO', fechado: '🔒 FECHADO' };

  return (
    <div>
      {/* Modal relatório de apostas */}
      {relatório && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card-golbet" style={{ maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>📊 {relatório.mercado.titulo}</h3>
              <button onClick={() => setRelatorio(null)} style={{ background: 'none', border: 'none', color: '#B0BEC5', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            {relatório.mercado.resultado && (
              <div style={{ background: 'rgba(67,160,71,0.15)', border: '1px solid #43A047', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 14 }}>
                🏆 Resultado: <strong>{relatório.mercado.resultado}</strong>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14, fontSize: 13 }}>
              <div>Pote total: <strong>R$ {Number(relatório.poteTotal).toFixed(2)}</strong></div>
              <div>Taxa casa (10%): <strong style={{ color: '#E53935' }}>R$ {Number(relatório.taxaCasa).toFixed(2)}</strong></div>
              <div>Pote prêmios: <strong style={{ color: '#43A047' }}>R$ {Number(relatório.potePremios).toFixed(2)}</strong></div>
              <div>Total apostas: <strong>{relatório.apostas.length}</strong></div>
            </div>
            {/* Breakdown por opção */}
            <div style={{ marginBottom: 12 }}>
              {relatório.mercado.opcoes.map(op => {
                const total = relatório.apostas.filter(a => a.opcao_escolhida === op).reduce((s, a) => s + a.valor, 0);
                return (
                  <div key={op} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(0,135,79,0.15)' }}>
                    <span style={{ color: relatório.mercado.resultado === op ? '#43A047' : '#fff', fontWeight: relatório.mercado.resultado === op ? 700 : 400 }}>
                      {relatório.mercado.resultado === op ? '🏆 ' : ''}{op}
                    </span>
                    <span>R$ {total.toFixed(2)} ({relatório.apostas.filter(a => a.opcao_escolhida === op).length} apostas)</span>
                  </div>
                );
              })}
            </div>
            {relatório.apostas.length > 0 && (
              <>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>Apostadores:</div>
                {relatório.apostas.map(a => (
                  <div key={a.id} style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid rgba(0,135,79,0.15)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{a.nome} — <strong style={{ color: '#FFD000' }}>{a.opcao_escolhida}</strong> · R$ {Number(a.valor).toFixed(2)}</span>
                    <span>
                      {a.status === 'ganhou' && <span style={{ color: '#43A047', fontWeight: 700 }}>+R$ {Number(a.premio).toFixed(2)} ✅</span>}
                      {a.status === 'perdeu' && <span style={{ color: '#E53935' }}>❌</span>}
                      {a.status === 'pendente' && <span style={{ color: '#F57C00' }}>⏳</span>}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Form criar novo mercado */}
      {criando ? (
        <div className="card-golbet" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>➕ Novo Mercado de Longo Prazo</h3>
          <form onSubmit={criarMercado} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#B0BEC5', display: 'block', marginBottom: 4 }}>Título do mercado</label>
              <input
                className="input-golbet"
                value={novoForm.titulo}
                onChange={e => setNovoForm({ ...novoForm, titulo: e.target.value })}
                placeholder="Ex: Quem será o campeão da GolBet?"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#B0BEC5', display: 'block', marginBottom: 4 }}>
                Opções (uma por linha, mín. 2)
              </label>
              <textarea
                className="input-golbet"
                style={{ minHeight: 120, resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
                value={novoForm.opcoes}
                onChange={e => setNovoForm({ ...novoForm, opcoes: e.target.value })}
                placeholder={'Brasil\nArgentina\nPortugal\nAlemanha'}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-amarelo" type="submit" style={{ flex: 1, padding: '10px 0', fontSize: 14 }}>✅ Criar Mercado</button>
              <button type="button" onClick={() => setCriando(false)} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: '1px solid #B0BEC5', borderRadius: 6, color: '#B0BEC5', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>Cancelar</button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <button className="btn-amarelo" style={{ padding: '9px 20px', fontSize: 14 }} onClick={() => setCriando(true)}>
            ➕ Novo Mercado
          </button>
        </div>
      )}

      {mercados.length === 0 && <p style={{ color: '#B0BEC5' }}>Nenhum mercado de longo prazo criado.</p>}

      {mercados.map(m => (
        <div key={m.id} className="card-golbet" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{m.titulo}</div>
              <div style={{ fontSize: 12, color: '#B0BEC5', marginBottom: 6 }}>
                {m.num_apostas} apostas · Pote: <strong style={{ color: '#F5D020' }}>R$ {Number(m.pote_total || 0).toFixed(2)}</strong>
                {m.resultado && <> · 🏆 Vencedor: <strong style={{ color: '#43A047' }}>{m.resultado}</strong></>}
              </div>
              {/* Opções disponíveis */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {m.opcoes.map(op => (
                  <span key={op} style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 10,
                    background: m.resultado === op ? 'rgba(67,160,71,0.2)' : 'rgba(0,0,0,0.3)',
                    border: m.resultado === op ? '1px solid #43A047' : '1px solid rgba(0,135,79,0.3)',
                    color: m.resultado === op ? '#43A047' : '#B0BEC5',
                    fontWeight: m.resultado === op ? 700 : 400,
                  }}>
                    {m.resultado === op ? '🏆 ' : ''}{op}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Badge status */}
              <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COR[m.status] || '#757575', background: `${STATUS_COR[m.status] || '#757575'}22`, padding: '3px 10px', borderRadius: 10 }}>
                {m.resultado ? '✅ FINALIZADO' : (STATUS_LABEL_LP[m.status] || m.status.toUpperCase())}
              </span>
              {/* Relatório */}
              <button onClick={() => verApostas(m.id)} style={{ background: 'rgba(25,118,210,0.15)', border: '1px solid rgba(25,118,210,0.4)', borderRadius: 6, color: '#42A5F5', cursor: 'pointer', padding: '4px 10px', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                📊 Apostas
              </button>
              {/* Apagar (só fechado e não finalizado) */}
              {m.status === 'fechado' && !m.resultado && (
                <button onClick={() => apagarMercado(m.id, m.titulo)} style={{ background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.4)', borderRadius: 6, color: '#E53935', cursor: 'pointer', padding: '4px 10px', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                  🗑️
                </button>
              )}
            </div>
          </div>

          {/* Ações */}
          {!m.resultado && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {m.status === 'aberto' && (
                <button className="btn-verde" style={{ fontSize: 13, padding: '6px 14px', background: '#F57C00' }} onClick={() => alterarStatus(m.id, 'fechado')}>
                  🔒 Fechar Apostas
                </button>
              )}
              {m.status === 'fechado' && (
                <button className="btn-verde" style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => alterarStatus(m.id, 'aberto')}>
                  🟢 Reabrir Apostas
                </button>
              )}
              {m.status === 'fechado' && (
                <>
                  <select
                    value={resultado[m.id] || ''}
                    onChange={e => setResultado({ ...resultado, [m.id]: e.target.value })}
                    style={{ background: '#003D2B', color: '#fff', border: '1px solid #00874F', borderRadius: 6, padding: '6px 10px', fontFamily: 'Inter, sans-serif', fontSize: 13 }}
                  >
                    <option value="">Selecionar vencedor</option>
                    {m.opcoes.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                  <button
                    className="btn-amarelo"
                    style={{ fontSize: 13, padding: '6px 14px' }}
                    onClick={() => finalizarMercado(m.id)}
                    disabled={!!finalizando[m.id]}
                  >
                    {finalizando[m.id] ? 'Processando...' : '🏆 Confirmar Vencedor'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Financeiro (com senha) ───────────────────────────────────────────────────
function Financeiro() {
  const { headers } = useAdmin();
  const [data, setData] = useState(null);
  const [autenticado, setAutenticado] = useState(false);
  const [senhaInput, setSenhaInput] = useState('');
  const [errSenha, setErrSenha] = useState('');

  async function verificarSenha(e) {
    e.preventDefault();
    try {
      await axios.post('/api/admin/login', { senha: senhaInput });
      setAutenticado(true);
    } catch {
      setErrSenha('Senha incorreta');
      setSenhaInput('');
    }
  }

  useEffect(() => {
    if (!autenticado) return;
    axios.get('/api/admin/financeiro', { headers }).then(r => setData(r.data)).catch(() => {});
  }, [autenticado]);

  if (!autenticado) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '48px 20px' }}>
      <div style={{ fontSize: 40 }}>🔐</div>
      <div style={{ fontWeight: 700, fontSize: 17 }}>Acesso Restrito</div>
      <div style={{ fontSize: 13, color: '#B0BEC5', textAlign: 'center', maxWidth: 300 }}>
        Confirme a senha de administrador para visualizar o relatório financeiro
      </div>
      <form onSubmit={verificarSenha} style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
        <input
          className="input-golbet"
          type="password"
          value={senhaInput}
          onChange={e => setSenhaInput(e.target.value)}
          placeholder="Senha do admin"
          autoFocus
          required
        />
        {errSenha && <div style={{ color: '#E53935', fontSize: 13 }}>{errSenha}</div>}
        <button className="btn-amarelo" type="submit" style={{ padding: '11px 0', fontSize: 14 }}>
          🔓 Confirmar acesso
        </button>
      </form>
    </div>
  );

  if (!data) return <div style={{ color: '#B0BEC5' }}>Carregando...</div>;

  const items = [
    { label: 'Total Depositado', value: data.totalDepositado, color: '#43A047', icon: '💰' },
    { label: 'Total Sacado', value: data.totalSacado, color: '#E53935', icon: '💸' },
    { label: 'Lucro da Casa', value: data.lucroCasa, color: '#FFD000', icon: '🏦' },
    { label: 'Total Apostado', value: data.totalApostado, color: '#1976D2', icon: '🎯' },
    { label: 'Total Prêmios Pagos', value: data.totalGanho, color: '#FF9800', icon: '🏆' },
    { label: 'Saldo Total Clientes', value: data.saldoTotal, color: '#00BCD4', icon: '👥' },
    { label: 'Apostas Ativas (R$)', value: data.apostasAtivas, color: '#9C27B0', icon: '⏳' },
    { label: 'Saques Pendentes (R$)', value: data.saquesPendentes, color: '#F57C00', icon: '⚠️' },
  ];

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Dashboard Financeiro</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {items.map(item => (
          <div key={item.label} className="card-golbet" style={{ padding: '16px 14px' }}>
            <div style={{ fontSize: 12, color: '#B0BEC5', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{item.icon}</span> {item.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>
              R$ {Number(item.value || 0).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
      <div className="card-golbet" style={{ marginTop: 14, padding: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: '#B0BEC5' }}>Total de Apostadores</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#FFD000' }}>{data.totalApostadores}</div>
      </div>
    </div>
  );
}

// ─── Gestão Extras (Ambos Marcam / Mais-Menos / Pênaltis) ────────────────────
function GestaoExtras() {
  const { headers } = useAdmin();
  const [mercados, setMercados] = useState([]);
  const [jogos, setJogos] = useState([]);
  const [form, setForm] = useState({ jogo_id: '', tipo: 'ambos_marcam', linha: '2.5' });
  const [finRes, setFinRes] = useState({});
  const [loading, setLoading] = useState({});

  const TIPOS = { ambos_marcam: 'Ambos Marcam', mais_menos: 'Mais/Menos Gols', penaltis: 'Pênaltis' };
  const OPC = { ambos_marcam: ['sim', 'nao'], mais_menos: ['mais', 'menos'], penaltis: ['sim', 'nao'] };
  const OPC_LABEL = { sim: 'Sim', nao: 'Não', mais: 'Mais', menos: 'Menos' };

  const fetchMercados = useCallback(() => {
    axios.get('/api/extras/admin/lista', { headers }).then(r => setMercados(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchMercados();
    axios.get('/api/jogos').then(r => setJogos(r.data)).catch(() => {});
  }, [fetchMercados]);

  async function criar(e) {
    e.preventDefault();
    try {
      await axios.post('/api/extras/admin/criar', {
        jogo_id: parseInt(form.jogo_id),
        tipo: form.tipo,
        linha: form.tipo === 'mais_menos' ? parseFloat(form.linha) : undefined,
      }, { headers });
      setForm({ jogo_id: '', tipo: 'ambos_marcam', linha: '2.5' });
      fetchMercados();
    } catch (e) { alert(e.response?.data?.erro || 'Erro'); }
  }

  async function finalizar(id) {
    if (!finRes[id]) return alert('Selecione o resultado');
    setLoading(prev => ({ ...prev, [id]: true }));
    try {
      await axios.post('/api/extras/admin/finalizar', { mercado_id: id, resultado: finRes[id] }, { headers });
      fetchMercados();
    } catch (e) { alert(e.response?.data?.erro || 'Erro'); }
    setLoading(prev => ({ ...prev, [id]: false }));
  }

  async function excluir(id) {
    if (!confirm('Excluir mercado? Apostas serão devolvidas.')) return;
    try {
      await axios.delete(`/api/extras/admin/${id}`, { headers });
      fetchMercados();
    } catch (e) { alert(e.response?.data?.erro || 'Erro'); }
  }

  return (
    <div>
      {/* Form criar */}
      <form onSubmit={criar} className="card-golbet" style={{ padding: 16, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={{ fontSize: 12, color: '#B0BEC5', display: 'block', marginBottom: 4 }}>Jogo</label>
          <select className="input-golbet" value={form.jogo_id} onChange={e => setForm({ ...form, jogo_id: e.target.value })} required>
            <option value="">Selecione...</option>
            {jogos.map(j => <option key={j.id} value={j.id}>{j.flag_a} {j.time_a} vs {j.time_b} {j.flag_b}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 140 }}>
          <label style={{ fontSize: 12, color: '#B0BEC5', display: 'block', marginBottom: 4 }}>Tipo</label>
          <select className="input-golbet" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
            {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {form.tipo === 'mais_menos' && (
          <div style={{ minWidth: 80 }}>
            <label style={{ fontSize: 12, color: '#B0BEC5', display: 'block', marginBottom: 4 }}>Linha</label>
            <input className="input-golbet" type="number" step="0.5" value={form.linha} onChange={e => setForm({ ...form, linha: e.target.value })} style={{ width: 70 }} />
          </div>
        )}
        <button className="btn-amarelo" type="submit" style={{ padding: '10px 20px' }}>Criar Mercado</button>
      </form>

      {/* Lista */}
      {mercados.map(m => (
        <div key={m.id} className="card-golbet" style={{ padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{TIPOS[m.tipo]}{m.tipo === 'mais_menos' ? ` (${m.linha})` : ''}</span>
              <span style={{ fontSize: 12, color: '#B0BEC5', marginLeft: 8 }}>{m.flag_a} {m.time_a} vs {m.time_b} {m.flag_b}</span>
            </div>
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: m.status === 'aberto' ? 'rgba(0,194,100,0.15)' : 'rgba(255,255,255,0.1)', color: m.status === 'aberto' ? '#00C264' : '#B0BEC5' }}>
              {m.status}
            </span>
          </div>

          <div style={{ fontSize: 12, color: '#B0BEC5', marginBottom: 6 }}>
            Pote: <strong style={{ color: '#FFD000' }}>R$ {Number(m.pote_total).toFixed(2)}</strong> · {m.apostas?.length || 0} apostas
          </div>

          {m.apostas?.length > 0 && (
            <div style={{ fontSize: 11, color: '#B0BEC5', marginBottom: 8, maxHeight: 100, overflowY: 'auto' }}>
              {m.apostas.map(a => (
                <div key={a.id} style={{ padding: '2px 0' }}>
                  {a.nome}: {OPC_LABEL[a.opcao_escolhida]} · R$ {Number(a.valor).toFixed(2)}
                  {a.status === 'ganhou' && <span style={{ color: '#00C264' }}> ✅ R$ {Number(a.premio).toFixed(2)}</span>}
                  {a.status === 'perdeu' && <span style={{ color: '#E53935' }}> ❌</span>}
                </div>
              ))}
            </div>
          )}

          {m.status === 'aberto' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="input-golbet" style={{ flex: 1, minWidth: 100 }} value={finRes[m.id] || ''} onChange={e => setFinRes(prev => ({ ...prev, [m.id]: e.target.value }))}>
                <option value="">Resultado...</option>
                {(OPC[m.tipo] || []).map(o => <option key={o} value={o}>{OPC_LABEL[o]}</option>)}
              </select>
              <button className="btn-amarelo" style={{ padding: '8px 14px', fontSize: 12 }} onClick={() => finalizar(m.id)} disabled={loading[m.id]}>
                {loading[m.id] ? '...' : '🏆 Finalizar'}
              </button>
              <button onClick={() => excluir(m.id)} style={{ background: 'none', border: '1px solid #E53935', color: '#E53935', borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontSize: 11 }}>
                Excluir
              </button>
            </div>
          )}

          {m.resultado && (
            <div style={{ fontSize: 12, color: '#00C264', fontWeight: 600 }}>Resultado: {OPC_LABEL[m.resultado]} · Taxa: R$ {Number(m.taxa_casa).toFixed(2)}</div>
          )}
        </div>
      ))}
      {mercados.length === 0 && <div style={{ color: '#B0BEC5', textAlign: 'center', padding: 20 }}>Nenhum mercado extra criado.</div>}
    </div>
  );
}

// ─── Admin principal ──────────────────────────────────────────────────────────
export default function Admin() {
  const [logado, setLogado] = useState(() => !!localStorage.getItem('golbet_admin'));
  const [aba, setAba] = useState('dashboard');

  if (!logado) return <AdminLogin onLogin={() => setLogado(true)} />;

  const COMP = { dashboard: Dashboard, financeiro: Financeiro, depositos: GestaoDepositos, saques: GestaoSaques, jogos: GestaoJogos, longoplazo: GestaoLongoPrazo, apostadores: GestaoApostadores };
  const Comp = COMP[aba];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={22} style={{ color: '#F5D020' }} />
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Painel Admin</h1>
        </div>
        <button onClick={() => { localStorage.removeItem('golbet_admin'); setLogado(false); }}
          style={{ background: 'none', border: '1px solid #E53935', color: '#E53935', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
          Sair
        </button>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(0,135,79,0.3)', flexWrap: 'wrap' }}>
        {Object.entries(ABA).map(([k, v]) => (
          <button key={k} onClick={() => setAba(k)} style={{
            background: 'none', border: 'none', color: aba === k ? '#F5D020' : '#B0BEC5', cursor: 'pointer', padding: '10px 16px',
            fontWeight: aba === k ? 700 : 400, fontSize: 14, borderBottom: aba === k ? '2px solid #F5D020' : '2px solid transparent',
            fontFamily: 'Inter, sans-serif', marginBottom: -1,
          }}>
            {v}
          </button>
        ))}
      </div>

      <Comp />
    </div>
  );
}
