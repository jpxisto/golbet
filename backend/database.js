require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Em produção no Render, define DB_PATH=/data/golbet.db (Persistent Disk montado em /data)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'golbet.db');
const db = new sqlite3.Database(DB_PATH);

// Promisified helpers
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
  });
}

// Simple transaction helper: runs array of {sql, params} sequentially
async function transaction(ops) {
  await run('BEGIN');
  try {
    for (const op of ops) await run(op.sql, op.params || []);
    await run('COMMIT');
  } catch (e) {
    await run('ROLLBACK');
    throw e;
  }
}

async function initDB() {
  await run('PRAGMA journal_mode = WAL');
  await run('PRAGMA foreign_keys = ON');

  await run(`CREATE TABLE IF NOT EXISTS apostadores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL UNIQUE,
    senha TEXT,
    saldo REAL DEFAULT 0,
    total_depositado REAL DEFAULT 0,
    total_sacado REAL DEFAULT 0,
    total_apostado REAL DEFAULT 0,
    total_ganho REAL DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  // Migration: adiciona coluna senha se não existir (bancos criados antes desta versão)
  try { await run('ALTER TABLE apostadores ADD COLUMN senha TEXT'); } catch {}

  await run(`CREATE TABLE IF NOT EXISTS jogos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time_a TEXT NOT NULL,
    flag_a TEXT NOT NULL,
    time_b TEXT NOT NULL,
    flag_b TEXT NOT NULL,
    data_hora DATETIME,
    status TEXT DEFAULT 'fechado',
    resultado TEXT,
    pote_total REAL DEFAULT 0,
    taxa_casa REAL DEFAULT 0,
    odd_final REAL DEFAULT 0,
    visivel INTEGER DEFAULT 1,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migration: add visivel if table already existed without the column
  try { await run('ALTER TABLE jogos ADD COLUMN visivel INTEGER DEFAULT 1'); } catch {}

  await run(`CREATE TABLE IF NOT EXISTS apostas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    apostador_id INTEGER REFERENCES apostadores(id),
    jogo_id INTEGER REFERENCES jogos(id),
    resultado TEXT NOT NULL,
    valor REAL NOT NULL,
    odd_final REAL,
    premio REAL DEFAULT 0,
    status TEXT DEFAULT 'pendente',
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(apostador_id, jogo_id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS depositos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    apostador_id INTEGER REFERENCES apostadores(id),
    valor REAL NOT NULL,
    chave_pix TEXT NOT NULL,
    status TEXT DEFAULT 'pendente',
    comprovante_info TEXT,
    aprovado_em DATETIME,
    motivo_rejeicao TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS saques (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    apostador_id INTEGER REFERENCES apostadores(id),
    valor REAL NOT NULL,
    chave_pix_cliente TEXT NOT NULL,
    tipo_pix TEXT NOT NULL,
    status TEXT DEFAULT 'pendente',
    pago_em DATETIME,
    observacao TEXT,
    motivo_rejeicao TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS lucro_casa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jogo_id INTEGER REFERENCES jogos(id),
    valor REAL NOT NULL,
    registrado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // === LONGO PRAZO ===
  // Mercados de aposta em vencedor de campeonato/torneio
  await run(`CREATE TABLE IF NOT EXISTS mercados_longo_prazo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    opcoes TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'aberto',
    resultado TEXT DEFAULT NULL,
    pote_total REAL DEFAULT 0,
    taxa_casa REAL DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    fechado_em DATETIME DEFAULT NULL
  )`);

  // Apostas em mercados de longo prazo (1 aposta por usuário por mercado)
  await run(`CREATE TABLE IF NOT EXISTS apostas_longo_prazo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mercado_id INTEGER NOT NULL REFERENCES mercados_longo_prazo(id),
    apostador_id INTEGER NOT NULL REFERENCES apostadores(id),
    opcao_escolhida TEXT NOT NULL,
    valor REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    premio REAL DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mercado_id, apostador_id)
  )`);

  await seedJogos();
}

async function seedJogos() {
  const row = await get('SELECT COUNT(*) as c FROM jogos');
  if (row.c > 0) return;

  const grupoA = [
    { time: 'Brasil', flag: '🇧🇷' },
    { time: 'Argentina', flag: '🇦🇷' },
    { time: 'Portugal', flag: '🇵🇹' },
    { time: 'Holanda', flag: '🇳🇱' },
  ];
  const grupoB = [
    { time: 'Alemanha', flag: '🇩🇪' },
    { time: 'Espanha', flag: '🇪🇸' },
    { time: 'França', flag: '🇫🇷' },
    { time: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  ];

  const baseDate = new Date('2025-06-10T20:00:00');
  let dayOffset = 0;

  for (const ta of grupoA) {
    for (const tb of grupoB) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + dayOffset);
      await run(
        `INSERT INTO jogos (time_a, flag_a, time_b, flag_b, data_hora, status) VALUES (?, ?, ?, ?, ?, 'fechado')`,
        [ta.time, ta.flag, tb.time, tb.flag, d.toISOString()]
      );
      dayOffset++;
    }
  }
}

module.exports = { db, run, get, all, transaction, initDB };
