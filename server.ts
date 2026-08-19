import express from 'express';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

// Leer el puerto asignado dinámicamente por Cloud Run (ej: 3000 u 8080)
const PORT = Number(process.env.PORT) || 8080;
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- ENDPOINTS API EMPRESAS ---
app.get('/api/empresas', async (req, res) => {
  try {
    const { data, error } = await supabase.from('empresas').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/empresas', async (req, res) => {
  try {
    const { data, error } = await supabase.from('empresas').insert([req.body]).select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/empresas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('empresas').delete().eq('id', id);
    if (error) throw error;
    res.json({ status: 'success', message: `Empresa ${id} eliminada` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- SERVIR FRONTEND ESTÁTICO DE VITE ---
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Forzar la vinculación con '0.0.0.0' para contenedores Docker/Cloud Run
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor iniciado correctamente en el puerto ${PORT}`);
});
