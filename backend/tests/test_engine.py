"""Smoke tests for the vision -> sonify -> synth pipeline."""

import io
import wave

import numpy as np

from app.datasets import DATASETS
from app.frames import get_frame
from app.sonify import features_to_params
from app.synth import render_wav
from app.vision import extract_features


def test_all_datasets_pipeline():
    for ds in DATASETS:
        frame = get_frame(ds.id)
        assert frame.shape == (512, 512, 3)
        features = extract_features(frame)
        assert len(features["spatial_grid"]) == 64
        assert len(features["luminance_histogram"]) == 32
        assert len(features["hue_histogram"]) == 36
        assert 0.0 <= features["edge_density"] <= 1.0
        params = features_to_params(features, ds)
        assert 44 <= params["tempo"] <= 168
        assert 0.0 <= params["density"] <= 1.0
        assert 0.0 <= params["busyness"] <= 1.0
        assert 0.0 <= features["gradient_mean"]
        assert 0.0 <= features["texture_energy"] <= 1.0
        assert params["root_note"] in ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
        wav = render_wav(params, features, seed_text=ds.id)
        with wave.open(io.BytesIO(wav), "rb") as wf:
            assert wf.getnchannels() == 2
            assert wf.getframerate() == 22050
            assert wf.getnframes() > 0


def test_analyze_path_with_synthetic_image():
    img = np.zeros((128, 128, 3), np.uint8)
    img[:] = (200, 100, 50)
    features = extract_features(img)
    assert features["mean_hsv"][1] > 100  # saturated orange
    params = features_to_params(features, DATASETS[0])
    assert params["brightness"] > 0.3
