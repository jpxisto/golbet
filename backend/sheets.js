/**
 * sheets.js — Integração Google Sheets
 * Cada evento financeiro do GolBet espelha uma linha na planilha externa.
 * Todas as chamadas são fire-and-forget (não bloqueiam a resposta da API).
 */
const { google } = require('googleapis');

const SPREADSHEET_ID  = process.env.GOOGLE_SPREADSHEET_ID;
const CLIENT_EMAIL    = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY_RAW = process.env.GOOGLE_PRIVATE_KEY || '';
const PRIVATE_KEY = PRIVATE_KEY_RAW
  .replace(/\\n/g, '\n')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
  .trim();

let _sheets = null;

function enabled() {
  return !!(SPREADSHEET_ID && CLIENT_EMAIL && PRIVATE_KEY);
}

async function getSheets() {
  if (_sheets) return _sheets;
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: CLIENT_EMAIL, private_key: PRIVATE_KEY },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  _sheets = google.sheets({ version: 'v4', auth });
  return _sheets;
}

// ─── Definição das abas e seus cabeçalhos ────────────────────────────────────
const ABAS = {
  'Resumo':        null, // gerenciada separadamente com fórmulas
  'Apostadores':   ['ID', 'Nome', 'Telefone', 'Saldo', 'Depositado', 'Apostado', 'Ganho', 'Sacado', 'Atualizado em'],
  'Depósitos':     ['ID', 'Apostador', 'Valor (R$)', 'Status', 'Observação', 'Criado em', 'Resolvido em', 'Motivo'],
  'Saques':        ['ID', 'Apostador', 'Valor (R$)', 'Chave Pix', 'Tipo', 'Status', 'Criado em', 'Resolvido em', 'Motivo'],
  'Apostas':       ['ID', 'Apostador', 'Jogo', 'Palpite', 'Valor (R$)', 'Status', 'Prêmio (R$)', 'Data'],
  'Extras':        ['ID', 'Apostador', 'Mercado', 'Palpite', 'Valor (R$)', 'Status', 'Prêmio (R$)', 'Data'],
  'Longo Prazo':   ['ID', 'Apostador', 'Mercado', 'Opção', 'Valor (R$)', 'Status', 'Prêmio (R$)', 'Data'],
  'Artilheiros':   ['ID', 'Apostador', 'Jogo', 'Opção', 'Valor (R$)', 'Status', 'Prêmio (R$)', 'Data'],
  'Lucro Casa':    ['ID Jogo', 'Descrição', 'Lucro (R$)', 'Data'],
  'Log Admin':     ['Ação', 'Detalhes', 'Valor', 'Data/Hora'],
};

// Colunas de Status por aba (índice 0 = col A) para formatação condicional
const STATUS_COL = {
  'Depósitos':   3,  // D
  'Saques':      5,  // F
  'Apostas':     5,  // F
  'Extras':      5,  // F
  'Longo Prazo': 5,  // F
  'Artilheiros': 5,  // F
};

// ─── Cores para formatação condicional ───────────────────────────────────────
const COR_VERDE    = { red: 0.78, green: 0.93, blue: 0.78 };
const COR_VERMELHO = { red: 0.96, green: 0.78, blue: 0.78 };
const COR_LARANJA  = { red: 1.0,  green: 0.92, blue: 0.78 };

function condFormatRule(sheetId, colIndex, value, bgColor) {
  return {
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: colIndex, endColumnIndex: colIndex + 1 }],
        booleanRule: {
          condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: value }] },
          format: { backgroundColor: bgColor },
        },
      },
      index: 0,
    },
  };
}

