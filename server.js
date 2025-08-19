
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { RateLimiterMemory } from 'rate-limiter-flexible';

dotenv.config();

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

const allowed = (process.env.ORIGINS || '*').split(',').map(s=>s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes('*') || allowed.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  }
}));

const limiter = new RateLimiterMemory({ points: 40, duration: 60 }); // 40 req/min/IP

app.use(async (req, res, next) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
    await limiter.consume(ip || 'anonymous');
    next();
  } catch (e) {
    res.status(429).json({ ok:false, error: 'Too Many Requests' });
  }
});

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = process.env.MODEL || 'openai/gpt-4o-mini';

async function callOpenRouter({ system, messages, apiKey, model }) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey || process.env.OPENROUTER_API_KEY}`,
  };
  const body = {
    model: model || DEFAULT_MODEL,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages
    ],
    temperature: 0.3
  };
  const r = await fetch(OPENROUTER_URL, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!r.ok) {
    const t = await r.text().catch(()=>'');
    throw new Error(`OpenRouter ${r.status} ${t}`);
  }
  const data = await r.json();
  return data?.choices?.[0]?.message?.content || '';
}

app.get('/', (req,res)=> res.json({ ok:true, name:'ai-summarizer-backend', version:'1.0.0' }));

app.post('/api/summarize', async (req,res)=>{
  try {
    const { system, user, apiKey, model } = req.body || {};
    if (!user) return res.status(400).json({ ok:false, error: 'Missing user content' });
    const text = await callOpenRouter({
      system: system || 'Bạn là AI tóm tắt.',
      messages: [{ role: 'user', content: user }],
      apiKey, model
    });
    res.json({ ok:true, text });
  } catch (e) {
    res.status(500).json({ ok:false, error: e?.message || String(e) });
  }
});

app.post('/api/chat', async (req,res)=>{
  try {
    const { system, messages, apiKey, model } = req.body || {};
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ ok:false, error:'Missing messages' });
    const text = await callOpenRouter({ system, messages, apiKey, model });
    res.json({ ok:true, text });
  } catch (e) {
    res.status(500).json({ ok:false, error: e?.message || String(e) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, ()=> {
  console.log(`AI Summarizer backend listening on :${port}`);
});
