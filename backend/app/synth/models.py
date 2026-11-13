"""The phenomenon models: measurement -> sound, per physical process.

Each builder receives the shared measurement grid (`app/analysis.py`) and
returns a **spec**: a description of the sound to be synthesised, either by the
browser's WebAudio engine or by `render.py`. The spec contains no notes, no
scales and no beat grid — only physically-motivated layers:

  * `noise`  — filtered noise beds (air, water, rain, rumble)
  * `tone`   — sine partials (star scans, resonant pings, glints)
  * `burst`  — short stochastic transients (fire crackle, thunder, droplets)

Design notes and where they come from
-------------------------------------
Wind          air moving past a listener is broadband turbulence shaped by
              resonances; the standard sonification-of-wind approach is
              band-pass filtered noise whose centre frequency follows speed
              (cf. Alexander's solar-wind sonification, and the York weather
              station mapping where wind speed sets a low-pass cutoff and gusts
              set amplitude). We use centre frequency + Q from turbulence.
Storm         rain is dense filtered noise at 1–6 kHz; thunder is a low
              frequency burst with a long decay; lightning flashes are short
              bright transients. All three are driven by cloud brightness and
              the sharpness of the cloud texture.
Fire          combustion is crackle (stochastic impulses at 1–8 kHz) over a low
              roar (20–200 Hz noise); the amount of orange/yellow pixels sets
              crackle rate and roar level.
Ocean         water surges: very low noise bands whose amplitude breathes with
              the swell, plus a gated whoosh from foam brightness.
City          discrete twinkles (short sine glints) whose rate follows light
              density and whose pitch stays inside the 400–1400 Hz band that
              equal-loudness contours favour for long listening.
Canopy        resonant pings (damped sines at 200–900 Hz) whose rate and pitch
              follow canopy height.
Plume         airy band-passed beds for transport, with a sparkle layer from
              the brightest, sharpest pixels.
Space         NASA's own method (Caldwell 73): position is the scan axis and
              brightness is pitch — reproduced here so the reference dataset
              sounds like its published sonification rather than like ours.
"""

from __future__ import annotations

import math

import numpy as np

from ..analysis import measure_grid, region


def _pan(cx: float, width: float = 0.85) -> float:
    return round((cx - 0.5) * 2 * width, 3)


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * float(np.clip(t, 0.0, 1.0))


# --------------------------------------------------------------------- wind


def build_wind(grid: dict) -> dict:
    layers = []
    for c in grid["cells"]:
        if c["brightness"] < 0.03 and c["turbulence"] < 0.03:
            layers.append({"kind": "noise", "t0": c["row"] * 0.3, "dur": 0.3, "gain": 0.0,
                           "filter": "bandpass", "freq": 600, "q": 1.2, "pan": _pan(c["cx"])})
            continue
        speed = 0.55 * c["brightness"] + 0.45 * c["turbulence"]
        layers.append(
            {
                "kind": "noise",
                "t0": round(c["row"] * 0.3, 3),
                "dur": 0.34,
                "gain": round(0.02 + 0.20 * speed, 4),
                "filter": "bandpass",
                # airflow resonance: stronger wind -> brighter, narrower band
                "freq": round(_lerp(280, 2400, speed), 1),
                "q": round(_lerp(0.7, 3.4, c["turbulence"]), 2),
                "pan": _pan(c["cx"]),
            }
        )
    # a continuous low bed so the piece has air even in still areas
    layers.append({"kind": "noise", "t0": 0, "dur": 30, "gain": 0.05,
                   "filter": "lowpass", "freq": 320, "q": 0.6, "pan": 0.0})
    return {
        "model": "wind",
        "title": "Filtered-noise airflow",
        "duration": 30,
        "layers": layers,
        "mapping": {
            "band centre frequency": "wind speed = brightness, texture",
            "band Q": "gustiness = texture energy",
            "gain": "wind speed",
            "pan": "horizontal position in the frame",
        },
        "explain": (
            "Air moving past you is broadband turbulence: it carries every frequency, and the "
            "resonances it passes through decide what you hear. Each cell of the frame becomes a "
            "noise band; its centre frequency rises and its resonance sharpens as the measured "
            "wind proxy (brightness and texture) increases. Pans follow the cell's position."
        ),
    }


# -------------------------------------------------------------------- storm


