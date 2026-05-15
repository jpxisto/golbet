const express = require('express');
const router = express.Router();
const { run, get, all, transaction } = require('../database');
const sheets = require('../sheets');

function authAdmin(req, res, next) {
  const senha = req.headers['x-admin-senha'];
  if (senha !== process.env.ADMIN_SENHA) return res.status(401).json({ erro: 'Não autorizado' });
  next();
}

router.post('/login', async (req, res) => {
  const { senha } = req.body;
  if (senha !== process.env.ADMIN_SENHA) return res.status(401).json({ erro: 'Senha incorreta' });
  res.json({ sucesso: true, nome: process.env.NOME_ADMIN || 'Admin' });
});

router.get('/stats', authAdmin, async (req, res) => {
  const totalArrecadado = (await get(`SELECT COALESCE(SUM(valor), 0) as v FROM depositos WHERE status = 'aprovado'`))?.v || 0;
  const lucroCasa = (await get(`SELECT COALESCE(SUM(valor), 0) as v FROM lucro_casa`))?.v || 0;
  const depositosPendentes = (await get(`SELECT COUNT(*) as c FROM depositos WHERE status = 'pendente'`))?.c || 0;
  const saquesPendentes = (await get(`SELECT COUNT(*) as c FROM saques WHERE status = 'pendente'`))?.c || 0;
  const totalApostadores = (await get(`SELECT COUNT(*) as c FROM apostadores`))?.c || 0;
  res.json({ totalArrecadado, lucroCasa, depositosPendentes, saquesPendentes, totalApostadores });
});

router.get('/apostadores', authAdmin, async (req, res) => {
  res.json(await all('SELECT * FROM apostadores ORDER BY criado_em DESC'));
});

// === DEPÓSITOS ===
router.get('/depositos', authAdmin, async (req, res) => {
  const { status } = req.query;
  const params = [];
  let q = `SELECT d.*, ap.nome, ap.telefone FROM depositos d JOIN apostadores ap ON d.apostador_id = ap.id`;
  if (status) { q += ' WHERE d.status = ?'; params.push(status); }
  q += ' ORDER BY d.criado_em DESC';
  res.json(await all(q, params));
});

router.patch('/depositos/:id/aprovar', authAdmin, async (req, res) => {
  const dep = await get('SELECT * FROM depositos WHERE id = ?', [req.params.id]);
  if (!dep) return res.status(404).json({ erro: 'Não encontrado' });
  if (dep.status !== 'pendente') return res.status(400).json({ erro: 'Não está pendente' });
  await transaction([
    { sql: `UPDATE depositos SET status = 'aprovado', aprovado_em = CURRENT_TIMESTAMP WHERE id = ?`, params: [dep.id] },
    { sql: 'UPDATE apostadores SET saldo = saldo + ?, total_depositado = total_depositado + ? WHERE id = ?', params: [dep.valor, dep.valor, dep.apostador_id] },
  ]);
  // Sync Sheets
  const ap = await get('SELECT * FROM apostadores WHERE id = ?', [dep.apostador_id]);
  sheets.syncDeposito({ ...dep, status: 'aprovado' }, ap?.nome || '');
  sheets.syncApostador(ap);
  sheets.logAdmin('Depósito aprovado', ap?.nome, `R$ ${Number(dep.valor).toFixed(2)}`);
  res.json({ sucesso: true });
});

router.patch('/depositos/:id/rejeitar', authAdmin, async (req, res) => {
  const { motivo } = req.body;
  if (!motivo) return res.status(400).json({ erro: 'Motivo obrigatório' });
  const dep = await get('SELECT * FROM depositos WHERE id = ?', [req.params.id]);
  if (!dep) return res.status(404).json({ erro: 'Não encontrado' });
  if (dep.status !== 'pendente') return res.status(400).json({ erro: 'Não está pendente' });
  await run(`UPDATE depositos SET status = 'rejeitado', motivo_rejeicao = ? WHERE id = ?`, [motivo, dep.id]);
  // Sync Sheets
  const ap = await get('SELECT nome FROM apostadores WHERE id = ?', [dep.apostador_id]);
  sheets.syncDeposito({ ...dep, status: 'rejeitado', motivo_rejeicao: motivo }, ap?.nome || '');
  sheets.logAdmin('Depósito rejeitado', `${ap?.nome} — ${motivo}`, `R$ ${Number(dep.valor).toFixed(2)}`);
  res.json({ sucesso: true });
});

