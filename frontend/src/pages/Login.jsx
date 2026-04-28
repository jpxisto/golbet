import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, addToast } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', senha: '' });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome.trim() || !form.senha) return setErro('Preencha todos os campos');
    setErro('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/apostadores/login', {
        nome: form.nome.trim(),
        senha: form.senha,
      });
      login(data);
      addToast(`Bem-vindo de volta, ${data.nome.split(' ')[0]}! ⚽`, 'sucesso');
      navigate('/');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao entrar');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#003D2B', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>⚽</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#fff', margin: 0 }}>GolBet</h1>
          <p style={{ color: '#F5D020', fontWeight: 600, margin: '4px 0 0', fontSize: 13 }}>Copa do Mundo Rolemberg</p>
        </div>

        <div className="card-golbet" style={{ padding: 28 }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Entrar na conta</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Nome */}
            <div>
              <label style={{ fontSize: 13, color: '#B0BEC5', display: 'block', marginBottom: 6 }}>Nome de usuário</label>
              <input
                className="input-golbet"
                value={form.nome}
                onChange={e => { setForm({ ...form, nome: e.target.value }); setErro(''); }}
                placeholder="Ex: João Silva"
                autoComplete="username"
              />
              <p style={{ fontSize: 11, color: '#B0BEC5', margin: '4px 0 0' }}>
                Pode digitar em maiúsculo, minúsculo ou misturado
              </p>
            </div>

            {/* Senha */}
            <div>
              <label style={{ fontSize: 13, color: '#B0BEC5', display: 'block', marginBottom: 6 }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-golbet"
                  style={{ paddingRight: 42 }}
                  type={mostrarSenha ? 'text' : 'password'}
                  value={form.senha}
                  onChange={e => { setForm({ ...form, senha: e.target.value }); setErro(''); }}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#B0BEC5', cursor: 'pointer', display: 'flex', padding: 0 }}
                >
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {erro && (
              <div style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.4)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#E53935' }}>
                ❌ {erro}
              </div>
            )}

            <button className="btn-amarelo" type="submit" style={{ marginTop: 4, padding: '13px 0', fontSize: 15 }} disabled={loading}>
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
