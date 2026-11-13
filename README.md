# Terra Jukebox — The Earth Information Jukebox

> NASA Space Apps Challenge 2026 · *The Earth Information Jukebox*

A cartridge jukebox for the planet. Pick a record — a hurricane, a thunderstorm,
the wind, a wildfire, an ocean current, a city at night — and the needle reads
the **real NASA frame** row by row, turning measured pixel values into sound.

**Nothing here is composed.** There is no tempo grid, no musical scale, no chord
progression, no reverb, and no synthetic imagery. Pitch is brightness, loudness
is brightness × edge density, grit is measured texture, and stereo position is
measured hue. If the number changes, the sound changes.

## Quick start

```bash
./dev.sh            # creates the venv, installs deps, runs both servers
```

Or manually:

```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --port 8000          # terminal 1

cd frontend && npm install && npm run dev            # terminal 2 → :5173
```

The Vite dev server proxies `/api` to the backend, so no environment variables
are needed.

## The records

| # | Record | What you hear | Source |
|---|---|---|---|
| 01 | Night Lights | a decade of cities brightening | NASA SVS 5313 · Black Marble VIIRS |
| 02 | Ocean Currents | warm seas high, polar seas low | NASA SVS 3912 · ECCO2 |
| 03 | GEOS Aerosols | dust and smoke, panned by colour | NASA SVS 5669 · GEOS |
| 04 | Air Quality | a narrow, heavy CO band | NASA SVS 5533 · GEOS-CF |
| 05 | Perpetual Ocean | quiet ocean cut by fast currents | NASA SVS 5425 · ECCO2 |
| 06 | Global CO₂ | a slow swell | NASA SVS 5196 · DYAMOND |
| 07 | **Hurricane Maria** | the eye falls silent mid-storm | NASA/NOAA Earth Observatory |
| 08 | **Thunderstorms** | sparse flashes to dense storm clusters | NASA SVS 5011 · ISS-LIS |
| 09 | **Wind** | wind filaments as bright, gritty rows | NASA SVS 5148 · GEOS-FP |
| 10 | **Wildfire Smoke** | plumes traced as loud noisy bands | NASA Earth Observatory · MODIS |
| 11 | Atmospheric River | a moisture ribbon | NASA SVS 4960 · GEOS |
| 12 | GEDI Forest Height | canopy height as pitch | NASA SVS 4950 · GEDI |
| 13 | Caldwell 73 | NASA's own star-scan method | NASA SVS 13786 · Hubble |

Every track ships its credit line, sensor, exact source frame and SVS link in
the app; `backend/app/assets/frames/SOURCES.md` lists them all.

## How the sound is made

1. **Split** the frame into 24 horizontal bands (90°N → 90°S on map products).
2. **Measure** each band with OpenCV: brightness, saturation, mean hue, Canny
   edge density, Laplacian texture energy, and four sampled columns.
3. **Normalise** brightness against that frame's own 2nd–98th percentile, so a
   pale map and a night map stay comparable.
4. **Map** with fixed linear rules: pitch = 110 Hz × 2^(n/12) for n = 0…30;
   amplitude = brightness × density; pan = hue; noise = texture.
5. **Play** one pass north → south (24 s), with each band's four sampled
   columns as four short notes — the melody is four pixel values read left to
   right.

For Night Lights, 2012 → 2023 are separate real frames, so the series is played
as three sustained tones (2012, 2023 average, and the change frame).

## What's in the box

- **Jukebox cabinet start screen** — wooden cabinet, chrome trim, animated
  record rack, spinning deck, tone arm, speaker grille. Click a record or press
  its number.
- **Listening view** — the real frame with the live scan line, the band the
  needle is reading, transport, per-band measurement table, pitch trace, live
  output spectrum and waveform.
- **Scan a frame** — upload any image (or pick a bundled NASA frame) and hear it.
- **The method** — the full mapping table, what is deliberately *absent* from
  the signal path, and the accessibility statement.
- **Offline render** — `backend/scripts/render_playlist.py` writes every frame,
  its measured scan JSON and a 44.1 kHz stereo WAV.

## Accessibility

Every record has a written description of both the image and its sound, read
into an ARIA live region; the transport is keyboard operable (Space, ←/→,
1–9 to load a record by number); high-contrast and reduced-motion modes are in
the header; and all decorative cabinet chrome is hidden from assistive
technology.

## Credits

Frames © NASA Scientific Visualization Studio, NASA Earth Observatory, NASA
GMAO, NASA/ESA Hubble. Per-track credit lines are shown in the app.