// === SAQUES ===
router.get('/saques', authAdmin, async (req, res) => {
  const { status } = req.query;
  const params = [];
  let q = `SELECT s.*, ap.nome, ap.telefone FROM saques s JOIN apostadores ap ON s.apostador_id = ap.id`;
  if (status) { q += ' WHERE s.status = ?'; params.push(status); }
  q += ' ORDER BY s.criado_em DESC';
  res.json(await all(q, params));
});

router.patch('/saques/:id/pagar', authAdmin, async (req, res) => {
  const { observacao } = req.body;
  const saque = await get('SELECT * FROM saques WHERE id = ?', [req.params.id]);
  if (!saque) return res.status(404).json({ erro: 'Não encontrado' });
  if (saque.status !== 'pendente') return res.status(400).json({ erro: 'Não está pendente' });
  await transaction([
    { sql: `UPDATE saques SET status = 'pago', pago_em = CURRENT_TIMESTAMP, observacao = ? WHERE id = ?`, params: [observacao || null, saque.id] },
    { sql: 'UPDATE apostadores SET total_sacado = total_sacado + ? WHERE id = ?', params: [saque.valor, saque.apostador_id] },
  ]);
  // Sync Sheets
  const ap = await get('SELECT * FROM apostadores WHERE id = ?', [saque.apostador_id]);
  sheets.syncSaque({ ...saque, status: 'pago' }, ap?.nome || '');
  sheets.syncApostador(ap);
  sheets.logAdmin('Saque pago', `${ap?.nome} — Pix: ${saque.chave_pix_cliente}`, `R$ ${Number(saque.valor).toFixed(2)}`);
  res.json({ sucesso: true });
});

router.patch('/saques/:id/rejeitar', authAdmin, async (req, res) => {
  const { motivo } = req.body;
  if (!motivo) return res.status(400).json({ erro: 'Motivo obrigatório' });
  const saque = await get('SELECT * FROM saques WHERE id = ?', [req.params.id]);
  if (!saque) return res.status(404).json({ erro: 'Não encontrado' });
  if (saque.status !== 'pendente') return res.status(400).json({ erro: 'Não está pendente' });
  await transaction([
    { sql: `UPDATE saques SET status = 'rejeitado', motivo_rejeicao = ? WHERE id = ?`, params: [motivo, saque.id] },
    { sql: 'UPDATE apostadores SET saldo = saldo + ? WHERE id = ?', params: [saque.valor, saque.apostador_id] },
  ]);
  // Sync Sheets
  const ap = await get('SELECT * FROM apostadores WHERE id = ?', [saque.apostador_id]);
  sheets.syncSaque({ ...saque, status: 'rejeitado', motivo_rejeicao: motivo }, ap?.nome || '');
  sheets.syncApostador(ap);
  sheets.logAdmin('Saque rejeitado', `${ap?.nome} — ${motivo}`, `R$ ${Number(saque.valor).toFixed(2)}`);
  res.json({ sucesso: true });
});

// === JOGOS ===
router.get('/jogos', authAdmin, async (req, res) => {
  const jogos = await all('SELECT * FROM jogos ORDER BY data_hora ASC');
  const result = await Promise.all(jogos.map(async j => ({
    ...j,
    num_apostas: (await get('SELECT COUNT(*) as c FROM apostas WHERE jogo_id = ?', [j.id]))?.c || 0,
  })));
  res.json(result);
});

// Criar jogo
router.post('/jogos', authAdmin, async (req, res) => {
  const { time_a, flag_a, time_b, flag_b, data_hora, visivel } = req.body;
  if (!time_a || !time_b) return res.status(400).json({ erro: 'Times são obrigatórios' });
  const result = await run(
    `INSERT INTO jogos (time_a, flag_a, time_b, flag_b, data_hora, status, visivel) VALUES (?, ?, ?, ?, ?, 'fechado', ?)`,
    [time_a.trim(), flag_a || '🏳️', time_b.trim(), flag_b || '🏳️', data_hora || null, visivel !== false ? 1 : 0]
  );
  const jogo = await get('SELECT * FROM jogos WHERE id = ?', [result.lastID]);
  res.json(jogo);
});

