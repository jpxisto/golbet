const express = require('express');
const router = express.Router();
const { run, get, all, transaction } = require('../database');
const sheets = require('../sheets');

// Calcula odds de UM jogo (usado no endpoint /:id)
async function calcOdds(jogoId) {
  const [apostas, jogo, numRow] = await Promise.all([
    all('SELECT resultado, SUM(valor) as total FROM apostas WHERE jogo_id = ? GROUP BY resultado', [jogoId]),
    get('SELECT pote_total FROM jogos WHERE id = ?', [jogoId]),
    get('SELECT COUNT(DISTINCT apostador_id) as c FROM apostas WHERE jogo_id = ?', [jogoId]),
  ]);
  return oddsFromRows(jogo?.pote_total || 0, apostas, numRow?.c || 0);
}

// Lógica de cálculo extraída (reusada no batch abaixo)
function oddsFromRows(pote, apostas, numApostadores) {
  const potePremios = pote * 0.89;
  const map = { A: 0, empate: 0, B: 0 };
  apostas.forEach(a => { map[a.resultado] = Number(a.total) || 0; });
  const calcOdd = t => (t === 0 || potePremios === 0) ? 0 : parseFloat((potePremios / t).toFixed(2));
  return {
    odd_a: calcOdd(map.A), odd_empate: calcOdd(map.empate), odd_b: calcOdd(map.B),
    apostado_a: map.A, apostado_empate: map.empate, apostado_b: map.B,
    num_apostadores: numApostadores,
  };
}

router.get('/', async (req, res) => {
  try {
    const jogos = await all('SELECT * FROM jogos WHERE visivel = 1 ORDER BY data_hora ASC');
    if (jogos.length === 0) return res.json([]);

    // Uma query só para todas as apostas de todos os jogos visíveis — elimina N+1
    const ids = jogos.map(j => j.id);
    const placeholders = ids.map(() => '?').join(',');
    const [apostasAll, numAll] = await Promise.all([
      all(`SELECT jogo_id, resultado, SUM(valor) as total FROM apostas WHERE jogo_id IN (${placeholders}) GROUP BY jogo_id, resultado`, ids),
      all(`SELECT jogo_id, COUNT(DISTINCT apostador_id) as c FROM apostas WHERE jogo_id IN (${placeholders}) GROUP BY jogo_id`, ids),
    ]);

    // Indexar por jogo_id para lookup O(1)
    const apostasMap = {};
    apostasAll.forEach(a => {
      if (!apostasMap[a.jogo_id]) apostasMap[a.jogo_id] = [];
      apostasMap[a.jogo_id].push(a);
    });
    const numMap = {};
    numAll.forEach(n => { numMap[n.jogo_id] = n.c; });

    const result = jogos.map(j => ({
      ...j,
      ...oddsFromRows(j.pote_total || 0, apostasMap[j.id] || [], numMap[j.id] || 0),
    }));
    res.json(result);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao carregar jogos' });
  }
});

