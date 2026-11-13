# Terra Tunes — The Earth Information Jukebox

> NASA Space Apps Challenge 2026 · *The Earth Information Jukebox*

An illustrated jukebox standing in a summer meadow. Throw the brass switch, light
the tubes, pull a disc out of the crate — the disc flies into the cabinet, the
needle drops, and **a real NASA visualization is played back as the sound of the
phenomenon it shows**. Wind gusts because it is filtered air turbulence. Fire
crackles because combustion is a train of impulses. A hurricane arrives with
rain, thunder and lightning strikes.

**Every scientific picture in the app is NASA's.** The thirteen frames are
bundled in `backend/app/assets/frames/`, each with its credit line and SVS link;
the Blue Marble disc (`frontend/public/art/discs/earth.webp`, Apollo 17 frame,
SVS 12564) is NASA's too. Discs, glow and light are drawn in CSS — no stock
photography, no stock video, no generated imagery is used as data anywhere. The
one illustrated asset is `frontend/public/art/jukebox.webp`, the user's own
cabinet painting, which is the start screen and is served untouched.

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

- **Off and on are different states.** Unlit glass, a cold globe and a dim card;
  throwing the switch lights the tubes (with rising bubbles and a level column
  driven by the live analyser), warms the cream card from inside, wakes the
  globe, and throws a warm glow onto the meadow.
- **The discs are discs.** Matt vinyl, concentric grooves, a fixed sheen and a
  hole that never rotates, with each track's NASA frame as the centre label.
  Choosing one lifts it from the crate and *flies it along an arc into the
  cradle* (Web Animations, skipped under reduced motion), then drops the needle.
- **Every control is real**: the brass power frame and the volume thumbwheel are
  the artwork's own corner brackets, the speaker's amber jewel is play/pause,
  and the dome's globe carries a spectrum halo drawn from the analyser.
- **It opens into the deck.** The cabinet flips down into the analysis view:
  the frame with its measured grid, transport, WAV download, the mapping table,
  provenance and the accessibility description of the frame.

## The records

| # | Record | Model | What you hear | Source |
|---|---|---|---|---|
| 01 | Night Lights | city | discrete twinkles, denser over cities | NASA SVS 5313 · Black Marble VIIRS |
| 02 | Ocean Currents | ocean | low surges breathing with the swell | NASA SVS 3912 · ECCO2 |
| 03 | GEOS Aerosols | plume | airy transport beds, sparkle on sharp dust | NASA SVS 5669 · GEOS |
| 04 | Air Quality | plume | denser, heavier transport | NASA SVS 5533 · GEOS-CF |
| 05 | Perpetual Ocean | ocean | surges cut by fast currents | NASA SVS 5425 · ECCO2 |
| 06 | Global CO₂ | plume | a slow, wide swell of air | NASA SVS 5196 · DYAMOND |
| 07 | **Hurricane Maria** | storm | rain, thunder, lightning clicks | NASA/NOAA Earth Observatory |
| 08 | **Thunderstorms** | storm | sparse flashes into dense storm clusters | NASA SVS 5011 · ISS-LIS |
| 09 | **Wind** | wind | band-passed airflow with gusts | NASA SVS 5148 · GEOS-FP |
| 10 | **Wildfire Smoke** | fire | combustion crackle over a low roar | NASA Earth Observatory · MODIS |
| 11 | Atmospheric River | plume | a moisture ribbon of moving air | NASA SVS 4960 · GEOS |
| 12 | GEDI Forest Height | canopy | damped pings, low for tall stands | NASA SVS 4950 · GEDI |
| 13 | Caldwell 73 | space | NASA's published position→pitch scan | NASA SVS 13786 · Hubble |

## How the sound is made

**1 · Measure (shared).** `backend/app/analysis.py` divides a frame into a 6 × 12
grid and measures each cell with OpenCV: brightness, saturation, hue, Laplacian
texture energy, gradient magnitude, and the fraction of hot / green / water /
white / dark pixels, plus whole-frame statistics.

**2 · Synthesize (per phenomenon).** `backend/app/synth/models.py` gives every
record a physical model, not a musical one:

| model | synthesis | grounded in |
|---|---|---|
| wind | band-passed noise; turbulence → centre frequency, gustiness → Q, gust level → amplitude | weather/solar-wind sonifications (York weather station; Alexander, U. Michigan) |
| storm | rain noise 1–6 kHz + low thunder bursts + bright lightning clicks | storm sonifications; cloud brightness → rain density, texture sharpness → strike rate |
| fire | stochastic crackle impulses 1–8 kHz over a 20–200 Hz roar | combustion acoustics; hot-pixel fraction → pop rate |
| ocean | very low resonant surges + gated foam whoosh | *Atmospherics/Weather Works* tide mapping |
| city | short sine glints inside the 400–1400 Hz equal-loudness band | Neuhoff on pitch/loudness interaction |
| canopy | damped resonant pings; height → rate and pitch | resonant-material analogy |
| plume | airy band-passed beds + sparkle from sharp bright pixels | *Artificial Soundscapes* wavetable/air mappings |
| space | NASA's own scan (Caldwell 73): position → time, brightness → pitch | NASA SVS 13786 |

The spec is declarative (`noise` / `tone` / `burst` layers with filter, pan and
envelope), so **the browser and the offline renderer play the same rules**:
`frontend/src/lib/audio/phenomena.ts` synthesises it with Web Audio, and
`backend/app/synth/render.py` renders it with NumPy to a downloadable WAV.

**3 · Check.** Masking and stream segregation are the real failure modes of
parameter-mapped sonification, so the mappings are redundant (wind speed changes
both filter centre and gust level), loudness is never the sole carrier of a
value, and pitch for long listening stays out of the ear's least sensitive
regions.

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
  tests/test_engine.py   11 tests: models differ, renders audible, flat frames flat
frontend/
  src/components/Jukebox.tsx      the cabinet and its overlays
  src/components/DiscCrate.tsx    the record crate
  src/components/VinylDisc.tsx    the disc itself
  src/components/FrameScanner.tsx the measurement view
  src/lib/audio/phenomena.ts      Web Audio synthesis of a spec
  src/lib/audio/mechanism.ts      the machine: switch, transport, needle
  src/lib/discFlight.ts           the disc's arc into the cradle
  src/lib/geometry.ts             OpenCV-measured overlay positions
  src/routes/index.tsx            cabinet + deck
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
cd backend && .venv/bin/python -m pytest -q     # 11 passed
cd frontend && npm run build                    # tsc -b && vite build
ls backend/app/assets/frames/                   # the real NASA frames
```

## Credits

Frames © NASA SVS, NASA Earth Observatory, NASA GMAO, NASA/ESA Hubble. The
Blue Marble disc is NASA's Apollo 17 frame (SVS 12564). Every visualization is
linked from its record inside the app. Built for the NASA Space Apps Challenge
2026 — *The Earth Information Jukebox*.