// Editar jogo
router.put('/jogos/:id', authAdmin, async (req, res) => {
  const { time_a, flag_a, time_b, flag_b, data_hora, visivel } = req.body;
  if (!time_a || !time_b) return res.status(400).json({ erro: 'Times são obrigatórios' });
  const jogo = await get('SELECT * FROM jogos WHERE id = ?', [req.params.id]);
  if (!jogo) return res.status(404).json({ erro: 'Jogo não encontrado' });
  await run(
    `UPDATE jogos SET time_a = ?, flag_a = ?, time_b = ?, flag_b = ?, data_hora = ?, visivel = ? WHERE id = ?`,
    [time_a.trim(), flag_a || jogo.flag_a, time_b.trim(), flag_b || jogo.flag_b, data_hora ?? jogo.data_hora, visivel !== undefined ? (visivel ? 1 : 0) : jogo.visivel, req.params.id]
  );
  res.json(await get('SELECT * FROM jogos WHERE id = ?', [req.params.id]));
});

// Toggle visibilidade
router.patch('/jogos/:id/visivel', authAdmin, async (req, res) => {
  const { visivel } = req.body;
  await run('UPDATE jogos SET visivel = ? WHERE id = ?', [visivel ? 1 : 0, req.params.id]);
  res.json({ sucesso: true });
});

// Apagar jogo (só se não estiver aberto)
router.delete('/jogos/:id', authAdmin, async (req, res) => {
  try {
    const jogo = await get('SELECT * FROM jogos WHERE id = ?', [req.params.id]);
    if (!jogo) return res.status(404).json({ erro: 'Jogo não encontrado' });
    if (jogo.status === 'aberto') return res.status(400).json({ erro: 'Feche o mercado antes de apagar o jogo.' });

    // Apagar mercados extras vinculados (FK constraint)
    const extMercados = await all('SELECT id FROM mercados_extras WHERE jogo_id = ?', [req.params.id]);
    for (const em of extMercados) {
      await run('DELETE FROM apostas_extras WHERE mercado_id = ?', [em.id]);
    }
    await run('DELETE FROM mercados_extras WHERE jogo_id = ?', [req.params.id]);

    // Apagar mercado artilheiro vinculado (FK constraint)
    const artMercado = await get('SELECT id FROM mercados_artilheiros WHERE jogo_id = ?', [req.params.id]);
    if (artMercado) {
      await run('DELETE FROM apostas_artilheiros WHERE mercado_id = ?', [artMercado.id]);
      await run('DELETE FROM mercados_artilheiros WHERE id = ?', [artMercado.id]);
    }

    await run('DELETE FROM apostas WHERE jogo_id = ?', [req.params.id]);
    await run('DELETE FROM lucro_casa WHERE jogo_id = ?', [req.params.id]);
    await run('DELETE FROM jogos WHERE id = ?', [req.params.id]);
    res.json({ sucesso: true });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao apagar jogo: ' + e.message });
  }
});

router.patch('/jogos/:id/status', authAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['fechado', 'aberto', 'encerrado'].includes(status)) return res.status(400).json({ erro: 'Status inválido' });
  // Ao abrir apostas, torna o jogo automaticamente visível
  if (status === 'aberto') {
    await run('UPDATE jogos SET status = ?, visivel = 1 WHERE id = ?', [status, req.params.id]);
  } else {
    await run('UPDATE jogos SET status = ? WHERE id = ?', [status, req.params.id]);
  }
  res.json({ sucesso: true });
});

