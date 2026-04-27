const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database');

router.post('/cadastro', async (req, res) => {
  const { nome, telefone } = req.body;
  if (!nome || !telefone) return res.status(400).json({ erro: 'Nome e telefone são obrigatórios' });
  try {
    const result = await run('INSERT INTO apostadores (nome, telefone) VALUES (?, ?)', [nome.trim(), telefone.trim()]);
    const apostador = await get('SELECT id, nome, telefone, saldo FROM apostadores WHERE id = ?', [result.lastID]);
    res.json(apostador);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ erro: 'Telefone já cadastrado' });
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/login', async (req, res) => {
  const { nome, telefone } = req.body;
  if (!nome || !telefone) return res.status(400).json({ erro: 'Nome e telefone são obrigatórios' });
  const apostador = await get(
    'SELECT id, nome, telefone, saldo FROM apostadores WHERE LOWER(nome) = LOWER(?) AND telefone = ?',
    [nome.trim(), telefone.trim()]
  );
  if (!apostador) return res.status(401).json({ erro: 'Apostador não encontrado' });
  res.json(apostador);
});

router.get('/:id/saldo', async (req, res) => {
  const row = await get('SELECT saldo FROM apostadores WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ erro: 'Apostador não encontrado' });
  res.json({ saldo: row.saldo });
});

router.get('/:id', async (req, res) => {
  const row = await get('SELECT * FROM apostadores WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ erro: 'Apostador não encontrado' });
  res.json(row);
});

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

  depositos.forEach(d => movimentacoes.push({ tipo: 'deposito', descricao: 'Depósito aprovado', valor: +d.valor, data: d.data_efetiva || d.criado_em }));
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
  let saldoAcumulado = 0;
  movimentacoes.forEach(m => { saldoAcumulado += m.valor; m.saldo = saldoAcumulado; });

  res.json(movimentacoes);
});

module.exports = router;
