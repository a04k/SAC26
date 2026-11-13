# Terra Tunes — The Earth Information Jukebox

> NASA Space Apps Challenge 2026 · *The Earth Information Jukebox*

A hand-painted jukebox standing in a Ghibli meadow. A girl waves you in, points at
the cabinet, and sits down to listen; the page pushes in and becomes the running
screen. Throw the brass switch, and **a real NASA visualization is played back as
the sound of the phenomenon it shows** — with the world behind the cabinet
changing to match the record: a thunderstorm for the storms, an aurora for the
currents, ash for the fires, deep space for Caldwell 73.

Scroll, and the record's own frame comes up with the measurement grid drawn on
it, the mapping the engine used, and — where NASA publishes one — the frame
series, each year measured by the same engine.

**Every scientific picture is NASA's.** The thirteen frames are bundled in
`backend/app/assets/frames/`, each with its credit line and SVS link; the Blue
Marble disc (`frontend/public/art/discs/earth.webp`, Apollo 17 frame, SVS 12564)
is NASA's too. Nothing generated is ever presented as a data frame.

Three kinds of picture are illustration, and are labelled as such: the painted
**backdrops** (`frontend/public/art/world-*.webp`), the **girl** in three poses
(`pose-greet`, `pose-point`, `pose-listen`, cut out from painted frames), and the
cabinet itself, which is the supplied painting cut out of its meadow
(`jukebox-cabinet.webp`).

## Quick start

```bash
./dev.sh            # creates the venv, installs deps, runs both servers
```

or manually:

```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --port 8000          # terminal 1

cd frontend && npm install && npm run dev            # terminal 2 → :5173
```

Vite proxies `/api` to the backend, so no environment variables are needed.

## The cabinet

- **A cut scene opens the site.** The girl greets you, points at the cabinet, and
  sits down with her headphones on; each pose is a hand-painted frame cut out of
  its background, and the page then pushes in and becomes the running screen
  (`frontend/src/components/Intro.tsx`). Skippable, and skipped on
  `prefers-reduced-motion`.
- **The world is the backdrop, and it changes with the record.** Six painted
  scenes — meadow, storm, night, aurora, fire, deep space — with live weather on
  top: rain as individual streaks with splash rings, multi-branch lightning on
  Poisson timing, drifting cumulus, aurora curtains, pollen, ash, fireflies and
  the cabinet's own light spilling onto the grass.
- **Off and on are different states.** Unlit glass, a cold dome and a dim card;
  throwing the switch lights the tubes (rising bubbles and a level column driven
  by the live analyser), warms the card, spins the record in the dome, and throws
  a warm glow onto the meadow.
- **The dome holds the record.** Pick a disc and it takes the globe's place in the
  dome and turns while it plays; with the cabinet off, NASA's Blue Marble sits
  there instead. The analyser fan is drawn along the arch of the glass, not as a
  circle dropped on top of it.
- **The crate is a disc.** Collapsed it is one record that spins; click it and the
  whole collection fans out as real discs with NASA labels. Choosing one flies it
  into the cabinet, then drops the needle.
- **Every control is real**: brass power lever, brass volume fader, the speaker's
  amber jewel as play/pause, and the "TERRA TUNES" plate as the label.
- **Scrolling reveals the record.** Under the stage: the real frame with its 6 × 12
  measurement grid drawn on it, the mapping and layer count for that record, its
  frame series (night lights 2012, 2023, and the change), the credit line, WAV
  download, and the scanner for your own frames.

All overlay geometry lives in `frontend/src/lib/geometry.ts` as fractions of the
cut-out sprite, measured from the artwork itself with OpenCV, so the glass, card,
speaker and controls stay aligned at any viewport width.

## The records

| # | Record | Model | What you hear | Source |
|---|---|---|---|---|
| 01 | Night Lights | city | discrete twinkles, denser over cities | NASA SVS 5313 · Black Marble VIIRS |
| 02 | Ocean Currents | ocean | low surges breathing with the swell | NASA SVS 3912 · ECCO2 |
| 03 | GEOS Aerosols | plume | airy transport beds, sparkle on sharp dust | NASA SVS 5669 · GEOS |
| 04 | Air Quality | plume | denser, heavier transport | NASA SVS 5533 · GEOS-CF |
| 05 | Perpetual Ocean | ocean | surges cut by fast currents | NASA SVS 5425 · ECCO2 |
| 06 | Global CO₂ | plume | a slow, wide swell of air | NASA SVS 5196 · DYAMOND |
| 07 | **Hurricane Maria** | storm | 300+ individual raindrops, thunder, lightning | NASA/NOAA Earth Observatory |
| 08 | **Thunderstorms** | storm | sparse flashes into dense storm clusters | NASA SVS 5011 · ISS-LIS |
| 09 | **Wind** | wind | gusts through a moving band-pass, plus a pressure bed | NASA SVS 5148 · GEOS-FP |
| 10 | **Wildfire Smoke** | fire | combustion crackle (300+ hits) over a low roar | NASA Earth Observatory · MODIS |
| 11 | Atmospheric River | plume | a moisture ribbon of moving air | NASA SVS 4960 · GEOS |
| 12 | GEDI Forest Height | canopy | damped pings, low for tall stands | NASA SVS 4950 · GEDI |
| 13 | Caldwell 73 | space | NASA's published position→pitch scan | NASA SVS 13786 · Hubble |

## How the sound is made