router.get('/apostas/minhas/:apostador_id', async (req, res) => {
  try {
    const apostas = await all(
      `SELECT a.*, j.time_a, j.flag_a, j.time_b, j.flag_b, j.data_hora, j.status as jogo_status, j.resultado as jogo_resultado, j.pote_total
       FROM apostas a JOIN jogos j ON a.jogo_id = j.id
       WHERE a.apostador_id = ? ORDER BY a.criado_em DESC`,
      [req.params.apostador_id]
    );
    res.json(apostas);
  } catch (e) { res.status(500).json({ erro: 'Erro ao buscar apostas' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const jogo = await get('SELECT * FROM jogos WHERE id = ?', [req.params.id]);
    if (!jogo) return res.status(404).json({ erro: 'Jogo não encontrado' });
    res.json({ ...jogo, ...(await calcOdds(jogo.id)) });
  } catch (e) { res.status(500).json({ erro: 'Erro ao buscar jogo' }); }
});

router.get('/:id/apostas', async (req, res) => {
  try {
    const apostas = await all(
      `SELECT a.*, ap.nome, ap.telefone FROM apostas a JOIN apostadores ap ON a.apostador_id = ap.id WHERE a.jogo_id = ?`,
      [req.params.id]
    );
    res.json(apostas);
  } catch (e) { res.status(500).json({ erro: 'Erro ao buscar apostas do jogo' }); }
});

router.post('/:id/apostar', async (req, res) => {
  const jogoId = parseInt(req.params.id);
  const { apostador_id, resultado, valor } = req.body;

  if (!apostador_id || !resultado || !valor) return res.status(400).json({ erro: 'Dados inválidos' });
  if (!['A', 'empate', 'B'].includes(resultado)) return res.status(400).json({ erro: 'Resultado inválido' });
  const valorNum = parseFloat(valor);
  if (valorNum < 5) return res.status(400).json({ erro: 'Valor mínimo: R$ 5,00' });

  try {
    const jogo = await get('SELECT status FROM jogos WHERE id = ?', [jogoId]);
    if (!jogo) return res.status(404).json({ erro: 'Jogo não encontrado' });
    if (jogo.status !== 'aberto') return res.status(400).json({ erro: 'Apostas encerradas para este jogo' });

    const apostador = await get('SELECT id FROM apostadores WHERE id = ?', [apostador_id]);
    if (!apostador) return res.status(404).json({ erro: 'Apostador não encontrado' });

    const apostaExistente = await get('SELECT * FROM apostas WHERE apostador_id = ? AND jogo_id = ?', [apostador_id, jogoId]);

    const ops = [];
    if (apostaExistente) {
      // Devolve aposta anterior e registra nova — deduçao líquida = valor - apostaExistente.valor
      const diff = valorNum - apostaExistente.valor;
      ops.push({ sql: 'UPDATE jogos SET pote_total = pote_total - ? WHERE id = ?', params: [apostaExistente.valor, jogoId] });
      ops.push({ sql: 'UPDATE apostas SET resultado = ?, valor = ?, criado_em = CURRENT_TIMESTAMP WHERE apostador_id = ? AND jogo_id = ?', params: [resultado, valorNum, apostador_id, jogoId] });
      // Deduçao atômica: só deduz se saldo cobrir o diff (positivo) — evita race condition
      if (diff > 0) {
        const r = await run(
          'UPDATE apostadores SET saldo = saldo - ?, total_apostado = total_apostado + ? WHERE id = ? AND saldo >= ?',
          [diff, diff, apostador_id, diff]
        );
        if (r.changes === 0) return res.status(400).json({ erro: 'Saldo insuficiente' });
      } else {
        // Devolução (diff ≤ 0): sempre seguro
        ops.push({ sql: 'UPDATE apostadores SET saldo = saldo - ?, total_apostado = total_apostado + ? WHERE id = ?', params: [diff, diff, apostador_id] });
      }
    } else {
      // Nova aposta — deduçao atômica anti-race-condition
      const r = await run(
        'UPDATE apostadores SET saldo = saldo - ?, total_apostado = total_apostado + ? WHERE id = ? AND saldo >= ?',
        [valorNum, valorNum, apostador_id, valorNum]
      );
      if (r.changes === 0) return res.status(400).json({ erro: 'Saldo insuficiente' });
      ops.push({ sql: 'INSERT INTO apostas (apostador_id, jogo_id, resultado, valor) VALUES (?, ?, ?, ?)', params: [apostador_id, jogoId, resultado, valorNum] });
    }
    ops.push({ sql: 'UPDATE jogos SET pote_total = pote_total + ? WHERE id = ?', params: [valorNum, jogoId] });
    await transaction(ops);

    const novoSaldo = await get('SELECT saldo FROM apostadores WHERE id = ?', [apostador_id]);
    // Sync Sheets — fire-and-forget
    const jogoInfo = await get('SELECT * FROM jogos WHERE id = ?', [jogoId]);
    const apInfo   = await get('SELECT nome FROM apostadores WHERE id = ?', [apostador_id]);
    const apostaInfo = await get('SELECT * FROM apostas WHERE apostador_id = ? AND jogo_id = ?', [apostador_id, jogoId]);
    if (jogoInfo && apInfo && apostaInfo) {
      const jogoDesc = `${jogoInfo.flag_a} ${jogoInfo.time_a} vs ${jogoInfo.time_b} ${jogoInfo.flag_b}`;
      sheets.syncAposta(apostaInfo, apInfo.nome, jogoDesc);
    }
    res.json({ sucesso: true, saldo: novoSaldo.saldo });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao registrar aposta: ' + e.message });
  }
});

module.exports = router;