router.patch('/jogos/:id/finalizar', authAdmin, async (req, res) => {
  const { resultado } = req.body;
  if (!['A', 'empate', 'B'].includes(resultado)) return res.status(400).json({ erro: 'Resultado inválido' });
  const jogoId = parseInt(req.params.id);
  const jogo = await get('SELECT * FROM jogos WHERE id = ?', [jogoId]);
  if (!jogo) return res.status(404).json({ erro: 'Não encontrado' });
  if (jogo.status !== 'encerrado') return res.status(400).json({ erro: 'Jogo deve estar encerrado' });

  const apostas = await all('SELECT * FROM apostas WHERE jogo_id = ?', [jogoId]);
  const poteTotal = apostas.reduce((s, a) => s + a.valor, 0);
  const taxaCasa = poteTotal * 0.11;
  const potePremios = poteTotal * 0.89;
  const vencedoras = apostas.filter(a => a.resultado === resultado);
  const totalVencedor = vencedoras.reduce((s, a) => s + a.valor, 0);

  const ops = [];
  if (totalVencedor > 0) {
    const oddFinal = potePremios / totalVencedor;
    vencedoras.forEach(aposta => {
      const premio = aposta.valor * oddFinal;
      ops.push({ sql: 'UPDATE apostadores SET saldo = saldo + ?, total_ganho = total_ganho + ? WHERE id = ?', params: [premio, premio, aposta.apostador_id] });
      ops.push({ sql: `UPDATE apostas SET status = 'ganhou', premio = ?, odd_final = ? WHERE id = ?`, params: [premio, oddFinal, aposta.id] });
    });
    apostas.filter(a => a.resultado !== resultado).forEach(a => {
      ops.push({ sql: `UPDATE apostas SET status = 'perdeu' WHERE id = ?`, params: [a.id] });
    });
    ops.push({ sql: 'INSERT INTO lucro_casa (jogo_id, valor) VALUES (?, ?)', params: [jogoId, taxaCasa] });
    ops.push({ sql: `UPDATE jogos SET status = 'finalizado', resultado = ?, taxa_casa = ?, odd_final = ? WHERE id = ?`, params: [resultado, taxaCasa, oddFinal, jogoId] });
  } else {
    apostas.forEach(a => ops.push({ sql: `UPDATE apostas SET status = 'perdeu' WHERE id = ?`, params: [a.id] }));
    ops.push({ sql: 'INSERT INTO lucro_casa (jogo_id, valor) VALUES (?, ?)', params: [jogoId, poteTotal] });
    ops.push({ sql: `UPDATE jogos SET status = 'finalizado', resultado = ?, taxa_casa = ?, odd_final = 0 WHERE id = ?`, params: [resultado, poteTotal, jogoId] });
  }

  await transaction(ops);

  // Sync Sheets — lucro + todas as apostas com resultado final
  const jogoDesc = `${jogo.flag_a} ${jogo.time_a} vs ${jogo.time_b} ${jogo.flag_b}`;
  sheets.syncLucroCasa(jogoId, jogoDesc, taxaCasa);
  sheets.logAdmin('Jogo finalizado', `${jogoDesc} — resultado: ${resultado}`, `Pote: R$ ${poteTotal.toFixed(2)}`);
  for (const aposta of apostas) {
    const ap = await get('SELECT nome FROM apostadores WHERE id = ?', [aposta.apostador_id]);
    const status = aposta.resultado === resultado ? 'ganhou' : 'perdeu';
    const premio = vencedoras.find(v => v.id === aposta.id)
      ? (aposta.valor / (totalVencedor || 1)) * potePremios : 0;
    sheets.syncAposta({ ...aposta, status, premio }, ap?.nome || '', jogoDesc, jogo);
  }

  // Notificações para apostadores
  for (const aposta of apostas) {
    const ganhou = aposta.resultado === resultado;
    const premio = ganhou && totalVencedor > 0 ? (aposta.valor / totalVencedor) * potePremios : 0;
    const msg = ganhou
      ? `🎉 Você ganhou R$ ${premio.toFixed(2)} no jogo ${jogoDesc}!`
      : `😔 Você não acertou o resultado do jogo ${jogoDesc}.`;
    await run('INSERT INTO notificacoes (apostador_id, mensagem, tipo) VALUES (?, ?, ?)',
      [aposta.apostador_id, msg, ganhou ? 'vitoria' : 'derrota']);
  }

  res.json({ sucesso: true });
});

router.get('/jogos/:id/relatorio', authAdmin, async (req, res) => {
  const jogo = await get('SELECT * FROM jogos WHERE id = ?', [req.params.id]);
  if (!jogo) return res.status(404).json({ erro: 'Não encontrado' });
  const apostas = await all(
    `SELECT a.*, ap.nome, ap.telefone FROM apostas a JOIN apostadores ap ON a.apostador_id = ap.id WHERE a.jogo_id = ?`,
    [req.params.id]
  );
  const poteTotal = apostas.reduce((s, a) => s + a.valor, 0);
  const por_resultado = {
    A: apostas.filter(a => a.resultado === 'A').reduce((s, a) => s + a.valor, 0),
    empate: apostas.filter(a => a.resultado === 'empate').reduce((s, a) => s + a.valor, 0),
    B: apostas.filter(a => a.resultado === 'B').reduce((s, a) => s + a.valor, 0),
  };
  res.json({ jogo, apostas, poteTotal, taxaCasa: jogo.taxa_casa, potePremios: poteTotal * 0.89, por_resultado });
});