There is no shared oscillators-and-filters patch: each record runs a **different
physical model**. The backend builds the model from OpenCV measurements and
returns a declarative spec; the browser rebuilds the same mechanism with WebAudio,
and `render.py` renders the same spec with NumPy for the WAV download.

| Model | Mechanism |
|---|---|
| wind | gust envelope from low-passed noise driving a turbulence generator through a moving band-pass, plus a pressure bed and a thin whistle |
| storm | thousands of individual droplet impacts (resonators, 0.6–5 kHz, ~12 ms, each with its own pan) plus thunder (bright crack, long filtered rumble) |
| fire | crackle as Poisson impulses through damped resonators (1–8 kHz) over a roar whose cutoff follows flame area, plus a smoke plume |
| ocean | sub-bass water mass, band-passed swells whose period comes from the frame's gradient, foam hiss |
| city | damped glints, rate from light density, pitch 420–1380 Hz, pan from x |
| canopy | three-partial modal pings, rate and pitch from green fraction and texture |
| plume | deep transport bed plus sparkle from the sharpest edges |
| space | Caldwell's method: left to right is time, brightness is pitch, y is stereo position |

Two rules hold everywhere: **nothing is scheduled in a musical grid** (no tempo,
scale, chord or reverb), and **every parameter comes from a measurement**. Tests in
`backend/tests/test_engine.py` enforce that the models differ in mechanism, that
rain is impacts rather than a noise bed, that a dark starfield is still audible,
and that a flat frame cannot invent variation.

## Reading the measurement grid

`FrameScanner` lays the real grid over the untouched NASA frame. Toggle it to
show either **the model's own input** (wind → turbulence, fire → hot fraction,
storm → cloud fraction, ocean → water fraction) or **the live level** of the
layer playing right now. Hover any cell to read the exact numbers the synth
consumed. There is no scan line: the picture's content drives the model, it is
not swept.

## Project layout

```
backend/
  app/analysis.py        OpenCV measurement grid (shared by every model)
  app/synth/models.py    eight physical models → declarative specs
  app/synth/render.py    the same specs rendered to stereo WAV with NumPy
  app/datasets.py        thirteen records with provenance and models
  app/frames.py          the bundled NASA frames (+ cached WebP encoding)
  app/main.py            FastAPI: catalog, frames, specs, renders, /api/analyze
  app/assets/frames/     the real NASA frames + SOURCES.md
  scripts/render_playlist.py   offline frames + specs + WAVs for the whole catalog
  tests/test_engine.py   12 tests: mechanisms differ, rain is impacts, starfield audible
frontend/public/art/
  jukebox-cabinet.webp    the supplied painting, cut out of its meadow (742×869)
  world-*.webp            six painted backdrops: meadow, storm, night, aurora, fire, space
  pose-*-sprite.webp      the girl in three poses, cut out for the cut scene and the stage
  discs/earth.webp        NASA Blue Marble, for the dome and the logo
frontend/
  src/components/Intro.tsx        the opening cut scene
  src/components/World.tsx        backdrops + live weather (rain, lightning, aurora, motes)
  src/components/Cabinet.tsx      the cabinet and every overlay on it
  src/components/Girl.tsx         the girl on the stage (procedural, for weather + audio)
  src/components/DiscSelector.tsx the disc that opens into the crate
  src/components/NowPlaying.tsx   the frame, the grid, the mapping, the series
  src/components/FrameScanner.tsx the measurement view, cell by cell
  src/components/VinylDisc.tsx    the disc itself
  src/lib/audio/phenomena.ts      Web Audio synthesis of a spec
  src/lib/audio/mechanism.ts      the machine: switch, transport, needle
  src/lib/discFlight.ts           the disc's arc into the cradle
  src/lib/geometry.ts             OpenCV-measured overlay positions
  src/routes/index.tsx            cut scene, stage, scroll reveal, deck
  src/routes/scan-frame.tsx       read any frame with any model
  src/routes/about.tsx            the method
```

## API

| endpoint | returns |
|---|---|
| `GET /api/health` | status, dataset count, model list |
| `GET /api/datasets` | the 13 records with provenance and model |
| `GET /api/datasets/{id}/frame.webp` | the frame, display-sized and cached |
| `GET /api/datasets/{id}/frame.png` | the frame, full quality |
| `GET /api/datasets/{id}/spec` | measured grid + synthesis spec |
| `GET /api/datasets/{id}/render.wav` | the offline render of that spec |
| `POST /api/analyze?model=wind` | measure any uploaded frame with any model |

## Accessibility

Every control is a real button, slider or switch with a label and focus ring;
state changes are announced through an `aria-live` region; the cabinet has a
high-contrast mode, a reduced-motion mode (which also disables the disc flight
and the bubbling tubes), and a **mechanism mute** so the machine's own sounds can
be silenced without silencing the sonification. Every record carries a written
description of its frame for users who cannot see it.

## Tests

```bash
cd backend && .venv/bin/python -m pytest -q     # 12 passed
cd frontend && npm run build                    # tsc -b && vite build
ls backend/app/assets/frames/                   # the real NASA frames
```

## Credits

Data frames © NASA SVS, NASA Earth Observatory, NASA GMAO, NASA/ESA Hubble. The
Blue Marble disc is NASA's Apollo 17 frame (SVS 12564). Every visualization is
linked from its record inside the app.

Illustration, credited as illustration and never used as data: the cabinet is the
team's own painting; the six backdrops and the girl's three poses were painted for
this project. Built for the NASA Space Apps Challenge 2026 — *The Earth
Information Jukebox*.
