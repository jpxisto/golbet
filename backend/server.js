require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/apostadores', require('./routes/apostadores'));
app.use('/api/jogos', require('./routes/jogos'));
app.use('/api/depositos', require('./routes/depositos'));
app.use('/api/saques', require('./routes/saques'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/longo-prazo', require('./routes/longoplazo'));
app.use('/api/artilheiros', require('./routes/artilheiros'));

// Serve frontend em produção
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

const PORT = process.env.PORT || 3001;

initDB()
  .then(() => app.listen(PORT, () => console.log(`GolBet backend rodando na porta ${PORT}`)))
  .catch(err => { console.error('Erro ao iniciar DB:', err); process.exit(1); });
