# Underground DJ Monolith Real App Roadmap

This roadmap moves the project from a full-stack portfolio prototype into a production-style application with users, ownership, deployment, and operational quality.

## Milestone A: Accounts And Ownership

### APP-001: Supabase Auth Setup

**Goal:** Add real user sign-in while preserving anonymous/local fallback.

**Scope:**
- Add Supabase browser auth client.
- Add sign-in/sign-out UI.
- Support magic link or email/password auth.
- Store public Supabase config in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

**Acceptance Criteria:**
- User can sign in and sign out.
- App still works anonymously.
- No service-role key reaches frontend code.
- `npm run lint`, `npm test`, and `npm run test:e2e` pass.

**Manual Setup Needed:**
- Supabase project URL.
- Supabase publishable/anon key. This is public client config, not a secret.
- Enable chosen auth provider in Supabase dashboard.

**Status:** Done.

---

### APP-002: User-Owned Profiles

**Goal:** Attach DJ profiles to authenticated Supabase users.

**Scope:**
- Add `user_id` to `dj_profiles`.
- Load authenticated profile when signed in.
- Keep anonymous browser profile fallback when signed out.
- Migrate/sync anonymous profile into signed-in profile on first login.

**Acceptance Criteria:**
- Signed-in users get their own profile.
- Signed-out users keep local/anonymous behavior.
- Profile data does not leak between users.

**Dependencies:** APP-001.

**Status:** Done.

---

### APP-003: User-Owned Sessions

**Goal:** Attach saved sessions to authenticated users while keeping public share links.

**Scope:**
- Add `user_id` and `visibility` to `dj_sessions`.
- Save private sessions for signed-in users.
- Keep short public links for explicitly shared sessions.
- Add ownership checks in backend routes.

**Acceptance Criteria:**
- Signed-in users can save private cloud sessions.
- Public share links only load sessions marked public/shareable.
- Anonymous cloud links still work as fallback if needed.

**Dependencies:** APP-001.

**Status:** Done.

---

## Milestone B: Production Deployment

### APP-004: Deploy Backend API

**Goal:** Deploy the Express API to a production Node host.

**Scope:**
- Pick a host: Render, Railway, Fly.io, or Cloud Run.
- Configure backend env vars.
- Verify `/api/health`.
- Verify sessions, profiles, and AI endpoints against deployed API.

**Acceptance Criteria:**
- Production API is reachable.
- No secrets are committed.
- Health check passes.

**Status:** Ready.

---

### APP-005: Deploy Frontend

**Goal:** Deploy the Vite app to a static frontend host.

**Scope:**
- Pick a host: Vercel, Netlify, Cloudflare Pages, or similar.
- Set `VITE_API_BASE_URL` to deployed backend.
- Verify full app flow against production API.

**Acceptance Criteria:**
- Frontend loads publicly.
- Cloud sessions and profiles hit production API.
- AI buttons call production API without exposing keys.

**Dependencies:** APP-004.

**Status:** Ready.

---

## Milestone C: Product Features

### APP-006: Session Library View

**Goal:** Give signed-in users a real cloud library of saved mixes.

**Scope:**
- Add list endpoint for a user's saved sessions.
- Show cloud sessions in the session cabinet.
- Add rename/delete actions.
- Keep local sessions separate or clearly labeled.

**Acceptance Criteria:**
- User can view their cloud sessions.
- User can delete a cloud session they own.
- Local sessions still work offline.

**Dependencies:** APP-003.

**Status:** Done.

**Completed:**
- Added authenticated list, update, and delete endpoints for user-owned cloud sessions.
- Added a signed-in cloud session library in the session cabinet.
- Added cloud load, rename, copy link, poster, refresh, and delete actions.
- Kept the local offline archive separate from cloud sessions.

---

### APP-007: Public Profile And Set Pages

**Goal:** Add shareable public pages for DJs and sets.

**Scope:**
- Add public profile route.
- Add public set route.
- Render profile metadata, set title, BPM, style, and poster preview.
- Keep private data hidden.

