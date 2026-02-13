import express from 'express';
import { readFileSync } from 'fs';
import { RAGScope } from '@ragscope/sdk';

const kb = JSON.parse(readFileSync(new URL('./knowledge-base.json', import.meta.url), 'utf-8'));

const ragscope = new RAGScope({
  endpoint: process.env.RAGSCOPE_URL || 'http://localhost:3000',
  defaultStrategy: 'auto',
  batchSize: 50,
  flushInterval: 2000,
});

function retrieve(query) {
  const q = query.toLowerCase();
  const matches = kb.buildings.filter(b =>
    q.includes(b.name.toLowerCase()) ||
    q.includes(b.city.toLowerCase()) ||
    q.includes(b.neighborhood.toLowerCase()) ||
    b.amenities.some(a => q.includes(a))
  );

  if (matches.length === 0) {
    return kb.buildings.slice(0, 2).map(b => JSON.stringify(b));
  }
  return matches.map(b => JSON.stringify(b));
}

function generate(query, context) {
  const q = query.toLowerCase();
  const buildings = context.map(c => { try { return JSON.parse(c); } catch { return null; } }).filter(Boolean);

  if (buildings.length === 0) {
    return "I don't have specific information about that. Please ask about our available coliving spaces.";
  }

  const b = buildings[0];
  const parts = [`Based on our listings, here's what I found about ${b.name} in ${b.city}:`];

  if (q.includes('price') || q.includes('cost') || q.includes('how much')) {
    const units = Object.entries(b.units).map(([type, info]) => `${type}: €${info.price}/month`);
    parts.push(`Pricing: ${units.join(', ')}.`);
  }

  if (q.includes('available') || q.includes('vacancy') || q.includes('room')) {
    const avail = Object.entries(b.units).filter(([, info]) => info.available > 0);
    if (avail.length > 0) {
      parts.push(`Available units: ${avail.map(([type, info]) => `${info.available} ${type}(s)`).join(', ')}.`);
    } else {
      parts.push('Currently fully booked.');
    }
  }

  if (q.includes('amenit') || q.includes('facilit') || q.includes('feature')) {
    parts.push(`Amenities include: ${b.amenities.join(', ')}.`);
  }

  if (q.includes('pet')) {
    parts.push(`Pet policy: ${b.petPolicy}.`);
  }

  if (parts.length === 1) {
    parts.push(b.description);
    parts.push(`Amenities: ${b.amenities.join(', ')}.`);
  }

  return parts.join(' ');
}

const app = express();
app.use(express.json());

app.post('/chat', (req, res) => {
  const { query, expectedOutput, metadata } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });

  const context = retrieve(query);
  const answer = generate(query, context);

  ragscope.capture({
    input: query,
    actualOutput: answer,
    expectedOutput,
    retrievalContext: context,
    metadata: { source: 'demo-chatbot', ...metadata },
  });

  res.json({ answer, retrievedDocuments: context.length });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Demo chatbot running on port ${PORT}`));

process.on('SIGINT', async () => { await ragscope.close(); process.exit(0); });
