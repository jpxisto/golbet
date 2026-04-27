import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, Copy, Check } from 'lucide-react';

const CHAVE_PIX = import.meta.env.VITE_CHAVE_PIX || '(61) 99999-9999';

export default function Deposito() {
  const { usuario, addToast } = useAuth();
  const [valor, setValor] = useState('');
  const [obs, setObs] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [meusDeps, setMeusDeps] = useState([]);
  const [chavePix, setChavePix] = useState(CHAVE_PIX);

  useEffect(() => {
    if (!usuario) return;
    axios.get(`/api/depositos/meus/${usuario.id}`).then(r => setMeusDeps(r.data)).catch(() => {});
  }, [usuario?.id]);

  function copiarChave() {
    navigator.clipboard.writeText(chavePix);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const valorNum = parseFloat(valor);
    if (valorNum < 10) return addToast('Valor mínimo: R$ 10,00', 'erro');
    setLoading(true);
    try {
      await axios.post('/api/depositos', { apostador_id: usuario.id, valor: valorNum, comprovante_info: obs });
      addToast('Solicitação enviada! Aguarde a aprovação do admin ⏳', 'info');
      setValor(''); setObs('');
      const r = await axios.get(`/api/depositos/meus/${usuario.id}`);
      setMeusDeps(r.data);
    } catch (e) {
      addToast(e.response?.data?.erro || 'Erro ao solicitar depósito', 'erro');
    }
    setLoading(false);
  }

  if (!usuario) return <div style={{ padding: 40, textAlign: 'center', color: '#B0BEC5' }}>Faça login primeiro.</div>;

  const statusLabel = { pendente: '⏳ Pendente', aprovado: '✅ Aprovado', rejeitado: '❌ Rejeitado' };
  const statusColor = { pendente: '#F57C00', aprovado: '#43A047', rejeitado: '#E53935' };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <PlusCircle size={22} style={{ color: '#F5D020' }} />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Fazer Depósito</h1>
      </div>

      <div className="card-golbet" style={{ padding: 24, marginBottom: 20 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: '#B0BEC5', display: 'block', marginBottom: 6 }}>Valor do depósito (mínimo R$ 10,00)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#B0BEC5' }}>R$</span>
              <input className="input-golbet" style={{ paddingLeft: 36 }} type="number" min={10} step={1} value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" required />
            </div>
          </div>

          {valor && parseFloat(valor) >= 10 && (
            <div style={{ background: '#003D2B', borderRadius: 8, padding: 16 }}>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#B0BEC5' }}>Transfira via Pix para a chave abaixo:</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#004A35', borderRadius: 6, padding: '10px 14px', border: '1px solid #00874F' }}>
                <span style={{ fontSize: 18 }}>📱</span>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 16, letterSpacing: 1 }}>{chavePix}</span>
                <button type="button" onClick={copiarChave} style={{ background: copiado ? '#43A047' : '#F5D020', border: 'none', borderRadius: 6, padding: '6px 12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                  {copiado ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}
                </button>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 13, color: '#F5D020', fontWeight: 600 }}>
                Valor exato: R$ {parseFloat(valor).toFixed(2)}
              </p>
            </div>
          )}

          <div>
            <label style={{ fontSize: 13, color: '#B0BEC5', display: 'block', marginBottom: 6 }}>Observação para o admin (opcional)</label>
            <input className="input-golbet" value={obs} onChange={e => setObs(e.target.value)} placeholder='Ex: "enviei às 14h, nome no Pix: João Silva"' />
          </div>

          <button className="btn-amarelo" type="submit" style={{ padding: '13px 0', fontSize: 15 }} disabled={loading || !valor}>
            {loading ? 'Enviando...' : '✅ Já fiz o Pix — Aguardar aprovação'}
          </button>
        </form>
      </div>

      {/* Histórico */}
      {meusDeps.length > 0 && (
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Meus depósitos</h3>
          {meusDeps.map(d => (
            <div key={d.id} className="card-golbet" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>R$ {Number(d.valor).toFixed(2)}</div>
                <div style={{ fontSize: 12, color: '#B0BEC5' }}>{new Date(d.criado_em).toLocaleString('pt-BR')}</div>
                {d.motivo_rejeicao && <div style={{ fontSize: 12, color: '#E53935', marginTop: 2 }}>Motivo: {d.motivo_rejeicao}</div>}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: statusColor[d.status] }}>{statusLabel[d.status]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
