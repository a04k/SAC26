"""Direct data-to-audio sonification (no composition, no instruments).

This module is deliberately *not* a music generator. Every audible parameter
is a measured property of the image:

  * Latitude bands: rows of the frame are averaged into 24 bands. The scan
    plays the frame from top (north) to bottom (south). Each band contributes
    one sustained tone whose pitch is the band's brightness above black and
    whose loudness is that band's edge/particle density.
  * Melody per band: four sample columns across the band give four pitches —
    the melody *is* the pixel values you see, in the order a reader would scan.
  * Texture: the band's high-frequency (Laplacian) content is mixed in as a
    noise layer — bright noisy regions actually sound gritty.
  * Annual series: when a track has a real time series (e.g. night lights
    2012→2023) each frame yields one summary pitch, played in order and
    annotated on screen with the year being heard.

Pitch mapping is linear and perceptual: normalized luminance 0..1 maps to a
12-semitone range above a fixed reference, so neighbouring brightness values
always produce neighbouring pitches and nothing is ever transposed or
quantized into a "nice" key.
"""

from __future__ import annotations

import math

import cv2
import numpy as np

BAND_COUNT = 24
SAMPLE_COLUMNS = (0.18, 0.39, 0.61, 0.82)
REFERENCE_HZ = 110.0  # A2
PITCH_SPAN_SEMITONES = 30.0  # 2.5 octaves of *linear* pitch for luminance 0..1
# Display-only gain so quiet scenes (night lights, ocean) are audible. It scales
# the whole score uniformly: relative loudness between bands is untouched.
DISPLAY_GAIN = 3.2


