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

// ─── Minhas apostas (todos os tipos) ─────────────────────────────────────────
router.get('/minhas-apostas/:id', async (req, res) => {
  const aid = req.params.id;
  try {
    // 1. Apostas de jogos
    const apostasJogo = await all(`
      SELECT a.id, 'jogo' as tipo, a.valor, a.status, a.premio, a.criado_em,
        a.resultado as opcao_escolhida,
        j.time_a, j.flag_a, j.time_b, j.flag_b, j.status as contexto_status,
        j.pote_total as pote_total,
        NULL as titulo
      FROM apostas a JOIN jogos j ON a.jogo_id = j.id
      WHERE a.apostador_id = ?
    `, [aid]);

    // 2. Apostas extras
    const apostasExtras = await all(`
      SELECT ae.id, 'extra' as tipo, ae.valor, ae.status, ae.premio, ae.criado_em,
        ae.opcao_escolhida,
        j.time_a, j.flag_a, j.time_b, j.flag_b, j.status as contexto_status,
        me.pote_total, me.tipo as extra_tipo, me.linha,
        NULL as titulo
      FROM apostas_extras ae
      JOIN mercados_extras me ON ae.mercado_id = me.id
      JOIN jogos j ON me.jogo_id = j.id
      WHERE ae.apostador_id = ?
    `, [aid]);

    // 3. Apostas longo prazo
    const apostasLP = await all(`
      SELECT a.id, 'longo_prazo' as tipo, a.valor, a.status, a.premio, a.criado_em,
        a.opcao_escolhida,
        NULL as time_a, NULL as flag_a, NULL as time_b, NULL as flag_b,
        m.status as contexto_status,
        m.pote_total,
        m.titulo
      FROM apostas_longo_prazo a JOIN mercados_longo_prazo m ON a.mercado_id = m.id
      WHERE a.apostador_id = ?
    `, [aid]);

    // 4. Apostas artilheiro
    const apostasArt = await all(`
      SELECT aa.id, 'artilheiro' as tipo, aa.valor, aa.status, aa.premio, aa.criado_em,
        aa.opcao_escolhida,
        j.time_a, j.flag_a, j.time_b, j.flag_b, j.status as contexto_status,
        ma.pote_total, ma.jogador_a, ma.jogador_b,
        NULL as titulo
      FROM apostas_artilheiros aa
      JOIN mercados_artilheiros ma ON aa.mercado_id = ma.id
      JOIN jogos j ON ma.jogo_id = j.id
      WHERE aa.apostador_id = ?
    `, [aid]);

    const todas = [
      ...apostasJogo,
      ...apostasExtras,
      ...apostasLP,
      ...apostasArt,
    ].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));

    res.json(todas);
  } catch (e) { res.status(500).json({ erro: 'Erro ao buscar apostas: ' + e.message }); }
});

// ─── Ranking ──────────────────────────────────────────────────────────────────
router.get('/ranking', async (req, res) => {
  try {
    const ranking = await all(`
      SELECT
        ap.id, ap.nome,
        (SELECT COUNT(*) FROM apostas WHERE apostador_id = ap.id AND status = 'ganhou') +
        (SELECT COUNT(*) FROM apostas_extras WHERE apostador_id = ap.id AND status = 'ganhou') +
        (SELECT COUNT(*) FROM apostas_longo_prazo WHERE apostador_id = ap.id AND status = 'ganhou') +
        (SELECT COUNT(*) FROM apostas_artilheiros WHERE apostador_id = ap.id AND status = 'ganhou') as vitorias,
        (SELECT COALESCE(SUM(premio), 0) FROM apostas WHERE apostador_id = ap.id AND status = 'ganhou') +
        (SELECT COALESCE(SUM(premio), 0) FROM apostas_extras WHERE apostador_id = ap.id AND status = 'ganhou') +
        (SELECT COALESCE(SUM(premio), 0) FROM apostas_longo_prazo WHERE apostador_id = ap.id AND status = 'ganhou') +
        (SELECT COALESCE(SUM(premio), 0) FROM apostas_artilheiros WHERE apostador_id = ap.id AND status = 'ganhou') as total_premio,
        (SELECT COUNT(*) FROM apostas WHERE apostador_id = ap.id) +
        (SELECT COUNT(*) FROM apostas_extras WHERE apostador_id = ap.id) +
        (SELECT COUNT(*) FROM apostas_longo_prazo WHERE apostador_id = ap.id) +
        (SELECT COUNT(*) FROM apostas_artilheiros WHERE apostador_id = ap.id) as total_apostas
      FROM apostadores ap
      WHERE (
        (SELECT COUNT(*) FROM apostas WHERE apostador_id = ap.id) +
        (SELECT COUNT(*) FROM apostas_extras WHERE apostador_id = ap.id) +
        (SELECT COUNT(*) FROM apostas_longo_prazo WHERE apostador_id = ap.id) +
        (SELECT COUNT(*) FROM apostas_artilheiros WHERE apostador_id = ap.id)
      ) > 0
      ORDER BY vitorias DESC, total_premio DESC
    `);
    const result = ranking.map((r, i) => ({
      posicao: i + 1, nome: r.nome, pontos: r.vitorias * 3,
      vitorias: r.vitorias, total_apostas: r.total_apostas,
      total_premio: r.total_premio,
      taxa_acerto: r.total_apostas > 0 ? Math.round((r.vitorias / r.total_apostas) * 100) : 0,
    }));
    res.json(result);
  } catch (e) { res.status(500).json({ erro: 'Erro ao carregar ranking' }); }
});

