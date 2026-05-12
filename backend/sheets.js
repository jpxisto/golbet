/**
 * sheets.js — Integração Google Sheets
 * Cada evento financeiro do GolBet espelha uma linha na planilha externa.
 * Todas as chamadas são fire-and-forget (não bloqueiam a resposta da API).
 */
const { google } = require('googleapis');

const SPREADSHEET_ID  = process.env.GOOGLE_SPREADSHEET_ID;
const CLIENT_EMAIL    = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY_RAW = process.env.GOOGLE_PRIVATE_KEY || '';
// Render armazena \n como literal — converte para quebra de linha real
const PRIVATE_KEY     = PRIVATE_KEY_RAW.replace(/\\n/g, '\n');

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
  'Apostadores':  ['ID', 'Nome', 'Telefone', 'Saldo', 'Depositado', 'Apostado', 'Ganho', 'Sacado', 'Atualizado em'],
  'Depósitos':    ['ID', 'Apostador', 'Valor', 'Status', 'Observação', 'Criado em', 'Resolvido em', 'Motivo'],
  'Saques':       ['ID', 'Apostador', 'Valor', 'Chave Pix', 'Tipo', 'Status', 'Criado em', 'Resolvido em', 'Motivo'],
  'Apostas':      ['ID', 'Apostador', 'Jogo', 'Palpite', 'Valor (R$)', 'Status', 'Prêmio (R$)', 'Data'],
  'Longo Prazo':  ['ID', 'Apostador', 'Mercado', 'Opção', 'Valor (R$)', 'Status', 'Prêmio (R$)', 'Data'],
  'Artilheiros':  ['ID', 'Apostador', 'Jogo', 'Opção', 'Valor (R$)', 'Status', 'Prêmio (R$)', 'Data'],
  'Lucro Casa':   ['Jogo ID', 'Descrição', 'Lucro (R$)', 'Data'],
  'Log Admin':    ['Ação', 'Detalhes', 'Valor', 'Data/Hora'],
};

// ─── Garante que todas as abas existam com cabeçalhos ────────────────────────
async function ensureSheets() {
  if (!enabled()) {
    console.log('⚠️  Sheets: credenciais não configuradas — sync desativado');
    return;
  }
  try {
    const sheets = await getSheets();
    const { data } = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existentes = data.sheets.map(s => s.properties.title);

    const novas = Object.keys(ABAS).filter(t => !existentes.includes(t));
    if (novas.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: novas.map(title => ({ addSheet: { properties: { title } } })) },
      });
      // Escreve cabeçalhos nas abas novas
      for (const title of novas) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${title}'!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: [ABAS[title]] },
        });
      }
    }
    console.log('✅ Google Sheets conectado —', SPREADSHEET_ID);
  } catch (e) {
    console.error('⚠️  Sheets ensureSheets:', e.message);
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

// ─── Hora atual em Brasília ───────────────────────────────────────────────────
function agora() {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}
function brl(v) { return `R$ ${Number(v || 0).toFixed(2)}`; }
function dt(s)  { return s ? new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : ''; }

// ─── Funções públicas de sync ─────────────────────────────────────────────────

function syncApostador(a) {
  append('Apostadores', [
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

function syncAposta(a, nome, jogoDesc) {
  append('Apostas', [
    a.id, nome, jogoDesc, a.resultado,
    Number(a.valor).toFixed(2),
    a.status,
    a.premio ? Number(a.premio).toFixed(2) : '',
    dt(a.criado_em),
  ]).catch(() => {});
}

function syncApostaLongo(a, nome, titulo) {
  append('Longo Prazo', [
    a.id, nome, titulo, a.opcao_escolhida,
    Number(a.valor).toFixed(2),
    a.status,
    a.premio ? Number(a.premio).toFixed(2) : '',
    dt(a.criado_em),
  ]).catch(() => {});
}

function syncApostaArtilheiro(a, nome, jogoDesc) {
  append('Artilheiros', [
    a.id, nome, jogoDesc, a.opcao_escolhida,
    Number(a.valor).toFixed(2),
    a.status,
    a.premio ? Number(a.premio).toFixed(2) : '',
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
  ensureSheets,
  syncApostador, syncDeposito, syncSaque,
  syncAposta, syncApostaLongo, syncApostaArtilheiro,
  syncLucroCasa, logAdmin,
};
