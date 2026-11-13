"""Offline WAV renderer (NumPy additive synthesis).

Renders a 16-second stereo loop from SonificationParams so every track can be
downloaded as a real audio file. The frontend WebAudio engine uses the same
params for live playback; this renderer is the "export" path.
"""

import hashlib
import io
import wave

import numpy as np

SR = 22050
SECONDS = 16

SCALES: dict[str, list[int]] = {
    "major-pentatonic": [0, 2, 4, 7, 9],
    "minor-pentatonic": [0, 3, 5, 7, 10],
    "dorian": [0, 2, 3, 5, 7, 9, 10],
    "lydian": [0, 2, 4, 6, 7, 9, 11],
    "major": [0, 2, 4, 5, 7, 9, 11],
    "minor": [0, 2, 3, 5, 7, 8, 10],
    "hirajoshi": [0, 2, 3, 7, 8],
    "whole-tone": [0, 2, 4, 6, 8, 10],
}

NOTE_TO_PC = {
    "C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5,
    "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11,
}


def _freq(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12.0)


def _seed(text: str) -> int:
    return int(hashlib.md5(text.encode()).hexdigest()[:8], 16)


def _add_tone(buf: np.ndarray, start: int, dur_s: float, freq: float,
              amp: float, pan: float, harmonics: int = 3,
              decay: float = 4.0, bright: float = 0.5) -> None:
    """Add a decaying harmonic tone at `start` samples with stereo pan."""
    n = int(dur_s * SR)
    if start >= buf.shape[1] or n <= 0:
        return
    end = min(buf.shape[1], start + n)
    t = np.arange(end - start) / SR
    env = np.exp(-decay * t) * np.minimum(1.0, t * 40.0)
    sig = np.zeros_like(t)
    for k in range(1, harmonics + 1):
        sig += (bright ** (k - 1)) * np.sin(2 * np.pi * freq * k * t) / k
    sig *= env * amp
    left = sig * (1.0 - max(0.0, pan)) * 0.9
    right = sig * (1.0 + min(0.0, pan)) * 0.9
    buf[0, start:end] += left
    buf[1, start:end] += right


def _add_noise(buf: np.ndarray, start: int, dur_s: float, amp: float,
               pan: float, rng: np.random.Generator, hp: bool = True) -> None:
    n = int(dur_s * SR)
    if start >= buf.shape[1] or n <= 0:
        return
    end = min(buf.shape[1], start + n)
    noise = rng.standard_normal(end - start)
    if hp:
        noise = np.diff(noise, prepend=0.0)
    env = np.exp(-np.arange(end - start) / SR * 30.0)
    sig = noise * env * amp
    buf[0, start:end] += sig * (1.0 - max(0.0, pan))
    buf[1, start:end] += sig * (1.0 + min(0.0, pan))


def render_wav(params: dict, features: dict, seed_text: str = "terra") -> bytes:
    rng = np.random.default_rng(_seed(seed_text))
    n = SR * SECONDS
    buf = np.zeros((2, n), dtype=np.float64)

    scale = SCALES.get(params["scale"], SCALES["major-pentatonic"])
    root_pc = NOTE_TO_PC.get(params["root_note"], 0)
    root_midi = 48 + root_pc  # C3-ish register
    tempo = float(params["tempo"])
    density = float(params["density"])
    brightness = float(params["brightness"])
    energy = float(params["energy"])
    pan_spread = float(params["pan_spread"])
    crackle = float(params["crackle"])
    grid = features.get("spatial_grid") or [0.5] * 64
    grid_size = int(features.get("grid_size", 8))

    step_dur = 60.0 / tempo / 2.0  # eighth notes
    steps = int(SECONDS / step_dur)
    bar_steps = 8
    chord_degrees = params.get("chord_degrees", [0, 3, 4, 3])

    def scale_degree(deg: int, octave: int = 0) -> float:
        idx = deg % len(scale)
        octaves = deg // len(scale)
        return root_midi + scale[idx] + 12 * (octave + octaves)

    arp_deg = 0
    for step in range(steps):
        t = step * step_dur
        start = int(t * SR)
        bar = step // bar_steps
        chord_deg = chord_degrees[bar % len(chord_degrees)]

        # --- pad chord on bar start --------------------------------------
        if step % bar_steps == 0:
            base = scale_degree(chord_deg, octave=0)
            for interval in (0, 4, 7):
                f = _freq(base + interval)
                _add_tone(buf, start, step_dur * bar_steps * 1.05, f,
                          amp=0.10 * (0.4 + energy), pan=0.0,
                          harmonics=4, decay=0.35, bright=0.35 + brightness * 0.5)

        # --- bass on beat 1 ----------------------------------------------
        if step % bar_steps == 0:
            f = _freq(scale_degree(chord_deg, octave=-1))
            _add_tone(buf, start, step_dur * 3, f, amp=0.22, pan=0.0,
                      harmonics=2, decay=1.2, bright=0.3)

        # --- arpeggio ------------------------------------------------------
        if rng.random() < density:
            arp_deg += int(rng.integers(-2, 3))
            arp_deg = int(np.clip(arp_deg, -2, len(scale) * 2))
            midi = scale_degree(arp_deg, octave=1)
            # pan from spatial grid cell x-position
            cell = int(rng.integers(0, len(grid)))
            gx = (cell % grid_size) / max(grid_size - 1, 1)
            pan = (gx - 0.5) * 2.2 * pan_spread
            _add_tone(buf, start, step_dur * 2.2, _freq(midi),
                      amp=0.16 * (0.4 + energy), pan=float(np.clip(pan, -0.9, 0.9)),
                      harmonics=3, decay=3.5, bright=0.4 + brightness * 0.5)

        # --- hats / crackle ------------------------------------------------
        if step % 2 == 1 and rng.random() < 0.25 + crackle * 0.6:
            _add_noise(buf, start, 0.05, amp=0.05 + crackle * 0.08,
                       pan=float(rng.uniform(-0.6, 0.6)), rng=rng)

        # --- shimmer strikes ------------------------------------------------
        if rng.random() < crackle * 0.25:
            midi = scale_degree(int(rng.integers(0, len(scale))), octave=2)
            _add_tone(buf, start, 0.6, _freq(midi), amp=0.08, pan=float(rng.uniform(-0.8, 0.8)),
                      harmonics=5, decay=6.0, bright=0.8)

    # mid/side widening: the 8x8 spatial grid should actually be audible in
    # stereo, so lift the side channel before normalising.
    mid = (buf[0] + buf[1]) / 2
    side = (buf[0] - buf[1]) / 2
    side *= 2.4
    buf[0] = mid + side
    buf[1] = mid - side

    # gentle fade in/out + normalize
    fade = int(0.05 * SR)
    buf[:, :fade] *= np.linspace(0, 1, fade)
    buf[:, -fade:] *= np.linspace(1, 0, fade)
    peak = np.abs(buf).max()
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