// ─── Garante que todas as abas existam e aplica formatações ──────────────────
async function ensureSheets() {
  if (!enabled()) {
    console.log('⚠️  Sheets: credenciais não configuradas — sync desativado');
    return;
  }
  try {
    const sheets = await getSheets();
    const { data } = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existentes = data.sheets.map(s => s.properties.title);
    const sheetIds   = Object.fromEntries(data.sheets.map(s => [s.properties.title, s.properties.sheetId]));

    // Criar abas que faltam
    const novas = Object.keys(ABAS).filter(t => !existentes.includes(t));
    if (novas.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: novas.map(title => ({ addSheet: { properties: { title } } })) },
      });
      // Busca IDs das novas abas
      const { data: d2 } = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      d2.sheets.forEach(s => { sheetIds[s.properties.title] = s.properties.sheetId; });

      for (const title of novas) {
        if (title === 'Resumo') {
          await _criarResumo(sheets, sheetIds['Resumo']);
        } else {
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${title}'!A1`,
            valueInputOption: 'RAW',
            requestBody: { values: [ABAS[title]] },
          });
          await _aplicarHeaderStyle(sheets, sheetIds[title]);
        }
      }
    }

    // Aplicar formatação condicional nas abas de Status (idempotente na prática)
    const formatRequests = [];
    for (const [aba, colIdx] of Object.entries(STATUS_COL)) {
      const sId = sheetIds[aba];
      if (!sId && sId !== 0) continue;
      formatRequests.push(
        condFormatRule(sId, colIdx, 'ganhou',   COR_VERDE),
        condFormatRule(sId, colIdx, 'aprovado', COR_VERDE),
        condFormatRule(sId, colIdx, 'pago',     COR_VERDE),
        condFormatRule(sId, colIdx, 'perdeu',   COR_VERMELHO),
        condFormatRule(sId, colIdx, 'rejeitado',COR_VERMELHO),
        condFormatRule(sId, colIdx, 'pendente', COR_LARANJA),
      );
    }
    if (formatRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: formatRequests },
      }).catch(() => {}); // ignora se regras já existem
    }

    console.log('✅ Google Sheets conectado —', SPREADSHEET_ID);
  } catch (e) {
    console.error('⚠️  Sheets ensureSheets:', e.message);
  }
}

// ─── Estilo do cabeçalho (fundo escuro, texto branco, negrito) ───────────────
async function _aplicarHeaderStyle(sheets, sheetId) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.13, green: 0.13, blue: 0.18 },
              textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
              horizontalAlignment: 'CENTER',
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
        },
      }, {
        updateSheetProperties: {
          properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
          fields: 'gridProperties.frozenRowCount',
        },
      }],
    },
  }).catch(() => {});
}

// ─── Aba de Resumo com fórmulas ───────────────────────────────────────────────
async function _criarResumo(sheets, sheetId) {
  const cabecalho = [['📊 RESUMO GOLBET', '', 'Atualizado automaticamente']];
  const linhas = [
    ['', '', ''],
    ['💰 FINANCEIRO', '', ''],
    ['Total depositado (aprovado)',  '', "=SOMASE(Depósitos!D:D,\"aprovado\",Depósitos!C:C)"],
    ['Total sacado (pago)',          '', "=SOMASE(Saques!F:F,\"pago\",Saques!C:C)"],
    ['Total em prêmios pagos',       '', "=SOMA(Apostas!G:G)+SOMA(Extras!G:G)+SOMA('Longo Prazo'!G:G)+SOMA(Artilheiros!G:G)"],
    ['Lucro da casa',                '', "=SOMA('Lucro Casa'!C:C)"],
    ['', '', ''],
    ['🎯 APOSTAS', '', ''],
    ['Total de apostas',             '', "=CONT.VALORES(Apostas!A:A)-1+CONT.VALORES(Extras!A:A)-1+CONT.VALORES('Longo Prazo'!A:A)-1+CONT.VALORES(Artilheiros!A:A)-1"],
    ['Apostas ganhas',               '', "=CONT.SE(Apostas!F:F,\"ganhou\")+CONT.SE(Extras!F:F,\"ganhou\")+CONT.SE('Longo Prazo'!F:F,\"ganhou\")+CONT.SE(Artilheiros!F:F,\"ganhou\")"],
    ['Apostas perdidas',             '', "=CONT.SE(Apostas!F:F,\"perdeu\")+CONT.SE(Extras!F:F,\"perdeu\")+CONT.SE('Longo Prazo'!F:F,\"perdeu\")+CONT.SE(Artilheiros!F:F,\"perdeu\")"],
    ['Apostas pendentes',            '', "=CONT.SE(Apostas!F:F,\"pendente\")+CONT.SE(Extras!F:F,\"pendente\")+CONT.SE('Longo Prazo'!F:F,\"pendente\")+CONT.SE(Artilheiros!F:F,\"pendente\")"],
    ['', '', ''],
    ['👥 APOSTADORES', '', ''],
    ['Total de apostadores',         '', "=CONT.VALORES(Apostadores!A:A)-1"],
    ['Depósitos pendentes',          '', "=CONT.SE(Depósitos!D:D,\"pendente\")"],
    ['Saques pendentes',             '', "=CONT.SE(Saques!F:F,\"pendente\")"],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Resumo'!A1",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [...cabecalho, ...linhas] },
  });

  // Formatar aba Resumo
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        // Título principal
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 14 }, backgroundColor: { red: 0.06, green: 0.14, blue: 0.08 } } },
            fields: 'userEnteredFormat(textFormat,backgroundColor)',
          },
        },
        // Largura das colunas
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 280 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } },
      ],
    },
  }).catch(() => {});
}

