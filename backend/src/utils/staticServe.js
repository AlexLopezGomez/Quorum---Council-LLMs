import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../../../frontend/dist');

function buildIndexHtml() {
  const indexPath = path.join(DIST_DIR, 'index.html');
  const meta = [
    `<meta name="fb-api-key" content="${process.env.VITE_FIREBASE_API_KEY || ''}">`,
    `<meta name="fb-auth-domain" content="${process.env.VITE_FIREBASE_AUTH_DOMAIN || ''}">`,
    `<meta name="fb-project-id" content="${process.env.VITE_FIREBASE_PROJECT_ID || ''}">`,
  ].join('');
  return fs.readFileSync(indexPath, 'utf-8').replace('</head>', `${meta}</head>`);
}

export function serveFrontend(app) {
  if (!fs.existsSync(DIST_DIR)) return;

  app.use(express.static(DIST_DIR));

  const indexHtml = buildIndexHtml();

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.setHeader('Content-Type', 'text/html');
    res.send(indexHtml);
  });
}
