import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, addToast } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', telefone: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post('/api/apostadores/login', form);
      login(data);
      addToast(`Bem-vindo, ${data.nome.split(' ')[0]}! 🎉`, 'sucesso');
      navigate('/');
    } catch (e) {
      addToast(e.response?.data?.erro || 'Erro ao fazer login', 'erro');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#003D2B', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>⚽</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: 0 }}>GolBet</h1>
          <p style={{ color: '#F5D020', fontWeight: 600, margin: '4px 0 0' }}>Copa do Mundo Rolemberg</p>
        </div>

        <div className="card-golbet" style={{ padding: 28 }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Entrar na conta</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, color: '#B0BEC5', display: 'block', marginBottom: 6 }}>Nome completo</label>
              <input className="input-golbet" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="João Silva" required />
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#B0BEC5', display: 'block', marginBottom: 6 }}>Telefone</label>
              <input className="input-golbet" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="(61) 99999-9999" required />
            </div>
            <button className="btn-amarelo" type="submit" style={{ marginTop: 6, padding: '13px 0', fontSize: 15 }} disabled={loading}>
              {loading ? 'Entrando...' : 'ENTRAR'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#B0BEC5' }}>
            Ainda não tem conta?{' '}
            <Link to="/cadastro" style={{ color: '#F5D020', fontWeight: 600 }}>Cadastre-se</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
