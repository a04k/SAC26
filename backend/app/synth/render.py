"""Offline renderer for phenomenon specs (NumPy).

Renders the same spec the browser synthesises live: filtered-noise beds
(2-pole resonant filters), sine partials with damped envelopes, and stochastic
bursts (thunder, crackle, clicks, droplets). No musical processing is applied.
"""

from __future__ import annotations

import io
import wave

import numpy as np

SR = 44100


def _noise(n: int, seed: int) -> np.ndarray:
    return np.random.default_rng(seed).standard_normal(n).astype(np.float32)


def _onepole_lp(x: np.ndarray, cutoff: float, sr: int = SR) -> np.ndarray:
    a = float(np.exp(-2.0 * np.pi * cutoff / sr))
    out = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        out[i] = acc
    return out


def _onepole_hp(x: np.ndarray, cutoff: float, sr: int = SR) -> np.ndarray:
    return x - _onepole_lp(x, cutoff, sr)


def _biquad_bp(x: np.ndarray, fc: float, q: float, sr: int = SR) -> np.ndarray:
    """RBJ band-pass, applied by direct-form recurrence."""
    w0 = 2 * np.pi * min(fc, sr * 0.45) / sr
    alpha = np.sin(w0) / (2 * max(q, 0.1))
    b0, b2 = alpha, -alpha
    a0 = 1 + alpha
    a1, a2 = -2 * np.cos(w0), 1 - alpha
    b0, b2, a1, a2 = b0 / a0, b2 / a0, a1 / a0, a2 / a0
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        yi = b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1 = x1, x[i]
        y2, y1 = y1, yi
        y[i] = yi
    return y


def _filter(x: np.ndarray, kind: str, freq: float, q: float) -> np.ndarray:
    if kind == "lowpass":
        return _onepole_lp(x, freq)
    if kind == "highpass":
        return _onepole_hp(x, freq)
    # resonant band-pass, applied twice for a steeper skirt
    return _biquad_bp(_biquad_bp(x, freq, q), freq, q)


def _fade(n: int, sr: int = SR) -> np.ndarray:
    f = min(int(0.01 * sr), n // 2)
    env = np.ones(n, np.float32)
    if f > 2:
        env[:f] = np.linspace(0, 1, f)
        env[-f:] = np.linspace(1, 0, f)
    return env


def render_spec(spec: dict) -> np.ndarray:
    dur = float(spec["duration"])
    n = int(SR * dur)
    buf = np.zeros((2, n), np.float64)
    seed = 100

    for layer in spec["layers"]:
        gain = float(layer.get("gain", 0))
        if gain <= 0:
            continue
        start = int(float(layer.get("t0", 0)) * SR)
        if start >= n:
            continue
        length = min(int(float(layer.get("dur", 1.0)) * SR), n - start)
        if length <= 4:
            continue
        seed += 1
        t = np.arange(length) / SR
        env = _fade(length)
        pan = float(layer.get("pan", 0.0))
        left = np.sqrt((1 - pan) / 2)
        right = np.sqrt((1 + pan) / 2)
        kind = layer["kind"]

        if kind == "noise":
            sig = _noise(length, seed)
            if "freq" in layer:
                sig = _filter(sig, layer.get("filter", "bandpass"), float(layer["freq"]), float(layer.get("q", 1.0)))
            sig = sig * env * gain * 2.2
        elif kind == "tone":
            sig = np.sin(2 * np.pi * float(layer["freq"]) * t)
            attack = max(1, int(float(layer.get("attack", 0.005)) * SR))
            decay = max(1, int(float(layer.get("decay", 0.4)) * SR))
            en = np.ones(length)
            en[: min(attack, length)] = np.linspace(0, 1, min(attack, length))
            tail = min(decay, length)
            en[-tail:] *= np.exp(-np.linspace(0, 5, tail))
            sig = sig * en * gain * 2.4
        elif kind == "burst":
            burst = layer.get("burst", "click")
            if burst == "thunder":
                noise = _noise(length, seed)
                rumble = _onepole_lp(noise, float(layer.get("freq", 70)))
                decay = np.exp(-t * 1.6)
                sig = rumble * decay * gain * 6.0
            elif burst == "crackle":
                impulses = np.zeros(length, np.float32)
                rng = np.random.default_rng(seed)
                count = max(2, int(length / SR * 1400))
                idx = rng.integers(0, length - 2, count)
                impulses[idx] = rng.uniform(-1, 1, count)
                sig = _onepole_hp(impulses, float(layer.get("freq", 3000))) * gain * 4.0
            else:  # click / droplet
                env_c = np.exp(-t * 90.0)
                sig = np.sin(2 * np.pi * float(layer.get("freq", 3000)) * t) * env_c * gain * 3.0
        else:
            continue

        buf[0, start:start + length] += sig * left
        buf[1, start:start + length] += sig * right

    peak = float(np.abs(buf).max())
    if peak > 0:
        buf *= 0.89 / peak
    return buf


def to_wav(buf: np.ndarray) -> bytes:
    pcm = (np.clip(buf, -1, 1) * 32767).astype(np.int16)
    out = io.BytesIO()
    with wave.open(out, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.T.tobytes())
    return out.getvalue()


def render_spec_wav(spec: dict) -> bytes:
    return to_wav(render_spec(spec))
