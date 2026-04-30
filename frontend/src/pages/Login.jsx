import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function GolbetLogoFull() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="52" height="44" viewBox="0 0 52 44" fill="none">
          <line x1="2" y1="32" x2="24" y2="22" stroke="#00C264" strokeWidth="4" strokeLinecap="round" opacity="0.7"/>
          <line x1="0" y1="38" x2="20" y2="29" stroke="#00C264" strokeWidth="2.5" strokeLinecap="round" opacity="0.4"/>
          <circle cx="36" cy="20" r="15" fill="#fff"/>
          <path d="M36 8.5 L39.5 15 L47 16 L41.5 21.5 L43 29 L36 25.5 L29 29 L30.5 21.5 L25 16 L32.5 15 Z" fill="#111" opacity="0.7"/>
        </svg>
        <div style={{ fontStyle: 'italic', fontWeight: 900, fontSize: 44, letterSpacing: '-2px', lineHeight: 1 }}>
          <span style={{ color: '#fff' }}>Gol</span>
          <span style={{ color: '#FFD000' }}>bet</span>
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,208,0,0.6)', letterSpacing: '2.5px', textTransform: 'uppercase' }}>
        Copa do Mundo Rolemberg
      </div>
    </div>
  );
}

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
      const { data } = await axios.post('/api/apostadores/login', { nome: form.nome.trim(), senha: form.senha });
      login(data);
      addToast(`Bem-vindo de volta, ${data.nome.split(' ')[0]}! ⚽`, 'sucesso');
      navigate('/');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao entrar');
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #001612 0%, #002318 60%, #001A10 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative', overflow: 'hidden',
    }}>
      {/* Decoração de fundo */}
      <div style={{ position: 'absolute', top: -120, right: -120, width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,194,100,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -100, left: -100, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,208,0,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400, animation: 'slideUp 0.3s ease' }}>
        <div style={{ marginBottom: 36, textAlign: 'center' }}>
          <GolbetLogoFull />
        </div>

        <div style={{
          background: 'rgba(0,43,28,0.85)', backdropFilter: 'blur(12px)',
          borderRadius: 16, border: '1px solid rgba(0,194,100,0.18)',
          padding: 28, boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}>
          <h2 style={{ margin: '0 0 22px', fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' }}>
            Entrar na conta
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--texto-sec)', display: 'block', marginBottom: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Nome de usuário
              </label>
              <input
                className="input-golbet"
                value={form.nome}
                onChange={e => { setForm({ ...form, nome: e.target.value }); setErro(''); }}
                placeholder="Ex: João Silva"
                autoComplete="username"
              />
              <p style={{ fontSize: 11, color: 'var(--texto-muted)', margin: '5px 0 0' }}>
                Maiúsculo ou minúsculo — funciona igual
              </p>
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--texto-sec)', display: 'block', marginBottom: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-golbet"
                  style={{ paddingRight: 44 }}
                  type={mostrarSenha ? 'text' : 'password'}
                  value={form.senha}
                  onChange={e => { setForm({ ...form, senha: e.target.value }); setErro(''); }}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setMostrarSenha(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--texto-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}>
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {erro && (
              <div style={{ background: 'rgba(255,69,69,0.08)', border: '1px solid rgba(255,69,69,0.25)', borderRadius: 8, padding: '9px 13px', fontSize: 13, color: 'var(--vermelho)', display: 'flex', alignItems: 'center', gap: 6 }}>
                ⚠️ {erro}
              </div>
            )}

            <button className="btn-amarelo" type="submit" style={{ marginTop: 6, padding: '14px 0', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={loading}>
              {loading ? 'Entrando...' : <><span>ENTRAR</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--texto-muted)' }}>
            Ainda não tem conta?{' '}
            <Link to="/cadastro" style={{ color: '#FFD000', fontWeight: 700, textDecoration: 'none' }}>
              Cadastre-se grátis
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
