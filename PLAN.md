# PLAN — The Earth Information Jukebox ("Terra Tunes")

## 0. Revision 4 — the staging and engine rewrite (current)

The brief: *"the rain sound is just noise added from outside the engine, which
needs to be redone entirely"*, *"backgrounds behind the jukebox should be
generated images, keep rain and lightning but they lack detail"*, *"the girl
should be an image or multiple images… she should greet me into the site, like a
cut scene"*, *"the disc selection should be a disc shaped button, click to
expand, the disc selected should replace the earth in the juke box top part and
spin"*, *"scrolling down reveals the image/frame/video and full analysis"*, *"the
bars need to be more aligned with the jukebox"*, *"optimised for all screens"*,
*"clean up the jukebox borders"*, *"remove any fake/generated non-NASA data
frame"*.

**1. The engine, rebuilt as physics rather than filters** (`app/synth/models.py`)

The previous version built a filtered-noise bed per measurement cell. Every
phenomenon therefore shared one mechanism, and rain was, exactly as the user
said, noise. Now:

- **rain is an impact train** — ~300 individual droplets per frame, each a short
  resonance (0.6–5 kHz, ~12 ms decay) with its own pitch, gain and stereo
  position, density and pitch taken from cloud brightness and texture;
- **thunder** is a bright crack plus a heavily low-passed rumble whose decay
  follows the cloud's dark mass;
- **wind** is a gust envelope (low-passed noise, squared) driving a turbulence
  generator through a moving band-pass, plus a pressure bed and a thin whistle;
- **fire** is Poisson crackle through damped resonators over a roar whose cutoff
  follows flame area, plus a smoke plume;
- **ocean** is water mass plus swells whose period comes from the measured
  gradient, plus foam hiss;
- **city / canopy** are damped glints and three-partial modal pings;
- **space** is Caldwell's own scan: left to right is time, brightness is pitch,
  y is stereo position;
- every model also reads a frame-relative brightness (`rel`), so a mostly-black
  starfield is not silently mute.

`app/synth/render.py` and `frontend/src/lib/audio/phenomena.ts` were rewritten in
step, block for block: the WAV download and the stream come from one set of
rules. `backend/tests/test_engine.py` (12 tests) enforces that mechanisms differ,
that rain is impacts and not a bed, that fire is spectrally brighter than ocean,
and that a dark frame still sounds.

**2. Staging: a cut scene, a painted world, and a stage that is only the cabinet**

- the site opens on a three-frame **cut scene** (`Intro.tsx`): the girl greets
  you, points at the cabinet, then sits with her headphones on; the page pushes
  in and becomes the running screen;
- her poses are **cut out of painted frames** (`public/art/pose-*-sprite.webp`,
  magenta-keyed and colour-decontaminated with OpenCV), not drawn in SVG;
- the world behind the cabinet is now **six painted backdrops**
  (`world-{meadow,storm,night,aurora,fire,space}.webp`), selected per record,
  with live weather on top: 150 rain streaks with splash rings, multi-branch
  lightning with a procedural bolt path on Poisson timing, drifting cumulus,
  aurora curtains, pollen/ash motes, fireflies;
- the **stage is full-screen and holds only the cabinet**: title column on the
  left, record label top-right, disc button bottom-left, scroll prompt
  bottom-right — nothing overlaps anything at 390 px, 1024 px or 1920 px.

**3. The jukebox as the subject**

- overlays are placed from `geometry.ts`, whose fractions were **measured on the
  cut-out sprite with OpenCV** (HSV/component masks in bounded ROIs, plus a Hough
  pass for the globe) — that is what fixed "buttons completely off";
- the dome now holds **the chosen record**, replacing the Blue Marble and
  spinning while it plays; with the cabinet off the globe returns;
- the analyser fan is drawn along the **arch of the glass** (elliptical
  placement, per-bar rotation) instead of as a circle on top of it;
- the crate is a **disc-shaped button** that expands into the collection;
- the two controls are **brass plates set into the base**: a lever that throws
  and a fader that slides, both with tell-tale lamps.

**4. Scroll reveals the record**

Under the stage: the frame at full width with the 6 × 12 measurement grid drawn
on it (hover a cell for its numbers), the mapping and layer count for that
record, the top measured cells, NASA's frame series for night lights
(2012 / 2023 / change), the credit line, NASA SVS link, WAV download, and the
deck for the full measurement sheet.

**5. No generated data frames**

Data imagery is NASA's, without exception. Illustration is now explicitly
labelled: six backdrops and three character poses were painted for this project,
and the cabinet is the team's own painting. Nothing generated is presented as a
frame of data, and the copy in the app and in `README.md` says so.

## 0b. Revision 2 — what changed and why

The first build used procedurally generated frames and a musical synth layer
(scale, tempo, reverb, "instruments"). That was judged too musical and not
grounded in real resources. Revision 2 removes both:

- **Real imagery only.** Fifteen authentic NASA frames are bundled in
  `backend/app/assets/frames/`, each traced to its SVS/Earth Observatory page
  and credit line (`SOURCES.md`). No drawings, no synthetic frames anywhere.
- **No composition.** The musical layer is deleted. There is no tempo, scale,
  chord, instrument or reverb. A frame is measured row by row and each
  measurement maps to exactly one audio parameter through a fixed linear rule.
- **A real jukebox.** The start screen is a wooden cartridge cabinet with an
  animated record rack, spinning deck and tone arm. Choosing a record flips to
  a listening view of the real frame with a live scan line.
- **Storms, wind and fire** added as first-class records (Hurricane Maria,
  ISS-LIS thunderstorms, GEOS-FP winds, wildfire smoke) alongside the ten
  challenge datasets.

The sections below are the original design; where they conflict, the rules in
this revision (and in `backend/app/scan.py`) are authoritative.

---

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
│  scan.py     → 24 measured latitude bands → tones (no musical mapping layer)                    │
│  synth.py    → offline WAV renderer: one sine per measured tone + measured noise                │
│  frames.py   → loads the real NASA frame assets (no procedural imagery)                          │
│  datasets.py → 13 records: SVS links, source frame, credit, sensor, accessibility text          │
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

### Per-track instruments (revision 4)

| record | model | mechanism |
|---|---|---|
| Night Lights | city | damped glints, 420–1380 Hz, rate from light density, pan from x |
| Ocean Currents, Perpetual Ocean | ocean | water-mass sub bed + swells whose period is the measured gradient + foam hiss |
| GEOS Aerosols, Air Quality, Global CO₂, Atmospheric River | plume | deep transport bed + moving band + sparkle on the sharpest edges |
| Hurricane Maria, Thunderstorms | storm | individual droplet impacts + thunder (crack + rumble) + cloud mass bed |
| Wind | wind | gust envelope → turbulence through a moving band-pass + pressure bed + whistle |
| Wildfire Smoke | fire | Poisson crackle through damped resonators + roar + smoke plume |
| GEDI Forest Height | canopy | three-partial modal pings, rate/pitch from green fraction and texture |
| Caldwell 73 | space | Caldwell's scan: x → time, brightness → pitch, y → stereo |

Every parameter in that table is read from the OpenCV measurement grid; none is
hand-authored, and none is scheduled on a musical grid.

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
