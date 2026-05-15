const express = require('express');
const router = express.Router();
const { run, get, all, transaction } = require('../database');
const sheets = require('../sheets');

const ADMIN_SENHA = process.env.ADMIN_SENHA || 'rolemberg2025';

const TIPOS = {
  ambos_marcam: { label: 'Ambos Marcam', opcoes: ['sim', 'nao'] },
  mais_menos:   { label: 'Mais/Menos Gols', opcoes: ['mais', 'menos'] },
  penaltis:     { label: 'Pênaltis', opcoes: ['sim', 'nao'] },
};

function authAdmin(req, res, next) {
  if (req.headers['x-admin-senha'] !== ADMIN_SENHA) return res.status(401).json({ erro: 'Não autorizado' });
  next();
}

// ─── Público: mercados de um jogo ─────────────────────────────────────────────
router.get('/jogo/:jogoId', async (req, res) => {
  try {
    const jogoId = req.params.jogoId;
    const apostadorId = req.headers['apostador-id'];
    const mercados = await all('SELECT * FROM mercados_extras WHERE jogo_id = ? ORDER BY tipo', [jogoId]);

    const result = [];
    for (const m of mercados) {
      const apostas = await all(
        'SELECT opcao_escolhida, SUM(valor) as total, COUNT(*) as num FROM apostas_extras WHERE mercado_id = ? GROUP BY opcao_escolhida',
        [m.id]
      );
      let minhaAposta = null;
      if (apostadorId) {
        minhaAposta = await get('SELECT * FROM apostas_extras WHERE mercado_id = ? AND apostador_id = ?', [m.id, apostadorId]);
      }
      const totais = {};
      apostas.forEach(a => { totais[a.opcao_escolhida] = a.total; });
      const tipoInfo = TIPOS[m.tipo] || {};
      result.push({ ...m, tipoLabel: tipoInfo.label || m.tipo, opcoes: tipoInfo.opcoes || [], totais, minhaAposta });
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao buscar mercados extras' });
  }
});

// ─── Apostar ──────────────────────────────────────────────────────────────────
router.post('/apostar', async (req, res) => {
  const { mercado_id, apostador_id, opcao_escolhida, valor } = req.body;
  if (!mercado_id || !apostador_id || !opcao_escolhida || !valor)
    return res.status(400).json({ erro: 'Dados inválidos' });

  const valorNum = parseFloat(valor);
  if (valorNum < 5) return res.status(400).json({ erro: 'Valor mínimo: R$ 5,00' });

  try {
    const mercado = await get('SELECT * FROM mercados_extras WHERE id = ?', [mercado_id]);
    if (!mercado) return res.status(404).json({ erro: 'Mercado não encontrado' });
    if (mercado.status !== 'aberto') return res.status(400).json({ erro: 'Mercado fechado para apostas' });

    const tipoInfo = TIPOS[mercado.tipo];
    if (!tipoInfo || !tipoInfo.opcoes.includes(opcao_escolhida))
      return res.status(400).json({ erro: 'Opção inválida' });

    const apostador = await get('SELECT id FROM apostadores WHERE id = ?', [apostador_id]);
    if (!apostador) return res.status(404).json({ erro: 'Apostador não encontrado' });

    const existente = await get('SELECT * FROM apostas_extras WHERE mercado_id = ? AND apostador_id = ?', [mercado_id, apostador_id]);

    const ops = [];
    if (existente) {
      const diff = valorNum - existente.valor;
      ops.push({ sql: 'UPDATE mercados_extras SET pote_total = pote_total - ? WHERE id = ?', params: [existente.valor, mercado_id] });
      ops.push({ sql: 'UPDATE apostas_extras SET opcao_escolhida = ?, valor = ?, criado_em = CURRENT_TIMESTAMP WHERE mercado_id = ? AND apostador_id = ?', params: [opcao_escolhida, valorNum, mercado_id, apostador_id] });
      if (diff > 0) {
        const r = await run('UPDATE apostadores SET saldo = saldo - ?, total_apostado = total_apostado + ? WHERE id = ? AND saldo >= ?', [diff, diff, apostador_id, diff]);
        if (r.changes === 0) return res.status(400).json({ erro: 'Saldo insuficiente' });
      } else {
        ops.push({ sql: 'UPDATE apostadores SET saldo = saldo - ?, total_apostado = total_apostado + ? WHERE id = ?', params: [diff, diff, apostador_id] });
      }
    } else {
      const r = await run('UPDATE apostadores SET saldo = saldo - ?, total_apostado = total_apostado + ? WHERE id = ? AND saldo >= ?', [valorNum, valorNum, apostador_id, valorNum]);
      if (r.changes === 0) return res.status(400).json({ erro: 'Saldo insuficiente' });
      ops.push({ sql: 'INSERT INTO apostas_extras (mercado_id, apostador_id, opcao_escolhida, valor) VALUES (?, ?, ?, ?)', params: [mercado_id, apostador_id, opcao_escolhida, valorNum] });
    }
    ops.push({ sql: 'UPDATE mercados_extras SET pote_total = pote_total + ? WHERE id = ?', params: [valorNum, mercado_id] });
    await transaction(ops);

    const novoSaldo = await get('SELECT saldo FROM apostadores WHERE id = ?', [apostador_id]);

    // Sheets sync
    const jogo = await get('SELECT * FROM jogos WHERE id = ?', [mercado.jogo_id]);
    const apInfo = await get('SELECT nome FROM apostadores WHERE id = ?', [apostador_id]);
    const apostaInfo = await get('SELECT * FROM apostas_extras WHERE mercado_id = ? AND apostador_id = ?', [mercado_id, apostador_id]);
    if (jogo && apInfo && apostaInfo) {
      const desc = `${tipoInfo.label}: ${jogo.flag_a} ${jogo.time_a} vs ${jogo.time_b} ${jogo.flag_b}`;
      sheets.syncApostaExtra(apostaInfo, apInfo.nome, desc);
    }

    res.json({ sucesso: true, saldo: novoSaldo.saldo });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao registrar aposta: ' + e.message });
  }
});

// ─── Admin: listar todos ──────────────────────────────────────────────────────
router.get('/admin/lista', authAdmin, async (req, res) => {
  try {
    const mercados = await all(`
      SELECT me.*, j.time_a, j.flag_a, j.time_b, j.flag_b, j.data_hora
      FROM mercados_extras me JOIN jogos j ON me.jogo_id = j.id
      ORDER BY me.criado_em DESC
    `);
    for (const m of mercados) {
      m.apostas = await all(`
        SELECT ae.*, ap.nome FROM apostas_extras ae
        JOIN apostadores ap ON ae.apostador_id = ap.id
        WHERE ae.mercado_id = ?
      `, [m.id]);
    }
    res.json(mercados);
  } catch (e) {
    res.status(500).json({ erro: 'Erro' });
  }
});

// ─── Admin: criar mercado ─────────────────────────────────────────────────────
router.post('/admin/criar', authAdmin, async (req, res) => {
  const { jogo_id, tipo, linha } = req.body;
  if (!jogo_id || !tipo || !TIPOS[tipo])
    return res.status(400).json({ erro: 'Tipo inválido. Use: ambos_marcam, mais_menos, penaltis' });

  try {
    const jogo = await get('SELECT * FROM jogos WHERE id = ?', [jogo_id]);
    if (!jogo) return res.status(404).json({ erro: 'Jogo não encontrado' });

    const existe = await get('SELECT id FROM mercados_extras WHERE jogo_id = ? AND tipo = ?', [jogo_id, tipo]);
    if (existe) return res.status(409).json({ erro: 'Já existe este mercado para este jogo' });

    const linhaVal = tipo === 'mais_menos' ? (parseFloat(linha) || 2.5) : null;
    const result = await run('INSERT INTO mercados_extras (jogo_id, tipo, linha) VALUES (?, ?, ?)', [jogo_id, tipo, linhaVal]);
    sheets.logAdmin('Mercado extra criado', `${TIPOS[tipo].label} — ${jogo.flag_a} ${jogo.time_a} vs ${jogo.time_b} ${jogo.flag_b}`, '—');
    res.json({ id: result.lastID, sucesso: true });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao criar mercado' });
  }
});

// ─── Admin: finalizar mercado ─────────────────────────────────────────────────
router.post('/admin/finalizar', authAdmin, async (req, res) => {
  const { mercado_id, resultado } = req.body;
  if (!mercado_id || !resultado) return res.status(400).json({ erro: 'Dados inválidos' });

  try {
    const mercado = await get('SELECT * FROM mercados_extras WHERE id = ?', [mercado_id]);
    if (!mercado) return res.status(404).json({ erro: 'Mercado não encontrado' });
    if (mercado.resultado) return res.status(400).json({ erro: 'Mercado já finalizado' });

    const tipoInfo = TIPOS[mercado.tipo];
    if (!tipoInfo || !tipoInfo.opcoes.includes(resultado))
      return res.status(400).json({ erro: 'Resultado inválido' });

    const apostas = await all('SELECT * FROM apostas_extras WHERE mercado_id = ?', [mercado_id]);
    const poteTotal = apostas.reduce((s, a) => s + a.valor, 0);
    const potePremios = poteTotal * 0.89;
    const taxaCasa = poteTotal * 0.11;

    const vencedoras = apostas.filter(a => a.opcao_escolhida === resultado);
    const totalVencedores = vencedoras.reduce((s, a) => s + a.valor, 0);

    const ops = [];
    if (totalVencedores > 0) {
      for (const a of vencedoras) {
        const premio = (a.valor / totalVencedores) * potePremios;
        ops.push({ sql: 'UPDATE apostas_extras SET status = ?, premio = ? WHERE id = ?', params: ['ganhou', premio, a.id] });
        ops.push({ sql: 'UPDATE apostadores SET saldo = saldo + ?, total_ganho = total_ganho + ? WHERE id = ?', params: [premio, premio, a.apostador_id] });
      }
    }
    for (const a of apostas.filter(x => x.opcao_escolhida !== resultado)) {
      ops.push({ sql: 'UPDATE apostas_extras SET status = ? WHERE id = ?', params: ['perdeu', a.id] });
    }
    ops.push({ sql: 'UPDATE mercados_extras SET status = ?, resultado = ?, taxa_casa = ? WHERE id = ?', params: ['fechado', resultado, taxaCasa, mercado_id] });
    if (taxaCasa > 0) {
      ops.push({ sql: 'INSERT INTO lucro_casa (jogo_id, valor) VALUES (?, ?)', params: [mercado.jogo_id, taxaCasa] });
    }
    await transaction(ops);

    // Notificações
    const jogo = await get('SELECT * FROM jogos WHERE id = ?', [mercado.jogo_id]);
    const jogoDesc = jogo ? `${jogo.flag_a} ${jogo.time_a} vs ${jogo.time_b} ${jogo.flag_b}` : '';
    const mercadoLabel = tipoInfo.label;

    for (const a of apostas) {
      const ganhou = a.opcao_escolhida === resultado;
      const premio = ganhou && totalVencedores > 0 ? (a.valor / totalVencedores) * potePremios : 0;
      const msg = ganhou
        ? `🎉 Você ganhou R$ ${premio.toFixed(2)} em ${mercadoLabel} (${jogoDesc})!`
        : `😔 ${mercadoLabel} (${jogoDesc}): resultado "${resultado}". Você apostou "${a.opcao_escolhida}".`;
      await run('INSERT INTO notificacoes (apostador_id, mensagem, tipo) VALUES (?, ?, ?)',
        [a.apostador_id, msg, ganhou ? 'vitoria' : 'derrota']);
    }

    // Sheets sync
    sheets.syncLucroCasa(mercado.jogo_id, `${mercadoLabel} — ${jogoDesc}`, taxaCasa);
    sheets.logAdmin('Mercado extra finalizado', `${mercadoLabel} — ${jogoDesc}`, `Taxa: R$ ${taxaCasa.toFixed(2)}`);
    for (const a of apostas) {
      const ap = await get('SELECT nome FROM apostadores WHERE id = ?', [a.apostador_id]);
      const status = a.opcao_escolhida === resultado ? 'ganhou' : 'perdeu';
      const premio = vencedoras.find(v => v.id === a.id) && totalVencedores > 0 ? (a.valor / totalVencedores) * potePremios : 0;
      const desc = `${mercadoLabel}: ${jogoDesc}`;
      sheets.syncApostaExtra({ ...a, status, premio }, ap?.nome || '', desc);
    }

    res.json({ sucesso: true, taxaCasa, potePremios, vencedoras: vencedoras.length });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao finalizar: ' + e.message });
  }
});

// ─── Admin: editar mercado (linha, status) ────────────────────────────────────
router.patch('/admin/:id', authAdmin, async (req, res) => {
  const { linha, status } = req.body;
  try {
    const mercado = await get('SELECT * FROM mercados_extras WHERE id = ?', [req.params.id]);
    if (!mercado) return res.status(404).json({ erro: 'Mercado não encontrado' });
    if (mercado.resultado) return res.status(400).json({ erro: 'Mercado finalizado não pode ser editado' });

    const campos = [];
    const params = [];
    if (linha !== undefined && mercado.tipo === 'mais_menos') {
      campos.push('linha = ?');
      params.push(parseFloat(linha) || 2.5);
    }
    if (status !== undefined && ['aberto', 'fechado'].includes(status)) {
      campos.push('status = ?');
      params.push(status);
    }
    if (campos.length > 0) {
      params.push(req.params.id);
      await run(`UPDATE mercados_extras SET ${campos.join(', ')} WHERE id = ?`, params);
    }
    res.json({ sucesso: true });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao atualizar mercado' });
  }
});

// ─── Admin: deletar mercado ───────────────────────────────────────────────────
router.delete('/admin/:id', authAdmin, async (req, res) => {
  try {
    const mercado = await get('SELECT * FROM mercados_extras WHERE id = ?', [req.params.id]);
    if (!mercado) return res.status(404).json({ erro: 'Mercado não encontrado' });

    // Devolve saldo das apostas
    const apostas = await all('SELECT * FROM apostas_extras WHERE mercado_id = ?', [mercado.id]);
    const ops = [];
    for (const a of apostas) {
      ops.push({ sql: 'UPDATE apostadores SET saldo = saldo + ?, total_apostado = total_apostado - ? WHERE id = ?', params: [a.valor, a.valor, a.apostador_id] });
    }
    ops.push({ sql: 'DELETE FROM apostas_extras WHERE mercado_id = ?', params: [mercado.id] });
    ops.push({ sql: 'DELETE FROM mercados_extras WHERE id = ?', params: [mercado.id] });
    await transaction(ops);

    const jogo = await get('SELECT * FROM jogos WHERE id = ?', [mercado.jogo_id]);
    const tipoInfo = TIPOS[mercado.tipo] || {};
    sheets.logAdmin('Mercado extra excluído', `${tipoInfo.label || mercado.tipo} — ${jogo?.flag_a} ${jogo?.time_a} vs ${jogo?.time_b} ${jogo?.flag_b}`, `Devolvido: R$ ${mercado.pote_total?.toFixed(2)}`);

    res.json({ sucesso: true });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao excluir' });
  }
});

module.exports = router;
