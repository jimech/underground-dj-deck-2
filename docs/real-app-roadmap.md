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

### APP-012: Backend Middleware Unit Tests

**Goal:** Lock down API reliability middleware with fast tests.

**Scope:**
- Include server tests in Vitest.
- Test rate-limit success and rejection behavior.
- Test request ID reuse and safe request logging.
- Test payload-too-large error responses.

**Acceptance Criteria:**
- `npm test` covers backend middleware.
- Tests do not need network sockets or real credentials.
- Security-sensitive values are not asserted or logged.

**Dependencies:** APP-009, APP-011.

**Status:** Done.

**Completed:**
- Updated Vitest to include `server/**/*.test.ts`.
- Added rate-limit tests for limit headers, `429`, and bearer-token bucket separation.
- Added request telemetry tests for `X-Request-Id`, safe logs, and `413` responses.

---

### APP-013: Manual Deployment Checklist

**Goal:** Make the remaining manual production steps explicit and safe.

**Scope:**
- Document Supabase setup order.
- Document backend host env vars and secrets.
- Document frontend host env vars.
- Document post-deploy smoke checks.
- Document pre-push secret checks.

**Acceptance Criteria:**
- Manual credential steps are clearly separated from committed code.
- The checklist explains which values are public and which are secret.
- The checklist includes verification steps after deploy.

**Dependencies:** APP-010.

**Status:** Done.

**Completed:**
- Added `docs/deployment-manual-checklist.md`.
- Linked the checklist from the README deployment guide.
- Included Supabase, backend, frontend, post-deploy, and push-safety steps.

---

### APP-014: Account Library Navigation

**Goal:** Make account, login/logout, saved mixes, and mounted songs easy to find.

**Scope:**
- Add a top-level Account tab separate from the studio surface.
- Keep sign-in/sign-out and public profile actions in the Account view.
- Show saved cloud mixes in a larger account library panel.
- Show currently mounted local songs separately from cloud-saved mixes.
- Keep audio files local unless a future storage ticket adds explicit upload support.

**Acceptance Criteria:**
- User can open Account without powering on the audio engine.
- Account view shows login/logout controls clearly.
- Account view shows saved cloud mixes and local mounted songs as separate concepts.
- Studio controls still render and test normally.

**Dependencies:** APP-001, APP-006.

**Status:** Done.

**Completed:**
- Added Studio/Account workspace navigation.
- Added an Account shortcut from the standby overlay.
- Added account-only layout for profile, auth, saved mixes, and mounted songs.
- Kept local uploaded songs browser-only and explicitly labeled.

---

### APP-015: Account Flow Smoke Test

**Goal:** Prevent regressions in the new Account tab and standby shortcut.

**Scope:**
- Add an e2e smoke test for opening Account without powering audio.
- Assert login, mounted songs, and saved mixes are visible in the account view.
- Keep the existing studio smoke path covered.
- Keep expected first-run anonymous profile misses out of failure noise.

**Acceptance Criteria:**
- Account can be opened from standby.
- Account page shows auth and library surfaces.
- Studio-only session cabinet is hidden while Account is active.
- `npm run test:e2e` covers both Studio and Account paths.

**Dependencies:** APP-014.

**Status:** Done.

**Completed:**
- Added a reusable e2e console-error collector.
- Added Account standby shortcut coverage.
- Verified Account and Studio paths in Playwright.

---

### APP-016: Production Bundle Splitting

**Goal:** Reduce the initial production JavaScript chunk and make vendor code cache-friendly.

**Scope:**
- Lazy-load public profile/set pages.
- Lazy-load the poster generator overlay.
- Move public route parsing into a tiny shared helper.
- Add conservative Vite vendor chunk boundaries.

**Acceptance Criteria:**
- Production build no longer emits the oversized chunk warning.
- Studio, Account, public pages, and poster overlay remain functional.
- No runtime behavior changes or new environment variables are required.

**Dependencies:** APP-007, APP-014.

**Status:** Done.

**Completed:**
- Split public pages and poster generator into separate async chunks.
- Added explicit vendor chunks for React, motion, Supabase/Google API clients, and icons.
- Reduced the main production app chunk to roughly 202 kB before gzip.
- Added e2e coverage for opening the lazy-loaded poster generator.

---

### APP-017: Production Smoke Route Coverage

**Goal:** Make post-deploy checks catch broken public route fallbacks.

**Scope:**
- Extend the production smoke script to check both `/sets/:id` and `/profile/:id`.
- Keep API health validation clear and JSON-specific.
- Improve connection and HTTP failure messages.
- Avoid any new secrets or provider-specific assumptions.

**Acceptance Criteria:**
- `npm run smoke:prod` checks frontend root, set route fallback, and profile route fallback.
- Backend health failures explain whether the response is unreachable, invalid JSON, or missing `ok=true`.
- Script remains usable with only `API_URL`, only `FRONTEND_URL`, or both.

**Dependencies:** APP-010, APP-007.

