import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

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
    if (!form.nome.trim() || form.nome.trim().length < 3)
      e.nome = 'Informe seu nome completo (mín. 3 caracteres)';
    if (!form.telefone || form.telefone.replace(/\D/g,'').length < 10)
      e.telefone = 'Telefone inválido';
    if (!form.senha || form.senha.length < 4)
      e.senha = 'Senha deve ter pelo menos 4 caracteres';
    if (form.senha !== form.confirmar)
      e.confirmar = 'As senhas não coincidem';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const e2 = validar();
    if (Object.keys(e2).length > 0) return setErros(e2);
    setErros({});
    setLoading(true);
    try {
      const { data } = await axios.post('/api/apostadores/cadastro', {
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        senha: form.senha,
      });
      login(data);
      addToast(`Conta criada! Bem-vindo, ${data.nome.split(' ')[0]}! 🎉`, 'sucesso');
      navigate('/');
    } catch (err) {
      addToast(err.response?.data?.erro || 'Erro ao cadastrar', 'erro');
    }
    setLoading(false);
  }

  const inp = (field, label, placeholder, type = 'text', extra) => (
    <div>
      <label style={{ fontSize: 13, color: '#B0BEC5', display: 'block', marginBottom: 6 }}>{label}</label>
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
      {erros[field] && <p style={{ color: '#E53935', fontSize: 12, margin: '4px 0 0' }}>{erros[field]}</p>}
    </div>
  );

  const toggleBtn = (field) => (
    <button type="button" onClick={() => setMostrarSenha(v => !v)}
      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#B0BEC5', cursor: 'pointer', display: 'flex', padding: 0 }}>
      {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#003D2B', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>⚽</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#fff', margin: 0 }}>GolBet</h1>
          <p style={{ color: '#F5D020', fontWeight: 600, margin: '4px 0 0', fontSize: 13 }}>Copa do Mundo Rolemberg</p>
        </div>

        <div className="card-golbet" style={{ padding: 28 }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Criar conta</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {inp('nome', 'Nome completo', 'Ex: João Silva')}
            {inp('telefone', 'Telefone', '(61) 99999-9999')}
            {inp('senha', 'Senha', 'Mínimo 4 caracteres',
              mostrarSenha ? 'text' : 'password',
              { style: { paddingRight: 40 }, toggle: toggleBtn('senha') }
            )}
            {inp('confirmar', 'Confirmar senha', 'Repita a senha',
              mostrarSenha ? 'text' : 'password',
              { style: { paddingRight: 40 }, toggle: null }
            )}

            <div style={{ background: 'rgba(0,135,79,0.15)', border: '1px solid rgba(0,135,79,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#B0BEC5' }}>
              💡 Você pode entrar com o nome em maiúsculo, minúsculo ou misturado — tudo funciona!
            </div>

            <button className="btn-amarelo" type="submit" style={{ marginTop: 4, padding: '13px 0', fontSize: 15 }} disabled={loading}>
              {loading ? 'Criando conta...' : 'CRIAR CONTA'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#B0BEC5' }}>
            Já tem conta?{' '}
            <Link to="/login" style={{ color: '#F5D020', fontWeight: 600 }}>Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
