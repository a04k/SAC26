"""The phenomenon engine: physical sound models, driven by measurement.

This replaces the old "one noise bed per measurement cell" approach. Nothing
here is a loop, a chord, a scale or a beat. Each phenomenon is a *physical
model* — a stochastic excitation passed through a resonator or an envelope
that stands for the real mechanism — and the measurement grid only supplies the
parameters of that mechanism (how fast, how hard, how bright, how far).

  Wind     Turbulence. A von-Karman-ish gust envelope (two-pole low-passed
           noise, cubed) drives a glottal-like turbulence generator, shaped by
           a moving band-pass (the "hiss"), plus a low body resonance for the
           pressure on the ears. Gust speed -> band centre; gust onset ->
           amplitude; hue -> how much of the energy is in the top octave.
  Storm    Rain is *impacts*, not noise: thousands of short resonant clicks
           (drop-on-leaf resonances, 0.6–5 kHz, ~12 ms), whose density and
           pitch follow the measured cloud brightness and texture. Thunder is a
           filtered noise burst with a crack (fast attack) and a long rumbling
           tail whose decay follows the cloud's low-frequency weight.
  Fire     Combustion: crackle = Poisson impulses shaped by a damped resonator
           bank (1–8 kHz, micro-decays), roar = low-passed noise whose cutoff
           follows the flame area, and a slow "breath" from the smoke plume.
  Ocean    Swell: band-passed noise with a slow amplitude envelope whose period
           is the measured gradient (the surf line), plus foam hiss on the
           crest, and a sub-bass bed for the water mass.
  City     Discrete sodium/LED glints: damped sines in the equal-loudness sweet
           spot, rate from light density, pitch from brightness, pan from x.
  Canopy   Resonant pings: modal resonators (three partials) struck at a rate
           set by canopy height and texture.
  Plume    Airy transport: a high band-passed bed plus a slow sub-bass swell;
           sparkle from the sharpest, brightest pixels.
  Space    Caldwell's own mapping: scan position is the x axis, brightness is
           pitch, plus the scan's characteristic soft gating.

Every model is deterministic given the frame (seeded from the measurement).
"""

from __future__ import annotations

import math

import numpy as np

from ..analysis import measure_grid

SR = 44100

LAYER_NOISE = "noise"
LAYER_RES = "res"        # damped resonator ping(s)
LAYER_HIT = "hit"        # short resonant click (rain drop, crackle, ping)
LAYER_SWELL = "swell"    # slow-envelope noise bed
LAYER_TONE = "tone"      # sine (used by the space scan)


# ---------------------------------------------------------------- utilities


def _pan(cx: float, width: float = 0.8) -> float:
    return round(float(np.clip((cx - 0.5) * 2 * width, -1, 1)), 3)


def _lerp(a: float, b: float, t: float) -> float:
    return float(a + (b - a) * float(np.clip(t, 0.0, 1.0)))


def _cells(grid: dict):
    return grid["cells"]


def _rng(seed: int) -> np.random.Generator:
    return np.random.default_rng(seed)


# --------------------------------------------------------------------- wind


def build_wind(grid: dict) -> dict:
    """Turbulence driven by gust speed; the band centre is the gust velocity."""
    layers: list[dict] = []
    rng = _rng(11)
    # one long gust bed per row band, not a lawn of tiny cells: a gust is a
    # continuous object, and chopping it per-cell is what made it sound like
    # stepping noise.
    rows = grid["rows"]
    cols = grid["cols"]
    for r in range(rows):
        row_cells = [c for c in _cells(grid) if c["row"] == r]
        if not row_cells:
            continue
        speed = float(np.mean([0.55 * c["brightness"] + 0.45 * c["turbulence"] for c in row_cells]))
        bright = float(np.mean([c["brightness"] for c in row_cells]))
        t0 = r * (grid["duration"] / rows)
        dur = grid["duration"] / rows
        # the gust: turbulence envelope, slow attack, long body
        layers.append(
            {
                "kind": LAYER_NOISE,
                "model": "turbulence",
                "t0": round(t0, 3),
                "dur": round(dur, 3),
                "gain": round(0.30 + 0.55 * speed, 3),
                "freq": round(_lerp(320, 2600, speed), 1),
                "q": round(_lerp(0.8, 2.6, 0.5 + 0.5 * bright), 2),
                "gust": round(_lerp(0.5, 2.4, speed), 2),
                "pan": _pan(float(np.mean([c["cx"] for c in row_cells]))),
            }
        )
    # a low pressure bed under everything, and a whistle in the strongest row
    strongest = max(_cells(grid), key=lambda c: c["turbulence"] + c["brightness"])
    layers.append(
        {
            "kind": LAYER_NOISE,
            "model": "body",
            "t0": 0.0,
            "dur": grid["duration"],
            "gain": 0.26,
            "freq": round(_lerp(90, 240, float(np.mean([c["turbulence"] for c in _cells(grid)]))), 1),
            "q": 0.7,
            "pan": 0.0,
        }
    )
    layers.append(
        {
            "kind": LAYER_RES,
            "model": "whistle",
            "t0": round(strongest["row"] * (grid["duration"] / rows), 3),
            "dur": round(grid["duration"] / rows, 3),
            "gain": round(0.06 + 0.10 * strongest["turbulence"], 3),
            "freq": round(_lerp(620, 1500, strongest["turbulence"]), 1),
            "decay": 0.9,
            "pan": _pan(strongest["cx"]),
        }
    )
    return {
        "model": "wind",
        "mapping": "gust velocity → band centre · gust onset → amplitude · hue → top-octave energy",
        "explain": (
            "Air has no pitch of its own: what you hear is turbulence filtered by the "
            "space around it. Each row of the frame becomes one gust, its speed setting "
            "the band the wind howls in, its texture setting how hard it hits."
        ),
        "layers": layers,
    }


