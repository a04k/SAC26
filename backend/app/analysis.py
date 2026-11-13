"""Shared frame measurement for every synthesis model.

A frame is reduced to a grid of cells (default 6 x 12). Each cell carries the
quantities the phenomenon models need, so that, for example, the wind model can
read `turbulence` and the fire model can read `hot` while measuring exactly the
same pixels.

All values are normalised 0..1 and are measurements, not interpretations:
`turbulence` is the mean local-variance texture energy, `hot` is the fraction of
pixels in the orange/red/yellow band of hue, `white` is the fraction of bright
low-saturation pixels (cloud/ice/smoke), and so on. Nothing here knows what a
hurricane is; the models decide what to do with these numbers.
"""

from __future__ import annotations

import cv2
import numpy as np

GRID_COLS = 12
GRID_ROWS = 6

# Hue windows in OpenCV's 0..179 scale (degrees/2).
HUE_RED = ((0, 10), (170, 180))
HUE_ORANGE = (10, 22)
HUE_YELLOW = (22, 35)
HUE_GREEN = (35, 85)
HUE_CYAN_BLUE = (85, 130)


def _hue_mask(h: np.ndarray, *ranges) -> np.ndarray:
    """True where hue (OpenCV 0..179) falls inside any of the given windows."""
    m = np.zeros(h.shape, bool)
    for lo, hi in ranges:
        m |= (h >= lo) & (h < hi)
    return m


def measure_grid(frame_bgr: np.ndarray, cols: int = GRID_COLS, rows: int = GRID_ROWS) -> dict:
    """Return the measurement grid plus whole-frame statistics."""
    h, w = frame_bgr.shape[:2]
    hsv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    hou, sat, val = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]

    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    grad = np.sqrt(gx**2 + gy**2)

    mean_sq = cv2.blur(gray.astype(np.float32) ** 2, (7, 7))
    sq_mean = cv2.blur(gray.astype(np.float32), (7, 7)) ** 2
    texture = np.sqrt(np.maximum(mean_sq - sq_mean, 0))

    edges = cv2.Canny(gray, 60, 160)

    hot = _hue_mask(hou, *HUE_RED, HUE_ORANGE, HUE_YELLOW) & (sat > 90) & (val > 80)
    green = _hue_mask(hou, HUE_GREEN) & (sat > 60)
    water = _hue_mask(hou, HUE_CYAN_BLUE) & (sat > 50)
    white = (val > 205) & (sat < 70)
    dark = val < 55

    cells: list[dict] = []
    for r in range(rows):
        y0, y1 = int(r * h / rows), int((r + 1) * h / rows)
        for c in range(cols):
            x0, x1 = int(c * w / cols), int((c + 1) * w / cols)
            sl = (slice(y0, y1), slice(x0, x1))
            n = (y1 - y0) * (x1 - x0)
            cells.append(
                {
                    "row": r,
                    "col": c,
                    # spatial centres, 0..1 (used for panning / stereo geometry)
                    "cx": round((c + 0.5) / cols, 4),
                    "cy": round((r + 0.5) / rows, 4),
                    "brightness": round(float(gray[sl].mean() / 255.0), 4),
                    "saturation": round(float(sat[sl].mean() / 255.0), 4),
                    "hue": round(float(hou[sl].mean()) * 2.0, 1),
                    "turbulence": round(float(np.clip(texture[sl].mean() / 42.0, 0, 1)), 4),
                    "edges": round(float(edges[sl].mean() / 255.0), 4),
                    "gradient": round(float(np.clip(grad[sl].mean() / 60.0, 0, 1)), 4),
                    "hot": round(float(hot[sl].sum() / n), 4),
                    "green": round(float(green[sl].sum() / n), 4),
                    "water": round(float(water[sl].sum() / n), 4),
                    "white": round(float(white[sl].sum() / n), 4),
                    "dark": round(float(dark[sl].sum() / n), 4),
                }
            )

    return {
        "cols": cols,
        "rows": rows,
        "cells": cells,
        "frame": {
            "width": int(w),
            "height": int(h),
            "brightness": round(float(gray.mean() / 255.0), 4),
            "saturation": round(float(sat.mean() / 255.0), 4),
            "turbulence": round(float(np.clip(texture.mean() / 42.0, 0, 1)), 4),
            "hot": round(float(hot.sum() / (h * w)), 4),
            "green": round(float(green.sum() / (h * w)), 4),
            "water": round(float(water.sum() / (h * w)), 4),
            "white": round(float(white.sum() / (h * w)), 4),
            "dark": round(float(dark.sum() / (h * w)), 4),
        },
    }


def region(grid: dict, row0: int, row1: int, col0: int = 0, col1: int | None = None) -> dict:
    """Mean measurements over a rectangular region of the grid."""
    cols = grid["cols"]
    col1 = cols if col1 is None else col1
    cells = [
        c
        for c in grid["cells"]
        if row0 <= c["row"] < row1 and col0 <= c["col"] < col1
    ]
    if not cells:
        return {}
    keys = [k for k in cells[0] if k not in ("row", "col")]
    return {k: round(float(np.mean([c[k] for c in cells])), 4) for k in keys}
