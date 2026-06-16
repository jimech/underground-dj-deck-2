import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import { getAuthenticatedUser, getUserProfileId } from './auth';
import { generateFlyerCopy } from './aiFlyerCopy';
import { generateSessionNames } from './aiSessionNaming';
import { getFlyerCopyRequestError } from '../shared/aiFlyerCopySchema';
import { getProfileValidationError } from '../shared/profileSchema';
import { getSessionNameRequestError } from '../shared/aiSessionNameSchema';
import { getSessionValidationError } from '../shared/sessionSchema';
import { sessionStorage } from './storage';

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 8787);
const frontendUrl = process.env.APP_URL || 'http://localhost:3000';

function buildShareUrl(id: string): string {
  return `${frontendUrl.replace(/\/$/, '')}/?sessionId=${encodeURIComponent(id)}`;
}

function asyncRoute(handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
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

app.post('/api/sessions', asyncRoute(async (req: Request, res: Response) => {
  const validationError = getSessionValidationError(req.body);
  if (validationError) {
    res.status(400).json({
      error: 'Invalid session payload',
      detail: validationError,
    });
    return;
  }

  const user = await getAuthenticatedUser(req.headers.authorization);
  const requestedVisibility = req.query.visibility === 'private' ? 'private' : 'public';
  if (requestedVisibility === 'private' && !user) {
    res.status(401).json({
      error: 'Authentication required',
    });
    return;
  }

  const stored = await sessionStorage.saveSession(req.body, {
    ...(user ? { userId: user.id } : {}),
    visibility: requestedVisibility,
  });
  res.status(201).json({
    id: stored.id,
    shareUrl: buildShareUrl(stored.id),
    createdAt: stored.createdAt,
    visibility: stored.visibility,
    session: stored.session,
  });
}));

app.get('/api/sessions/:id', asyncRoute(async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req.headers.authorization);
  const stored = await sessionStorage.getSession(req.params.id, {
    ...(user ? { userId: user.id } : {}),
  });
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
    visibility: stored.visibility,
    session: stored.session,
  });
}));

app.put('/api/profiles/:id', asyncRoute(async (req: Request, res: Response) => {
  const validationError = getProfileValidationError(req.body);
  if (validationError) {
    res.status(400).json({
      error: 'Invalid profile payload',
      detail: validationError,
    });
    return;
  }

  const user = await getAuthenticatedUser(req.headers.authorization);
  const profileId = user ? getUserProfileId(user.id) : req.params.id;
  const profile = await sessionStorage.saveProfile(profileId, req.body, user?.id);
  res.json({
    profile,
  });
}));

app.get('/api/profiles/:id', asyncRoute(async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req.headers.authorization);
  const profileId = user ? getUserProfileId(user.id) : req.params.id;
  const profile = await sessionStorage.getProfile(profileId);
  if (!profile) {
    res.status(404).json({
      error: 'Profile not found',
    });
    return;
  }

  res.json({
    profile,
  });
}));

app.post('/api/ai/session-name', asyncRoute(async (req: Request, res: Response) => {
  const validationError = getSessionNameRequestError(req.body);
  if (validationError) {
    res.status(400).json({
      error: 'Invalid session naming payload',
      detail: validationError,
    });
    return;
  }

  const result = await generateSessionNames(req.body);
  res.json(result);
}));

app.post('/api/ai/flyer-copy', asyncRoute(async (req: Request, res: Response) => {
  const validationError = getFlyerCopyRequestError(req.body);
  if (validationError) {
    res.status(400).json({
      error: 'Invalid flyer copy payload',
      detail: validationError,
    });
    return;
  }

  const result = await generateFlyerCopy(req.body);
  res.json(result);
}));

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
  });
});

app.listen(port, () => {
  console.log(`Underground DJ Monolith API listening on http://localhost:${port}`);
});
