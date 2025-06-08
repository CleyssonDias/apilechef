// API Express usando MongoDB para persistência de produtos, movimentações e usuários

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URL = 'mongodb+srv://cleysson:@line1927@lechef.exxy2vh.mongodb.net/?retryWrites=true&w=majority&appName=lechef';
const DB_NAME = 'lechef';

const app = express();
app.use(cors());
app.use(bodyParser.json());

let db, produtos, movimentacoes, usuarios;

// Conexão MongoDB
MongoClient.connect(MONGO_URL, { useUnifiedTopology: true })
  .then(client => {
    db = client.db(DB_NAME);
    produtos = db.collection('produtos');
    movimentacoes = db.collection('movimentacoes');
    usuarios = db.collection('usuarios');
    console.log('MongoDB conectado');
  })
  .catch(err => {
    console.error('Erro ao conectar ao MongoDB:', err);
    process.exit(1);
  });

// --- Produtos ---

app.get('/api/produtos', async (req, res) => {
  try {
    const docs = await produtos.find({}).toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/produtos/:id', async (req, res) => {
  try {
    const doc = await produtos.findOne({ _id: new ObjectId(req.params.id) });
    if (!doc) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/api/produtos', async (req, res) => {
  try {
    const p = req.body;
    const result = await produtos.insertOne(p);
    res.json({ id: result.insertedId, ...p });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.put('/api/produtos/:id', async (req, res) => {
  try {
    const p = req.body;
    await produtos.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: p }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/api/produtos/:id', async (req, res) => {
  try {
    await produtos.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// --- Movimentações ---

app.get('/api/movimentacoes', async (req, res) => {
  try {
    const docs = await movimentacoes.find({}).toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/movimentacoes-dia', async (req, res) => {
  const dia = req.query.dia;
  if (!dia) return res.status(400).json({ erro: 'Informe o dia' });
  try {
    const docs = await movimentacoes.find({ data: { $regex: `^${dia}` } }).toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/api/movimentacoes', async (req, res) => {
  try {
    const m = req.body;
    const result = await movimentacoes.insertOne(m);
    res.json({ id: result.insertedId, ...m });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/api/movimentacoes', async (req, res) => {
  try {
    await movimentacoes.deleteMany({});
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// --- Usuários (autenticação simples) ---

app.post('/api/usuarios', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Email e senha obrigatórios' });
  try {
    const exists = await usuarios.findOne({ email });
    if (exists) return res.status(400).json({ erro: 'Usuário já existe' });
    await usuarios.insertOne({ email, senha });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const user = await usuarios.findOne({ email, senha });
    if (!user) return res.status(401).json({ erro: 'Usuário ou senha inválidos' });
    res.json({ token: 'token-fake', usuario: email });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// --- Inicialização ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('API rodando na porta', PORT);
});