def luminance(frame_bgr: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0


def band_rows(frame_bgr: np.ndarray, bands: int = BAND_COUNT) -> list[dict]:
    """Average each horizontal band -> luminance, HSV, edge & texture density."""
    h, w = frame_bgr.shape[:2]
    hsv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 40, 120)
    grad = np.abs(cv2.Laplacian(gray, cv2.CV_32F, ksize=3))

    out: list[dict] = []
    for b in range(bands):
        y0, y1 = int(b * h / bands), int((b + 1) * h / bands)
        sl = slice(y0, y1)
        lum = float(gray[sl].mean() / 255.0)
        sat = float(hsv[sl, :, 1].mean() / 255.0)
        hue = float(hsv[sl, :, 0].mean() * 2.0)  # degrees (OpenCV hue is 0..179)
        edge = float((edges[sl] > 0).mean())
        texture = float(grad[sl].mean() / 255.0)
        samples = [float(gray[sl, int(c * (w - 1)):int(c * (w - 1)) + max(1, w // 60)].mean() / 255.0)
                   for c in SAMPLE_COLUMNS]
        out.append(
            {
                "band": b,
                "label": _band_label(b, bands),
                "luminance": round(lum, 4),
                "saturation": round(sat, 4),
                "hue": round(hue, 1),
                "edge": round(edge, 4),
                "texture": round(texture, 4),
                "samples": [round(s, 4) for s in samples],
            }
        )
    return out


def _band_label(band: int, bands: int) -> str:
    lat = 90.0 - (band + 0.5) * 180.0 / bands
    return f"{abs(lat):.0f}°{'N' if lat >= 0 else 'S'}"


def frame_scan(frame_bgr: np.ndarray, seconds: float = 24.0) -> dict:
    """The playable score: one tone + one 4-note melody per latitude band.

    Pitch uses the band's brightness *relative to this frame's own 2nd–98th
    percentile range*, so a pale map (GEDI on white) and a dark one (night
    lights) land in the same register and stay comparable. The bounds used are
    returned in `normalization` — nothing is hidden.
    """
    bands = band_rows(frame_bgr)
    lums = [b["luminance"] for b in bands] or [0.0]
    lo = float(np.percentile(lums, 2))
    hi = float(np.percentile(lums, 98))
    if hi - lo < 1e-6:
        lo, hi = 0.0, 1.0

    def norm(v: float) -> float:
        return float(min(1.0, max(0.0, (v - lo) / (hi - lo))))

    # relative loudness is preserved exactly; one uniform gain keeps it in range
    raw_amps = [0.02 + norm(b["luminance"]) * 0.30 for b in bands]
    raw_amps = [a * (0.5 + 0.9 * min(1.0, b["edge"] * 4 + b["texture"] * 1.5))
                for a, b in zip(raw_amps, bands)]
    amp_peak = max(raw_amps) or 1.0
    gain = min(DISPLAY_GAIN, 0.42 / amp_peak) if amp_peak > 0 else DISPLAY_GAIN

    seg = seconds / len(bands)
    tones = []
    for b, raw_amp in zip(bands, raw_amps):
        time_s = round(b["band"] * seg, 4)
        # amplitude and pitch both come straight from measured values
        amp = raw_amp * gain
        tones.append(
            {
                "time": time_s,
                "duration": round(seg * 0.94, 4),
                "freq": round(_pitch_hz(norm(b["luminance"])), 2),
                "amp": round(amp, 4),
                "pan": round((_hue_pan(b["hue"])), 3),
                "noise": round(min(0.6, b["texture"] * 2.2), 3),
                "melody": [
                    {"freq": round(_pitch_hz(norm(v)), 2), "amp": round(0.05 + norm(v) * 0.16, 4)}
                    for v in b["samples"]
                ],
                "melody_step": round(seg / 5.0, 4),
                "band": b["band"],
                "label": b["label"],
            }
        )
    lum = luminance(frame_bgr)
    return {
        "duration": seconds,
        "bands": bands,
        "tones": tones,
        "normalization": {
            "luminance_p2": round(lo, 4),
            "luminance_p98": round(hi, 4),
            "gain": round(gain, 3),
            "method": "per-frame 2nd–98th percentile, linear (no musical scale)",
        },
        "summary": {
            "mean_luminance": round(float(lum.mean()), 4),
            "mean_hue": round(float(bands and np.mean([b["hue"] for b in bands])), 1),
            "mean_pitch_hz": round(float(np.mean([t["freq"] for t in tones])), 2),
            "mean_edge": round(float(np.mean([b["edge"] for b in bands])), 4),
        },
        "mapping": {
            "pitch": "band brightness normalised to this frame's 2–98 percentile → 110 Hz × 2^(n/12), n = 0..30 (linear, not quantized)",
            "loudness": "band brightness × edge/texture density → amplitude (single uniform gain, relative loudness preserved)",
            "pan": "mean hue of the band → stereo position",
            "texture": "Laplacian energy → noise mix",
            "order": "top (north) to bottom (south), left to right within a band",
        },
    }


def _pitch_hz(lum01: float) -> float:
    return REFERENCE_HZ * 2 ** ((max(0.0, min(1.0, lum01)) * PITCH_SPAN_SEMITONES) / 12.0)


def _hue_pan(hue_deg: float) -> float:
    # red/magenta -> left, cyan/green -> right; deterministic and documented
    return round(math.cos(math.radians(hue_deg)), 3) * 0.9


def series_scan(frames: list[np.ndarray], labels: list[str]) -> dict:
    """One summary tone per frame for a real time series (e.g. 2012→2023)."""
    means = [float(luminance(f).mean()) for f in frames] or [0.0]
    lo, hi = min(means), max(means)
    span = (hi - lo) if (hi - lo) > 1e-6 else 1.0
    steps = []
    for i, (f, label) in enumerate(zip(frames, labels)):
        lum = luminance(f)
        hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)
        rel = (float(lum.mean()) - lo) / span
        steps.append(
            {
                "index": i,
                "label": label,
                "time": round(i * 1.6, 3),
                "duration": 1.45,
                "freq": round(_pitch_hz(rel), 2),
                "amp": round(min(0.42, (0.02 + rel * 0.30) * DISPLAY_GAIN), 4),
                "relative_brightness": round(rel, 3),
                "hue": round(float(hsv[:, :, 0].mean()) * 2.0, 1),
            }
        )
    return {"duration": round(len(steps) * 1.6 + 0.6, 2), "steps": steps}