// ─── Notificações ─────────────────────────────────────────────────────────────
router.get('/:id/notificacoes', async (req, res) => {
  try {
    const notifs = await all('SELECT * FROM notificacoes WHERE apostador_id = ? ORDER BY criado_em DESC LIMIT 20', [req.params.id]);
    res.json(notifs);
  } catch (e) { res.status(500).json({ erro: 'Erro' }); }
});

router.patch('/:id/notificacoes/ler', async (req, res) => {
  try {
    await run('UPDATE notificacoes SET lida = 1 WHERE apostador_id = ?', [req.params.id]);
    res.json({ sucesso: true });
  } catch (e) { res.status(500).json({ erro: 'Erro' }); }
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

  try {
    // 1. Depósitos
    const depositos = await all(
      `SELECT valor, aprovado_em as data_efetiva, criado_em FROM depositos WHERE apostador_id = ? AND status = 'aprovado'`,
      [id]
    );

    // 2. Apostas — resultado do jogo
    const apostas = await all(
      `SELECT a.valor, a.status, a.premio, a.criado_em, j.time_a, j.time_b
       FROM apostas a JOIN jogos j ON a.jogo_id = j.id WHERE a.apostador_id = ?`,
      [id]
    );

    // 3. Apostas extras (Ambos Marcam / Mais-Menos / Pênaltis)
    const apostasExtras = await all(
      `SELECT ae.valor, ae.status, ae.premio, ae.criado_em,
              me.tipo as extra_tipo, me.linha,
              j.time_a, j.time_b
       FROM apostas_extras ae
       JOIN mercados_extras me ON ae.mercado_id = me.id
       JOIN jogos j ON me.jogo_id = j.id
       WHERE ae.apostador_id = ?`,
      [id]
    );

    // 4. Apostas artilheiro
    const apostasArt = await all(
      `SELECT aa.valor, aa.status, aa.premio, aa.criado_em,
              j.time_a, j.time_b
       FROM apostas_artilheiros aa
       JOIN mercados_artilheiros ma ON aa.mercado_id = ma.id
       JOIN jogos j ON ma.jogo_id = j.id
       WHERE aa.apostador_id = ?`,
      [id]
    );

    // 5. Apostas longo prazo
    const apostasLP = await all(
      `SELECT a.valor, a.status, a.premio, a.criado_em, m.titulo
       FROM apostas_longo_prazo a
       JOIN mercados_longo_prazo m ON a.mercado_id = m.id
       WHERE a.apostador_id = ?`,
      [id]
    );

    // 6. Saques
    const saques = await all(
      `SELECT valor, status, criado_em, pago_em as data_efetiva FROM saques WHERE apostador_id = ?`,
      [id]
    );

    const EXTRA_LABEL = { ambos_marcam: 'Ambos Marcam', mais_menos: 'Mais/Menos Gols', penaltis: 'Pênaltis' };

    depositos.forEach(d => movimentacoes.push({
      tipo: 'deposito', descricao: 'Depósito aprovado', valor: +d.valor,
      data: d.data_efetiva || d.criado_em,
    }));

    apostas.forEach(a => {
      const jogo = `${a.time_a} vs ${a.time_b}`;
      movimentacoes.push({ tipo: 'aposta', descricao: `Aposta: ${jogo}`, valor: -a.valor, data: a.criado_em });
      if (a.status === 'ganhou' && a.premio > 0)
        movimentacoes.push({ tipo: 'premio', descricao: `Prêmio: ${jogo}`, valor: +a.premio, data: a.criado_em });
    });

    apostasExtras.forEach(a => {
      const tipoLabel = EXTRA_LABEL[a.extra_tipo] || a.extra_tipo;
      const linha = a.extra_tipo === 'mais_menos' ? ` ${a.linha}` : '';
      const jogo = `${a.time_a} vs ${a.time_b}`;
      movimentacoes.push({ tipo: 'aposta', descricao: `Aposta ${tipoLabel}${linha}: ${jogo}`, valor: -a.valor, data: a.criado_em });
      if (a.status === 'ganhou' && a.premio > 0)
        movimentacoes.push({ tipo: 'premio', descricao: `Prêmio ${tipoLabel}${linha}: ${jogo}`, valor: +a.premio, data: a.criado_em });
    });

    apostasArt.forEach(a => {
      const jogo = `${a.time_a} vs ${a.time_b}`;
      movimentacoes.push({ tipo: 'aposta', descricao: `Aposta Artilheiro: ${jogo}`, valor: -a.valor, data: a.criado_em });
      if (a.status === 'ganhou' && a.premio > 0)
        movimentacoes.push({ tipo: 'premio', descricao: `Prêmio Artilheiro: ${jogo}`, valor: +a.premio, data: a.criado_em });
    });

    apostasLP.forEach(a => {
      movimentacoes.push({ tipo: 'aposta', descricao: `Aposta Longo Prazo: ${a.titulo}`, valor: -a.valor, data: a.criado_em });
      if (a.status === 'ganhou' && a.premio > 0)
        movimentacoes.push({ tipo: 'premio', descricao: `Prêmio Longo Prazo: ${a.titulo}`, valor: +a.premio, data: a.criado_em });
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
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao carregar extrato: ' + e.message });
  }
});

module.exports = router;