**Acceptance Criteria:**
- Public set links are clean and inspectable.
- Private sessions are not exposed.
- Public pages work without sign-in.

**Dependencies:** APP-003.

**Status:** Done.

**Completed:**
- Added public API endpoints for DJ profiles and public sets.
- Added clean frontend routes for `/profile/:id` and `/sets/:id`.
- Added public set poster-style preview with BPM, operator, style, and open-in-studio action.
- Added copy actions for public profile links and clean public set links.
- Kept private sessions hidden from public set lookups.

---

## Milestone D: Reliability And Safety

### APP-008: CI Workflow

**Goal:** Run checks automatically on push/PR.

**Scope:**
- Add GitHub Actions workflow.
- Run install, lint, unit tests, e2e smoke test, and build.
- Cache npm dependencies where reasonable.

**Acceptance Criteria:**
- CI passes on clean pushes.
- Failing tests block merges.

**Status:** Done.

**Completed:**
- Added GitHub Actions CI for pushes and pull requests to `main`.
- Runs `npm ci`, TypeScript checking, unit tests, production build, and Playwright smoke tests.
- Caches npm dependencies through `actions/setup-node`.
- Uploads Playwright traces/test output on failures.

---

### APP-009: Rate Limits And Abuse Protection

**Goal:** Protect AI and write endpoints before public deployment.

**Scope:**
- Add lightweight backend rate limiting.
- Restrict AI endpoints per IP/user.
- Add request body limits and clear errors.

**Acceptance Criteria:**
- AI endpoints cannot be spammed cheaply.
- Normal app usage is unaffected.

**Dependencies:** APP-004.

**Status:** Done.

**Completed:**
- Added dependency-free backend rate limiting for AI and write endpoints.
- Buckets by client IP or a short bearer-token hash without storing raw tokens.
- Added `429` responses with retry and rate-limit headers.
- Added clear `413` responses for request bodies over 1 MB.
- Documented rate-limit tuning environment variables.

---

### APP-010: Deployment Config Templates

**Goal:** Make production deployment less manual without committing secrets.

**Scope:**
- Add backend host template.
- Add frontend SPA route fallback config.
- Add production smoke-check script.
- Document which values must be entered manually in hosting dashboards.

**Acceptance Criteria:**
- Backend template has no committed secrets.
- Frontend clean routes work on static hosts.
- A deployed frontend/backend can be verified with one command.

**Dependencies:** APP-004, APP-005, APP-007.

**Status:** Done.

**Completed:**
- Added `render.yaml` for a Render-style Node API deploy.
- Added `vercel.json` and `public/_redirects` for SPA route fallback.
- Added `npm run smoke:prod` for post-deploy health and route checks.
- Updated deployment docs and migration list.

---

### APP-011: API Runtime Observability

**Goal:** Make the public API easier to operate and debug without leaking sensitive data.

**Scope:**
- Add request IDs to responses.
- Add structured request completion logs.
- Add safer error logs.
- Add graceful shutdown handling for production hosts.

**Acceptance Criteria:**
- Every API response has `X-Request-Id`.
- Logs include route timing and status without request bodies or auth headers.
- API exits cleanly on `SIGTERM` and `SIGINT`.

**Dependencies:** APP-004.

**Status:** Done.

**Completed:**
- Added generated/reused request IDs and `X-Request-Id` response headers.
- Added structured request logs with method, path, status, duration, and request ID.
- Added request IDs to server error responses.
- Added graceful shutdown with configurable `SHUTDOWN_GRACE_MS`.

---

## Recommended Next Step

Deploy the backend and frontend manually when you are ready:

1. Create/connect the backend service and enter backend env vars in the host dashboard.
2. Create/connect the frontend static app and enter public `VITE_*` env vars.
3. Run `API_URL="https://YOUR_API_HOST" FRONTEND_URL="https://YOUR_FRONTEND_HOST" npm run smoke:prod`.
