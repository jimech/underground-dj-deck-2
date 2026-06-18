# 🎧 Underground DJ Monolith
An immersive, ultra-modern industrial DJ performance studio and tactile hardware emulator powered by the native Web Audio API. 

Designed for digital audio enthusiasts, creative developers, and live-mix performers, the **Underground DJ Monolith** bridges the gap between classic analog equipment and high-performance web engineering. Every knob, fader, vinyl spindle, and tape reel offers responsive visual and sonic feedback, turning a browser window into a tactile mixing rig.

---

## 🎨 Design Philosophy & UI/UX Craftsmanship (Portfolio Focus)

The visual design of the Monolith breaks away from generic modern SaaS interfaces. Instead, it embraces a high-density, **tactile, retro-futuristic industrial design aesthetic** that celebrates the physical form-factor of classic studio gear.

### 📐 Structural Grid & Interface Rhythm
* **Dense Skeuomorphic Rails**: The layout mimics physical rack-mount equipment. Components are encased in multi-level borders, subtle drop-shadows, and inset highlights that make buttons feel depressed and sliders feel raised.
* **Typographic Contrast**: High-contrast pairing of heavy "Space Grotesk" labels with technical, monospaced "JetBrains Mono" readouts. This mirrors the silk-screened markings found on hardware consoles and professional synthesizers.
* **No Unsolicited Visual Noise**: Margins, rails, and panels only contain information relevant to the current performance, avoiding mock terminal spam to preserve visual authenticity and clarity.

---

### 🎨 The Dynamic Theming Matrix & CSS Architecture
The Monolith features a fully integrated **Modular Custom Variable Theme System** mapped entirely through Tailwind custom properties variables inside `src/index.css`. Switching themes triggers a synchronized, tactile hardware transformation across all components.

| Theme | Aesthetic Inspiration | Visual Tone | Primary Accent |
| :--- | :--- | :--- | :--- |
| **MONOLITH** | Custom Studio Master Console (Default) | Raw Electronic Dark Slate, Charcoal | Vintage Neon Orange |
| **SILVER RIG** | Laboratory Industrial Gear | Brushed Aluminum Plate, Sleek Gray | Blueprint/Laboratory Blue |
| **OBSIDIAN** | Acid Club Darkroom | Deep OLED Pitch-Black | Intense Neon Magenta Laser |
| **90S RAVE** | 16-Bit Tracker Cabinets (Amiga/Tokyo Arcade) | Rich Cosmic Purple, Ultraviolet | Radioactive Yellow / Pink |

#### Seamless Tactile Rig Transitions
To enhance the sensory experience of changing the "mechanical state" of the rig:
1. **Screen-Wide Scanline Sweep**: A high-luminance laser bar sweeps down the screen using an accelerated CSS animation on state transition.
2. **CRT Phosphor Flicker**: A momentary brightness flash stimulates the eyes with organic retro cathode-ray-tube flicker using an `AnimatePresence` overlay.
3. **Preamplifier Audio Trigger**: If the master power is on, changing themes triggers a custom-filtered, ambient mechanical-relay click sound (`crackle_echo`) synthesized live on the audio track.

```css
@keyframes scanswipe {
  0% { top: -5%; }
  100% { top: 105%; }
}
.animate-scanswipe {
  animation: scanswipe 0.7s cubic-bezier(0.15, 0.85, 0.35, 1) infinite;
}
```

---

## ⚡ Quick Start Guide (Try the Simulator)

Follow this structured flow to explore the full audio-visual suite:

1. **Power On**: Click the master **POWER** toggle in the top-left terminal bar to initialize the Web Audio context.
2. **Recall a Master Session**: Scroll down to the **Session Storage Cabinet** (bottom-right). Click **LOCK ACID PRESET** or **CORE DRONE PRESET** to instantly wire a fully patched mixing layout and step-sequencing grid.
3. **Activate the Sequencer**: In the **Step Sequencer** module, adjust your BPM and click **PLAY/PAUSE**. Watch the synchronized strobe-lights scan across the 16-step grid.
4. **Interact with Decks**: Go back up to **Deck A** and **Deck B**. Click **PLAY** to start the track reels. Grab and spin the **Vinyl Record Platters** with your cursor/touch to execute scratches with real friction drag physics.
5. **Adjust the Crossfader**: Slide the central crossfader back and forth, and use the **3-band Equalizers** (Low, Mid, High) to perform seamless transitions.
6. **Trigger Sound FX Pads**: Use the trigger matrix and ambient soundscapes (Rain, Crowd, Subway, Drone) to frame your performance in deep industrial textures.
7. **Record & Export Lossless WAV**: Click the tape recorder **REC** button. Perform your set, hit record again, and click **EXPORT WAV** to compile your live digital master into a lossless 16-bit PCM WAV directly in your browser!

