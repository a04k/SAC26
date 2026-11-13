"""Offline renderer for the phenomenon specs (NumPy only, no scipy).

This is the reference implementation of every physical model: the browser's
WebAudio graph mirrors these blocks block for block, and the WAV you can
download is rendered here. Keeping one set of rules matters — a demo where the
download sounds different from the stream is a demo that is lying.

Blocks
  turbulence   white noise -> gust envelope (low-passed, squared) -> bank of
               two RBJ band-passes in series -> soft saturation
  body         low-passed noise (the pressure of moving air / water mass)
  thunder      bright crack (very fast attack) + heavily low-passed rumble with
               a long exponential decay
  dropletec    one short damped resonator per impact, summed in place
  crackle      same resonator, much shorter, brighter, random polarity
  swell        band-passed noise with a periodic amplitude envelope
  ping         three-partial modal resonator with independent decays
  glint        damped sine with a 2 ms attack
  scan         gated sine with a soft attack (Caldwell)
"""

from __future__ import annotations

import io
import wave

import numpy as np

SR = 44100


# ------------------------------------------------------------------ filters


def _white(n: int, rng: np.random.Generator) -> np.ndarray:
    return rng.standard_normal(n).astype(np.float32)


def _lp(x: np.ndarray, cutoff: float) -> np.ndarray:
    """One-pole low-pass; `cutoff` in Hz."""
    a = float(np.exp(-2.0 * np.pi * min(cutoff, SR * 0.45) / SR))
    out = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1.0 - a) * x[i] + a * acc
        out[i] = acc
    return out


def _hp(x: np.ndarray, cutoff: float) -> np.ndarray:
    return x - _lp(x, cutoff)


def _biquad(x: np.ndarray, kind: str, fc: float, q: float) -> np.ndarray:
    """RBJ biquad: 'bp' (constant skirt gain), 'lp', 'hp', 'peak'."""
    fc = float(np.clip(fc, 20.0, SR * 0.45))
    q = max(float(q), 0.1)
    w0 = 2 * np.pi * fc / SR
    cw, sw = np.cos(w0), np.sin(w0)
    alpha = sw / (2 * q)
    if kind == "bp":
        b0, b1, b2 = alpha, 0.0, -alpha
    elif kind == "hp":
        b0, b1, b2 = (1 + cw) / 2, -(1 + cw), (1 + cw) / 2
    else:
        b0, b1, b2 = (1 - cw) / 2, 1 - cw, (1 - cw) / 2
    a0 = 1 + alpha
    a1, a2 = -2 * cw, 1 - alpha
    b0, b1, b2, a1, a2 = b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        yi = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1 = x1, x[i]
        y2, y1 = y1, yi
        y[i] = yi
    return y


