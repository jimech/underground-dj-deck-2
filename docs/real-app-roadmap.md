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

### APP-024: Multi-Origin API CORS Allowlist

**Goal:** Support local, preview, staging, and production frontend origins without opening API CORS to every site.

**Scope:**
- Add a reusable CORS allowlist helper.
- Keep localhost origins enabled for development.
- Allow `APP_URL` plus optional comma-separated `CORS_ALLOWED_ORIGINS`.
- Add unit coverage for allowed, normalized, and rejected origins.
- Document the optional deployment variable.

**Acceptance Criteria:**
- Backend CORS still allows local development.
- Production can allow multiple explicit frontend origins.
- Unknown origins are not wildcard-allowed.
- No secrets or credentials are required.

**Dependencies:** APP-010, APP-011.

**Status:** Done.

**Completed:**
- Added `server/cors.ts` and unit tests.
- Updated API middleware to use the allowlist helper.
- Documented `CORS_ALLOWED_ORIGINS` in env and deployment docs.

---

### APP-025: Storage-Aware API Health

**Goal:** Make production health checks reveal whether the backend is using persistent Supabase storage or memory fallback.

**Scope:**
- Add non-sensitive storage runtime metadata.
- Include storage status in `/api/health`.
- Make production smoke validation require `storage.activeDriver`.
- Document the expected Supabase production health response.

**Acceptance Criteria:**
- Health response includes configured driver, active driver, and persistence flag.
- No credentials, URLs, or service keys are exposed.
- Production smoke catches malformed health payloads.
- Docs explain how to spot accidental memory fallback.

**Dependencies:** APP-008, APP-010, APP-024.

**Status:** Done.

**Completed:**
- Added storage runtime status.
- Updated `/api/health` and API client health typing.
- Updated smoke and deployment docs.

---

### APP-026: Production Smoke Storage Expectation

**Goal:** Let the post-deploy smoke check fail when production accidentally runs memory storage.

**Scope:**
- Add optional `EXPECT_STORAGE_DRIVER` validation to `npm run smoke:prod`.
- Require `storage.persistent: true` when Supabase is expected.
- Update deployment docs to use the stricter production smoke command.

**Acceptance Criteria:**
- Smoke checks still work without an expected driver.
- Production docs show the Supabase expectation.
- A deployed API using memory fallback fails the stricter smoke check.
- No credentials are required.

**Dependencies:** APP-025.

**Status:** Done.

**Completed:**
- Added storage-driver expectation validation to `scripts/smoke-production.mjs`.
- Added focused smoke health validation tests.
- Updated README and deployment checklist smoke commands.

---

### APP-027: Account Library UX Polish

**Goal:** Make the Account workspace easier to understand as a profile, sign-in, songs, and saved-mixes hub.

**Scope:**
- Add a compact Account summary for cloud mixes, mounted songs, and active storage mode.
- Clarify the magic-link sign-in copy and signed-in cloud sync state.
- Replace the confusing empty saved-mixes instruction with an actionable Studio shortcut.
- Cover the Account shortcut in browser smoke tests.

**Acceptance Criteria:**
- Account view explains local vs cloud state at a glance.
- Empty saved mixes state points users to Studio without hunting for the right control.
- The Studio shortcut returns to the standby Studio view.
- Existing Account and Studio smoke paths still pass.

**Dependencies:** APP-014, APP-015, APP-023.

**Status:** Done.

**Completed:**
- Added Account summary metrics.
- Added clearer sign-in and cloud-sync helper text.
- Added an `Open Studio` empty-state action and e2e coverage.

---

### APP-028: Studio Save Action Clarity

**Goal:** Make the main Studio save/share controls easier to understand at a glance.

**Scope:**
- Replace icon-only session name generation and local-save controls with visible command labels.
- Rename the cloud-save command from `Cloud Link` to `Save Cloud`.
- Keep existing local save, cloud save, share, export, and flyer behavior unchanged.
- Open the flyer generator through direct React state from the session manager instead of a browser event.
- Cover the renamed controls in browser smoke tests.

**Acceptance Criteria:**
- Studio shows distinct `Name`, `Save Local`, and `Save Cloud` commands.
- The controls remain usable on narrow layouts.
- Account empty state points to the same `Save Cloud` wording.
- Existing Studio and Account smoke tests pass.

