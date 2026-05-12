require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./database');
const { ensureSheets } = require('./sheets');

const app = express();
app.set('trust proxy', 1); // Render usa proxy reverso
app.use(cors());
app.use(express.json());

// ── Rate limiters ──────────────────────────────────────────────────────────────
// Leitura geral: 30 req/min por IP (cobre polling dos clientes)
const limiterLeitura = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas requisições. Aguarde um momento.' },
});

// Apostas: 10 req/min por IP (evita spam de apostas)
const limiterAposta = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de aposta. Aguarde um momento.' },
});

// Admin: 60 req/min (admin faz muitas ações em sequência)
const limiterAdmin = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Limite de requisições admin atingido.' },
});

app.use('/api/apostadores', require('./routes/apostadores'));

// Jogos: leitura limitada; apostas mais restritivas
app.use('/api/jogos', (req, res, next) => {
  if (req.method === 'POST' && req.path.includes('/apostar')) return limiterAposta(req, res, next);
  return limiterLeitura(req, res, next);
}, require('./routes/jogos'));

app.use('/api/depositos', require('./routes/depositos'));
app.use('/api/saques', require('./routes/saques'));
app.use('/api/admin', limiterAdmin, require('./routes/admin'));

// Longo prazo: apostas restritas
app.use('/api/longo-prazo', (req, res, next) => {
  if (req.method === 'POST' && req.path.includes('/apostar')) return limiterAposta(req, res, next);
  return limiterLeitura(req, res, next);
}, require('./routes/longoplazo'));

// Artilheiros: apostas restritas
app.use('/api/artilheiros', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/apostar') return limiterAposta(req, res, next);
  return limiterLeitura(req, res, next);
}, require('./routes/artilheiros'));

// Serve frontend em produção
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

const PORT = process.env.PORT || 3001;

initDB()
  .then(() => {
    ensureSheets(); // fire-and-forget — cria abas na planilha se não existirem
    app.listen(PORT, () => console.log(`GolBet backend rodando na porta ${PORT}`));
  })
  .catch(err => { console.error('Erro ao iniciar DB:', err); process.exit(1); });
