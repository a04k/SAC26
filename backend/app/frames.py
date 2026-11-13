"""Procedural EIC-style frames.

Deterministic synthetic stand-ins for SVS visualization frames, one per
dataset. They exist so the OpenCV pipeline always runs on real pixels without
downloading large SVS videos. Swap in real frames via POST /api/analyze
(upload) — the same vision -> sonify path processes them.
"""

import cv2
import numpy as np

from .datasets import DATASETS_BY_ID

SIZE = 512


def _rng(seed: int) -> np.random.Generator:
    return np.random.default_rng(seed)


def _blur(img: np.ndarray, k: int = 21) -> np.ndarray:
    return cv2.GaussianBlur(img, (k, k), 0)


def _continents(rng: np.random.Generator, scale: int = 6) -> np.ndarray:
    """Blobby land mask (float 0..1) in equirectangular space."""
    field = np.zeros((SIZE, SIZE), np.float32)
    for octave, weight in ((scale, 0.72), (scale * 2, 0.2), (scale * 3, 0.08)):
        n = cv2.resize(
            rng.random((octave, octave * 2)).astype(np.float32),
            (SIZE, SIZE),
            interpolation=cv2.INTER_CUBIC,
        )
        field += weight * n
    field = cv2.GaussianBlur(field, (0, 0), 6)
    lo, hi = float(field.min()), float(field.max())
    field = (field - lo) / (hi - lo + 1e-9)
    land = (field > 0.53).astype(np.float32)
    return cv2.GaussianBlur(land, (0, 0), 5)


