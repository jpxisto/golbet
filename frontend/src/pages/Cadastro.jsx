import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function GolbetLogoFull() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="44" height="37" viewBox="0 0 52 44" fill="none">
          <line x1="2" y1="32" x2="24" y2="22" stroke="#00C264" strokeWidth="4" strokeLinecap="round" opacity="0.7"/>
          <line x1="0" y1="38" x2="20" y2="29" stroke="#00C264" strokeWidth="2.5" strokeLinecap="round" opacity="0.4"/>
          <circle cx="36" cy="20" r="15" fill="#fff"/>
          <path d="M36 8.5 L39.5 15 L47 16 L41.5 21.5 L43 29 L36 25.5 L29 29 L30.5 21.5 L25 16 L32.5 15 Z" fill="#111" opacity="0.7"/>
        </svg>
        <div style={{ fontStyle: 'italic', fontWeight: 900, fontSize: 38, letterSpacing: '-2px', lineHeight: 1 }}>
          <span style={{ color: '#fff' }}>Gol</span>
          <span style={{ color: '#FFD000' }}>bet</span>
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,208,0,0.6)', letterSpacing: '2.5px', textTransform: 'uppercase' }}>
        GolBet
      </div>
    </div>
  );
}

export default function Cadastro() {
  const { login, addToast } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', telefone: '', senha: '', confirmar: '' });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erros, setErros] = useState({});

  function formatTelefone(v) {
    const n = v.replace(/\D/g, '').slice(0, 11);
    if (n.length <= 2) return `(${n}`;
    if (n.length <= 7) return `(${n.slice(0,2)}) ${n.slice(2)}`;
    return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
  }

  function validar() {
    const e = {};
    if (!form.nome.trim() || form.nome.trim().length < 3) e.nome = 'Mínimo 3 caracteres';
    if (!form.telefone || form.telefone.replace(/\D/g,'').length < 10) e.telefone = 'Telefone inválido';
    if (!form.senha || form.senha.length < 4) e.senha = 'Mínimo 4 caracteres';
    if (form.senha !== form.confirmar) e.confirmar = 'As senhas não coincidem';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const e2 = validar();
    if (Object.keys(e2).length > 0) return setErros(e2);
    setErros({});
    setLoading(true);
    try {
      const { data } = await axios.post('/api/apostadores/cadastro', { nome: form.nome.trim(), telefone: form.telefone.trim(), senha: form.senha });
      login(data);
      addToast(`Conta criada! Bem-vindo, ${data.nome.split(' ')[0]}! 🎉`, 'sucesso');
      navigate('/');
    } catch (err) {
      addToast(err.response?.data?.erro || 'Erro ao cadastrar', 'erro');
    }
    setLoading(false);
  }

  function campo(field, label, placeholder, type = 'text', extra) {
    return (
      <div>
        <label style={{ fontSize: 11, color: 'var(--texto-sec)', display: 'block', marginBottom: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</label>
        <div style={{ position: 'relative' }}>
          <input
            className="input-golbet"
            style={extra?.style}
            type={type}
            value={form[field]}
            onChange={e => {
              const val = field === 'telefone' ? formatTelefone(e.target.value) : e.target.value;
              setForm({ ...form, [field]: val });
              if (erros[field]) setErros({ ...erros, [field]: '' });
            }}
            placeholder={placeholder}
          />
          {extra?.toggle}
        </div>
        {erros[field] && <p style={{ color: 'var(--vermelho)', fontSize: 11, margin: '5px 0 0', fontWeight: 500 }}>⚠️ {erros[field]}</p>}
      </div>
    );
  }

  const olho = (
    <button type="button" onClick={() => setMostrarSenha(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--texto-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}>
      {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #001612 0%, #002318 60%, #001A10 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -120, right: -120, width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,194,100,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -100, left: -100, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,208,0,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, animation: 'slideUp 0.3s ease' }}>
        <div style={{ marginBottom: 30, textAlign: 'center' }}>
          <GolbetLogoFull />
        </div>

        <div style={{
          background: 'rgba(0,43,28,0.85)', backdropFilter: 'blur(12px)',
          borderRadius: 16, border: '1px solid rgba(0,194,100,0.18)',
          padding: 28, boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}>
          <h2 style={{ margin: '0 0 22px', fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' }}>
            Criar conta
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {campo('nome', 'Nome completo', 'Ex: João Silva')}
            {campo('telefone', 'Telefone', '(61) 99999-9999')}
            {campo('senha', 'Senha', 'Mínimo 4 caracteres', mostrarSenha ? 'text' : 'password', { style: { paddingRight: 44 }, toggle: olho })}
            {campo('confirmar', 'Confirmar senha', 'Repita a senha', mostrarSenha ? 'text' : 'password', {})}

            <div style={{ background: 'rgba(0,194,100,0.06)', border: '1px solid rgba(0,194,100,0.15)', borderRadius: 8, padding: '9px 13px', fontSize: 12, color: 'var(--texto-muted)' }}>
              💡 Você pode entrar com maiúsculo ou minúsculo — tudo funciona!
            </div>

            <button className="btn-amarelo" type="submit" style={{ marginTop: 6, padding: '14px 0', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={loading}>
              {loading ? 'Criando conta...' : <><span>CRIAR CONTA</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--texto-muted)' }}>
            Já tem conta?{' '}
            <Link to="/login" style={{ color: '#FFD000', fontWeight: 700, textDecoration: 'none' }}>
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