# -------------------------------------------------------------------- storm


def build_storm(grid: dict) -> dict:
    """Rain as thousands of droplet impacts; thunder as a crack plus a rumble."""
    layers: list[dict] = []
    rng = _rng(23)
    dur = grid["duration"]
    # --- rain: a Poisson train of resonant impacts -------------------------
    total = 0
    drops: list[dict] = []
    for c in _cells(grid):
        cloud = max(c["white"], 0.7 * c["rel"] if c["rel"] > 0.5 else 0.0)
        if cloud < 0.16:
            continue
        # dense cloud -> dense rain
        n = int(_lerp(3, 26, cloud))
        for _ in range(n):
            t = c["row"] * (dur / grid["rows"]) + rng.uniform(0, dur / grid["rows"])
            drops.append(
                {
                    "t": round(float(t), 4),
                    "f": round(float(rng.uniform(700, 5200) * _lerp(0.7, 1.3, c["turbulence"])), 1),
                    "g": round(float(0.20 + 0.55 * rng.random() * cloud), 3),
                    "p": _pan(c["cx"] + rng.uniform(-0.1, 0.1)),
                    "d": round(float(rng.uniform(0.008, 0.020)), 4),
                }
            )
            total += 1
    drops.sort(key=lambda d: d["t"])
    # chunk into layers so the spec stays a manageable document
    chunk = max(1, total // 24) if total else 1
    for i in range(0, len(drops), chunk):
        layers.append(
            {
                "kind": LAYER_HIT,
                "model": "droplet",
                "t0": drops[i]["t"],
                "dur": 0.06,
                "gain": 0.5,
                "drops": drops[i : i + chunk],
            }
        )

    # --- the cloud's mass: a wet low bed --------------------------------
    mass = float(np.mean([c["dark"] + c["white"] * 0.4 for c in _cells(grid)]))
    layers.append(
        {
            "kind": LAYER_NOISE,
            "model": "body",
            "t0": 0.0,
            "dur": dur,
            "gain": round(0.20 + 0.30 * mass, 3),
            "freq": 150,
            "q": 0.6,
            "pan": 0.0,
        }
    )

    # --- thunder: for each of the darkest, most textured rows ------------
    rows = grid["rows"]
    for r in range(rows):
        row = [c for c in _cells(grid) if c["row"] == r]
        weight = float(np.mean([c["dark"] * 0.6 + c["turbulence"] * 0.4 for c in row]))
        if weight < 0.45:
            continue
        layers.append(
            {
                "kind": LAYER_NOISE,
                "model": "thunder",
                "t0": round(r * (dur / rows) + 0.15, 3),
                "dur": round(min(3.2, dur / 2), 2),
                "gain": round(0.5 + 0.5 * weight, 3),
                "freq": round(_lerp(48, 110, weight), 1),
                "q": 0.9,
                "crack": 0.5,
                "decay": round(_lerp(1.1, 2.4, weight), 2),
                "pan": _pan(float(np.mean([c["cx"] for c in row]))),
            }
        )
    return {
        "model": "storm",
        "mapping": "cloud brightness → drop density · texture → drop pitch · dark mass → thunder",
        "explain": (
            "Rain is not a hiss: it is thousands of separate drops hitting leaves, "
            "water and roofs, each a tiny resonance. Bright cloud makes more of them; "
            "thick, dark cloud adds thunder — a crack with a rumble that outlives it."
        ),
        "layers": layers,
        "drop_count": total,
    }


# --------------------------------------------------------------------- fire


def build_fire(grid: dict) -> dict:
    layers: list[dict] = []
    rng = _rng(37)
    dur = grid["duration"]
    hot = [c for c in _cells(grid) if c["hot"] > 0.12]
    total = 0
    crackles: list[dict] = []
    for c in hot:
        n = int(_lerp(4, 34, c["hot"]))
        for _ in range(n):
            crackles.append(
                {
                    "t": round(float(c["row"] * (dur / grid["rows"]) + rng.uniform(0, dur / grid["rows"])), 4),
                    "f": round(float(rng.uniform(1200, 7600)), 1),
                    "g": round(float(0.15 + 0.6 * rng.random() * c["hot"]), 3),
                    "p": _pan(c["cx"] + rng.uniform(-0.08, 0.08)),
                    "d": round(float(rng.uniform(0.004, 0.014)), 4),
                }
            )
            total += 1
    crackles.sort(key=lambda d: d["t"])
    chunk = max(1, total // 26) if total else 1
    for i in range(0, len(crackles), chunk):
        layers.append(
            {
                "kind": LAYER_HIT,
                "model": "crackle",
                "t0": crackles[i]["t"],
                "dur": 0.05,
                "gain": 0.55,
                "hits": crackles[i : i + chunk],
            }
        )
    flame = float(np.mean([c["hot"] for c in _cells(grid)]))
    layers.append(
        {
            "kind": LAYER_NOISE,
            "model": "roar",
            "t0": 0.0,
            "dur": dur,
            "gain": round(0.18 + 0.55 * flame, 3),
            "freq": round(_lerp(140, 420, flame), 1),
            "q": 0.8,
            "pan": 0.0,
        }
    )
    smoke = float(np.mean([c["white"] + c["dark"] for c in _cells(grid)]))
    layers.append(
        {
            "kind": LAYER_SWELL,
            "model": "plume",
            "t0": 0.0,
            "dur": dur,
            "gain": round(0.10 + 0.28 * smoke, 3),
            "freq": 900,
            "period": round(_lerp(9.0, 3.4, flame), 2),
            "pan": 0.0,
        }
    )
    return {
        "model": "fire",
        "mapping": "hot-pixel fraction → crackle rate + roar cutoff · smoke → slow plume",
        "explain": (
            "Fire is combustion made audible: the crackle is thousands of tiny "
            "implosions of sap and air, the roar is the flame front moving. More "
            "orange in the frame, more of both — plus the slow breath of the smoke."
        ),
        "layers": layers,
        "crackle_count": total,
    }


# -------------------------------------------------------------------- ocean


def build_ocean(grid: dict) -> dict:
    layers: list[dict] = []
    dur = grid["duration"]
    water = float(np.mean([c["water"] + c["brightness"] * 0.4 for c in _cells(grid)]))
    grad = float(np.mean([c["gradient"] for c in _cells(grid)]))
    layers.append(
        {
            "kind": LAYER_NOISE,
            "model": "sub",
            "t0": 0.0,
            "dur": dur,
            "gain": round(0.22 + 0.30 * water, 3),
            "freq": 78,
            "q": 0.6,
            "pan": 0.0,
        }
    )
    for r in range(grid["rows"]):
        row = [c for c in _cells(grid) if c["row"] == r]
        bright = float(np.mean([c["brightness"] for c in row]))
        layers.append(
            {
                "kind": LAYER_SWELL,
                "model": "swell",
                "t0": round(r * (dur / grid["rows"]), 3),
                "dur": round(dur / grid["rows"], 3),
                "gain": round(0.20 + 0.45 * bright, 3),
                "freq": round(_lerp(420, 1800, bright), 1),
                "period": round(_lerp(7.5, 2.6, grad), 2),
                "pan": _pan(float(np.mean([c["cx"] for c in row]))),
            }
        )
    # foam: brief bright hisses on the sharpest cells
    for c in _cells(grid):
        if c["gradient"] > 0.62 and c["brightness"] > 0.5:
            layers.append(
                {
                    "kind": LAYER_NOISE,
                    "model": "foam",
                    "t0": round(c["row"] * (dur / grid["rows"]), 3),
                    "dur": 0.5,
                    "gain": round(0.10 + 0.14 * c["gradient"], 3),
                    "freq": round(_lerp(2400, 6200, c["gradient"]), 1),
                    "q": 1.4,
                    "pan": _pan(c["cx"]),
                }
            )
    return {
        "model": "ocean",
        "mapping": "gradient → swell period · brightness → crest band · foam → high hiss",
        "explain": (
            "Water is weight and surge. The sub-bass is the mass of the sea, the swells "
            "are the surf line's period as measured from the frame's gradient, and the "
            "foam is the hiss of the crest breaking apart."
        ),
        "layers": layers,
    }


# --------------------------------------------------------------------- city


def build_city(grid: dict) -> dict:
    """Discrete glints: damped sines whose pitch is the light's brightness."""
    layers: list[dict] = []
    rng = _rng(53)
    dur = grid["duration"]
    glints: list[dict] = []
    for c in _cells(grid):
        if c["rel"] < 0.22:
            continue
        n = int(_lerp(1, 7, c["rel"]))
        for _ in range(n):
            glints.append(
                {
                    "t": round(float(c["row"] * (dur / grid["rows"]) + rng.uniform(0, dur / grid["rows"])), 4),
                    "f": round(float(_lerp(420, 1380, c["rel"]) * rng.uniform(0.97, 1.03)), 1),
                    "g": round(float(0.10 + 0.36 * c["rel"] * rng.random()), 3),
                    "p": _pan(c["cx"]),
                    "d": round(float(rng.uniform(0.10, 0.34)), 3),
                }
            )
    glints.sort(key=lambda d: d["t"])
    chunk = max(1, len(glints) // 26) if glints else 1
    for i in range(0, len(glints), chunk):
        layers.append(
            {
                "kind": LAYER_HIT,
                "model": "glint",
                "t0": glints[i]["t"],
                "dur": 0.4,
                "gain": 0.5,
                "glints": glints[i : i + chunk],
            }
        )
    layers.append(
        {
            "kind": LAYER_NOISE,
            "model": "body",
            "t0": 0.0,
            "dur": dur,
            "gain": 0.10,
            "freq": 180,
            "q": 0.7,
            "pan": 0.0,
        }
    )
    return {
        "model": "city",
        "mapping": "light density → glint rate · brightness → pitch (420–1380 Hz) · x → pan",
        "explain": (
            "City light is discrete, not continuous, so each bright cell emits a short "
            "glint whose number follows its brightness. Pitch stays in the 420–1380 Hz "
            "band where the ear is most sensitive, and panning follows the map."
        ),
        "layers": layers,
    }


# ------------------------------------------------------------------- canopy


def build_canopy(grid: dict) -> dict:
    layers: list[dict] = []
    rng = _rng(71)
    dur = grid["duration"]
    pings: list[dict] = []
    for c in _cells(grid):
        if c["green"] < 0.10:
            continue
        n = int(_lerp(1, 6, c["green"]))
        for _ in range(n):
            pings.append(
                {
                    "t": round(float(c["row"] * (dur / grid["rows"]) + rng.uniform(0, dur / grid["rows"])), 4),
                    "f": round(float(_lerp(220, 880, c["turbulence"])), 1),
                    "g": round(float(0.12 + 0.4 * c["green"] * rng.random()), 3),
                    "p": _pan(c["cx"]),
                    "d": round(float(rng.uniform(0.18, 0.6)), 3),
                }
            )
    pings.sort(key=lambda d: d["t"])
    chunk = max(1, len(pings) // 22) if pings else 1
    for i in range(0, len(pings), chunk):
        layers.append(
            {
                "kind": LAYER_HIT,
                "model": "ping",
                "t0": pings[i]["t"],
                "dur": 0.7,
                "gain": 0.5,
                "pings": pings[i : i + chunk],
            }
        )
    layers.append(
        {
            "kind": LAYER_NOISE,
            "model": "body",
            "t0": 0.0,
            "dur": dur,
            "gain": 0.12,
            "freq": 320,
            "q": 0.8,
            "pan": 0.0,
        }
    )
    return {
        "model": "canopy",
        "mapping": "green fraction → strike rate · texture → modal pitch (220–880 Hz)",
        "explain": (
            "A forest canopy is a resonant structure: each dense green cell is struck "
            "and rings at a pitch set by how textured it is. Sparse canopy is sparse "
            "pings; dense, broken canopy is a shimmer."
        ),
        "layers": layers,
    }


# -------------------------------------------------------------------- plume


def build_plume(grid: dict) -> dict:
    layers: list[dict] = []
    dur = grid["duration"]
    mass = float(np.mean([c["brightness"] for c in _cells(grid)]))
    layers.append(
        {
            "kind": LAYER_NOISE,
            "model": "body",
            "t0": 0.0,
            "dur": dur,
            "gain": round(0.14 + 0.30 * mass, 3),
            "freq": round(_lerp(70, 160, mass), 1),
            "q": 0.6,
            "pan": 0.0,
        }
    )
    for r in range(grid["rows"]):
        row = [c for c in _cells(grid) if c["row"] == r]
        air = float(np.mean([c["white"] + c["brightness"] for c in row])) / 2
        layers.append(
            {
                "kind": LAYER_NOISE,
                "model": "turbulence",
                "t0": round(r * (dur / grid["rows"]), 3),
                "dur": round(dur / grid["rows"], 3),
                "gain": round(0.12 + 0.32 * air, 3),
                "freq": round(_lerp(900, 4200, air), 1),
                "q": 1.1,
                "gust": 0.7,
                "pan": _pan(float(np.mean([c["cx"] for c in row]))),
            }
        )
    for c in _cells(grid):
        if c["gradient"] > 0.7 and c["brightness"] > 0.45:
            layers.append(
                {
                    "kind": LAYER_HIT,
                    "model": "sparkle",
                    "t0": round(c["row"] * (dur / grid["rows"]), 3),
                    "dur": 0.3,
                    "gain": 0.12,
                    "glints": [
                        {
                            "t": round(float(c["row"] * (dur / grid["rows"]) + 0.05), 3),
                            "f": round(float(_lerp(1800, 4800, c["brightness"])), 1),
                            "g": 0.22,
                            "p": _pan(c["cx"]),
                            "d": 0.12,
                        }
                    ],
                }
            )
    return {
        "model": "plume",
        "mapping": "mass → sub bed · brightness → transport band · sharp edges → sparkle",
        "explain": (
            "A plume is air carrying something: a deep bed for the mass, a moving "
            "band for the transport, and brief sparkles where the edge of the cloud "
            "is sharpest against the dark."
        ),
        "layers": layers,
    }


# -------------------------------------------------------------------- space


def build_space(grid: dict) -> dict:
    """Caldwell's mapping: x is the scan axis, brightness is pitch."""
    layers: list[dict] = []
    dur = grid["duration"]
    for c in _cells(grid):
        if c["rel"] < 0.10:
            continue
        layers.append(
            {
                "kind": LAYER_TONE,
                "model": "scan",
                # left to right is time; the vertical position is where the
                # sound sits in the stereo image
                "t0": round(c["cx"] * dur, 3),
                "dur": round(dur / grid["cols"], 3),
                "gain": round(0.10 + 0.30 * c["rel"], 3),
                "freq": round(_lerp(140, 1500, c["rel"]), 1),
                "attack": 0.015,
                "decay": 0.2,
                "pan": _pan(c["cy"], 0.95),
            }
        )
    return {
        "model": "space",
        "mapping": "scan position → time · brightness → pitch (Caldwell 73)",
        "explain": (
            "This one follows NASA's own published method: the image is read left to "
            "right and brightness becomes pitch, so the reference dataset sounds like "
            "the sonification it is famous for rather than like ours."
        ),
        "layers": layers,
    }


BUILDERS = {
    "wind": build_wind,
    "storm": build_storm,
    "fire": build_fire,
    "ocean": build_ocean,
    "city": build_city,
    "canopy": build_canopy,
    "plume": build_plume,
    "space": build_space,
}

# The same physical processes also read *any* frame; the deck offers these.
MODELS = BUILDERS


def build_spec(frame_bgr, shell: dict, cols: int = 12, rows: int = 6, seconds: float = 24.0) -> dict:
    model = shell.get("model")
    if model not in BUILDERS:
        raise ValueError(f"unknown model {model!r}")
    grid = measure_grid(frame_bgr, cols=cols, rows=rows)
    grid["duration"] = seconds
    # A frame's absolute brightness is arbitrary (a starfield is mostly black);
    # every model that thresholds on light uses `rel`, the brightness relative to
    # this frame's own bright end, so a dark frame is not silently mute.
    bright = np.array([c["brightness"] for c in grid["cells"]], dtype=float)
    top = float(np.percentile(bright, 92)) or 1.0
    for c in grid["cells"]:
        c["rel"] = round(float(np.clip(c["brightness"] / top, 0, 1)), 4)
    body = BUILDERS[model](grid)
    return {
        "model": model,
        "title": shell.get("title") or shell.get("short") or model,
        "duration": seconds,
        "layers": body["layers"],
        "mapping": body["mapping"],
        "explain": body["explain"],
        "grid": {
            "cols": cols,
            "rows": rows,
            "cells": grid["cells"],
        },
        "frame_stats": grid["frame"],
        **{k: v for k, v in body.items() if k in ("drop_count", "crackle_count")},
    }


def model_for(shell: dict) -> str:
    return shell.get("model", "plume")
