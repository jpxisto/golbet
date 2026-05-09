import { useState, useEffect } from 'react';
import axios from 'axios';
import JogoCard from '../components/JogoCard';
import { useAuth } from '../context/AuthContext';
import { Trophy, Zap, Lock } from 'lucide-react';

const FILTROS = [
  { label: 'Todos', val: null },
  { label: '🟢 Abertos', val: 'aberto' },
  { label: '🔒 Encerrados', val: 'encerrado' },
  { label: '✅ Finalizados', val: 'finalizado' },
  { label: '⚪ Fechados', val: 'fechado' },
];

export default function Home() {
  const { usuario } = useAuth();
  const [jogos, setJogos] = useState([]);
  const [minhasApostas, setMinhasApostas] = useState([]);
  const [filtro, setFiltro] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      const [jogosRes, apostasRes] = await Promise.all([
        axios.get('/api/jogos'),
        usuario ? axios.get(`/api/jogos/apostas/minhas/${usuario.id}`) : Promise.resolve({ data: [] }),
      ]);
      setJogos(jogosRes.data);
      setMinhasApostas(apostasRes.data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [usuario?.id]);

  // Atualiza a lista de jogos a cada 45s — detecta quando o admin abre/fecha um jogo
  useEffect(() => {
    const iv = setInterval(fetchData, 45000);
    return () => clearInterval(iv);
  }, [usuario?.id]);

  const jogosFiltrados = filtro ? jogos.filter(j => j.status === filtro) : jogos;
  const apostaMap = {};
  minhasApostas.forEach(a => { apostaMap[a.jogo_id] = a; });
  const abertos = jogos.filter(j => j.status === 'aberto').length;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(0,194,100,0.2)', borderTopColor: '#00C264', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ color: 'var(--texto-muted)', fontSize: 13 }}>Carregando jogos...</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>

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
              Copa do Mundo Rolemberg
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--texto-muted)' }}>
            {jogos.length} jogos no total
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
            {' '}para apostar nos jogos e ganhar prêmios
          </span>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {FILTROS.map(f => (
          <button key={f.label} onClick={() => setFiltro(f.val)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            background: filtro === f.val ? '#FFD000' : 'rgba(0,0,0,0.3)',
            color: filtro === f.val ? '#000' : 'rgba(255,255,255,0.55)',
            border: filtro === f.val ? 'none' : '1px solid rgba(0,194,100,0.15)',
            boxShadow: filtro === f.val ? '0 2px 10px rgba(255,208,0,0.25)' : 'none',
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de jogos */}
      {jogosFiltrados.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 20px',
          color: 'var(--texto-muted)',
          background: 'rgba(0,0,0,0.2)', borderRadius: 12,
          border: '1px solid rgba(0,194,100,0.08)',
        }}>
          <Lock size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: 14 }}>Nenhum jogo nesta categoria</p>
        </div>
      ) : (
        jogosFiltrados.map(jogo => (
          <JogoCard key={jogo.id} jogo={jogo} minhaAposta={apostaMap[jogo.id]} />
        ))
      )}
    </div>
  );
}
