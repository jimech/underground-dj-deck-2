# Manual Deployment Checklist

Use this when you are ready to publish the full-stack app. Do not paste real secrets into the repo, chat, screenshots, or committed files. Put real values only in provider dashboards or your local `.env`.

## 1. Supabase

Manual steps:

- Create or open your Supabase project.
- In SQL Editor, run these files in order by pasting the SQL contents, not the filenames:
  - `supabase/migrations/202606160001_create_dj_sessions.sql`
  - `supabase/migrations/202606160002_create_dj_profiles.sql`
  - `supabase/migrations/202606160003_add_user_id_to_dj_profiles.sql`
  - `supabase/migrations/202606160004_add_ownership_to_dj_sessions.sql`
- Enable email magic links or OTP under Authentication settings.
- Add redirect URLs under Authentication URL configuration:
  - `http://localhost:3000`
  - Your production frontend URL, for example `https://YOUR_FRONTEND_HOST`

Values you will need later:

- Project URL: safe to use in frontend and backend config.
- Publishable/anon key: safe to use in frontend config.
- Service role key: backend-only secret. Never put this in `VITE_*`.

## 2. Backend Host

Recommended simple path: Render using `render.yaml`.

Manual steps:

- Create a new Render web service from this repo.
- Use `render.yaml` as the service blueprint if Render detects it.
- Set the backend environment variables in Render, not in git.
- Deploy the service.
- Open `https://YOUR_API_HOST/api/health` and confirm it returns `ok: true`.

Backend environment variables:

```bash
APP_URL="https://YOUR_FRONTEND_HOST"
SESSION_STORAGE_DRIVER="supabase"
SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVER_ONLY_SUPABASE_SECRET"
GEMINI_API_KEY="YOUR_SERVER_ONLY_GEMINI_KEY"
AI_RATE_LIMIT_MAX=20
AI_RATE_LIMIT_WINDOW_MS=600000
WRITE_RATE_LIMIT_MAX=120
WRITE_RATE_LIMIT_WINDOW_MS=600000
SHUTDOWN_GRACE_MS=10000
```

Manual credential notes:

- `SUPABASE_SERVICE_ROLE_KEY` is required for Supabase persistence on the backend.
- `GEMINI_API_KEY` is optional for local fallback behavior, but needed for real AI copy/name generation.
- If you do not want AI yet, leave `GEMINI_API_KEY` unset and the app will still run with fallbacks.

## 3. Frontend Host

Recommended simple path: Vercel or Netlify.

Manual steps:

- Create a frontend/static app from this repo.
- Build command: `npm run build`
- Output directory: `dist`
- Confirm SPA fallback is active:
  - Vercel uses `vercel.json`.
  - Netlify uses `public/_redirects`.
- Set frontend environment variables in the host dashboard.
- Deploy.

Frontend environment variables:

```bash
VITE_API_BASE_URL="https://YOUR_API_HOST"
VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY"
```

Manual credential notes:

- `VITE_*` values are visible in the browser.
- Never put `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` in frontend env vars.

## 4. Post-Deploy Verification

Run local checks before pushing:

```bash
npm run verify
```

After backend/frontend deploy:

```bash
API_URL="https://YOUR_API_HOST" FRONTEND_URL="https://YOUR_FRONTEND_HOST" npm run smoke:prod
```

Manual browser checks:

- Open the production frontend.
- Sign in with magic link.
- Save a cloud session.
- Refresh and confirm it appears in Cloud Sessions.
- Copy a public set link and open it in a private/incognito window.
- Edit your DJ profile and copy/open the public profile link.

## 5. Push Safety

Before pushing public code:

- Run `git status --short` and make sure `.env` is not listed.
- Scan tracked and untracked repository files for accidental secrets:

```bash
npm run secret:scan
```

Only placeholders like `YOUR_SERVER_ONLY_SUPABASE_SECRET` should appear in committed files.
