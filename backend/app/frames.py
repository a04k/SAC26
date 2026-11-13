"""Access to the real NASA frames bundled with Terra Jukebox.

No synthetic imagery: `assets/frames/<id>.jpg` holds an authentic frame for
every track, taken from the visualization the SVS source page publishes
(credits in `assets/frames/SOURCES.md`). The same files are served to the
browser, analysed by OpenCV and rendered to audio — one source of truth.

Tracks with a real annual series (night lights) additionally expose the frames
of their time series so the scan can play year by year.
"""

from __future__ import annotations

import functools
from pathlib import Path

import cv2
import numpy as np

from .datasets import DATASETS_BY_ID

ASSET_DIR = Path(__file__).resolve().parent / "assets" / "frames"


@functools.lru_cache(maxsize=32)
def get_frame(dataset_id: str) -> np.ndarray:
    if dataset_id not in DATASETS_BY_ID:
        raise KeyError(dataset_id)
    path = ASSET_DIR / f"{dataset_id}.jpg"
    img = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(f"missing frame asset: {path}")
    return img


@functools.lru_cache(maxsize=8)
def get_asset(asset_id: str) -> np.ndarray:
    """Any bundled asset by filename stem (used for time-series frames)."""
    path = ASSET_DIR / f"{asset_id}.jpg"
    img = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(f"missing frame asset: {path}")
    return img


# Frames are shown as discs, sleeves and covers all over the UI, so keeping the
# payload small matters more than pixel-perfect PNGs: encode once as WebP at a
# sane display size and cache it in-process.
_ENC_CACHE: dict[str, bytes] = {}
_MAX_EDGE = 1400


def frame_bytes(dataset_id: str, fmt: str = ".webp") -> bytes:
    key = f"{dataset_id}:{fmt}"
    if key in _ENC_CACHE:
        return _ENC_CACHE[key]
    img = get_frame(dataset_id)
    h, w = img.shape[:2]
    if max(h, w) > _MAX_EDGE:
        f = _MAX_EDGE / max(h, w)
        img = cv2.resize(img, (int(w * f), int(h * f)), interpolation=cv2.INTER_AREA)
    if fmt == ".webp":
        ok, buf = cv2.imencode(".webp", img, [cv2.IMWRITE_WEBP_QUALITY, 82])
    else:
        ok, buf = cv2.imencode(".png", img)
    if not ok:
        raise RuntimeError("encode failed")
    _ENC_CACHE[key] = buf.tobytes()
    return _ENC_CACHE[key]


def frame_png_bytes(dataset_id: str) -> bytes:
    return frame_bytes(dataset_id, ".png")


def asset_ids() -> list[str]:
    return sorted(p.stem for p in ASSET_DIR.glob("*.jpg"))
