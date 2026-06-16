# Underground DJ Monolith Full-Stack Tickets

This backlog turns the current browser-only Web Audio app into a full-stack product while preserving its strongest feature: low-latency audio running locally in the client.

## Milestone 1: Backend Foundation

### TICKET-001: Add Express API Server

**Goal:** Create a TypeScript Express backend that can run alongside the Vite app.

**Scope:**
- Add `server/index.ts`.
- Add `GET /api/health`.
- Add JSON body parsing.
- Add development scripts for frontend-only and full-stack mode.
- Keep the frontend build unchanged.

**Acceptance Criteria:**
- `npm run server` starts the API server.
- `GET /api/health` returns `{ "ok": true }`.
- `npm run lint` passes.
- README includes the new full-stack run command.

**Dependencies:** None.

**Status:** Done.

---

### TICKET-002: Shared Session Schema

**Goal:** Move session validation into a shared module used by both frontend and backend.

**Scope:**
- Add `shared/sessionSchema.ts`.
- Define a typed `VersionedSession` shape.
- Add runtime validation for imported and posted sessions.
- Update `src/utils/sessionCodec.ts` to use the shared schema.

**Acceptance Criteria:**
- Invalid sessions are rejected with useful errors.
- Existing local session export/import still works.
- `npm run lint` passes.

**Dependencies:** TICKET-001.

**Status:** Done.

---

### TICKET-003: In-Memory Cloud Session API

**Goal:** Add backend endpoints for saving and loading sessions before introducing a database.

**Scope:**
- Add `POST /api/sessions`.
- Add `GET /api/sessions/:id`.
- Generate short public IDs.
- Store sessions in memory for development.
- Return stable share URLs or IDs.

**Acceptance Criteria:**
- A valid session can be posted and retrieved.
- Invalid session payloads return `400`.
- Unknown session IDs return `404`.
- API responses are documented in README.

**Dependencies:** TICKET-002.

**Status:** Done.

---

## Milestone 2: Frontend Cloud Sharing

### TICKET-004: Frontend API Client

**Goal:** Add a small frontend API layer for backend calls.

**Scope:**
- Add `src/lib/apiClient.ts`.
- Add typed helpers for `healthCheck`, `saveSession`, and `getSession`.
- Handle network errors cleanly.
- Avoid coupling components directly to `fetch`.

**Acceptance Criteria:**
- API calls are isolated in one module.
- Components receive useful success/error results.
- `npm run lint` passes.

**Dependencies:** TICKET-003.

**Status:** Done.

---

### TICKET-005: Save Session To Backend

**Goal:** Add a cloud-save action to the session manager.

**Scope:**
- Add a "Save Cloud Link" action next to existing local save/share controls.
- Post the current rig session to the backend.
- Copy or display the returned share URL.
- Keep localStorage save/export as offline fallback.

**Acceptance Criteria:**
- User can save a session through the API.
- User sees a success or error message.
- Existing local save/export behavior remains intact.

**Dependencies:** TICKET-004.

**Status:** Done.

---

### TICKET-006: Load Backend Session Links

**Goal:** Support clean share URLs backed by the API instead of large Base64 hashes.

**Scope:**
- Support URLs like `?sessionId=abc123`.
- Fetch the session from `/api/sessions/:id`.
- Load it through the existing `loadSession` flow.
- Preserve old `#session=` Base64 compatibility.

**Acceptance Criteria:**
- Backend session links load successfully.
- Old hash-based links still work.
- Bad or expired session IDs show a clear error.

**Dependencies:** TICKET-005.

**Status:** Done.

---

## Milestone 3: Persistence And Identity

### TICKET-007: Database Adapter

**Goal:** Replace in-memory session storage with a swappable persistence layer.

**Scope:**
- Add a storage interface.
- Add an in-memory implementation.
- Add a database-ready implementation stub.
- Keep API routes unaware of the storage backend details.

**Acceptance Criteria:**
- Existing API behavior does not change.
- Storage implementation can be swapped from one place.
- `npm run lint` passes.

