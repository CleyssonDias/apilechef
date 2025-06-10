// API Express usando SQLite para persistência de produtos, movimentações e usuários

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'lechef.sqlite');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Inicializa banco SQLite
const db = new sqlite3.Database(DB_PATH);

// Criação das tabelas se não existirem
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    quantidade INTEGER,
    minimo INTEGER,
    categoria TEXT,
    fornecedor TEXT,
    validade TEXT,
    observacoes TEXT,
    foto TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS movimentacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT,
    produto TEXT,
    quantidade INTEGER,
    data TEXT,
    usuario TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    senha TEXT
  )`);
});

// --- Produtos ---

app.get('/api/produtos', (req, res) => {
  db.all('SELECT * FROM produtos', [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

app.get('/api/produtos/:id', (req, res) => {
  db.get('SELECT * FROM produtos WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ erro: err.message });
    if (!row) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json(row);
  });
});

app.post('/api/produtos', (req, res) => {
  const p = req.body;
  db.run(
    `INSERT INTO produtos (nome, quantidade, minimo, categoria, fornecedor, validade, observacoes, foto)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [p.nome, p.quantidade, p.minimo, p.categoria, p.fornecedor, p.validade, p.observacoes, p.foto],
    function(err) {
      if (err) return res.status(500).json({ erro: err.message });
      res.json({ id: this.lastID, ...p });
    }
  );
});

app.put('/api/produtos/:id', (req, res) => {
  const p = req.body;
  db.run(
    `UPDATE produtos SET nome=?, quantidade=?, minimo=?, categoria=?, fornecedor=?, validade=?, observacoes=?, foto=?
     WHERE id=?`,
    [p.nome, p.quantidade, p.minimo, p.categoria, p.fornecedor, p.validade, p.observacoes, p.foto, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ erro: err.message });
      res.json({ ok: true });
    }
  );
});

app.delete('/api/produtos/:id', (req, res) => {
  db.run('DELETE FROM produtos WHERE id=?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ erro: err.message });
    res.json({ ok: true });
  });
});

// --- Movimentações ---

app.get('/api/movimentacoes', (req, res) => {
  db.all('SELECT * FROM movimentacoes', [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

app.get('/api/movimentacoes-dia', (req, res) => {
  const dia = req.query.dia;
  if (!dia) return res.status(400).json({ erro: 'Informe o dia' });
  db.all('SELECT * FROM movimentacoes WHERE data LIKE ?', [`${dia}%`], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

app.post('/api/movimentacoes', (req, res) => {
  const m = req.body;
  db.run(
    `INSERT INTO movimentacoes (tipo, produto, quantidade, data, usuario)
     VALUES (?, ?, ?, ?, ?)`,
    [m.tipo, m.produto, m.quantidade, m.data, m.usuario],
    function(err) {
      if (err) return res.status(500).json({ erro: err.message });
      res.json({ id: this.lastID, ...m });
    }
  );
});

app.delete('/api/movimentacoes', (req, res) => {
  db.run('DELETE FROM movimentacoes', [], function(err) {
    if (err) return res.status(500).json({ erro: err.message });
    res.json({ ok: true });
  });
});

// --- Usuários (autenticação simples) ---

app.get('/api/usuarios', (req, res) => {
  db.all('SELECT id, email FROM usuarios', [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

// Novo endpoint para deletar usuário por id (não permite deletar admin@admin)
app.delete('/api/usuarios/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT email FROM usuarios WHERE id=?', [id], (err, row) => {
    if (err) return res.status(500).json({ erro: err.message });
    if (!row) return res.status(404).json({ erro: 'Usuário não encontrado' });
    if (row.email === "admin@admin") {
      return res.status(403).json({ erro: 'Não é permitido apagar o admin.' });
    }
    db.run('DELETE FROM usuarios WHERE id=?', [id], function(err2) {
      if (err2) return res.status(500).json({ erro: err2.message });
      res.json({ ok: true });
    });
  });
});

app.post('/api/usuarios', (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Email e senha obrigatórios' });

  // Não permite cadastrar o admin@admin via API
  if (email === "admin@admin") {
    return res.status(403).json({ erro: 'Não é permitido cadastrar o admin pela API.' });
  }

  db.run(
    'INSERT INTO usuarios (email, senha) VALUES (?, ?)',
    [email, senha],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ erro: 'Usuário já existe' });
        return res.status(500).json({ erro: err.message });
      }
      res.json({ ok: true });
    }
  );
});

app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  db.get('SELECT * FROM usuarios WHERE email=? AND senha=?', [email, senha], (err, row) => {
    if (err) return res.status(500).json({ erro: err.message });
    if (!row) return res.status(401).json({ erro: 'Usuário ou senha inválidos' });
    res.json({ token: 'token-fake', usuario: email });
  });
});

// --- Inicialização ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('API rodando na porta', PORT);
});