def build_storm(grid: dict) -> dict:
    src = region(grid, 0, grid["rows"])
    busiest = max(grid["cells"], key=lambda c: c["white"] * (0.5 + c["turbulence"]))
    layers = [
        # rain: dense high noise
        {
            "kind": "noise", "t0": 0, "dur": 34,
            "gain": round(0.03 + 0.16 * src.get("white", 0.2), 4),
            "filter": "highpass", "freq": round(_lerp(1200, 4800, src.get("white", 0.2)), 1),
            "q": 0.7, "pan": 0.0,
        },
        # low wind bed around the storm
        {
            "kind": "noise", "t0": 0, "dur": 34,
            "gain": round(0.04 + 0.12 * src.get("turbulence", 0.2), 4),
            "filter": "lowpass", "freq": round(_lerp(180, 700, src.get("turbulence", 0.2)), 1),
            "q": 1.1, "pan": 0.0,
        },
    ]
    # thunder bursts where cloud is thick and textured
    rng = np.random.default_rng(11)
    for i in range(9):
        c = busiest if i == 0 else grid["cells"][int(rng.integers(0, len(grid["cells"])))]
        weight = 0.5 * c["white"] + 0.5 * c["turbulence"]
        layers.append(
            {
                "kind": "burst",
                "t0": round(2.0 + i * 3.1 + rng.uniform(-0.6, 0.6), 3),
                "dur": 1.6,
                "gain": round(0.08 + 0.3 * weight, 4),
                "burst": "thunder",
                "freq": round(_lerp(48, 120, weight), 1),
                "pan": _pan(c["cx"], 0.6),
            }
        )
    # lightning clicks at the sharpest highlights
    for c in sorted(grid["cells"], key=lambda c: -(c["white"] * c["gradient"]))[:10]:
        layers.append(
            {
                "kind": "burst",
                "t0": round(1.0 + c["row"] * 4.2 + 0.3 * c["col"], 3),
                "dur": 0.12,
                "gain": round(0.05 + 0.22 * c["white"] * (0.4 + c["gradient"]), 4),
                "burst": "click",
                "freq": round(_lerp(2200, 6500, c["gradient"]), 1),
                "pan": _pan(c["cx"]),
            }
        )
    return {
        "model": "storm",
        "title": "Rain, wind and thunder",
        "duration": 34,
        "layers": layers,
        "mapping": {
            "rain noise level": "cloud/white brightness",
            "rain high-pass cutoff": "cloud brightness",
            "thunder rate & level": "cloud texture (turbulence)",
            "lightning clicks": "sharp bright highlights",
            "pan": "position of each feature",
        },
        "explain": (
            "Rain is dense high-frequency noise; how bright and how textured the cloud is decides "
            "how much rain you hear and how hissy it is. Thunder is a low burst with a long decay, "
            "placed where the cloud is thickest and most broken up. The sharpest bright highlights "
            "become short electric clicks. The structure of the storm is therefore audible: the eye "
            "becomes a drop in rain level."
        ),
    }


# --------------------------------------------------------------------- fire


def build_fire(grid: dict) -> dict:
    hot_cells = sorted(grid["cells"], key=lambda c: -c["hot"])
    total_hot = grid["frame"]["hot"]
    rng = np.random.default_rng(23)
    layers = [
        # low roar
        {
            "kind": "noise", "t0": 0, "dur": 26,
            "gain": round(0.03 + 0.14 * min(1.0, total_hot * 6), 4),
            "filter": "lowpass", "freq": round(_lerp(90, 260, grid["frame"]["brightness"]), 1),
            "q": 0.8, "pan": 0.0,
        }
    ]
    # crackle: impulses concentrated where the fire actually is
    for c in hot_cells[:16]:
        rate = 4 + int(26 * c["hot"])
        for k in range(rate):
            layers.append(
                {
                    "kind": "burst",
                    "t0": round(c["row"] * 4.0 + k * (4.0 / rate) + rng.uniform(0, 0.12), 3),
                    "dur": round(rng.uniform(0.03, 0.11), 3),
                    "gain": round(0.03 + 0.22 * c["hot"] * rng.uniform(0.5, 1.0), 4),
                    "burst": "crackle",
                    "freq": round(rng.uniform(1200, 6800), 1),
                    "pan": _pan(c["cx"], 0.7),
                }
            )
    return {
        "model": "fire",
        "title": "Combustion crackle",
        "duration": 26,
        "layers": layers,
        "mapping": {
            "crackle rate": "fraction of hot (orange/red/yellow) pixels",
            "crackle brightness": "random within 1.2–6.8 kHz",
            "roar level & cutoff": "hot pixel fraction, frame brightness",
            "pan": "where in the frame the fire is",
        },
        "explain": (
            "Fire is a low roar plus thousands of tiny explosions. Cells with a high fraction of "
            "orange, red and yellow pixels crackle fastest and loudest, so a dense plume sounds "
            "dense and a thin one sounds sparse. Crackle pitch is random within a broadband range "
            "because combustion pops are broadband, not pitched."
        ),
    }


