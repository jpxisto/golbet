const express = require('express');
const router = express.Router();
const { run, get, all, transaction } = require('../database');

// ── GET /api/longo-prazo ──────────────────────────────────────────────────────
// Lista todos os mercados visíveis (abertos e finalizados) com contagem de apostas
router.get('/', async (req, res) => {
  try {
    const mercados = await all(`
      SELECT m.*,
             COUNT(a.id) as num_apostadores
      FROM mercados_longo_prazo m
      LEFT JOIN apostas_longo_prazo a ON a.mercado_id = m.id
      GROUP BY m.id
      ORDER BY m.criado_em DESC
    `);

    // Parseia o campo opcoes (JSON string) para array
    const result = mercados.map(m => ({
      ...m,
      opcoes: JSON.parse(m.opcoes || '[]'),
    }));

    res.json(result);
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── GET /api/longo-prazo/minhas/:apostador_id ─────────────────────────────────
// Retorna apostas de longo prazo do usuário com dados do mercado
router.get('/minhas/:apostador_id', async (req, res) => {
  try {
    const apostas = await all(`
      SELECT a.*, m.titulo, m.status as mercado_status, m.resultado as mercado_resultado, m.opcoes
      FROM apostas_longo_prazo a
      JOIN mercados_longo_prazo m ON a.mercado_id = m.id
      WHERE a.apostador_id = ?
      ORDER BY a.criado_em DESC
    `, [req.params.apostador_id]);

    const result = apostas.map(a => ({
      ...a,
      opcoes: JSON.parse(a.opcoes || '[]'),
    }));

    res.json(result);
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── POST /api/longo-prazo/:id/apostar ─────────────────────────────────────────
// Faz uma aposta em um mercado de longo prazo
router.post('/:id/apostar', async (req, res) => {
  const { apostador_id, opcao_escolhida, valor } = req.body;
  const mercadoId = parseInt(req.params.id);

  // Validações básicas
  if (!apostador_id || !opcao_escolhida || !valor) {
    return res.status(400).json({ erro: 'Campos obrigatórios: apostador_id, opcao_escolhida, valor' });
  }
  const valorNum = parseFloat(valor);
  if (isNaN(valorNum) || valorNum < 5) {
    return res.status(400).json({ erro: 'Valor mínimo de R$ 5,00' });
  }

  try {
    // Verifica se o mercado existe e está aberto
    const mercado = await get('SELECT * FROM mercados_longo_prazo WHERE id = ?', [mercadoId]);
    if (!mercado) return res.status(404).json({ erro: 'Mercado não encontrado' });
    if (mercado.status !== 'aberto') return res.status(400).json({ erro: 'Este mercado não está aberto para apostas' });

    // Verifica se a opção escolhida é válida
    const opcoes = JSON.parse(mercado.opcoes || '[]');
    if (!opcoes.includes(opcao_escolhida)) {
      return res.status(400).json({ erro: 'Opção inválida para este mercado' });
    }

    // Verifica se o apostador existe e tem saldo suficiente
    const apostador = await get('SELECT * FROM apostadores WHERE id = ?', [apostador_id]);
    if (!apostador) return res.status(404).json({ erro: 'Apostador não encontrado' });
    if (apostador.saldo < valorNum) return res.status(400).json({ erro: 'Saldo insuficiente' });

    // Verifica se já apostou NESTA OPÇÃO específica (pode apostar em outras opções do mesmo mercado)
    const apostaExistente = await get(
      'SELECT * FROM apostas_longo_prazo WHERE mercado_id = ? AND apostador_id = ? AND opcao_escolhida = ?',
      [mercadoId, apostador_id, opcao_escolhida]
    );

    if (apostaExistente) {
      // EDITAR aposta existente nesta opção
      const diff = valorNum - apostaExistente.valor;
      if (diff > 0 && apostador.saldo < diff) {
        return res.status(400).json({ erro: 'Saldo insuficiente para aumentar a aposta' });
      }
      await transaction([
        { sql: 'UPDATE apostas_longo_prazo SET valor = ? WHERE id = ?', params: [valorNum, apostaExistente.id] },
        { sql: 'UPDATE mercados_longo_prazo SET pote_total = pote_total + ? WHERE id = ?', params: [diff, mercadoId] },
        { sql: 'UPDATE apostadores SET saldo = saldo - ?, total_apostado = total_apostado + ? WHERE id = ?', params: [diff, diff, apostador_id] },
      ]);
      const atualizado = await get('SELECT saldo FROM apostadores WHERE id = ?', [apostador_id]);
      return res.json({ sucesso: true, saldo: atualizado.saldo, editado: true });
    }

    // NOVA aposta (nesta opção ainda não apostada)
    await transaction([
      {
        sql: 'UPDATE apostadores SET saldo = saldo - ?, total_apostado = total_apostado + ? WHERE id = ?',
        params: [valorNum, valorNum, apostador_id],
      },
      {
        sql: `INSERT INTO apostas_longo_prazo (mercado_id, apostador_id, opcao_escolhida, valor) VALUES (?, ?, ?, ?)`,
        params: [mercadoId, apostador_id, opcao_escolhida, valorNum],
      },
      {
        sql: 'UPDATE mercados_longo_prazo SET pote_total = pote_total + ? WHERE id = ?',
        params: [valorNum, mercadoId],
      },
    ]);

    const atualizado = await get('SELECT saldo FROM apostadores WHERE id = ?', [apostador_id]);
    res.json({ sucesso: true, saldo: atualizado.saldo });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) {
      return res.status(409).json({ erro: 'Você já apostou nesta opção' });
    }
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
