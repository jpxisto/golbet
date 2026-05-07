import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ShieldCheck, Users, DollarSign, Trophy, ChevronDown, ChevronUp } from 'lucide-react';

const ABA = { dashboard: 'Dashboard', depositos: 'Depósitos', saques: 'Saques', jogos: 'Jogos', longoplazo: 'Longo Prazo', apostadores: 'Apostadores' };

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
    { label: 'Lucro da casa', val: `R$ ${Number(stats.lucroCasa).toFixed(2)}`, icon: <Trophy size={20} />, color: '#43A047' },
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

  async function salvar() {
    if (!form.time_a.trim() || !form.time_b.trim()) return setErro('Informe os dois times');
    setSalvando(true);
    try {
      if (editando) {
        await axios.put(`/api/admin/jogos/${jogo.id}`, form, { headers });
      } else {
        await axios.post('/api/admin/jogos', form, { headers });
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

  const fetchJogos = useCallback(() => {
    axios.get('/api/admin/jogos', { headers }).then(r => setJogos(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchJogos(); }, [fetchJogos]);

  async function mudarStatus(id, status) {
    await axios.patch(`/api/admin/jogos/${id}/status`, { status }, { headers });
    fetchJogos();
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
        </div>
      ))}
    </div>
  );
}

// ─── Apostadores ──────────────────────────────────────────────────────────────
function GestaoApostadores() {
  const { headers } = useAdmin();
  const [lista, setLista] = useState([]);

  useEffect(() => {
    axios.get('/api/admin/apostadores', { headers }).then(r => setLista(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      {lista.length === 0 && <p style={{ color: '#B0BEC5' }}>Nenhum apostador cadastrado.</p>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#003D2B', color: '#B0BEC5' }}>
              {['Nome', 'Telefone', 'Saldo', 'Depositado', 'Apostado', 'Ganho', 'Sacado'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid rgba(0,135,79,0.3)', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((a, i) => (
              <tr key={a.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.1)' }}>
                <td style={{ padding: '9px 12px', fontWeight: 600 }}>{a.nome}</td>
                <td style={{ padding: '9px 12px', color: '#B0BEC5' }}>{a.telefone}</td>
                <td style={{ padding: '9px 12px', color: '#F5D020', fontWeight: 700 }}>R$ {Number(a.saldo).toFixed(2)}</td>
                <td style={{ padding: '9px 12px', color: '#43A047' }}>R$ {Number(a.total_depositado).toFixed(2)}</td>
                <td style={{ padding: '9px 12px', color: '#E53935' }}>R$ {Number(a.total_apostado).toFixed(2)}</td>
                <td style={{ padding: '9px 12px', color: '#43A047' }}>R$ {Number(a.total_ganho).toFixed(2)}</td>
                <td style={{ padding: '9px 12px', color: '#B0BEC5' }}>R$ {Number(a.total_sacado).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
                placeholder="Ex: Quem será o campeão da Copa Rolemberg?"
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

// ─── Admin principal ──────────────────────────────────────────────────────────
export default function Admin() {
  const [logado, setLogado] = useState(() => !!localStorage.getItem('golbet_admin'));
  const [aba, setAba] = useState('dashboard');

  if (!logado) return <AdminLogin onLogin={() => setLogado(true)} />;

  const COMP = { dashboard: Dashboard, depositos: GestaoDepositos, saques: GestaoSaques, jogos: GestaoJogos, longoplazo: GestaoLongoPrazo, apostadores: GestaoApostadores };
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