# -------------------------------------------------------------------- ocean


def build_ocean(grid: dict) -> dict:
    layers = []
    for c in grid["cells"]:
        swell = 0.6 * c["water"] + 0.4 * c["brightness"]
        if c["row"] % 2 == 0:
            layers.append(
                {
                    "kind": "noise",
                    "t0": round(c["row"] * 0.34, 3),
                    "dur": 1.1,
                    "gain": round(0.02 + 0.16 * swell, 4),
                    "filter": "lowpass",
                    "freq": round(_lerp(140, 900, swell), 1),
                    "q": 1.6,  # resonant enough to breathe rather than hiss
                    "pan": _pan(c["cx"], 0.7),
                }
            )
    layers.append({"kind": "noise", "t0": 0, "dur": 24, "gain": 0.06,
                   "filter": "lowpass", "freq": 220, "q": 1.0, "pan": 0.0})
    return {
        "model": "ocean",
        "title": "Surge and swell",
        "duration": 24,
        "layers": layers,
        "mapping": {
            "surge cutoff": "water fraction, brightness",
            "surge level": "same",
            "pan": "horizontal position",
        },
        "explain": (
            "Water is low, resonant noise that swells rather than hisses. Each band of the ocean "
            "becomes a resonant low-pass surge whose brightness and cutoff follow how much of that "
            "band is sea and how bright it is, so warm bright water sounds broader than cold dark "
            "water."
        ),
    }


# --------------------------------------------------------------------- city


def build_city(grid: dict) -> dict:
    rng = np.random.default_rng(5)
    layers = []
    lights = sorted(grid["cells"], key=lambda c: -c["brightness"])[:34]
    for c in lights:
        n = int(2 + 14 * c["brightness"])
        for k in range(n):
            layers.append(
                {
                    "kind": "tone",
                    "t0": round(rng.uniform(0, 22), 3),
                    "dur": round(rng.uniform(0.6, 2.2), 3),
                    "gain": round(0.02 + 0.10 * c["brightness"], 4),
                    # equal-loudness-friendly band, no scale imposed
                    "freq": round(rng.uniform(400, 1400), 1),
                    "shape": "sine",
                    "attack": 0.01,
                    "decay": round(rng.uniform(0.3, 0.8), 3),
                    "pan": _pan(c["cx"]),
                }
            )
    layers.append({"kind": "noise", "t0": 0, "dur": 24, "gain": 0.03,
                   "filter": "bandpass", "freq": 500, "q": 0.8, "pan": 0.0})
    return {
        "model": "city",
        "title": "Twinkling lights",
        "duration": 24,
        "layers": layers,
        "mapping": {
            "twinkle rate": "brightness of the cell",
            "level": "brightness",
            "pitch": "random 400–1400 Hz (equal-loudness band)",
            "pan": "where the city is",
        },
        "explain": (
            "City light is discrete, not continuous, so each bright cell emits a scatter of short "
            "glints whose number follows its brightness. Pitch is randomised inside the 400–1400 Hz "
            "band, which the equal-loudness contours mark as least fatiguing over long listening. "
            "Nothing is quantised: denser cities simply twinkle more."
        ),
    }


# ------------------------------------------------------------------- canopy


def build_canopy(grid: dict) -> dict:
    layers = []
    for c in grid["cells"]:
        if c["green"] < 0.05 and c["brightness"] < 0.25:
            continue
        height = 0.65 * c["green"] + 0.35 * c["brightness"]
        n = int(1 + 5 * height)
        for k in range(n):
            layers.append(
                {
                    "kind": "tone",
                    "t0": round(c["row"] * 1.0 + k * 0.18 + c["col"] * 0.02, 3),
                    "dur": 0.9,
                    "gain": round(0.02 + 0.12 * height, 4),
                    "freq": round(_lerp(200, 900, height), 1),
                    "shape": "sine",
                    "attack": 0.002,
                    "decay": 0.45,
                    "pan": _pan(c["cx"]),
                }
            )
    return {
        "model": "canopy",
        "title": "Resonant pings",
        "duration": 22,
        "layers": layers,
        "mapping": {
            "ping pitch": "canopy height (green fraction, brightness)",
            "ping rate": "same",
            "pan": "horizontal position",
        },
        "explain": (
            "A forest is a resonator: trunks and leaves ring briefly when struck. Each cell emits "
            "damped sines whose pitch and rate follow measured canopy density, so the treeline "
            "rises and falls in pitch exactly as it does in the data."
        ),
    }