---

## 🛠️ Web Audio Signal Chain & Technical Architecture

The Underground DJ Monolith is engineered entirely client-side using **Vite, React, TypeScript, and the Web Audio API**. Sound synthesis, file decoding, interactive scratching physics, and output buffering happen in real-time without reliance on expensive database servers or heavy backends.

### Web Audio Routing Diagram
The Monolith's internal DSP signal routing maps each source channel through distinct filtering matrices before summing into the master record buffer:

```text
[ Deck A Sample Node ] ──────────> [ EQ Low/Mid/High ] ──> [ Combo Filter / Resonance ] ──┐
                                                                                           ├──> [ X-Fader Node ] ──> [ Master Volume ] ──> [ Hardware Buffer ]
[ Deck B Sample Node ] ──────────> [ EQ Low/Mid/High ] ──> [ Combo Filter / Resonance ] ──┘
                                                                                           ▲
[ Ambient Atmosphere Channels ]  ──> [ Vol Controller ] ───────────────────────────────────┤
[ Sound Effects Pitch Pads ]     ──> [ Vol Controller ] ───────────────────────────────────┘
                                                                                           │
                                                                                    [ LIVE TAPE BUFFER ]
                                                                                   (PCM 16-Bit WAV Encoder)
```

### Key Technical Achievements

#### 💿 Mechanical Friction & Scratch Engine
* The Turntables integrate custom HTML5 high-DPI Canvas graphics paired with mathematical physics loops.
* **Scratch Calculations**: When grabbed, the engine measures the mouse angle delta between frames to determine play speed ($ScratchVelocity = \Delta \theta \times Scale$).
* **Motor Inertia**: Upon cursor release, the spindle smoothly returns to play speed using logarithmic acceleration curves ($v_{new} = v_{old} + (1.0 - v_{old}) \times Inertia$), mimicking the high torque of Technics SL-1200 motors.

#### 📼 Lossless WAV Compiler
* Unlike standard browser `MediaRecorder` implementations which often force lossy compression (Opus/WebM), the Monolith uses a custom **PCM WAV Encoder**.
* It intercepts the compiled stereo audio buffers, packs the raw Float32 data into structured 16-bit signed integer streams, writes the rigid 44-byte WAV header, and outputs an offline file download blob.

#### 🗄️ JSON Storage Cabinet
* State parameters (BPM, step sequencer patterns, volume sliders, equalizer gains, locked tracks) are bundled and written to browser local storage.
* Sessions can be exported and imported as lightweight, portable `.json` configuration templates, providing zero-cold-start state persistence.

---

## 📦 Run & Host Locally

To run the app locally, or deploy it as a highly responsive piece of your portfolio:

### 1. Requirements
* **NodeJS** >= 18.x
* **NPM** >= 9.x

### 2. Execution Setup
```bash
# 1. Unzip the project folder
# 2. Enter workspace root directory
cd underground-dj-monolith

# 3. Install dependencies
npm install

# 4. Boot up local development server
npm run dev
```
Open `http://localhost:3000` to interact with the console.

### 2.1 Full-Stack Development Mode
The app can also run with a local Express API for cloud-session and AI features.

```bash
# Start the Express API on http://localhost:8787
npm run server

# In another terminal, start the Vite frontend
npm run dev
```

For convenience on macOS/Linux, both processes can be started together:

```bash
npm run dev:full
```

The backend health check is available at `http://localhost:8787/api/health` and returns a JSON status payload.

The frontend API client uses `VITE_API_BASE_URL` when set, otherwise it defaults to `http://localhost:8787`. This value is browser-visible public configuration; never place secrets or API keys in `VITE_*` variables.

The API adds an `X-Request-Id` response header to every request. If a client sends `X-Request-Id`, the server reuses it; otherwise it generates one. Runtime logs include request ID, method, path, status, and duration, but they do not log request bodies, authorization headers, API keys, or raw tokens.

Graceful shutdown is enabled for `SIGTERM` and `SIGINT`. Override the default 10 second shutdown window with:

```bash
SHUTDOWN_GRACE_MS=10000
```

