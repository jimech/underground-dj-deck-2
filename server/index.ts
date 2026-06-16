import 'dotenv/config';
import express, { type Request, type Response } from 'express';

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 8787);

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'underground-dj-monolith-api',
  });
});

app.listen(port, () => {
  console.log(`Underground DJ Monolith API listening on http://localhost:${port}`);
});