// ═══════════════════════════════════════════════════════════════════════════════
// === APOSTADORES (admin) =====================================================

// Resetar senha de um apostador
router.patch('/apostadores/:id/resetar-senha', authAdmin, async (req, res) => {
  const bcrypt = require('bcryptjs');
  const { nova_senha } = req.body;
  if (!nova_senha || nova_senha.length < 4)
    return res.status(400).json({ erro: 'Nova senha deve ter pelo menos 4 caracteres' });

  const apostador = await get('SELECT id, nome FROM apostadores WHERE id = ?', [req.params.id]);
  if (!apostador) return res.status(404).json({ erro: 'Apostador não encontrado' });

  const hash = await bcrypt.hash(nova_senha, 10);
  await run('UPDATE apostadores SET senha = ? WHERE id = ?', [hash, req.params.id]);
  sheets.logAdmin('Senha redefinida', apostador.nome, '—');
  res.json({ sucesso: true, nome: apostador.nome });
});

// Ajustar saldo manualmente (crédito ou débito)
router.patch('/apostadores/:id/ajustar-saldo', authAdmin, async (req, res) => {
  const { valor, motivo } = req.body;
  const num = parseFloat(valor);
  if (isNaN(num) || num === 0)
    return res.status(400).json({ erro: 'Informe um valor diferente de zero' });
  if (!motivo || !motivo.trim())
    return res.status(400).json({ erro: 'Motivo obrigatório' });

  const apostador = await get('SELECT id, nome, saldo FROM apostadores WHERE id = ?', [req.params.id]);
  if (!apostador) return res.status(404).json({ erro: 'Apostador não encontrado' });

  const novoSaldo = parseFloat(apostador.saldo) + num;
  if (novoSaldo < 0) return res.status(400).json({ erro: 'Saldo ficaria negativo' });

  await run('UPDATE apostadores SET saldo = ? WHERE id = ?', [novoSaldo, req.params.id]);
  const apAtualizado = await get('SELECT * FROM apostadores WHERE id = ?', [req.params.id]);
  sheets.syncApostador(apAtualizado);
  sheets.logAdmin('Saldo ajustado', `${apostador.nome} — ${motivo}`, `${num >= 0 ? '+' : ''}R$ ${num.toFixed(2)} → novo saldo: R$ ${novoSaldo.toFixed(2)}`);
  res.json({ sucesso: true, nome: apostador.nome, saldo_anterior: apostador.saldo, novo_saldo: novoSaldo });
});

// === LONGO PRAZO (admin) =====================================================
// ═══════════════════════════════════════════════════════════════════════════════