#### Session API
The local API includes development-only in-memory session sharing. These sessions reset whenever the server restarts unless Supabase persistence is enabled.

The backend chooses its session storage through `SESSION_STORAGE_DRIVER`. The current supported local value is `memory`; the API routes call a storage interface so a database adapter can be enabled later without changing route behavior.

#### Supabase Persistence
To persist cloud sessions beyond server restarts:

1. Create a Supabase project.
2. In the Supabase SQL editor, run these migrations in order:
   - `supabase/migrations/202606160001_create_dj_sessions.sql`
   - `supabase/migrations/202606160002_create_dj_profiles.sql`
   - `supabase/migrations/202606160003_add_user_id_to_dj_profiles.sql`
   - `supabase/migrations/202606160004_add_ownership_to_dj_sessions.sql`
3. Create a local `.env` file, never committed to git:

```bash
SESSION_STORAGE_DRIVER="supabase"
SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVER_ONLY_SERVICE_ROLE_KEY"
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be placed in `VITE_*` variables or frontend code. If Supabase credentials are missing, the server falls back to in-memory storage for local development.

```bash
# Save a full VersionedSession JSON payload
curl -X POST http://localhost:8787/api/sessions \
  -H "Content-Type: application/json" \
  -d @session.json
```

Successful response shape:

```json
{
  "id": "abc123xyz",
  "shareUrl": "http://localhost:3000/?sessionId=abc123xyz",
  "createdAt": "2026-06-16T00:00:00.000Z",
  "session": "the saved VersionedSession payload"
}
```

```bash
# Load a saved session by public ID
curl http://localhost:8787/api/sessions/abc123xyz
```

Invalid session payloads return `400` with a validation detail. Unknown session IDs return `404`.

When a user is signed in, the backend attaches their Supabase user ID to newly saved cloud sessions. Public cloud links remain loadable from `?sessionId=...`; private sessions are supported by the API with `POST /api/sessions?visibility=private` and require the owning signed-in user to load them.

Signed-in users also get an account-scoped cloud library. These routes require an `Authorization: Bearer <supabase_access_token>` header:

- `GET /api/sessions` lists sessions owned by the signed-in user.
- `PUT /api/sessions/:id` renames/updates an owned session payload.
- `DELETE /api/sessions/:id` deletes an owned session.

Public set pages use clean browser URLs like `/sets/:id`. The matching API endpoint is `GET /api/public/sets/:id`; it only returns sessions marked `public`, so private cloud sessions are not exposed.

#### Profile API
The app also syncs an anonymous browser profile to the backend when available, while keeping localStorage as the immediate offline fallback.

When a Supabase auth session is present, the frontend sends the user's access token to the API. The backend verifies that token and stores the profile under the authenticated Supabase user ID. Signed-out users keep using the anonymous browser profile ID.

Public DJ profile pages use `/profile/:id`. The matching API endpoint is `GET /api/public/profiles/:id`; it returns display fields only and never returns Supabase auth email, access tokens, service keys, or raw user IDs.

```bash
# Save/update an anonymous DJ profile
curl -X PUT http://localhost:8787/api/profiles/profile_abc \
  -H "Content-Type: application/json" \
  -d '{
    "djName": "DJ Monolith",
    "djCrew": "Sub-level 4",
    "soundStyle": "Industrial Techno",
    "avatarIndex": 0,
    "timeMixed": 0,
    "vinylSpins": 0
  }'

# Load an anonymous DJ profile
curl http://localhost:8787/api/profiles/profile_abc
```

Invalid profile payloads return `400`. Unknown profile IDs return `404`.

#### AI Session Naming
The backend can generate session names from BPM, style, ambient mode, and sequencer density:

```bash
curl -X POST http://localhost:8787/api/ai/session-name \
  -H "Content-Type: application/json" \
  -d '{
    "bpm": 130,
    "soundStyle": "Industrial Techno",
    "ambientMode": "subway",
    "sequencerDensity": 0.25
  }'