**Dependencies:** APP-027.

**Status:** Done.

**Completed:**
- Added visible labels to session name generation and local save controls.
- Renamed the cloud-save action to `Save Cloud`.
- Routed session-manager flyer buttons through a direct App callback for more reliable lazy loading.
- Updated e2e coverage for the clarified Studio commands.

---

### APP-029: Share Flow Copy Clarity

**Goal:** Make offline sharing and cloud saving feel like two different, understandable actions.

**Scope:**
- Rename the Studio share-panel trigger to `Offline Share`.
- Clarify that share codes/browser hash links are temporary browser snapshots.
- Explain that `Save Cloud` creates public set pages and account-library storage.
- Add an empty cloud-link hint inside the share panel.
- Cover the clarified share panel in browser smoke tests.

**Acceptance Criteria:**
- Users can distinguish offline share codes from cloud-saved public set links.
- The share panel points users to `Save Cloud` when they want a public cloud link.
- Existing save, share, flyer, Account, and public-route smoke tests pass.

**Dependencies:** APP-028.

**Status:** Done.

**Completed:**
- Renamed `Share Link` to `Offline Share`.
- Added share-panel helper copy for offline vs cloud paths.
- Added e2e coverage for the clarified share panel.

---

### APP-030: Footer Product Polish

**Goal:** Make the app footer feel production-ready and avoid exposing personal contact details in the public UI.

**Scope:**
- Remove the personal operator email from the in-app footer.
- Replace template-like labels with product status and safety chips.
- Keep the footer compact across desktop and mobile layouts.

**Acceptance Criteria:**
- Footer no longer displays personal email/contact info.
- Footer communicates app identity and safe deployment posture.
- Layout remains responsive and does not overlap adjacent content.

**Dependencies:** APP-027.

**Status:** Done.

**Completed:**
- Replaced footer content with app identity, offline-ready status, server-side key posture, and local Web Audio engine status.

---

### APP-031: Header Shortcuts Discovery

**Goal:** Make keyboard controls discoverable from the main header instead of relying on a floating help button.

**Scope:**
- Add a `Shortcuts` header action beside Guided Tour.
- Reuse the existing keyboard shortcuts modal and event path.
- Cover the header shortcut launch path in browser smoke tests.

**Acceptance Criteria:**
- Header exposes a visible `Shortcuts` action.
- Clicking it opens the existing shortcuts modal.
- Users can close the modal and continue using Studio.
- Existing Studio, Account, flyer, and public-route smoke tests pass.

**Dependencies:** APP-030.

**Status:** Done.

**Completed:**
- Added a header `Shortcuts` button.
- Added e2e coverage for opening and closing the shortcuts modal.

---

### APP-032: Dismissible Action Toasts

**Goal:** Make save/share/auth feedback easier to notice and control.

**Scope:**
- Move action feedback from the session panel bottom to a fixed toast.
- Add a dismiss button and polite status semantics.
- Clear previous toast timers before showing a new message.
- Cover local-save feedback in browser smoke tests.

**Acceptance Criteria:**
- Save/share feedback appears in a consistent visible toast.
- Users can dismiss the message manually.
- Repeated actions do not leave stale timers fighting each other.
- Existing Studio, Account, flyer, and public-route smoke tests pass.

**Dependencies:** APP-028, APP-031.

**Status:** Done.

**Completed:**
- Added fixed dismissible action toasts.
- Added safer toast timer handling.
- Added e2e coverage for the local save confirmation toast.

---

### APP-033: Guided Tour Copy Refresh

**Goal:** Make first-run guidance match the real Studio controls and current save/share model.

**Scope:**
- Replace stale preset-focused tour copy with practical product guidance.
- Explain the difference between `Save Local`, `Save Cloud`, and `Offline Share`.
- Keep the existing guided tour targets and navigation behavior.
- Cover the header guided-tour path in browser smoke tests.

**Acceptance Criteria:**
- Guided Tour opens from the header and starts with clear power guidance.
- The session cabinet step references current save/share controls.
- Tour copy no longer points users toward removed preset labels.
- Existing Studio, Account, flyer, and public-route smoke tests pass.

**Dependencies:** APP-028, APP-031.

**Status:** Done.

