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


def frame_png_bytes(dataset_id: str) -> bytes:
    ok, buf = cv2.imencode(".png", get_frame(dataset_id))
    if not ok:
        raise RuntimeError("png encode failed")
    return buf.tobytes()


def asset_ids() -> list[str]:
    return sorted(p.stem for p in ASSET_DIR.glob("*.jpg"))
