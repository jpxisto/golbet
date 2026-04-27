const express = require('express');
const router = express.Router();
const { run, get, all, transaction } = require('../database');

router.post('/', async (req, res) => {
  const { apostador_id, valor, chave_pix_cliente, tipo_pix } = req.body;
  if (!apostador_id || !valor || !chave_pix_cliente || !tipo_pix) return res.status(400).json({ erro: 'Dados inválidos' });
  if (valor < 10) return res.status(400).json({ erro: 'Valor mínimo: R$ 10,00' });

  const apostador = await get('SELECT * FROM apostadores WHERE id = ?', [apostador_id]);
  if (!apostador) return res.status(404).json({ erro: 'Apostador não encontrado' });
  if (apostador.saldo < valor) return res.status(400).json({ erro: 'Saldo insuficiente' });

  try {
    await transaction([
      { sql: 'UPDATE apostadores SET saldo = saldo - ? WHERE id = ?', params: [valor, apostador_id] },
      { sql: 'INSERT INTO saques (apostador_id, valor, chave_pix_cliente, tipo_pix) VALUES (?, ?, ?, ?)', params: [apostador_id, valor, chave_pix_cliente, tipo_pix] },
    ]);
    const novoSaldo = await get('SELECT saldo FROM apostadores WHERE id = ?', [apostador_id]);
    res.json({ sucesso: true, saldo: novoSaldo.saldo });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao solicitar saque: ' + e.message });
  }
});

router.get('/meus/:apostador_id', async (req, res) => {
  const saques = await all('SELECT * FROM saques WHERE apostador_id = ? ORDER BY criado_em DESC', [req.params.apostador_id]);
  res.json(saques);
});

module.exports = router;