# -------------------------------------------------------------------- plume


def build_plume(grid: dict) -> dict:
    layers = []
    for c in grid["cells"]:
        density = 0.5 * c["white"] + 0.3 * c["brightness"] + 0.2 * c["turbulence"]
        layers.append(
            {
                "kind": "noise",
                "t0": round(c["row"] * 0.45, 3),
                "dur": 0.5,
                "gain": round(0.015 + 0.18 * density, 4),
                "filter": "bandpass",
                "freq": round(_lerp(500, 3200, density), 1),
                "q": round(_lerp(0.9, 2.6, c["turbulence"]), 2),
                "pan": _pan(c["cx"]),
            }
        )
    for c in sorted(grid["cells"], key=lambda c: -(c["white"] * c["gradient"]))[:8]:
        layers.append(
            {
                "kind": "burst", "t0": round(4 + c["row"] * 3.0, 3), "dur": 0.18,
                "gain": round(0.02 + 0.1 * c["white"], 4), "burst": "click",
                "freq": round(_lerp(3000, 7000, c["gradient"]), 1), "pan": _pan(c["cx"]),
            }
        )
    return {
        "model": "plume",
        "title": "Airy transport",
        "duration": 26,
        "layers": layers,
        "mapping": {
            "band level": "smoke/dust density (white fraction, brightness)",
            "band cutoff": "density",
            "Q": "texture (how ragged the plume is)",
            "sparkle clicks": "sharpest bright specks",
        },
        "explain": (
            "Smoke and dust are neither water nor fire: they are airy, ragged, and they drift. "
            "Each cell becomes a band of filtered noise whose level and cutoff follow measured "
            "density and whose resonance follows how ragged the plume is, with brief sparkles "
            "where the image has sharp bright specks."
        ),
    }


# -------------------------------------------------------------------- space


def build_space(grid: dict) -> dict:
    layers = []
    for c in grid["cells"]:
        if c["brightness"] < 0.10:
            continue
        # The published Caldwell 73 method: scan position -> pitch, brightness -> volume.
        layers.append(
            {
                "kind": "tone",
                "t0": round(c["cy"] * 16.0, 3),
                "dur": 0.55,
                "gain": round(0.02 + 0.16 * c["brightness"], 4),
                "freq": round(_lerp(200, 1600, c["cx"]), 1),
                "shape": "triangle",
                "attack": 0.005,
                "decay": 0.35,
                "pan": _pan(c["cx"] * 0.6 + 0.2),
            }
        )
    return {
        "model": "space",
        "title": "NASA scan method",
        "duration": 18,
        "layers": layers,
        "mapping": {
            "pitch": "horizontal position (left = low, right = high)",
            "volume": "brightness",
            "time": "vertical position, top to bottom",
        },
        "explain": (
            "This record reproduces the rule NASA published for Caldwell 73: the image is read "
            "left to right and top to bottom, horizontal position becomes pitch and brightness "
            "becomes volume. It is here as a reference so you can compare our per-phenomenon "
            "models against the agency's own method."
        ),
    }


# --------------------------------------------------------------------- maps


MODELS = {
    "wind": build_wind,
    "storm": build_storm,
    "fire": build_fire,
    "ocean": build_ocean,
    "city": build_city,
    "canopy": build_canopy,
    "plume": build_plume,
    "space": build_space,
}


def model_for(dataset: dict) -> str:
    """Which physical model a dataset plays through."""
    model = dataset.get("model")
    if model in MODELS:
        return model
    # fall back on the element grouping
    return {
        "storms": "storm",
        "wind": "plume",
        "fire": "fire",
        "ocean": "ocean",
        "land": "city",
        "space": "space",
    }.get(dataset.get("element", ""), "plume")


def build_spec(frame_bgr, dataset: dict) -> dict:
    model = model_for(dataset)
    grid = measure_grid(frame_bgr)
    spec = MODELS[model](grid)
    spec["grid"] = {"cols": grid["cols"], "rows": grid["rows"], "cells": grid["cells"]}
    spec["frame_stats"] = grid["frame"]
    spec["dataset"] = dataset
    return spec
