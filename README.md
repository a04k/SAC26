# Terra Jukebox — The Earth Information Jukebox

> NASA Space Apps Challenge 2026 · *The Earth Information Jukebox*
> An interactive 3D jukebox that translates NASA Earth Information Center
> (EIC) visualizations into sound — in real time.

**Terra Jukebox** pairs ten real EIC datasets (Night Lights, Ocean Currents,
GEOS Aerosols, DYAMOND CO₂, ISS Lightning, GEDI Forest Height, Caldwell 73…)
with dynamic sonifications. A Python/OpenCV engine reads the pixels of each
visual frame — color, edges, density, spatial layout — and converts them
into musical parameters. A WebAudio synth plays them live while a 3D Earth
wears the frame as its texture. Upload any image and hear *it*, too.

## Quick start

```bash
# one command (creates the venv, installs deps, runs both servers)
./dev.sh

# or manually:
# 1) Backend — vision + sonification engine (terminal 1)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# API docs: http://localhost:8000/docs

# 2) Frontend — TanStack + React + Three.js (terminal 2)
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

The frontend proxies `/api` to the backend, so no environment variables are
needed. (Set `VITE_API_URL` only if you deploy the API separately.)

## What you can do

- **Orbit the jukebox** — click a glowing disc to load a track; drag to
  orbit, scroll to zoom.
- **Play the planet** — the synth sonifies the selected frame live; tweak
  tempo, density, brightness, scale, root, reverb, volume.
- **Watch the translation** — six visualizers show the FFT, waveform, polar
  view, luminance/hue histograms, the 8×8 spatial grid and a feature radar.
- **Read the recipe** — every track documents exactly which visual feature
  drives which sound, with its SVS source link.
- **Analyze your own frame** — upload any image (e.g. a real EIC frame) and
  the OpenCV engine measures color, edges, gradient energy, entropy, texture,
  FFT content and spatial layout, then sonifies it.
- **Navigate by keyboard** — Space plays/pauses, ←/→ change tracks, sliders
  are arrow-key operable.
- **Download the sound** — each track renders to a 16-second stereo WAV
  server-side (and `backend/scripts/render_playlist.py` renders the whole
  playlist: frames, WAVs and a `manifest.json`).

## Accessibility

Screen-reader announcements for track changes and sound descriptions,
keyboard-operable controls, high-contrast mode, reduced-motion support, and
plain-language "recipes" for every track.

## Docs

- [`PLAN.md`](./PLAN.md) — full design: challenge analysis, architecture,
  sonification mapping table, milestones, judging-criteria mapping.
- Backend API: `http://localhost:8000/docs` (FastAPI/Swagger).

## License / credits

Built for the 2026 NASA Space Apps Challenge. EIC visualizations and SVS
identifiers referenced from [spaceappschallenge.org](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/).
Procedural frames are stand-ins generated in `backend/app/frames.py`; swap in
real SVS frames via the Analyze page.