**Status:** Done.

**Completed:**
- Added profile route fallback verification to `scripts/smoke-production.mjs`.
- Added shared SPA-shell validation for public routes.
- Improved smoke failure messages for connection, HTTP, and JSON failures.

---

### APP-018: Public Route Browser Smoke Test

**Goal:** Keep clean public profile and set routes working after route and bundle changes.

**Scope:**
- Add e2e coverage for `/profile/:id` and `/sets/:id`.
- Verify the lazy-loaded public page shell renders on both routes.
- Allow expected local API connection failures in the browser-only e2e environment.

**Acceptance Criteria:**
- Browser tests cover public profile and public set route entry points.
- Public route failures render the in-app `Signal Not Found` state instead of crashing.
- Existing Studio, Account, and flyer smoke paths still pass.

**Dependencies:** APP-007, APP-016, APP-017.

**Status:** Done.

**Completed:**
- Added public route shell coverage to Playwright smoke tests.
- Narrowed expected local API connection noise to `localhost:8787/api/*`.

---

### APP-019: Browser Title Metadata

**Goal:** Replace generic app titles with useful route-aware browser titles.

**Scope:**
- Set the static HTML title to the app name.
- Set Studio and Account workspace titles.
- Set loading, success, and not-found titles for public profile and set routes.
- Add e2e assertions for important title states.

**Acceptance Criteria:**
- Browser tabs no longer show the default template title.
- Account and Studio titles are distinct.
- Public routes expose meaningful titles even when the public API is unavailable.

**Dependencies:** APP-014, APP-018.

**Status:** Done.

**Completed:**
- Updated `index.html` title.
- Added workspace and public-route document title effects.
- Added Playwright title assertions for Studio, Account, and public not-found routes.

---

### APP-020: Public Route Success Smoke Test

**Goal:** Verify public profile and set pages render real public API data, not only not-found states.

**Scope:**
- Mock public profile and public set API responses in Playwright.
- Assert profile metadata, set metadata, BPM, operator, and browser titles render.
- Keep the test independent of Supabase and the local API server.

**Acceptance Criteria:**
- Public profile success page renders profile name, crew/style, stats, and title.
- Public set success page renders set title, BPM, operator, and title.
- Tests stay deterministic without network credentials.

**Dependencies:** APP-018, APP-019.

**Status:** Done.

**Completed:**
- Added mocked public API success coverage for `/profile/:id` and `/sets/:id`.
- Verified public page success titles in Playwright.

---

### APP-021: Repository Secret Scan

**Goal:** Add a repeatable pre-push safety check for public repository secrets.

**Scope:**
- Add a local scanner for tracked and untracked repository files.
- Flag common high-risk formats like provider keys, private keys, database URLs with passwords, and Supabase service-role JWTs.
- Document the scanner in pre-deploy and push-safety checklists.

**Acceptance Criteria:**
- `npm run secret:scan` exits successfully when only placeholders are present.
- Real-looking backend secrets fail the scan before push.
- The scanner does not require real credentials or network access.

**Dependencies:** APP-013, APP-015.

**Status:** Done.

**Completed:**
- Added `scripts/scan-secrets.mjs`.
- Added `npm run secret:scan`.
- Updated README and deployment checklist safety steps.

---

### APP-022: CI Secret Scan Gate

**Goal:** Make GitHub CI block accidental public secret leaks.

**Scope:**
- Run the repository secret scan in GitHub Actions.
- Put the scan before browser install, tests, and build so failures are fast.
- Keep CI free of real credentials.

**Acceptance Criteria:**
- Push/PR checks run `npm run secret:scan`.
- Secret scan failures stop the workflow before expensive checks.
- No new manual credentials are required.

**Dependencies:** APP-008, APP-021.

**Status:** Done.

**Completed:**
- Added a CI secret-scan step after `npm ci`.
- Updated the CI job label to include secret scanning.

---

### APP-023: One-Command Local Verification

**Goal:** Make the local pre-push check easy to run and hard to forget.

**Scope:**
- Add a single npm script for secret scan, typecheck, unit tests, build, and e2e smoke tests.
- Update README and deployment checklist to prefer the one-command flow.
- Keep individual scripts available for focused debugging.

**Acceptance Criteria:**
- `npm run verify` runs all local pre-push checks in order.
- Documentation points to `npm run verify` for normal push readiness.
- No new credentials or external services are required.

**Dependencies:** APP-015, APP-016, APP-021.

**Status:** Done.

**Completed:**
- Added `npm run verify`.
- Updated README and deployment checklist verification instructions.

---

## Recommended Next Step

Deploy the backend and frontend manually when you are ready:

1. Create/connect the backend service and enter backend env vars in the host dashboard.
2. Create/connect the frontend static app and enter public `VITE_*` env vars.
3. Run `API_URL="https://YOUR_API_HOST" FRONTEND_URL="https://YOUR_FRONTEND_HOST" npm run smoke:prod`.
