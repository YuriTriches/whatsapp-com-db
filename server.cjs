const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = '';
const SUPABASE_KEY = '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 1. REGISTRAR
app.post('/registrar', async (req, res) => {
  const { nome, senha } = req.body;
  const { data, error } = await supabase
    .from('usuarios')
    .insert([{ nome_usuario: nome, senha: senha }])
    .select().single();

  if (error) return res.status(400).json({ error: "Erro ao registrar ou usuário já existe" });
  res.json(data);
});

// 2. LOGIN
app.post('/login', async (req, res) => {
  const { nome, senha } = req.body;
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('nome_usuario', nome)
    .eq('senha', senha)
    .single();

  if (error || !data) return res.status(401).json({ error: "Usuário ou senha incorretos" });
  res.json(data);
});

// 3. BUSCAR TODOS OS USUÁRIOS
app.get('/usuarios', async (req, res) => {
  const { data, error } = await supabase.from('usuarios').select('id, nome_usuario, foto_url');
  if (error) return res.status(500).send(error.message);
  res.json(data);
});

// 4. ATUALIZAR PERFIL
app.put('/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, senha, foto } = req.body;
  const { error } = await supabase
    .from('usuarios')
    .update({ nome_usuario: nome, senha: senha, foto_url: foto })
    .eq('id', id);

  if (error) return res.status(500).send(error.message);
  res.json({ success: true });
});

// 5. BUSCAR MENSAGENS
app.get('/mensagens', async (req, res) => {
  const { data, error } = await supabase
    .from('mensagens')
    .select('*')
    .order('enviada_em', { ascending: true });

  if (error) return res.status(500).send(error.message);
  res.json(data || []);
});

// 6. ENVIAR MENSAGEM
app.post('/mensagens', async (req, res) => {
  const { remetente_id, destinatario_id, conteudo } = req.body;
  const { data, error } = await supabase
    .from('mensagens')
    .insert([{ remetente_id, destinatario_id, conteudo }])
    .select().single();

  if (error) return res.status(500).send(error.message);
  res.json(data);
});

app.listen(3001, () => {
  console.log("--------------------------------");
  console.log("🚀 BACKEND CONECTADO AO SUPABASE");
  console.log("📡 PORTA: 3001");
  console.log("--------------------------------");
});