def _fade(n: int) -> np.ndarray:
    f = min(int(0.012 * SR), max(1, n // 2))
    env = np.ones(n, np.float32)
    if f > 2:
        env[:f] = np.linspace(0, 1, f)
        env[-f:] = np.linspace(1, 0, f)
    return env


# ------------------------------------------------------------------- events


def _resonator(out: np.ndarray, start: int, freq: float, decay: float, gain: float,
               polarity: float = 1.0, partials: tuple = (1.0,)) -> None:
    """Add a damped resonant impact in place (a drop, a crackle, a ping)."""
    n = min(int(decay * 6.0 * SR), len(out) - start)
    if n <= 8:
        return
    t = np.arange(n) / SR
    sig = np.zeros(n, np.float32)
    for i, amp in enumerate(partials):
        f = freq * (1.0 + 0.62 * i)
        if f > SR * 0.45:
            continue
        sig += amp * np.sin(2 * np.pi * f * t) * np.exp(-t / max(decay, 0.001))
    # 2 ms attack so the transient does not click
    a = max(1, int(0.002 * SR))
    if n > a:
        sig[:a] *= np.linspace(0, 1, a)
    out[start:start + n] += polarity * gain * sig


# ------------------------------------------------------------- layer render


def _layer(buf: np.ndarray, layer: dict, rng: np.random.Generator, n: int) -> None:
    gain = float(layer.get("gain", 0))
    if gain <= 0:
        return
    model = layer.get("model", "body")
    start = int(float(layer.get("t0", 0)) * SR)
    if start >= n:
        return
    length = min(int(float(layer.get("dur", 1.0)) * SR), n - start)
    if length <= 8:
        return
    pan = float(np.clip(layer.get("pan", 0.0), -1, 1))
    gl, gr = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    t = np.arange(length) / SR
    sig = None

    if model == "turbulence":
        noise = _white(length, rng)
        # gust envelope: slow, squared, always positive
        gust = _lp(_white(length, rng), 2.6 * float(layer.get("gust", 1.0)))
        gust = np.abs(gust) / (np.abs(gust).max() + 1e-9)
        gust = 0.25 + 1.5 * gust ** 1.6
        hiss = _biquad(_biquad(noise, "bp", float(layer.get("freq", 800)), float(layer.get("q", 1.0))),
                       "bp", float(layer.get("freq", 800)), float(layer.get("q", 1.0)))
        sig = np.tanh(hiss * gust * 2.4) * _fade(length) * gain

    elif model == "body":
        noise = _lp(_white(length, rng), float(layer.get("freq", 120)))
        sig = noise * _fade(length) * gain * 2.2

    elif model == "thunder":
        noise = _white(length, rng)
        rumble = _lp(_lp(noise, float(layer.get("freq", 70))), float(layer.get("freq", 70)) * 1.6)
        env = np.exp(-t * (1.0 / max(float(layer.get("decay", 1.6)), 0.2)))
        # the crack: the first 60 ms, bright and hard
        crack_n = min(length, int(0.06 * SR))
        crack = _hp(noise, 900.0)[:crack_n] * np.exp(-np.arange(crack_n) / (0.012 * SR))
        body = rumble * env
        body[:crack_n] += crack * float(layer.get("crack", 0.5)) * 1.6
        sig = body * _fade(length) * gain * 3.0

    elif model in ("droplet", "crackle", "glint", "ping"):
        out_l = np.zeros(length, np.float32)
        out_r = np.zeros(length, np.float32)
        key = {"droplet": "drops", "crackle": "hits"}.get(model, "glints" if model == "glint" else "pings")
        if model in ("droplet", "crackle"):
            key = "drops" if model == "droplet" else "hits"
        events = layer.get(key, [])
        base = float(layer.get("t0", 0))
        for e in events:
            off = int(max(0.0, float(e["t"]) - base) * SR)
            if off >= length:
                continue
            f = float(e["f"])
            d = float(e.get("d", 0.012))
            # each impact keeps its own place in the stereo field
            ep = float(np.clip(e.get("p", 0.0), -1, 1))
            el, er = np.sqrt((1 - ep) / 2), np.sqrt((1 + ep) / 2)
            tmp = np.zeros(length, np.float32)
            if model == "droplet":
                _resonator(tmp, off, f, d, float(e["g"]), partials=(1.0, 0.35))
            elif model == "crackle":
                _resonator(tmp, off, f, d, float(e["g"]), polarity=float(rng.choice([-1.0, 1.0])),
                           partials=(1.0, 0.5, 0.25))
            elif model == "glint":
                _resonator(tmp, off, f, d, float(e["g"]), partials=(1.0, 0.12))
            else:  # ping, three-partial modal
                _resonator(tmp, off, f, d, float(e["g"]), partials=(1.0, 0.45, 0.22))
            out_l += tmp * el
            out_r += tmp * er
        buf[0, start:start + length] += out_l * gain * 1.5
        buf[1, start:start + length] += out_r * gain * 1.5
        return

    elif model == "swell":
        noise = _biquad(_white(length, rng), "bp", float(layer.get("freq", 700)), 1.1)
        period = max(float(layer.get("period", 5.0)), 0.6)
        env = 0.25 + 0.75 * (0.5 + 0.5 * np.sin(2 * np.pi * t / period - np.pi / 2)) ** 2
        sig = noise * env * _fade(length) * gain * 2.0

    elif model == "foam":
        noise = _hp(_white(length, rng), float(layer.get("freq", 3000)))
        env = np.exp(-t * 3.4)
        sig = noise * env * _fade(length) * gain * 1.6

    elif model == "whistle":
        # a thin resonance riding on the gust: modal, not musical
        f = float(layer.get("freq", 900))
        env = np.exp(-(((t - length / SR / 2) / (length / SR / 3)) ** 2)) * 0.6
        sig = np.sin(2 * np.pi * f * t) * env * gain

    elif model == "plume":
        noise = _lp(_white(length, rng), 420.0)
        period = max(float(layer.get("period", 6.0)), 0.8)
        env = 0.3 + 0.7 * (0.5 + 0.5 * np.sin(2 * np.pi * t / period))
        sig = noise * env * _fade(length) * gain * 2.0

    elif model == "scan":
        # Caldwell's method: a pure tone whose pitch is the pixel brightness,
        # soft attack, no partials. Brightness never reaches zero in a real
        # frame, so the pitch floor is generous and the envelope follows it.
        f = float(layer.get("freq", 220))
        a = max(1, int(float(layer.get("attack", 0.02)) * SR))
        env = np.ones(length, np.float32)
        env[:a] = np.linspace(0, 1, a)
        tail = max(1, int(0.12 * SR))
        if length > tail:
            env[-tail:] *= np.linspace(1, 0, tail)
        sig = np.sin(2 * np.pi * f * t) * env * gain

    elif model == "sparkle":
        out = np.zeros(length, np.float32)
        for e in layer.get("glints", []):
            off = int(max(0.0, float(e["t"]) - float(layer.get("t0", 0))) * SR)
            if off < length:
                _resonator(out, off, float(e["f"]), float(e.get("d", 0.1)), float(e["g"]), partials=(1.0, 0.2))
        sig = out * gain

    if sig is None:
        return
    buf[0, start:start + length] += sig * gl
    buf[1, start:start + length] += sig * gr


def render_spec(spec: dict) -> np.ndarray:
    n = int(SR * float(spec["duration"]))
    buf = np.zeros((2, n), np.float64)
    for i, layer in enumerate(spec["layers"]):
        _layer(buf, layer, np.random.default_rng(1000 + i), n)

    # gentle master: soft-knee limiter so crackle transients do not clip
    peak = float(np.abs(buf).max())
    if peak > 0:
        buf = np.tanh(buf / peak * 1.15) * 0.82
    # fade the ends so the file opens and closes cleanly
    f = min(int(0.03 * SR), n // 2)
    buf[:, :f] *= np.linspace(0, 1, f)
    buf[:, -f:] *= np.linspace(1, 0, f)
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
