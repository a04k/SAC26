# PLAN — The Earth Information Jukebox ("Terra Jukebox")

## 1. The challenge, distilled

NASA's Earth Information Center (EIC) produces stunning visualizations of a
changing planet, but sight-only presentation excludes blind/low-vision users
and hides patterns the eye misses. The task: build an **"Earth Jukebox"** —
an interface that pairs EIC visual frames with **dynamic sonifications
generated in real time**, translating sight into sound. Computer vision
(color, density, shape) → audio parameters (pitch, tempo, timbre, rhythm),
balanced between data fidelity and musicality, with accessibility as a core
theme.

Resources used (SVS = Scientific Visualization Studio):
Night Lights 2012–2023 (5313) · Sea Surface Currents & Temperature (3912) ·
GEOS Aerosols (5669) · Air Quality Model Runs (5533) · Perpetual Ocean 2
(5425) · DYAMOND Global CO₂ (5196) · ISS Lightning 2017–2023 (5011) ·
3D Atmospheric River (4960) · GEDI Forest Height (4950) · Caldwell 73
sonification reference (13786).

## 2. Concept: Terra Jukebox

A 3D jukebox in orbit around Earth. Each **track is a real EIC dataset**.
Selecting a track:

1. The dataset's frame becomes the **texture of a 3D Earth** (plus atmosphere
   shader, bloom, starfield) — you literally *see* the data as a planet.
2. A **Python + OpenCV engine** analyzes the frame's pixels (HSV histograms,
   edge density, spatial luminance grid, FFT radial profile, dominant colors)
   and converts them into **musical parameters** (root note, scale, tempo,
   density, brightness, pan spread).
3. A **WebAudio synth engine** plays those parameters live — pad chords,
   arpeggios, bass, percussion — with per-dataset instruments.
4. Six **live visualizers** (spectrum, waveform, polar, histograms, spatial
   grid, feature radar) show both the image features and the sound being made.
5. The same engine can **render an offline WAV** (numpy synthesis) and can
   **analyze any user-uploaded image** — drop in any EIC frame and hear it.

## 3. Architecture

