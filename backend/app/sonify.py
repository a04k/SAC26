"""Feature -> music mapping (the sonification rules).

Converts the OpenCV feature dict from vision.py into a SonificationParams
dict consumed by both the offline WAV renderer (synth.py) and the frontend
WebAudio engine. Everything is quantized to a musical scale so that even
chaotic data sounds intentional.
"""

from .datasets import Dataset

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def features_to_params(features: dict, dataset: Dataset) -> dict:
    mean_h, mean_s, mean_v = features["mean_hsv"]
    lum_mean = mean_v / 255.0
    sat_mean = mean_s / 255.0
    edge = features["edge_density"]
    entropy = features["entropy"]  # ~0..5 for 32 bins
    colorfulness = features["colorfulness"]
    grid = features["spatial_grid"]
    grid_std = float(__import__("numpy").std(grid)) if grid else 0.0
    radial = features["fft_radial"]
    high_freq = float(radial[-1]) if radial else 0.0

    # Root note from dominant hue: 36 hue bins over 360 degrees -> 12 pitch classes.
    peak_bin = int(features["hue_peaks"][0]) if features["hue_peaks"] else 0
    hue_deg = peak_bin * 10.0
    pitch_class = int(round(hue_deg / 30.0)) % 12
    root_note = NOTE_NAMES[pitch_class]

    # Chord degrees from the next hue peaks (I - IV - V - IV flavour).
    peaks = features["hue_peaks"]
    chord_degrees = [0, 3, 4, 3]
    if len(peaks) >= 2:
        chord_degrees = [0, int(peaks[1]) % 5, 4, int(peaks[1]) % 5]

    # Busyness: how much visual detail the frame carries, on a log scale so
    # smooth gradients and dense city grids both land in a usable range.
    import math

    grad = features.get("gradient_mean", 0.0)
    texture = features.get("texture_energy", 0.0)
    log_sharp = math.log1p(features["sharpness"]) / math.log1p(5000.0)
    busyness = _clamp(0.34 * log_sharp + 0.36 * min(grad / 26.0, 1.0) + 0.18 * min(edge * 6, 1) + 0.12 * texture, 0.0, 1.0)

    # Tempo keeps each dataset's character (a lightning track is fast, CO2 slow)
    # while the frame's detail stretches or compresses it.
    tempo = int(round(_clamp(dataset.base_tempo * (0.66 + busyness * 1.15), 44, 168)))
    density = _clamp(0.14 + busyness * 0.72 + entropy / 16.0, 0.08, 1.0)
    brightness = _clamp(0.22 + sat_mean * 0.5 + lum_mean * 0.28, 0.0, 1.0)
    energy = _clamp(lum_mean * 1.15, 0.0, 1.0)
    warmth = _clamp(1.0 - brightness, 0.0, 1.0)
    pan_spread = _clamp(0.25 + grid_std * 1.6, 0.0, 1.0)
    space = _clamp(colorfulness / 120.0, 0.0, 1.0)
    crackle = _clamp(high_freq * 0.8 + edge * 0.6, 0.0, 1.0)

    return {
        "root_note": root_note,
        "scale": dataset.scale,
        "scale_name": dataset.scale_name,
        "instrument": dataset.instrument,
        "instrument_name": dataset.instrument_name,
        "tempo": tempo,
        "density": round(density, 3),
        "brightness": round(brightness, 3),
        "energy": round(energy, 3),
        "warmth": round(warmth, 3),
        "pan_spread": round(pan_spread, 3),
        "space": round(space, 3),
        "crackle": round(crackle, 3),
        "busyness": round(busyness, 3),
        "chord_degrees": chord_degrees,
        "centroid": features["centroid"],
    }
