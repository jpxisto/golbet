const express = require('express');
const router = express.Router();
const { run, get, all, transaction } = require('../database');

async function calcOdds(jogoId) {
  const apostas = await all('SELECT resultado, SUM(valor) as total FROM apostas WHERE jogo_id = ? GROUP BY resultado', [jogoId]);
  const jogo = await get('SELECT pote_total FROM jogos WHERE id = ?', [jogoId]);
  const pote = jogo?.pote_total || 0;
  const potePremios = pote * 0.9;

  const map = { A: 0, empate: 0, B: 0 };
  apostas.forEach(a => { map[a.resultado] = a.total; });

  function calcOdd(total) {
    if (total === 0 || potePremios === 0) return 0;
    return parseFloat((potePremios / total).toFixed(2));
  }

  const numRow = await get('SELECT COUNT(DISTINCT apostador_id) as c FROM apostas WHERE jogo_id = ?', [jogoId]);

  return {
    odd_a: calcOdd(map.A),
    odd_empate: calcOdd(map.empate),
    odd_b: calcOdd(map.B),
    apostado_a: map.A,
    apostado_empate: map.empate,
    apostado_b: map.B,
    num_apostadores: numRow?.c || 0,
  };
}

router.get('/', async (req, res) => {
  const jogos = await all('SELECT * FROM jogos WHERE visivel = 1 ORDER BY data_hora ASC');
  const result = await Promise.all(jogos.map(async j => ({ ...j, ...(await calcOdds(j.id)) })));
  res.json(result);
});

router.get('/apostas/minhas/:apostador_id', async (req, res) => {
  const apostas = await all(
    `SELECT a.*, j.time_a, j.flag_a, j.time_b, j.flag_b, j.data_hora, j.status as jogo_status, j.resultado as jogo_resultado, j.pote_total
     FROM apostas a JOIN jogos j ON a.jogo_id = j.id
     WHERE a.apostador_id = ? ORDER BY a.criado_em DESC`,
    [req.params.apostador_id]
  );
  res.json(apostas);
});

router.get('/:id', async (req, res) => {
  const jogo = await get('SELECT * FROM jogos WHERE id = ?', [req.params.id]);
  if (!jogo) return res.status(404).json({ erro: 'Jogo não encontrado' });
  res.json({ ...jogo, ...(await calcOdds(jogo.id)) });
});

router.get('/:id/apostas', async (req, res) => {
  const apostas = await all(
    `SELECT a.*, ap.nome, ap.telefone FROM apostas a JOIN apostadores ap ON a.apostador_id = ap.id WHERE a.jogo_id = ?`,
    [req.params.id]
  );
  res.json(apostas);
});

router.post('/:id/apostar', async (req, res) => {
  const jogoId = parseInt(req.params.id);
  const { apostador_id, resultado, valor } = req.body;

  if (!apostador_id || !resultado || !valor) return res.status(400).json({ erro: 'Dados inválidos' });
  if (!['A', 'empate', 'B'].includes(resultado)) return res.status(400).json({ erro: 'Resultado inválido' });
  if (valor < 5) return res.status(400).json({ erro: 'Valor mínimo: R$ 5,00' });

  const jogo = await get('SELECT * FROM jogos WHERE id = ?', [jogoId]);
  if (!jogo) return res.status(404).json({ erro: 'Jogo não encontrado' });
  if (jogo.status !== 'aberto') return res.status(400).json({ erro: 'Apostas encerradas para este jogo' });

  const apostador = await get('SELECT * FROM apostadores WHERE id = ?', [apostador_id]);
  if (!apostador) return res.status(404).json({ erro: 'Apostador não encontrado' });
  if (apostador.saldo < valor) return res.status(400).json({ erro: 'Saldo insuficiente' });

  const apostaExistente = await get('SELECT * FROM apostas WHERE apostador_id = ? AND jogo_id = ?', [apostador_id, jogoId]);

  try {
    const ops = [];
    if (apostaExistente) {
      ops.push({ sql: 'UPDATE apostadores SET saldo = saldo + ?, total_apostado = total_apostado - ? WHERE id = ?', params: [apostaExistente.valor, apostaExistente.valor, apostador_id] });
      ops.push({ sql: 'UPDATE jogos SET pote_total = pote_total - ? WHERE id = ?', params: [apostaExistente.valor, jogoId] });
      ops.push({ sql: 'UPDATE apostas SET resultado = ?, valor = ?, criado_em = CURRENT_TIMESTAMP WHERE apostador_id = ? AND jogo_id = ?', params: [resultado, valor, apostador_id, jogoId] });
    } else {
      ops.push({ sql: 'INSERT INTO apostas (apostador_id, jogo_id, resultado, valor) VALUES (?, ?, ?, ?)', params: [apostador_id, jogoId, resultado, valor] });
    }
    ops.push({ sql: 'UPDATE apostadores SET saldo = saldo - ?, total_apostado = total_apostado + ? WHERE id = ?', params: [valor, valor, apostador_id] });
    ops.push({ sql: 'UPDATE jogos SET pote_total = pote_total + ? WHERE id = ?', params: [valor, jogoId] });
    await transaction(ops);

    const novoSaldo = await get('SELECT saldo FROM apostadores WHERE id = ?', [apostador_id]);
    res.json({ sucesso: true, saldo: novoSaldo.saldo });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao registrar aposta: ' + e.message });
  }
});

module.exports = router;