```
┌──────────────────────────── Frontend (TanStack + React + Three.js) ────────────────────────────┐
│  3D Jukebox (R3F): Earth w/ frame texture · orbiting track discs · particles · bloom            │
│  Player deck: play/pause · tempo/density/brightness/volume/reverb · scale & root selectors      │
│  Visualizers: FFT spectrum · waveform · polar · luminance/hue histograms · 8×8 grid · radar      │
│  Library: 10 EIC track cards · Frame viewer · Feature panel · Analyze (upload) · About          │
│  Audio: WebAudio lookahead scheduler → pad / pluck / bass / hat / shimmer voices → analyser      │
└───────────────┬──────────────────────────────────────────────┬──────────────────────────────────┘
                │ REST /api (Vite proxy in dev)                │
┌───────────────▼──────────────────────────────────────────────▼──────────────────────────────────┐
│  Backend (FastAPI + OpenCV + NumPy)                                                            │
│  vision.py   → 16 feature families from pixels (HSV hist, Canny, gradient, entropy, FFT, k-means)│
│  sonify.py   → features → SonificationParams (root, scale, tempo, density, brightness, pan…)    │
│  synth.py    → offline WAV renderer (additive pad + arp + bass + percussion)                    │
│  frames.py   → procedural EIC-style frames per dataset (stand-ins for SVS frames; upload any)   │
│  datasets.py → catalog of 10 EIC tracks with SVS links, palettes, instruments, recipes          │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Why procedural frames?** SVS videos are large and hotlinking them is
unreliable in a hackathon sandbox. `frames.py` generates deterministic,
dataset-specific synthetic frames (night-light clusters, ocean swirls,
aerosol clouds, CO₂ heat blobs, lightning bolts, canopy texture…) so the
OpenCV pipeline always runs on *real pixels*. Any real EIC frame can be
dropped in via **Analyze → upload** and gets the identical treatment.

## 4. Sonification mapping (the heart of the project)

| Visual feature (OpenCV)        | Audio parameter        | Rationale |
|--------------------------------|------------------------|-----------|
| Dominant hue (HSV histogram)   | Root note / chord      | Color → pitch class (Caldwell 73 method: luminosity + position → pitch) |
| Busyness (log sharpness + gradient energy + edge density + texture) | Tempo + note density | Busy image = busier music, measured on a log scale so smooth gradients and dense city grids both land in a musical range |
| Edge density (Canny)           | Rhythm accents         | Sharp structure = percussive attacks |
| Mean luminance                 | Energy / pad brightness| Bright frame = bright sound |
| Mean saturation                | Filter cutoff / warmth | Saturated = vivid timbre |
| Shannon entropy (luminance)    | Harmonic complexity    | Complex image = richer chords |
| 8×8 spatial luminance grid     | Stereo pan + arp order | Left of frame = left of ear |
| FFT radial profile             | Percussion pattern     | High-freq texture → hats/shimmer |
| Colorfulness (Hasler–Süsstrunk)| Reverb / space         | Vivid = spacious |
| Brightness centroid            | Stereo drift over time | "Where the light is" moves the sound |

Musicality guardrails: everything is quantized to a **scale** (pentatonic,
Dorian, Lydian, Hirajōshi…), chords follow I–IV–V–IV, and envelopes are
shaped so even "noisy" data sounds intentional.

**Busyness (the tempo model).** Raw Canny density is badly distributed for
music (most frames sit under 5%). `sonify.py` therefore composes a `busyness`
score from four log-scaled signals — Laplacian sharpness, Sobel gradient
energy, edge density and local-variance texture — and applies it to each
dataset's base tempo:

```
tempo = clamp(base_tempo × (0.66 + 1.15 × busyness), 44, 168)
```

On the ten demo frames this yields 47 BPM (smooth CO₂ field) through 168 BPM
(ISS lightning), so *the image really does choose the tempo*.

**Measured feature families (vision.py).** HSV mean/std · 32-bin luminance
histogram · 36-bin hue histogram · 16-bin saturation histogram · Canny edge
density · Laplacian sharpness · Sobel gradient mean · local-variance texture
energy · Shannon entropy · Hasler–Süsstrunk colorfulness · 8×8 luminance grid ·
luminance centroid · 8-band FFT radial profile · k-means dominant colors ·
hue peaks.

### Per-track instruments

| Track | Instrument | Scale | Tempo |
|---|---|---|---|
| Night Lights | warm pad + pluck | Major Pentatonic | 72 |
| Ocean Currents | flowing sine arp | Lydian | 96 |
| GEOS Aerosols | noise textures | Dorian | 84 |
| Air Quality | hazy pad | Natural Minor | 68 |
| Perpetual Ocean | deep pulse + arp | Dorian | 88 |
| DYAMOND CO₂ | low drone | Natural Minor | 60 |
| ISS Lightning | percussive strikes | Hirajōshi | 120 |
| Atmospheric River | shimmer | Major Pentatonic | 80 |
| GEDI Forest Height | marimba plucks | Major Pentatonic | 76 |
| Caldwell 73 | deep-space tones | Whole Tone | 64 |

## 5. Tech stack

- **Backend**: Python 3.11, FastAPI, OpenCV (headless), NumPy, Uvicorn.
- **Frontend**: Vite + React 19 + TypeScript, **TanStack Router** (code-based
  routes) + TanStack Query, **Three.js via React Three Fiber + drei +
  postprocessing**, Zustand, Tailwind CSS v4, lucide-react icons.
- **Audio**: WebAudio API (real-time) + NumPy offline WAV renderer.
- **Accessibility**: skip link, ARIA live region announcing track + sound
  description, keyboard-operable controls, high-contrast mode, reduced-motion
  respect, text "recipe" for every track, screen-reader-friendly labels.

## 6. Repo layout

```
PLAN.md  README.md
backend/
  requirements.txt
  app/{main,datasets,vision,sonify,synth,frames}.py
  tests/test_engine.py
frontend/
  package.json  vite.config.ts  index.html
  src/
    main.tsx  router.tsx  index.css
    routes/{__root,index,analyze,about}.tsx
    components/{Jukebox3D,Visualizers,PlayerControls,TrackLibrary,FeaturePanel,FrameViewer}.tsx
    lib/{api,types,datasets}.ts  lib/audio/{engine,scales}.ts  lib/store.ts
```

## 7. How to run

```bash
# backend (terminal 1)
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend (terminal 2)
cd frontend && npm install && npm run dev   # http://localhost:5173
```

The Vite dev server proxies `/api` → `localhost:8000`, so the app works from
any host (including preview iframes) with no CORS/env juggling.

`./dev.sh` starts both. `cd backend && python scripts/render_playlist.py`
renders the curated playlist (frames + WAVs + manifest).

## 8. Milestones

1. ✅ Backend engine: vision → sonify → synth + procedural frames + API.
2. ✅ Frontend shell: router, store, API client, dataset catalog.
3. ✅ 3D jukebox: textured Earth, orbiting discs, bloom, particles.
4. ✅ WebAudio engine + player deck + six visualizers.
5. ✅ Analyze page (upload → OpenCV → play), About page, accessibility pass.
6. ✅ Offline playlist export (`backend/scripts/render_playlist.py` → frames +
   WAVs + `manifest.json`), so the project also ships as a curated playlist.
7. ⏭ Next: real SVS frame ingestion, MIDI export, per-frame animation loops,
   mobile layout refinements.

## 9. Judging-criteria mapping (Space Apps)

- **Impact**: makes Earth science audible & accessible to blind/low-vision
  users; reveals patterns (edges, entropy) the eye misses.
- **Creativity**: a jukebox you orbit; the planet wears the data; every track
  has its own instrument and story.
- **Technology**: real computer vision (OpenCV) driving a real-time synth;
  offline WAV rendering; 3D + data-viz stack.
- **Presentation**: every mapping is documented in-app ("How sight becomes
  sound") with per-track recipes and SVS source links.