def _night_lights(rng: np.random.Generator) -> np.ndarray:
    img = np.zeros((SIZE, SIZE, 3), np.uint8)
    img[:] = (26, 20, 14)  # near-black ocean (BGR)
    land = _continents(rng, 5)

    # graticule for that EIC map look
    for y in range(0, SIZE, SIZE // 6):
        cv2.line(img, (0, y), (SIZE, y), (36, 30, 24), 1)
    for x in range(0, SIZE, SIZE // 8):
        cv2.line(img, (x, 0), (x, SIZE), (36, 30, 24), 1)

    # land: dim olive terrain
    img = img + (land[..., None] * np.array([18, 24, 20], np.float32)).astype(np.uint8)

    # city-light clusters, concentrated where land is
    glow = np.zeros_like(img, dtype=np.float32)
    ys, xs = np.nonzero(land > 0.5)
    picks = rng.integers(0, len(ys), size=min(190, len(ys))) if len(ys) else []
    for idx in picks:
        cy, cx = int(ys[idx]), int(xs[idx])
        r = int(rng.integers(2, 14))
        intensity = rng.uniform(0.55, 1.0)
        col = np.array([70.0 * intensity, 170.0 * intensity, 255.0 * intensity])  # warm BGR
        cv2.circle(glow, (cx, cy), r, tuple(float(c) for c in col), -1)
    glow = cv2.GaussianBlur(glow, (0, 0), 4)
    out = np.clip(img.astype(np.float32) + glow, 0, 255).astype(np.uint8)
    return out


def _ocean(rng: np.random.Generator) -> np.ndarray:
    # sea-surface temperature gradient: cool north -> warm south
    temp = np.zeros((SIZE, SIZE, 3), np.uint8)
    for y in range(SIZE):
        t = y / (SIZE - 1)
        r = int(30 + 170 * t**1.4)
        g = int(70 + 110 * (1 - abs(t - 0.55) * 1.6))
        b = int(120 + 110 * (1 - t))
        temp[y, :] = (np.clip(b, 0, 255), np.clip(g, 0, 255), np.clip(r, 0, 255))
    grad = cv2.GaussianBlur(temp, (0, 0), 26)
    layer = np.zeros_like(grad)
    for k in range(26):
        y0 = int(rng.integers(0, SIZE))
        amp = rng.uniform(8, 40)
        phase = rng.uniform(0, 6.28)
        pts = []
        for x in range(0, SIZE, 8):
            y = int(y0 + amp * np.sin(x / 60.0 + phase))
            pts.append((x, y))
        col = (int(rng.integers(180, 255)), int(rng.integers(200, 255)), int(rng.integers(120, 200)))
        cv2.polylines(layer, [np.array(pts)], False, col, int(rng.integers(1, 4)))
    layer = _blur(layer, 7)
    return cv2.add(grad, layer)


def _aerosols(rng: np.random.Generator) -> np.ndarray:
    img = np.zeros((SIZE, SIZE, 3), np.uint8)
    img[:] = (28, 30, 34)
    layer = np.zeros_like(img)
    palettes = [(60, 140, 250), (150, 150, 150), (250, 160, 60), (200, 220, 240)]
    for _ in range(90):
        cx, cy = int(rng.integers(0, SIZE)), int(rng.integers(0, SIZE))
        r = int(rng.integers(10, 70))
        col = palettes[int(rng.integers(0, len(palettes)))]
        cv2.circle(layer, (cx, cy), r, col, -1)
    layer = _blur(layer, 45)
    # wind-blown streaks over the plumes
    streaks = np.zeros_like(img)
    for _ in range(22):
        y0 = int(rng.integers(0, SIZE))
        amp = rng.uniform(6, 26)
        ph = rng.uniform(0, 6.28)
        pts = [(x, int(y0 + amp * np.sin(x / 90.0 + ph))) for x in range(0, SIZE, 12)]
        cv2.polylines(streaks, [np.array(pts)], False,
                      (int(rng.integers(70, 130)), int(rng.integers(80, 150)), int(rng.integers(90, 170))), 5)
    streaks = _blur(streaks, 17)
    img = cv2.addWeighted(img, 1.0, layer, 0.5, 0)
    img = cv2.addWeighted(img, 1.0, streaks, 0.35, 0)
    # particle specks
    for _ in range(1100):
        x, y = int(rng.integers(0, SIZE)), int(rng.integers(0, SIZE))
        cv2.circle(img, (x, y), 1, (205, 205, 205), -1)
    return img


def _air_quality(rng: np.random.Generator) -> np.ndarray:
    img = np.zeros((SIZE, SIZE, 3), np.uint8)
    img[:] = (58, 52, 62)
    layer = np.zeros_like(img)
    # broad haze basins + drifting plume bands
    for _ in range(28):
        cx, cy = int(rng.integers(0, SIZE)), int(rng.integers(0, SIZE))
        r = int(rng.integers(30, 110))
        col = (int(rng.integers(50, 110)), int(rng.integers(30, 80)), int(rng.integers(130, 200)))
        cv2.circle(layer, (cx, cy), r, col, -1)
    for _ in range(14):
        y0 = int(rng.integers(0, SIZE))
        amp = rng.uniform(10, 45)
        pts = [
            (x, int(y0 + amp * np.sin(x / 70.0 + rng.uniform(0, 6))))
            for x in range(0, SIZE, 10)
        ]
        cv2.polylines(layer, [np.array(pts)], False,
                      (int(rng.integers(60, 120)), int(rng.integers(40, 90)), int(rng.integers(140, 210))), 9)
    layer = _blur(layer, 41)
    out = cv2.addWeighted(img, 1.0, layer, 0.6, 0)
    # particulate speckle
    speck = (rng.random((SIZE, SIZE)) > 0.9993).astype(np.uint8) * 255
    out = cv2.bitwise_or(out, cv2.cvtColor(speck, cv2.COLOR_GRAY2BGR))
    return out


def _perpetual_ocean(rng: np.random.Generator) -> np.ndarray:
    img = np.zeros((SIZE, SIZE, 3), np.uint8)
    img[:] = (40, 16, 4)  # BGR dark navy
    layer = np.zeros_like(img)
    for k in range(7):
        x0 = int((k + 1) * SIZE / 8 + rng.integers(-20, 20))
        pts = []
        for y in range(0, SIZE, 8):
            x = int(x0 + 26 * np.sin(y / 55.0 + k))
            pts.append((x, y))
        cv2.polylines(layer, [np.array(pts)], False, (240, 190, 60), 3)
    layer = _blur(layer, 5)
    return cv2.add(img, layer)


def _co2(rng: np.random.Generator) -> np.ndarray:
    """Equirectangular CO2 concentration field (DYAMOND-style heat map)."""
    field = np.zeros((SIZE, SIZE), np.float32)
    for octave, weight in ((5, 0.55), (11, 0.3), (23, 0.15)):
        n = cv2.resize(
            rng.random((octave, octave * 2)).astype(np.float32),
            (SIZE, SIZE),
            interpolation=cv2.INTER_CUBIC,
        )
        field += weight * n
    field = cv2.GaussianBlur(field, (0, 0), 10)
    lo, hi = float(field.min()), float(field.max())
    field = (field - lo) / (hi - lo + 1e-9)
    # latitudinal gradient: tropics + northern industrial belt hotter
    lat = np.linspace(0, 1, SIZE)[:, None]
    field = np.clip(field * 0.7 + 0.35 * np.exp(-((lat - 0.32) ** 2) / 0.035), 0, 1)

    img = np.zeros((SIZE, SIZE, 3), np.uint8)
    img[:, :, 2] = np.clip(40 + 215 * field, 0, 255)        # R
    img[:, :, 1] = np.clip(20 + 150 * field ** 1.6, 0, 255)  # G
    img[:, :, 0] = np.clip(60 * (1 - field) + 20, 0, 255)    # B
    # cool blue regions where concentration is lowest
    img = cv2.addWeighted(img, 0.92, cv2.applyColorMap((255 * (1 - field)).astype(np.uint8), cv2.COLORMAP_WINTER), 0.12, 0)
    return img


def _lightning(rng: np.random.Generator) -> np.ndarray:
    img = np.zeros((SIZE, SIZE, 3), np.uint8)
    img[:] = (10, 12, 16)
    glow = np.zeros_like(img)
    for _ in range(9):
        x, y = int(rng.integers(40, SIZE - 40)), int(rng.integers(10, 120))
        pts = [(x, y)]
        while y < SIZE - 20:
            x += int(rng.integers(-22, 23))
            y += int(rng.integers(14, 42))
            pts.append((x, y))
        arr = np.array(pts)
        cv2.polylines(glow, [arr], False, (200, 240, 255), 5)
        cv2.polylines(img, [arr], False, (255, 255, 255), 1)
    glow = _blur(glow, 15)
    return cv2.add(img, glow)


def _atmospheric_river(rng: np.random.Generator) -> np.ndarray:
    """3D-model style moisture plume: a long, ragged, glowing ribbon."""
    img = np.zeros((SIZE, SIZE, 3), np.uint8)
    img[:] = (34, 28, 24)
    for y in range(SIZE):
        img[y, :] = (34 + y // 12, 28 + y // 16, 24 + y // 20)

    plume = np.zeros((SIZE, SIZE), np.float32)
    t = np.linspace(0, 1, 260)
    # core path of the river
    xs = 30 + t * (SIZE - 60)
    ys = SIZE * 0.66 - 120 * np.sin(t * np.pi * 0.9) + 26 * np.sin(t * 9.0)
    for i in range(len(t) - 1):
        w = int(16 + 34 * np.sin(t[i] * np.pi))
        cv2.line(plume, (int(xs[i]), int(ys[i])), (int(xs[i + 1]), int(ys[i + 1])), 1.0, w)
    # ragged edges / tendrils
    for _ in range(70):
        k = int(rng.integers(0, len(t)))
        cv2.circle(plume, (int(xs[k] + rng.normal(0, 26)), int(ys[k] + rng.normal(0, 34))),
                   int(rng.integers(4, 26)), float(rng.uniform(0.3, 0.9)), -1)
    plume = cv2.GaussianBlur(plume, (0, 0), 9)
    plume /= plume.max() + 1e-9
    core = np.clip(plume ** 1.7, 0, 1)

    col = np.stack([
        (170 + 85 * core),   # B
        (205 + 50 * core),   # G
        (225 + 30 * core),   # R
    ], axis=-1)
    out = np.clip(img.astype(np.float32) * (1 - core[..., None]) + col * core[..., None], 0, 255)
    return out.astype(np.uint8)


def _forest_height(rng: np.random.Generator) -> np.ndarray:
    # Multi-octave value noise -> canopy height field (dense forest = tall).
    field = np.zeros((SIZE, SIZE), np.float32)
    for octave, weight in ((6, 0.55), (14, 0.28), (34, 0.17)):
        n = cv2.resize(
            rng.random((octave, octave)).astype(np.float32),
            (SIZE, SIZE),
            interpolation=cv2.INTER_CUBIC,
        )
        field += weight * n
    field = cv2.GaussianBlur(field, (0, 0), 4)
    lo, hi = float(field.min()), float(field.max())
    field = (field - lo) / (hi - lo + 1e-9)
    # canopy height ramp: dark green -> mid green -> pale lime
    img = np.zeros((SIZE, SIZE, 3), np.uint8)
    b = (40 + 120 * field).astype(np.uint8)
    g = (60 + 175 * field).astype(np.uint8)
    r = (20 + 90 * field**2.2).astype(np.uint8)
    img[:, :, 0] = b
    img[:, :, 1] = g
    img[:, :, 2] = r
    # shaded relief for texture
    shade = cv2.GaussianBlur(field, (0, 0), 2) - cv2.GaussianBlur(field, (0, 0), 12)
    img = np.clip(img.astype(np.float32) + shade[..., None] * 120.0, 0, 255).astype(np.uint8)
    # scattered gaps in the canopy
    gaps = (rng.random((SIZE, SIZE)) > 0.985).astype(np.float32)
    gaps = cv2.GaussianBlur(gaps, (0, 0), 1.2)[..., None]
    img = (img.astype(np.float32) * (1 - gaps * 0.6)).astype(np.uint8)
    return img


def _caldwell(rng: np.random.Generator) -> np.ndarray:
    img = np.zeros((SIZE, SIZE, 3), np.uint8)
    img[:] = (16, 10, 24)
    layer = np.zeros_like(img)
    for _ in range(10):
        cx, cy = int(rng.integers(60, SIZE - 60)), int(rng.integers(60, SIZE - 60))
        r = int(rng.integers(30, 110))
        col = (int(rng.integers(150, 220)), int(rng.integers(90, 150)), int(rng.integers(180, 240))) \
            if rng.random() < 0.5 else (int(rng.integers(200, 255)), int(rng.integers(140, 190)), int(rng.integers(60, 110)))
        cv2.circle(layer, (cx, cy), r, col, -1)
    layer = _blur(layer, 29)
    img = cv2.addWeighted(img, 1.0, layer, 0.5, 0)
    # bright core
    cv2.circle(img, (SIZE // 2, SIZE // 2), 26, (255, 250, 245), -1)
    img = _blur(img, 5)
    # stars
    for _ in range(700):
        x, y = int(rng.integers(0, SIZE)), int(rng.integers(0, SIZE))
        v = int(rng.integers(120, 255))
        cv2.circle(img, (x, y), 1, (v, v, v), -1)
    return img


_GENERATORS = {
    "night-lights": _night_lights,
    "ocean-currents": _ocean,
    "aerosols": _aerosols,
    "air-quality": _air_quality,
    "perpetual-ocean": _perpetual_ocean,
    "co2": _co2,
    "lightning": _lightning,
    "atmospheric-river": _atmospheric_river,
    "forest-height": _forest_height,
    "caldwell-73": _caldwell,
}

_cache: dict[str, np.ndarray] = {}


def get_frame(dataset_id: str) -> np.ndarray:
    if dataset_id not in DATASETS_BY_ID:
        raise KeyError(dataset_id)
    if dataset_id not in _cache:
        seed = int.from_bytes(dataset_id.encode()[:4].ljust(4, b"\0"), "little")
        _cache[dataset_id] = _GENERATORS[dataset_id](_rng(seed))
    return _cache[dataset_id]


def frame_png_bytes(dataset_id: str) -> bytes:
    ok, buf = cv2.imencode(".png", get_frame(dataset_id))
    if not ok:
        raise RuntimeError("png encode failed")
    return buf.tobytes()