// ─── Limpar todas as abas (mantém cabeçalhos) ────────────────────────────────
async function clearAllSheets() {
  if (!enabled()) return { erro: 'Sheets não configurado' };
  try {
    const sheets = await getSheets();
    const { data } = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    for (const sheet of data.sheets) {
      const title = sheet.properties.title;
      if (title === 'Resumo' || title === 'Página1') continue; // preserva fórmulas
      const rowCount = sheet.properties.gridProperties.rowCount;
      if (rowCount <= 1) continue;
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${title}'!A2:Z${rowCount}`,
      });
    }
    return { sucesso: true };
  } catch (e) {
    return { erro: e.message };
  }
}

// ─── Append genérico ─────────────────────────────────────────────────────────
async function append(aba, valores) {
  if (!enabled()) return;
  try {
    const sheets = await getSheets();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${aba}'!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [valores] },
    });
  } catch (e) {
    console.error(`⚠️  Sheets append [${aba}]:`, e.message);
  }
}

// ─── Update ou append: atualiza linha existente (busca por ID na col A) ──────
async function upsert(aba, id, valores) {
  if (!enabled()) return;
  try {
    const sheets = await getSheets();
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${aba}'!A:A`,
    });
    const rows = data.values || [];
    const rowIdx = rows.findIndex((r, i) => i > 0 && String(r[0]) === String(id));

    if (rowIdx > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${aba}'!A${rowIdx + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [valores] },
      });
    } else {
      await append(aba, valores);
    }
  } catch (e) {
    console.error(`⚠️  Sheets upsert [${aba}]:`, e.message);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function agora() {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}
function brl(v) { return `R$ ${Number(v || 0).toFixed(2)}`; }
function dt(s)  { return s ? new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : ''; }

// Converte resultado A/B/empate em nome legível dado o objeto do jogo
function palpiteJogo(resultado, jogo) {
  if (!jogo) return resultado;
  if (resultado === 'A') return `${jogo.flag_a || ''} ${jogo.time_a}`.trim();
  if (resultado === 'B') return `${jogo.flag_b || ''} ${jogo.time_b}`.trim();
  return '🤝 Empate';
}

// Converte opcao artilheiro A/B/empate com nome do jogador se definido
function palpiteArtilheiro(opcao, jogo, mercado) {
  if (opcao === 'A') return mercado?.jogador_a || `${jogo?.flag_a || ''} ${jogo?.time_a || ''}`.trim();
  if (opcao === 'B') return mercado?.jogador_b || `${jogo?.flag_b || ''} ${jogo?.time_b || ''}`.trim();
  return '🤝 Empate';
}

// ─── Funções públicas de sync ─────────────────────────────────────────────────

// Apostador: upsert (atualiza linha existente pelo ID)
function syncApostador(a) {
  upsert('Apostadores', a.id, [
    a.id, a.nome, a.telefone || '',
    brl(a.saldo), brl(a.total_depositado), brl(a.total_apostado),
    brl(a.total_ganho), brl(a.total_sacado), agora(),
  ]).catch(() => {});
}

function syncDeposito(d, nome) {
  append('Depósitos', [
    d.id, nome, brl(d.valor), d.status,
    d.comprovante_info || '',
    dt(d.criado_em), agora(),
    d.motivo_rejeicao || '',
  ]).catch(() => {});
}

function syncSaque(s, nome) {
  append('Saques', [
    s.id, nome, brl(s.valor),
    s.chave_pix_cliente, s.tipo_pix, s.status,
    dt(s.criado_em), agora(),
    s.motivo_rejeicao || '',
  ]).catch(() => {});
}

// jogoInfo: objeto completo do jogo (opcional) — usado para palpite legível
function syncAposta(a, nome, jogoDesc, jogoInfo) {
  const palpite = jogoInfo ? palpiteJogo(a.resultado, jogoInfo) : a.resultado;
  upsert('Apostas', a.id, [
    a.id, nome, jogoDesc, palpite,
    Number(a.valor).toFixed(2),
    a.status,
    a.premio > 0 ? Number(a.premio).toFixed(2) : (a.status === 'pendente' ? '—' : 'R$ 0,00'),
    dt(a.criado_em),
  ]).catch(() => {});
}

// Extra: aposta em mercado extra (Ambos Marcam / Mais-Menos / Pênaltis)
function syncApostaExtra(a, nome, mercadoDesc) {
  const OPC = { sim: 'Sim', nao: 'Não', mais: 'Mais gols', menos: 'Menos gols' };
  upsert('Extras', a.id, [
    a.id, nome, mercadoDesc, OPC[a.opcao_escolhida] || a.opcao_escolhida,
    Number(a.valor).toFixed(2),
    a.status,
    a.premio > 0 ? Number(a.premio).toFixed(2) : (a.status === 'pendente' ? '—' : 'R$ 0,00'),
    dt(a.criado_em),
  ]).catch(() => {});
}

function syncApostaLongo(a, nome, titulo) {
  upsert('Longo Prazo', a.id, [
    a.id, nome, titulo, a.opcao_escolhida,
    Number(a.valor).toFixed(2),
    a.status,
    a.premio > 0 ? Number(a.premio).toFixed(2) : (a.status === 'pendente' ? '—' : 'R$ 0,00'),
    dt(a.criado_em),
  ]).catch(() => {});
}

// jogoInfo e mercadoInfo opcionais — para palpite legível no artilheiro
function syncApostaArtilheiro(a, nome, jogoDesc, jogoInfo, mercadoInfo) {
  const palpite = (jogoInfo || mercadoInfo)
    ? palpiteArtilheiro(a.opcao_escolhida, jogoInfo, mercadoInfo)
    : a.opcao_escolhida;
  upsert('Artilheiros', a.id, [
    a.id, nome, jogoDesc, palpite,
    Number(a.valor).toFixed(2),
    a.status,
    a.premio > 0 ? Number(a.premio).toFixed(2) : (a.status === 'pendente' ? '—' : 'R$ 0,00'),
    dt(a.criado_em),
  ]).catch(() => {});
}

function syncLucroCasa(jogoId, jogoDesc, valor) {
  append('Lucro Casa', [jogoId, jogoDesc, Number(valor).toFixed(2), agora()]).catch(() => {});
}

function logAdmin(acao, detalhes, valor) {
  append('Log Admin', [acao, detalhes || '', valor || '', agora()]).catch(() => {});
}

module.exports = {
  ensureSheets, clearAllSheets,
  syncApostador, syncDeposito, syncSaque,
  syncAposta, syncApostaExtra, syncApostaLongo, syncApostaArtilheiro,
  syncLucroCasa, logAdmin,
};