// Lista todos os mercados com contagem de apostas
router.get('/longo-prazo/mercados', authAdmin, async (req, res) => {
  try {
    const mercados = await all(`
      SELECT m.*, COUNT(a.id) as num_apostas
      FROM mercados_longo_prazo m
      LEFT JOIN apostas_longo_prazo a ON a.mercado_id = m.id
      GROUP BY m.id
      ORDER BY m.criado_em DESC
    `);
    res.json(mercados.map(m => ({ ...m, opcoes: JSON.parse(m.opcoes || '[]') })));
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// Criar novo mercado
router.post('/longo-prazo/mercados', authAdmin, async (req, res) => {
  const { titulo, opcoes } = req.body;
  if (!titulo || !titulo.trim()) return res.status(400).json({ erro: 'Título obrigatório' });
  if (!Array.isArray(opcoes) || opcoes.length < 2) {
    return res.status(400).json({ erro: 'Informe pelo menos 2 opções' });
  }
  const opcoesLimpas = opcoes.map(o => o.trim()).filter(Boolean);
  if (opcoesLimpas.length < 2) return res.status(400).json({ erro: 'Opções inválidas' });

  try {
    const result = await run(
      `INSERT INTO mercados_longo_prazo (titulo, opcoes) VALUES (?, ?)`,
      [titulo.trim(), JSON.stringify(opcoesLimpas)]
    );
    const mercado = await get('SELECT * FROM mercados_longo_prazo WHERE id = ?', [result.lastID]);
    res.json({ ...mercado, opcoes: JSON.parse(mercado.opcoes) });
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// Altera status do mercado (aberto ↔ fechado)
router.patch('/longo-prazo/mercados/:id/status', authAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['aberto', 'fechado'].includes(status)) {
    return res.status(400).json({ erro: 'Status deve ser "aberto" ou "fechado"' });
  }
  const mercado = await get('SELECT * FROM mercados_longo_prazo WHERE id = ?', [req.params.id]);
  if (!mercado) return res.status(404).json({ erro: 'Mercado não encontrado' });
  if (mercado.resultado) return res.status(400).json({ erro: 'Mercado já foi finalizado' });

  try {
    const fechadoEm = status === 'fechado' ? `CURRENT_TIMESTAMP` : 'NULL';
    await run(
      `UPDATE mercados_longo_prazo SET status = ?, fechado_em = ${fechadoEm} WHERE id = ?`,
      [status, req.params.id]
    );
    res.json({ sucesso: true });
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// Finaliza mercado: define resultado e distribui prêmios (90% do pote)
router.patch('/longo-prazo/mercados/:id/finalizar', authAdmin, async (req, res) => {
  const { resultado } = req.body;
  if (!resultado || !resultado.trim()) return res.status(400).json({ erro: 'Resultado obrigatório' });

  const mercadoId = parseInt(req.params.id);
  const mercado = await get('SELECT * FROM mercados_longo_prazo WHERE id = ?', [mercadoId]);
  if (!mercado) return res.status(404).json({ erro: 'Mercado não encontrado' });
  if (mercado.resultado) return res.status(400).json({ erro: 'Este mercado já foi finalizado' });

  // Valida que o resultado é uma das opções válidas
  const opcoes = JSON.parse(mercado.opcoes || '[]');
  if (!opcoes.includes(resultado)) return res.status(400).json({ erro: 'Resultado não é uma opção válida deste mercado' });

  try {
    const apostas = await all('SELECT * FROM apostas_longo_prazo WHERE mercado_id = ?', [mercadoId]);
    const poteTotal = apostas.reduce((s, a) => s + a.valor, 0);
    const taxaCasa = poteTotal * 0.11;
    const potePremios = poteTotal * 0.89;

    const vencedoras = apostas.filter(a => a.opcao_escolhida === resultado);
    const totalVencedores = vencedoras.reduce((s, a) => s + a.valor, 0);

    const ops = [];

    if (totalVencedores > 0) {
      // Distribui proporcionalmente entre vencedores (mesmo padrão das apostas comuns)
      vencedoras.forEach(aposta => {
        const premio = (aposta.valor / totalVencedores) * potePremios;
        ops.push({
          sql: 'UPDATE apostadores SET saldo = saldo + ?, total_ganho = total_ganho + ? WHERE id = ?',
          params: [premio, premio, aposta.apostador_id],
        });
        ops.push({
          sql: `UPDATE apostas_longo_prazo SET status = 'ganhou', premio = ? WHERE id = ?`,
          params: [premio, aposta.id],
        });
      });
      // Perdedores
      apostas.filter(a => a.opcao_escolhida !== resultado).forEach(a => {
        ops.push({ sql: `UPDATE apostas_longo_prazo SET status = 'perdeu' WHERE id = ?`, params: [a.id] });
      });
    } else {
      // Ninguém acertou: casa fica com tudo
      apostas.forEach(a => {
        ops.push({ sql: `UPDATE apostas_longo_prazo SET status = 'perdeu' WHERE id = ?`, params: [a.id] });
      });
    }

    // Atualiza o mercado com resultado e dados finais
    ops.push({
      sql: `UPDATE mercados_longo_prazo SET status = 'fechado', resultado = ?, taxa_casa = ?, fechado_em = CURRENT_TIMESTAMP WHERE id = ?`,
      params: [resultado, taxaCasa, mercadoId],
    });

    await transaction(ops);
    res.json({ sucesso: true });
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// Lista apostas de um mercado específico
router.get('/longo-prazo/mercados/:id/apostas', authAdmin, async (req, res) => {
  const mercado = await get('SELECT * FROM mercados_longo_prazo WHERE id = ?', [req.params.id]);
  if (!mercado) return res.status(404).json({ erro: 'Mercado não encontrado' });

  try {
    const apostas = await all(`
      SELECT a.*, ap.nome, ap.telefone
      FROM apostas_longo_prazo a
      JOIN apostadores ap ON a.apostador_id = ap.id
      WHERE a.mercado_id = ?
      ORDER BY a.criado_em DESC
    `, [req.params.id]);

    const poteTotal = apostas.reduce((s, a) => s + a.valor, 0);
    res.json({
      mercado: { ...mercado, opcoes: JSON.parse(mercado.opcoes || '[]') },
      apostas,
      poteTotal,
      potePremios: poteTotal * 0.89,
      taxaCasa: poteTotal * 0.11,
    });
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// Apaga mercado (só se não tiver apostas ou estiver fechado sem resultado)
router.delete('/longo-prazo/mercados/:id', authAdmin, async (req, res) => {
  const mercado = await get('SELECT * FROM mercados_longo_prazo WHERE id = ?', [req.params.id]);
  if (!mercado) return res.status(404).json({ erro: 'Mercado não encontrado' });
  if (mercado.resultado) return res.status(400).json({ erro: 'Não é possível apagar um mercado já finalizado' });
  if (mercado.status === 'aberto') return res.status(400).json({ erro: 'Feche o mercado antes de apagar' });

  try {
    // Se há apostas pendentes, devolve o saldo aos apostadores antes de apagar
    const apostas = await all('SELECT * FROM apostas_longo_prazo WHERE mercado_id = ?', [req.params.id]);
    const ops = apostas.map(a => ({
      sql: 'UPDATE apostadores SET saldo = saldo + ?, total_apostado = total_apostado - ? WHERE id = ?',
      params: [a.valor, a.valor, a.apostador_id],
    }));
    ops.push({ sql: 'DELETE FROM apostas_longo_prazo WHERE mercado_id = ?', params: [req.params.id] });
    ops.push({ sql: 'DELETE FROM mercados_longo_prazo WHERE id = ?', params: [req.params.id] });

    await transaction(ops);
    res.json({ sucesso: true });
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ─── Dashboard Financeiro ─────────────────────────────────────────────────────
router.get('/financeiro', authAdmin, async (req, res) => {
  try {
    const totalDepositado = await get("SELECT COALESCE(SUM(valor), 0) as v FROM depositos WHERE status = 'aprovado'");
    const totalSacado = await get("SELECT COALESCE(SUM(valor), 0) as v FROM saques WHERE status = 'pago'");
    const lucroCasa = await get("SELECT COALESCE(SUM(valor), 0) as v FROM lucro_casa");
    const totalApostado = await get("SELECT COALESCE(SUM(total_apostado), 0) as v FROM apostadores");
    const totalGanho = await get("SELECT COALESCE(SUM(total_ganho), 0) as v FROM apostadores");
    const saldoTotal = await get("SELECT COALESCE(SUM(saldo), 0) as v FROM apostadores");
    const totalApostadores = await get("SELECT COUNT(*) as v FROM apostadores");
    const apostasAtivas = await get("SELECT COALESCE(SUM(valor), 0) as v FROM apostas WHERE status = 'pendente'");
    const saquesPendentes = await get("SELECT COALESCE(SUM(valor), 0) as v FROM saques WHERE status = 'pendente'");

    res.json({
      totalDepositado: totalDepositado.v,
      totalSacado: totalSacado.v,
      lucroCasa: lucroCasa.v,
      totalApostado: totalApostado.v,
      totalGanho: totalGanho.v,
      saldoTotal: saldoTotal.v,
      totalApostadores: totalApostadores.v,
      apostasAtivas: apostasAtivas.v,
      saquesPendentes: saquesPendentes.v,
    });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao carregar financeiro' });
  }
});

// ─── TEMP: Limpar planilha Google Sheets ─────────────────────────────────────
router.post('/limpar-sheets', authAdmin, async (req, res) => {
  const resultado = await sheets.clearAllSheets();
  res.json(resultado);
});

module.exports = router;