**Dependencies:** TICKET-003.

**Status:** Done.

---

### TICKET-008: Supabase Session Storage

**Goal:** Persist saved sessions in Supabase Postgres.

**Scope:**
- Add Supabase environment variables.
- Add sessions table migration SQL.
- Implement the database storage adapter.
- Document setup steps.

**Acceptance Criteria:**
- Saved sessions survive server restarts.
- Missing Supabase config falls back to in-memory storage in development.
- README includes schema and environment setup.

**Dependencies:** TICKET-007.

**Status:** Done.

---

### TICKET-009: User Profiles

**Goal:** Move DJ profile data from localStorage toward account-backed profiles.

**Scope:**
- Add profile API endpoints.
- Save DJ name, crew, style, avatar index, and stats.
- Keep anonymous local profile fallback.

**Acceptance Criteria:**
- Profile data can be loaded from the backend.
- Local profile behavior still works without sign-in.
- Profile errors do not block the audio rig.

**Dependencies:** TICKET-008.

**Status:** Done.

---

## Milestone 4: AI And Social Features

### TICKET-010: AI Session Naming

**Goal:** Use the existing Gemini environment setup to generate session names and descriptions.

**Scope:**
- Add `POST /api/ai/session-name`.
- Send BPM, style, ambient mode, and sequencer density.
- Return several short names and one description.
- Keep the API key server-side only.

**Acceptance Criteria:**
- No AI key is exposed to the browser.
- The UI can request generated names.
- Failures show a graceful fallback.

**Dependencies:** TICKET-001.

**Status:** Done.

---

### TICKET-011: AI Flyer Copy

**Goal:** Generate poster/flyer text for the existing canvas flyer generator.

**Scope:**
- Add `POST /api/ai/flyer-copy`.
- Generate event title, tagline, and short social caption.
- Add a UI action in `SetPosterGenerator`.

**Acceptance Criteria:**
- Generated copy can be applied to the poster fields.
- Poster export still works offline without AI.
- AI failures do not break canvas rendering.

**Dependencies:** TICKET-010.

**Status:** Done.

---

## Milestone 5: Quality And Shipping

### TICKET-012: Session Codec Tests

**Goal:** Add tests for session serialization, deserialization, and validation.

**Scope:**
- Add a test runner.
- Test valid Base64 sessions.
- Test corrupted codes.
- Test invalid schema payloads.

**Acceptance Criteria:**
- Tests run from `npm test`.
- Core session codec behavior is covered.
- CI-ready command is documented.

**Dependencies:** TICKET-002.

**Status:** Ready.

---

### TICKET-013: Browser Smoke Test

**Goal:** Add an automated smoke test for the main UI.

**Scope:**
- Add Playwright or a lightweight browser verification setup.
- Verify the app loads.
- Verify the power button initializes the deck.
- Verify the session manager section renders.

**Acceptance Criteria:**
- Smoke test can run locally.
- Failures produce useful output.
- Test does not require audio device access.

**Dependencies:** TICKET-001.

**Status:** Ready.

---

### TICKET-014: Deployment Guide

**Goal:** Document how to deploy the full-stack app.

**Scope:**
- Add deployment notes for Vercel, Render, or Railway.
- Document environment variables.
- Explain frontend/backend hosting options.
- Include Supabase setup once persistence is added.

**Acceptance Criteria:**
- A developer can deploy from the README.
- Required environment variables are listed.
- Offline/static-only mode is still documented.

**Dependencies:** TICKET-008.

**Status:** Ready.

---

## Recommended Work Order

1. TICKET-001: Add Express API Server
2. TICKET-002: Shared Session Schema
3. TICKET-003: In-Memory Cloud Session API
4. TICKET-004: Frontend API Client
5. TICKET-005: Save Session To Backend
6. TICKET-006: Load Backend Session Links

After those six, the project will read as a real full-stack application: frontend instrument, backend API, shareable cloud sessions, and a clean path to database persistence.
