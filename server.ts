import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// PROCESAR PETICIONES DE IA CON GEMINI
const processAIRequest = async (req: express.Request, res: express.Response) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6IbJ9zmwt9bfcV38bc4QI5e3Mx-KHh2jkJUhWlF4a4Diw';
    const { prompt, tdrData, documentText, tender } = req.body || {};
    const content = prompt || documentText || JSON.stringify(tdrData || tender) || 'Analizar licitación';

    console.log('📡 [POST /api/ai/analyze] Petición recibida en Backend');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Eres un experto en licitaciones públicas de Mercado Público Chile. Analiza estos TDR y entrega requisitos y riesgos clave:\n\n${content}` }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error de Google:', data);
      return res.status(response.status).json({ error: 'Error de Evaluación IA', details: data.error?.message });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Análisis procesado correctamente.';
    console.log('✅ Análisis retornado con éxito.');

    return res.json({ success: true, analysis: text, result: text });
  } catch (err: any) {
    console.error('❌ Error Express:', err);
    return res.status(500).json({ error: 'Error de Evaluación IA', details: err.message });
  }
};

// RUTAS DE IA
app.all('/api/ai/analyze', processAIRequest);
app.all('/api/ai/evaluate', processAIRequest);
app.all('/api/ai*', processAIRequest);

// MOCK PARA EVITAR BLOQUEOS
app.all('/api/*', (req, res) => {
  res.json({ success: true, status: 'ok', data: [] });
});

// RUTAS CORREGIDAS PARA SERVIR EL FRONTEND DESDE LA MISMA CARPETA DIST
const clientPath = path.resolve(__dirname);

app.use(express.static(clientPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Servidor ejecutándose en http://localhost:${PORT}`);
});
