DEEPSEEK_API_KEYimport 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DEEPSEEK_API_KEY) {
  console.error('DEEPSEEK_API_KEY manquante dans .env');
  process.exit(1);
}

app.use(express.static(__dirname));
app.use(express.json({ limit: '200kb' }));

app.get('/', (req, res) => res.redirect('/carnet-muscu.html'));

app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt requis.' });
  }

  try {
    const upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-flash',
        messages: [
          { role: 'system', content: 'Tu es un coach de musculation. Réponds en français, en texte brut.' },
          { role: 'user', content: prompt },
        ],
        stream: true,
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      console.error('DeepSeek error', upstream.status, err);
      return res.status(upstream.status).send(err);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: 'Erreur serveur.' });
    else res.end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`→ http://localhost:${PORT}/carnet-muscu.html`));