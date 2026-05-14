import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { MinusCircle } from 'lucide-react';

const TIPOS_PIX = ['cpf', 'telefone', 'email', 'aleatoria'];
const TIPOS_LABEL = { cpf: 'CPF', telefone: 'Telefone', email: 'E-mail', aleatoria: 'Aleatória' };

export default function Saque() {
  const { usuario, saldo, fetchSaldo, addToast } = useAuth();
  const [form, setForm] = useState({ valor: '', chave_pix_cliente: '', tipo_pix: 'telefone' });
  const [loading, setLoading] = useState(false);
  const [meusSaques, setMeusSaques] = useState([]);

  useEffect(() => {
    if (!usuario) return;
    axios.get(`/api/saques/meus/${usuario.id}`).then(r => setMeusSaques(r.data)).catch(() => {});
  }, [usuario?.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    const valorNum = parseFloat(form.valor);
    if (valorNum < 10) return addToast('Valor mínimo para saque: R$ 10,00', 'erro');
    if (valorNum > saldo) return addToast('Saldo insuficiente', 'erro');
    setLoading(true);
    try {
      await axios.post('/api/saques', { ...form, apostador_id: usuario.id, valor: valorNum });
      addToast('Saque solicitado! O admin fará o Pix em breve 💸', 'sucesso');
      fetchSaldo();
      setForm({ valor: '', chave_pix_cliente: '', tipo_pix: 'telefone' });
      const r = await axios.get(`/api/saques/meus/${usuario.id}`);
      setMeusSaques(r.data);
    } catch (e) {
      addToast(e.response?.data?.erro || 'Erro ao solicitar saque', 'erro');
    }
    setLoading(false);
  }

  if (!usuario) return <div style={{ padding: 40, textAlign: 'center', color: '#B0BEC5' }}>Faça login primeiro.</div>;

  const statusLabel = { pendente: '⏳ Pendente', pago: '✅ Pago', rejeitado: '❌ Rejeitado' };
  const statusColor = { pendente: '#F57C00', pago: '#43A047', rejeitado: '#E53935' };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <MinusCircle size={22} style={{ color: '#F5D020' }} />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Solicitar Saque</h1>
      </div>

      <div className="card-golbet" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ marginBottom: 20, padding: '10px 14px', background: 'rgba(245,208,32,0.1)', border: '1px solid rgba(245,208,32,0.3)', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
          Saldo disponível: <span style={{ color: '#F5D020' }}>R$ {Number(saldo).toFixed(2)}</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: '#B0BEC5', display: 'block', marginBottom: 6 }}>Valor do saque (mínimo R$ 10,00)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#B0BEC5' }}>R$</span>
              <input className="input-golbet" style={{ paddingLeft: 36 }} type="number" min={10} max={saldo} step={0.01}
                value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} placeholder="0,00" required />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, color: '#B0BEC5', display: 'block', marginBottom: 8 }}>Tipo de chave Pix</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TIPOS_PIX.map(t => (
                <button key={t} type="button" onClick={() => setForm({ ...form, tipo_pix: t })} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  background: form.tipo_pix === t ? '#F5D020' : 'rgba(0,135,79,0.2)',
                  color: form.tipo_pix === t ? '#000' : '#fff',
                  border: form.tipo_pix === t ? 'none' : '1px solid rgba(0,135,79,0.4)',
                }}>
                  {TIPOS_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, color: '#B0BEC5', display: 'block', marginBottom: 6 }}>Sua chave Pix para receber</label>
            <input className="input-golbet" value={form.chave_pix_cliente}
              onChange={e => setForm({ ...form, chave_pix_cliente: e.target.value })}
              placeholder={form.tipo_pix === 'telefone' ? '(61) 99999-9999' : form.tipo_pix === 'cpf' ? '000.000.000-00' : form.tipo_pix === 'email' ? 'seuemail@email.com' : 'Chave aleatória'}
              required />
          </div>

          <button className="btn-amarelo" type="submit" style={{ padding: '13px 0', fontSize: 15 }} disabled={loading || !form.valor || parseFloat(form.valor) > saldo}>
            {loading ? 'Solicitando...' : '📤 Solicitar Saque'}
          </button>
        </form>
      </div>

      {meusSaques.length > 0 && (
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--texto-sec)' }}>Meus saques</h3>
          {meusSaques.map(s => (
            <div key={s.id} className="card-golbet" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#FF8C00' }}>-R$ {Number(s.valor).toFixed(2)}</div>
                  <div style={{ fontSize: 12, color: 'var(--texto-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {TIPOS_LABEL[s.tipo_pix]}: {s.chave_pix_cliente}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--texto-muted)', marginTop: 2 }}>{new Date(s.criado_em).toLocaleString('pt-BR')}</div>
                  {s.motivo_rejeicao && <div style={{ fontSize: 12, color: '#FF4545', marginTop: 4 }}>Motivo: {s.motivo_rejeicao}</div>}
                  {s.observacao && <div style={{ fontSize: 12, color: 'var(--texto-muted)', marginTop: 2 }}>Obs: {s.observacao}</div>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: statusColor[s.status], whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {statusLabel[s.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
