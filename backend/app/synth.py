"""Offline WAV renderer for the direct pixel sonification.

No instruments, no scales, no reverb: each latitude band becomes a sustained
sine at the pitch its brightness dictates, plus a band-limited noise layer
proportional to its measured texture, panned by its hue. Tempo and harmony
never enter the signal path.
"""

import io
import wave

import cv2
import numpy as np

from .scan import frame_scan

SR = 44100
FADE = 0.012  # seconds, click-suppression only


def read_image(data: bytes) -> np.ndarray:
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("could not decode image")
    return img


def _noise_burst(n: int, amount: float, rng: np.random.Generator) -> np.ndarray:
    """Band-limited noise whose cutoff follows the measured texture."""
    if amount <= 0.001:
        return np.zeros(n, np.float32)
    white = rng.standard_normal(n).astype(np.float32)
    # one-pole low-pass, fixed coefficient: deterministic spectral colour
    out = np.empty_like(white)
    acc = 0.0
    a = 0.35
    for i in range(n):
        acc += a * (white[i] - acc)
        out[i] = acc
    return out * (amount * 4.0)


def render_frame_wav(frame_bgr: np.ndarray, seconds: float = 24.0) -> bytes:
    scan = frame_scan(frame_bgr, seconds=seconds)
    n = int(SR * seconds)
    buf = np.zeros((2, n), np.float64)
    rng = np.random.default_rng(7)

    for tone in scan["tones"]:
        start = int(tone["time"] * SR)
        dur = tone["duration"]
        length = min(int(dur * SR), n - start)
        if length <= 0:
            continue
        t = np.arange(length) / SR
        env = np.ones(length, np.float32)
        f = int(FADE * SR)
        if f > 0 and length > 2 * f:
            env[:f] = np.linspace(0, 1, f)
            env[-f:] = np.linspace(1, 0, f)

        sig = np.sin(2 * np.pi * tone["freq"] * t).astype(np.float32)
        sig += _noise_burst(length, tone["noise"], rng)
        sig *= env * tone["amp"]

        # four-column melody: the pixels the user can see in that band
        for k, note in enumerate(tone["melody"]):
            s0 = start + int(k * tone["melody_step"] * SR)
            ln = min(int(0.34 * SR), n - s0)
            if ln <= 0 or s0 >= n:
                continue
            tt = np.arange(ln) / SR
            menv = np.exp(-tt * 7.0)
            buf[0, s0:s0 + ln] += np.sin(2 * np.pi * note["freq"] * tt) * menv * note["amp"] * 0.8
            buf[1, s0:s0 + ln] += np.sin(2 * np.pi * note["freq"] * tt) * menv * note["amp"] * 0.8

        # hue pan
        pan = tone["pan"]
        left = np.sqrt((1.0 - pan) / 2.0)
        right = np.sqrt((1.0 + pan) / 2.0)
        buf[0, start:start + length] += sig * left
        buf[1, start:start + length] += sig * right

    peak = float(np.abs(buf).max())
    if peak > 0:
        buf *= 0.89 / peak
    pcm = (buf * 32767).astype(np.int16)
    out = io.BytesIO()
    with wave.open(out, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.T.tobytes())
    return out.getvalue()
