const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { run, get, all } = require('../database');
const sheets = require('../sheets');

// ─── Cadastro ────────────────────────────────────────────────────────────────
router.post('/cadastro', async (req, res) => {
  const { nome, telefone, senha } = req.body;
  if (!nome || !telefone || !senha)
    return res.status(400).json({ erro: 'Nome, telefone e senha são obrigatórios' });
  if (senha.length < 4)
    return res.status(400).json({ erro: 'Senha deve ter pelo menos 4 caracteres' });

  try {
    const hash = await bcrypt.hash(senha, 10);
    const result = await run(
      'INSERT INTO apostadores (nome, telefone, senha) VALUES (?, ?, ?)',
      [nome.trim(), telefone.trim(), hash]
    );
    const apostador = await get(
      'SELECT id, nome, telefone, saldo, total_depositado, total_apostado, total_ganho, total_sacado FROM apostadores WHERE id = ?',
      [result.lastID]
    );
    sheets.syncApostador(apostador);
    sheets.logAdmin('Novo cadastro', apostador.nome, '—');
    res.json(apostador);
  } catch (e) {
    if (e.message.includes('UNIQUE'))
      return res.status(409).json({ erro: 'Telefone já cadastrado' });
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { nome, senha } = req.body;
  if (!nome || !senha)
    return res.status(400).json({ erro: 'Nome e senha são obrigatórios' });

  // Busca pelo nome em qualquer combinação de maiúsculas/minúsculas
  const apostador = await get(
    'SELECT * FROM apostadores WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?))',
    [nome]
  );

  if (!apostador)
    return res.status(401).json({ erro: 'Usuário não encontrado' });

  // Suporte a contas antigas sem senha (permite login com qualquer senha enquanto não definida)
  if (apostador.senha) {
    const ok = await bcrypt.compare(senha, apostador.senha);
    if (!ok) return res.status(401).json({ erro: 'Senha incorreta' });
  }

  res.json({
    id: apostador.id,
    nome: apostador.nome,
    telefone: apostador.telefone,
    saldo: apostador.saldo,
  });
});

// ─── Saldo ────────────────────────────────────────────────────────────────────
router.get('/:id/saldo', async (req, res) => {
  const row = await get('SELECT saldo FROM apostadores WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ erro: 'Apostador não encontrado' });
  res.json({ saldo: row.saldo });
});

// ─── Perfil ───────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const row = await get(
    'SELECT id, nome, telefone, saldo, total_depositado, total_sacado, total_apostado, total_ganho, criado_em FROM apostadores WHERE id = ?',
    [req.params.id]
  );
  if (!row) return res.status(404).json({ erro: 'Apostador não encontrado' });
  res.json(row);
});

// ─── Alterar senha ────────────────────────────────────────────────────────────
router.patch('/:id/senha', async (req, res) => {
  const { senha_atual, nova_senha } = req.body;
  if (!senha_atual || !nova_senha)
    return res.status(400).json({ erro: 'Informe a senha atual e a nova senha' });
  if (nova_senha.length < 4)
    return res.status(400).json({ erro: 'Nova senha deve ter pelo menos 4 caracteres' });

  const apostador = await get('SELECT * FROM apostadores WHERE id = ?', [req.params.id]);
  if (!apostador) return res.status(404).json({ erro: 'Não encontrado' });

  if (apostador.senha) {
    const ok = await bcrypt.compare(senha_atual, apostador.senha);
    if (!ok) return res.status(401).json({ erro: 'Senha atual incorreta' });
  }

  const hash = await bcrypt.hash(nova_senha, 10);
  await run('UPDATE apostadores SET senha = ? WHERE id = ?', [hash, req.params.id]);
  res.json({ sucesso: true });
});

// ─── Extrato ──────────────────────────────────────────────────────────────────
router.get('/:id/extrato', async (req, res) => {
  const id = req.params.id;
  const movimentacoes = [];

  const depositos = await all(
    `SELECT valor, aprovado_em as data_efetiva, criado_em FROM depositos WHERE apostador_id = ? AND status = 'aprovado'`,
    [id]
  );
  const apostas = await all(
    `SELECT a.id, a.valor, a.resultado, a.status, a.premio, a.criado_em, j.time_a, j.time_b
     FROM apostas a JOIN jogos j ON a.jogo_id = j.id WHERE a.apostador_id = ?`,
    [id]
  );
  const saques = await all(
    `SELECT valor, status, criado_em, pago_em as data_efetiva FROM saques WHERE apostador_id = ?`,
    [id]
  );

  depositos.forEach(d => movimentacoes.push({
    tipo: 'deposito', descricao: 'Depósito aprovado', valor: +d.valor,
    data: d.data_efetiva || d.criado_em,
  }));
  apostas.forEach(a => {
    movimentacoes.push({ tipo: 'aposta', descricao: `Aposta: ${a.time_a} vs ${a.time_b}`, valor: -a.valor, data: a.criado_em });
    if (a.status === 'ganhou' && a.premio > 0)
      movimentacoes.push({ tipo: 'premio', descricao: `Prêmio: ${a.time_a} vs ${a.time_b}`, valor: +a.premio, data: a.criado_em });
  });
  saques.forEach(s => movimentacoes.push({
    tipo: 'saque',
    descricao: s.status === 'pago' ? 'Saque pago' : s.status === 'pendente' ? 'Saque solicitado (pendente)' : 'Saque rejeitado',
    valor: s.status === 'rejeitado' ? 0 : -s.valor,
    data: s.data_efetiva || s.criado_em,
    status: s.status,
  }));

  movimentacoes.sort((a, b) => new Date(a.data) - new Date(b.data));
  let saldo = 0;
  movimentacoes.forEach(m => { saldo += m.valor; m.saldo = saldo; });

  res.json(movimentacoes);
});

module.exports = router;
