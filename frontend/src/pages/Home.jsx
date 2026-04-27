import { useState, useEffect } from 'react';
import axios from 'axios';
import JogoCard from '../components/JogoCard';
import { useAuth } from '../context/AuthContext';
import { Trophy } from 'lucide-react';

const FILTROS = ['Todos', 'Abertos', 'Encerrados', 'Finalizados', 'Fechados'];

export default function Home() {
  const { usuario } = useAuth();
  const [jogos, setJogos] = useState([]);
  const [minhasApostas, setMinhasApostas] = useState([]);
  const [filtro, setFiltro] = useState('Todos');
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

  const filtroMap = { Todos: null, Abertos: 'aberto', Encerrados: 'encerrado', Finalizados: 'finalizado', Fechados: 'fechado' };
  const jogosFiltrados = filtro === 'Todos' ? jogos : jogos.filter(j => j.status === filtroMap[filtro]);

  const apostaMap = {};
  minhasApostas.forEach(a => { apostaMap[a.jogo_id] = a; });

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#B0BEC5' }}>Carregando jogos...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Trophy size={22} style={{ color: '#F5D020' }} />
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Copa do Mundo Rolemberg</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#B0BEC5' }}>{jogos.filter(j => j.status === 'aberto').length} jogos com apostas abertas</p>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTROS.map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            background: filtro === f ? '#F5D020' : 'rgba(0,135,79,0.2)',
            color: filtro === f ? '#000' : '#fff',
            border: filtro === f ? 'none' : '1px solid rgba(0,135,79,0.4)',
          }}>
            {f}
          </button>
        ))}
      </div>

      {!usuario && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(245,208,32,0.1)', border: '1px solid rgba(245,208,32,0.3)', borderRadius: 8, fontSize: 13, color: '#F5D020' }}>
          ⚡ <a href="/login" style={{ color: '#F5D020', fontWeight: 700 }}>Faça login</a> para apostar nos jogos
        </div>
      )}

      {jogosFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#B0BEC5' }}>Nenhum jogo nesta categoria.</div>
      ) : (
        jogosFiltrados.map(jogo => (
          <JogoCard key={jogo.id} jogo={jogo} minhaAposta={apostaMap[jogo.id]} />
        ))
      )}
    </div>
  );
}
