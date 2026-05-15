const express = require('express');
const router = express.Router();
const { run, get, all, transaction } = require('../database');
const sheets = require('../sheets');

const ADMIN_SENHA = process.env.ADMIN_SENHA || 'rolemberg2025';

function authAdmin(req, res, next) {
  if (req.headers['x-admin-senha'] !== ADMIN_SENHA) {
    return res.status(401).json({ erro: 'Não autorizado' });
  }
  next();
}

// ── Admin: listar todos os mercados artilheiros ───────────────────────────────
router.get('/admin/lista', authAdmin, async (req, res) => {
  try {
    const mercados = await all(`
      SELECT m.*, j.time_a, j.flag_a, j.time_b, j.flag_b,
             COUNT(a.id) as num_apostas
      FROM mercados_artilheiros m
      JOIN jogos j ON m.jogo_id = j.id
      LEFT JOIN apostas_artilheiros a ON a.mercado_id = m.id
      GROUP BY m.id
      ORDER BY m.criado_em DESC
    `);
    res.json(mercados);
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── Admin: criar mercado artilheiro para um jogo ──────────────────────────────
router.post('/admin/criar', authAdmin, async (req, res) => {
  const { jogo_id, jogador_a, jogador_b } = req.body;
  if (!jogo_id) return res.status(400).json({ erro: 'jogo_id obrigatório' });

  try {
    // Garantir que as colunas existem (migration defensiva)
    try { await run('ALTER TABLE mercados_artilheiros ADD COLUMN jogador_a TEXT DEFAULT NULL'); } catch {}
    try { await run('ALTER TABLE mercados_artilheiros ADD COLUMN jogador_b TEXT DEFAULT NULL'); } catch {}

    const jogo = await get('SELECT * FROM jogos WHERE id = ?', [jogo_id]);
    if (!jogo) return res.status(404).json({ erro: 'Jogo não encontrado' });

    const existente = await get('SELECT id FROM mercados_artilheiros WHERE jogo_id = ?', [jogo_id]);
    if (existente) return res.status(409).json({ erro: 'Já existe mercado artilheiro para este jogo' });

    const r = await run(
      'INSERT INTO mercados_artilheiros (jogo_id, jogador_a, jogador_b) VALUES (?, ?, ?)',
      [jogo_id, jogador_a || null, jogador_b || null]
    );
    res.json({ sucesso: true, id: r.lastID });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao criar artilheiro: ' + e.message });
  }
});

// ── Admin: editar nomes dos jogadores ────────────────────────────────────────
router.patch('/admin/:id/jogadores', authAdmin, async (req, res) => {
  const { jogador_a, jogador_b } = req.body;
  try {
    // Garantir que as colunas existem (migration defensiva)
    try { await run('ALTER TABLE mercados_artilheiros ADD COLUMN jogador_a TEXT DEFAULT NULL'); } catch {}
    try { await run('ALTER TABLE mercados_artilheiros ADD COLUMN jogador_b TEXT DEFAULT NULL'); } catch {}

    const mercado = await get('SELECT * FROM mercados_artilheiros WHERE id = ?', [req.params.id]);
    if (!mercado) return res.status(404).json({ erro: 'Mercado não encontrado' });
    if (mercado.resultado) return res.status(400).json({ erro: 'Mercado finalizado não pode ser editado' });

    await run(
      'UPDATE mercados_artilheiros SET jogador_a = ?, jogador_b = ? WHERE id = ?',
      [jogador_a || null, jogador_b || null, req.params.id]
    );
    res.json({ sucesso: true });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao salvar jogadores: ' + e.message });
  }
});

// ── Admin: alterar status do mercado ─────────────────────────────────────────
router.patch('/admin/:id/status', authAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['aberto', 'fechado'].includes(status)) {
    return res.status(400).json({ erro: 'Status inválido (aberto | fechado)' });
  }
  try {
    await run('UPDATE mercados_artilheiros SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ sucesso: true });
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── Admin: finalizar mercado e distribuir prêmios ─────────────────────────────
router.patch('/admin/:id/finalizar', authAdmin, async (req, res) => {
  const { resultado } = req.body;
  // resultado deve ser 'A', 'empate' ou 'B' (códigos internos)
  if (!['A', 'empate', 'B'].includes(resultado)) {
    return res.status(400).json({ erro: 'Resultado inválido (A | empate | B)' });
  }

  try {
    const mercado = await get('SELECT * FROM mercados_artilheiros WHERE id = ?', [req.params.id]);
    if (!mercado) return res.status(404).json({ erro: 'Mercado não encontrado' });
    if (mercado.resultado) return res.status(400).json({ erro: 'Mercado já foi finalizado' });

    const apostas = await all('SELECT * FROM apostas_artilheiros WHERE mercado_id = ?', [mercado.id]);
    const potePremios = mercado.pote_total * 0.89;
    const taxaCasa = mercado.pote_total * 0.11;

    const vencedores = apostas.filter(a => a.opcao_escolhida === resultado);
    const totalVencedores = vencedores.reduce((sum, a) => sum + a.valor, 0);

    const ops = [];

    // Marcar perdedores
    apostas.filter(a => a.opcao_escolhida !== resultado).forEach(a => {
      ops.push({ sql: 'UPDATE apostas_artilheiros SET status = ? WHERE id = ?', params: ['perdeu', a.id] });
    });

    // Distribuir prêmios proporcionalmente
    if (totalVencedores > 0) {
      vencedores.forEach(a => {
        const premio = (a.valor / totalVencedores) * potePremios;
        ops.push({ sql: 'UPDATE apostas_artilheiros SET status = ?, premio = ? WHERE id = ?', params: ['ganhou', premio, a.id] });
        ops.push({ sql: 'UPDATE apostadores SET saldo = saldo + ?, total_ganho = total_ganho + ? WHERE id = ?', params: [premio, premio, a.apostador_id] });
      });
    }

    // Fechar mercado com resultado
    ops.push({ sql: 'UPDATE mercados_artilheiros SET status = ?, resultado = ?, taxa_casa = ? WHERE id = ?', params: ['fechado', resultado, taxaCasa, mercado.id] });

    // Registrar taxa da casa
    if (taxaCasa > 0) {
      ops.push({ sql: 'INSERT INTO lucro_casa (jogo_id, valor) VALUES (?, ?)', params: [mercado.jogo_id, taxaCasa] });
    }

    await transaction(ops);

    // Sheets sync
    const jogo = await get('SELECT * FROM jogos WHERE id = ?', [mercado.jogo_id]);
    const jogoDesc = jogo ? `${jogo.flag_a} ${jogo.time_a} vs ${jogo.time_b} ${jogo.flag_b}` : '';
    sheets.syncLucroCasa(mercado.jogo_id, `Artilheiro — ${jogoDesc}`, taxaCasa);
    sheets.logAdmin('Artilheiro finalizado', jogoDesc, `Taxa: R$ ${taxaCasa.toFixed(2)}`);
    for (const a of apostas) {
      const ap = await get('SELECT nome FROM apostadores WHERE id = ?', [a.apostador_id]);
      const status = a.opcao_escolhida === resultado ? 'ganhou' : 'perdeu';
      const premio = vencedores.find(v => v.id === a.id) && totalVencedores > 0 ? (a.valor / totalVencedores) * potePremios : 0;
      sheets.syncApostaArtilheiro({ ...a, status, premio }, ap?.nome || '', jogoDesc, jogo, mercado);
    }

    res.json({ sucesso: true });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao finalizar: ' + e.message });
  }
});

// ── Admin: deletar mercado artilheiro (devolve saldos) ───────────────────────
router.delete('/admin/:id', authAdmin, async (req, res) => {
  try {
    const mercado = await get('SELECT * FROM mercados_artilheiros WHERE id = ?', [req.params.id]);
    if (!mercado) return res.status(404).json({ erro: 'Mercado não encontrado' });
    if (mercado.resultado) return res.status(400).json({ erro: 'Mercado finalizado não pode ser deletado' });

    const apostas = await all('SELECT * FROM apostas_artilheiros WHERE mercado_id = ?', [mercado.id]);
    const ops = [];

    apostas.forEach(a => {
      ops.push({ sql: 'UPDATE apostadores SET saldo = saldo + ?, total_apostado = total_apostado - ? WHERE id = ?', params: [a.valor, a.valor, a.apostador_id] });
    });

    ops.push({ sql: 'DELETE FROM apostas_artilheiros WHERE mercado_id = ?', params: [mercado.id] });
    ops.push({ sql: 'DELETE FROM mercados_artilheiros WHERE id = ?', params: [mercado.id] });

    await transaction(ops);
    res.json({ sucesso: true });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao deletar: ' + e.message });
  }
});

// ── Admin: listar apostas de um mercado ──────────────────────────────────────
router.get('/admin/:id/apostas', authAdmin, async (req, res) => {
  try {
    const mercado = await get('SELECT * FROM mercados_artilheiros WHERE id = ?', [req.params.id]);
    if (!mercado) return res.status(404).json({ erro: 'Não encontrado' });

    const apostas = await all(`
      SELECT a.*, ap.nome
      FROM apostas_artilheiros a
      JOIN apostadores ap ON a.apostador_id = ap.id
      WHERE a.mercado_id = ?
      ORDER BY a.criado_em DESC
    `, [mercado.id]);

    const jogo = await get('SELECT * FROM jogos WHERE id = ?', [mercado.jogo_id]);
    res.json({ mercado, jogo, apostas });
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── GET /api/artilheiros/:jogoId — mercado + minha aposta (público) ───────────
// IMPORTANTE: deve vir DEPOIS das rotas /admin/* para não capturar "admin" como jogoId
router.get('/:jogoId', async (req, res) => {
  const jogoId = parseInt(req.params.jogoId);
  if (isNaN(jogoId)) return res.json({ mercado: null, minhaAposta: null });

  const apostadorId = req.headers['apostador-id'];

  try {
    // Garantir colunas antes de consultar
    try { await run('ALTER TABLE mercados_artilheiros ADD COLUMN jogador_a TEXT DEFAULT NULL'); } catch {}
    try { await run('ALTER TABLE mercados_artilheiros ADD COLUMN jogador_b TEXT DEFAULT NULL'); } catch {}

    const mercado = await get(
      'SELECT id, jogo_id, jogador_a, jogador_b, status, resultado, pote_total, taxa_casa, criado_em FROM mercados_artilheiros WHERE jogo_id = ?',
      [jogoId]
    );
    if (!mercado) return res.json({ mercado: null, minhaAposta: null });

    let minhaAposta = null;
    if (apostadorId) {
      minhaAposta = await get('SELECT * FROM apostas_artilheiros WHERE mercado_id = ? AND apostador_id = ?', [mercado.id, apostadorId]);
    }

    res.json({ mercado, minhaAposta });
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── POST /api/artilheiros/apostar — registrar/editar aposta ──────────────────
router.post('/apostar', async (req, res) => {
  const { jogo_id, apostador_id, opcao_escolhida, valor } = req.body;

  if (!jogo_id || !apostador_id || !opcao_escolhida || !valor) {
    return res.status(400).json({ erro: 'Campos obrigatórios: jogo_id, apostador_id, opcao_escolhida, valor' });
  }

  const valorNum = parseFloat(valor);
  if (isNaN(valorNum) || valorNum < 5) {
    return res.status(400).json({ erro: 'Valor mínimo de R$ 5,00' });
  }

  // opcao_escolhida deve ser 'A', 'empate' ou 'B'
  if (!['A', 'empate', 'B'].includes(opcao_escolhida)) {
    return res.status(400).json({ erro: 'Opção inválida (A | empate | B)' });
  }

  try {
    const mercado = await get('SELECT * FROM mercados_artilheiros WHERE jogo_id = ?', [jogo_id]);
    if (!mercado) return res.status(404).json({ erro: 'Mercado artilheiro não encontrado para este jogo' });
    if (mercado.status !== 'aberto') return res.status(400).json({ erro: 'Este mercado não está aberto para apostas' });

    const apostador = await get('SELECT id FROM apostadores WHERE id = ?', [apostador_id]);
    if (!apostador) return res.status(404).json({ erro: 'Apostador não encontrado' });

    const apostaExistente = await get(
      'SELECT * FROM apostas_artilheiros WHERE mercado_id = ? AND apostador_id = ?',
      [mercado.id, apostador_id]
    );

    if (apostaExistente) {
      // EDITAR aposta (pode trocar de opção e/ou valor)
      const diff = valorNum - apostaExistente.valor;
      if (diff > 0) {
        // Deduçao atômica anti-race-condition
        const r = await run(
          'UPDATE apostadores SET saldo = saldo - ?, total_apostado = total_apostado + ? WHERE id = ? AND saldo >= ?',
          [diff, diff, apostador_id, diff]
        );
        if (r.changes === 0) return res.status(400).json({ erro: 'Saldo insuficiente' });
      }
      await transaction([
        { sql: 'UPDATE apostas_artilheiros SET opcao_escolhida = ?, valor = ? WHERE id = ?', params: [opcao_escolhida, valorNum, apostaExistente.id] },
        { sql: 'UPDATE mercados_artilheiros SET pote_total = pote_total + ? WHERE id = ?', params: [diff, mercado.id] },
        ...(diff <= 0 ? [{ sql: 'UPDATE apostadores SET saldo = saldo - ?, total_apostado = total_apostado + ? WHERE id = ?', params: [diff, diff, apostador_id] }] : []),
      ]);
    } else {
      // NOVA aposta — deduçao atômica anti-race-condition
      const r = await run(
        'UPDATE apostadores SET saldo = saldo - ?, total_apostado = total_apostado + ? WHERE id = ? AND saldo >= ?',
        [valorNum, valorNum, apostador_id, valorNum]
      );
      if (r.changes === 0) return res.status(400).json({ erro: 'Saldo insuficiente' });
      await transaction([
        { sql: 'INSERT INTO apostas_artilheiros (mercado_id, apostador_id, opcao_escolhida, valor) VALUES (?, ?, ?, ?)', params: [mercado.id, apostador_id, opcao_escolhida, valorNum] },
        { sql: 'UPDATE mercados_artilheiros SET pote_total = pote_total + ? WHERE id = ?', params: [valorNum, mercado.id] },
      ]);
    }

    const atualizado = await get('SELECT saldo FROM apostadores WHERE id = ?', [apostador_id]);

    // Sheets sync
    const jogoInfo = await get('SELECT * FROM jogos WHERE id = ?', [jogo_id]);
    const mercadoAtual = await get('SELECT * FROM mercados_artilheiros WHERE jogo_id = ?', [jogo_id]);
    const apostaAtual = await get('SELECT * FROM apostas_artilheiros WHERE mercado_id = ? AND apostador_id = ?', [mercadoAtual?.id, apostador_id]);
    const apInfo = await get('SELECT nome FROM apostadores WHERE id = ?', [apostador_id]);
    if (jogoInfo && apostaAtual && apInfo) {
      const jogoDesc = `${jogoInfo.flag_a} ${jogoInfo.time_a} vs ${jogoInfo.time_b} ${jogoInfo.flag_b}`;
      sheets.syncApostaArtilheiro(apostaAtual, apInfo.nome, jogoDesc, jogoInfo, mercadoAtual);
    }

    res.json({ sucesso: true, saldo: atualizado.saldo });
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno: ' + e.message });
  }
});

module.exports = router;