```

Set `GEMINI_API_KEY` only in local `.env` or deployment secrets. The key is read by the Express server and must never be placed in `VITE_*` variables or frontend code. If the key is missing or the AI call fails, the endpoint returns a local fallback response so the UI remains usable.

AI endpoints and write endpoints have lightweight server-side rate limits. Limits are keyed by client IP, or by a short hash of the bearer token when a signed-in user is present. The token itself is never stored in the limiter.

Optional tuning env vars:

```bash
AI_RATE_LIMIT_MAX=20
AI_RATE_LIMIT_WINDOW_MS=600000
WRITE_RATE_LIMIT_MAX=120
WRITE_RATE_LIMIT_WINDOW_MS=600000
```

Requests above the limit return `429` with `Retry-After` and `X-RateLimit-*` headers. JSON request bodies are capped at 1 MB; larger payloads return `413`.

The poster generator also uses the server-side AI path for flyer copy:

```bash
curl -X POST http://localhost:8787/api/ai/flyer-copy \
  -H "Content-Type: application/json" \
  -d '{
    "djName": "DJ Monolith",
    "djCrew": "Bunker Collective",
    "soundStyle": "Industrial Techno",
    "sessionName": "Live Setup Improv",
    "bpm": 130,
    "ambientMode": "subway",
    "aspectRatio": "1:1"
  }'
```

### 3. Production Build
```bash
# Compile and bundle code to optimized static files
npm run build
```

### 4. Deployment Guide

The project can be deployed in two modes:

#### Static-Only Portfolio Mode
Use this when you only need the browser-based Web Audio rig.

```bash
npm run build
```

Deploy the generated `dist/` folder to GitHub Pages, Netlify, Vercel static hosting, Cloudflare Pages, or any static host. In this mode:

- Web Audio, recording, local sessions, local profiles, and poster export work in the browser.
- Cloud session links, Supabase persistence, profile sync, and AI copy endpoints are unavailable.
- No backend secrets are required.

#### Full-Stack Mode
Use this when you want cloud sessions, profile sync, and AI features.

Recommended split:

- **Frontend:** deploy the Vite build to Vercel, Netlify, Cloudflare Pages, or similar.
- **Backend:** deploy the Express API to Render, Railway, Fly.io, Cloud Run, or a Node-capable server.
- **Database:** Supabase Postgres using the migrations in `supabase/migrations/`.

Included deployment templates:

- `render.yaml` is a Render web-service template for the Express API. It includes secret placeholders with `sync: false`; fill those values in Render's environment settings.
- `vercel.json` rewrites clean SPA routes such as `/sets/:id` and `/profile/:id` back to `index.html`.
- `public/_redirects` does the same SPA fallback for Netlify-style static hosting.

Manual step-by-step deployment checklist:

- `docs/deployment-manual-checklist.md`

Backend start command:

```bash
npm run server
```

Frontend build command:

```bash
npm run build
```

Required frontend environment variable:

```bash
VITE_API_BASE_URL="https://YOUR_API_HOST"
VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY"
```

These values are public browser config. Never put secrets in `VITE_*` variables.

Required backend environment variables:

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
```

Backend secret rules:

- Store real values only in local `.env` or deployment-provider secret settings.
- Never commit `.env`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` in frontend code.
- Never prefix backend secrets with `VITE_`.

Auth setup:

- In Supabase, enable email magic link or OTP sign-in under Authentication settings.
- Add your local and production frontend URLs to Supabase Auth redirect URLs.
- Use the publishable/anon key for `VITE_SUPABASE_ANON_KEY`; never use the service-role key in frontend config.

Before enabling Supabase persistence, run these SQL files in the Supabase SQL Editor:

```text
supabase/migrations/202606160001_create_dj_sessions.sql
supabase/migrations/202606160002_create_dj_profiles.sql
supabase/migrations/202606160003_add_user_id_to_dj_profiles.sql
supabase/migrations/202606160004_add_ownership_to_dj_sessions.sql
```

Pre-deploy checks:

```bash
npm run lint
npm test
npm run test:e2e
npm run build
```

Health check after backend deploy:

```bash
curl https://YOUR_API_HOST/api/health
```

Expected response:

```json
{
  "ok": true,
  "service": "underground-dj-monolith-api"
}
```

Full production smoke check after frontend/backend deploy:

```bash
API_URL="https://YOUR_API_HOST" FRONTEND_URL="https://YOUR_FRONTEND_HOST" npm run smoke:prod
```

### 5. Quality Checks
```bash
# Type-check the project
npm run lint

# Run automated tests
npm test

# Run browser smoke tests
npm run test:e2e
```

The unit suite covers shared session codec behavior plus backend middleware for rate limits, request IDs, and payload-too-large errors.

Porting the app to a portfolio? The static-only mode keeps the compiled output in `./dist` hostable on free static hosting. Use full-stack mode only when you want cloud persistence and AI features.

---

💡 *Designed by the Gemini Duplex in cooperation with the System Architect, Resident Operator: **jimemettr@gmail.com**.*
