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

### 3. Production Build
```bash
# Compile and bundle code to optimized static files
npm run build
```
Porting the app to a portfolio? Since it relies purely on client-side Web Audio synthesis, the compiled output in `./dist` can be hosted **entirely for free** on services such as **GitHub Pages**, **Vercel**, **Netlify**, or **Cloud Run** with zero database setup, zero server cold starts, and absolute responsiveness!

---

💡 *Designed by the Gemini Duplex in cooperation with the System Architect, Resident Operator: **jimemettr@gmail.com**.*