**Completed:**
- Refreshed all guided-tour step titles, descriptions, and action hints.
- Added e2e coverage for opening the tour and advancing to the save/share step.

---

### APP-034: Cloud Save Readiness Strip

**Goal:** Make the Studio explain what `Save Cloud` will do before the user clicks it.

**Scope:**
- Add a compact cloud-save status strip above the Studio save controls.
- Show whether the current cloud path is account-library storage or public-link-only storage.
- Explain that signed-out users should use Account sign-in to keep mixes in their library.
- Cover the unsigned Studio state in browser smoke tests.

**Acceptance Criteria:**
- Studio shows the current cloud-save mode near `Save Cloud`.
- Signed-out users see that cloud saving creates a public link but does not attach to their library.
- The copy points users to Account sign-in without changing save behavior.
- Existing Studio, Account, flyer, and public-route smoke tests pass.

**Dependencies:** APP-028, APP-033.

**Status:** Done.

**Completed:**
- Added `Cloud Save Mode` status copy to the Studio session cabinet.
- Added e2e coverage for the public-link-only unsigned state.

---

### APP-035: Cloud Save Button State

**Goal:** Make the `Save Cloud` command itself reflect whether the user is saving to an account library or creating a public link only.

**Scope:**
- Add an auth-aware sublabel inside the `Save Cloud` button.
- Use a distinct unsigned visual state for public-link-only saves.
- Keep existing cloud-save behavior unchanged.
- Cover the unsigned button state in browser smoke tests.

**Acceptance Criteria:**
- Signed-out Studio shows `Save Cloud` with a `Public Link` sublabel.
- Signed-in Studio can show the same command as an account-library save.
- Users get the warning at the exact click target, not only in nearby helper copy.
- Existing Studio, Account, flyer, and public-route smoke tests pass.

**Dependencies:** APP-034.

**Status:** Done.

**Completed:**
- Added auth-aware `Save Cloud` button styling and sublabel copy.
- Added e2e coverage for the signed-out `Public Link` state.

---

### APP-036: Cloud Link Labels

**Goal:** Make saved cloud links easier to understand after a successful `Save Cloud`.

**Scope:**
- Store both the public set page URL and the Studio load URL in the share panel state.
- Label the two links separately as `Public Set Page` and `Studio Load Link`.
- Copy the right URL from each link row.
- Cover the successful cloud-save share panel in browser smoke tests with mocked API data.

**Acceptance Criteria:**
- A successful cloud save shows the public set page URL in the share panel.
- The Studio load URL remains available but is not confused with the public page.
- Selecting or copying cloud library items refreshes the latest public link state.
- Existing Studio, Account, flyer, and public-route smoke tests pass.

**Dependencies:** APP-029, APP-035.

**Status:** Done.

**Completed:**
- Added separate latest cloud public URL and studio URL state.
- Reworked the share panel to display clearly labeled cloud links.
- Added e2e coverage for mocked cloud save link labels.

---

### APP-037: Studio Account CTA

**Goal:** Give signed-out Studio users a direct path to Account sign-in from the cloud-save explanation.

**Scope:**
- Add an `Open Account` action to the Studio cloud-save readiness strip.
- Wire the Studio session manager to switch the app workspace to Account.
- Keep the CTA hidden when already signed in.
- Cover the Studio-to-Account-to-Studio path in browser smoke tests.

**Acceptance Criteria:**
- Signed-out users can open Account from the Studio cloud-save strip.
- The Account view shows the sign-in/library surface.
- Users can return to Studio and continue the save/share flow.
- Existing Studio, Account, flyer, and public-route smoke tests pass.

**Dependencies:** APP-034, APP-036.

**Status:** Done.

**Completed:**
- Added `onOpenAccount` workspace callback support to the session manager.
- Added an `Open Account` CTA in the Studio cloud-save readiness strip.
- Added e2e coverage for opening Account from Studio and returning.

---

## Recommended Next Step

Deploy the backend and frontend manually when you are ready:

1. Create/connect the backend service and enter backend env vars in the host dashboard.
2. Create/connect the frontend static app and enter public `VITE_*` env vars.
3. Run `API_URL="https://YOUR_API_HOST" FRONTEND_URL="https://YOUR_FRONTEND_HOST" npm run smoke:prod`.
