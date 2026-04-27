const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database');

router.post('/', async (req, res) => {
  const { apostador_id, valor, comprovante_info } = req.body;
  if (!apostador_id || !valor) return res.status(400).json({ erro: 'Dados inválidos' });
  if (valor < 10) return res.status(400).json({ erro: 'Valor mínimo: R$ 10,00' });

  const apostador = await get('SELECT id FROM apostadores WHERE id = ?', [apostador_id]);
  if (!apostador) return res.status(404).json({ erro: 'Apostador não encontrado' });

  const chave = process.env.CHAVE_PIX_ADMIN || '(61) 99999-9999';
  const result = await run('INSERT INTO depositos (apostador_id, valor, chave_pix, comprovante_info) VALUES (?, ?, ?, ?)', [apostador_id, valor, chave, comprovante_info || null]);
  res.json({ id: result.lastID, status: 'pendente' });
});

router.get('/meus/:apostador_id', async (req, res) => {
  const deps = await all('SELECT * FROM depositos WHERE apostador_id = ? ORDER BY criado_em DESC', [req.params.apostador_id]);
  res.json(deps);
});

module.exports = router;
