import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { getSessionValidationError } from '../shared/sessionSchema';
import { getSession, saveSession } from './sessionStore';

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 8787);
const frontendUrl = process.env.APP_URL || 'http://localhost:3000';

function buildShareUrl(id: string): string {
  return `${frontendUrl.replace(/\/$/, '')}/?sessionId=${encodeURIComponent(id)}`;
}

app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (
    origin === 'http://localhost:3000' ||
    origin === 'http://127.0.0.1:3000' ||
    origin === frontendUrl
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'underground-dj-monolith-api',
  });
});

app.post('/api/sessions', (req: Request, res: Response) => {
  const validationError = getSessionValidationError(req.body);
  if (validationError) {
    res.status(400).json({
      error: 'Invalid session payload',
      detail: validationError,
    });
    return;
  }

  const stored = saveSession(req.body);
  res.status(201).json({
    id: stored.id,
    shareUrl: buildShareUrl(stored.id),
    createdAt: stored.createdAt,
    session: stored.session,
  });
});

app.get('/api/sessions/:id', (req: Request, res: Response) => {
  const stored = getSession(req.params.id);
  if (!stored) {
    res.status(404).json({
      error: 'Session not found',
    });
    return;
  }

  res.json({
    id: stored.id,
    shareUrl: buildShareUrl(stored.id),
    createdAt: stored.createdAt,
    session: stored.session,
  });
});

app.listen(port, () => {
  console.log(`Underground DJ Monolith API listening on http://localhost:${port}`);
});
