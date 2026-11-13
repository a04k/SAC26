"""Tests for the physical-model engine.

These check the contract that matters: one shared measurement grid feeds every
phenomenon, each phenomenon produces a spec that is non-trivial for real NASA
frames, the models genuinely differ in mechanism (not just in a label), the
offline render is audible and stereo, and a flat frame can never invent
variation that is not in the pixels.
"""

import io
import wave

import numpy as np
import pytest

from app.analysis import measure_grid
from app.datasets import DATASETS
from app.frames import get_frame
from app.synth import MODELS, build_spec, model_for, render_spec_wav
from app.synth.render import SR, render_spec

ALL_MODELS = ["wind", "storm", "fire", "ocean", "city", "canopy", "plume", "space"]
MODEL_LAYERS = {"noise", "res", "hit", "swell", "tone"}


def spec_for(dataset_id: str) -> dict:
    ds = next(d for d in DATASETS if d.id == dataset_id)
    return build_spec(get_frame(dataset_id), ds.to_dict())


def _mono(spec: dict) -> np.ndarray:
    return render_spec(spec).mean(axis=0)


def _centroid(x: np.ndarray) -> float:
    spec = np.abs(np.fft.rfft(x * np.hanning(len(x))))
    freqs = np.fft.rfftfreq(len(x), 1 / SR)
    return float((spec * freqs).sum() / max(spec.sum(), 1e-9))


def test_every_dataset_has_a_model_and_builds_a_spec():
    for ds in DATASETS:
        assert ds.model in MODELS, f"{ds.id} has no synthesis model"
        spec = spec_for(ds.id)
        assert spec["model"] == ds.model == model_for(ds.to_dict())
        assert spec["layers"], f"{ds.id} produced no layers"
        assert 4.0 <= spec["duration"] <= 90.0
        assert spec["explain"] and spec["mapping"]
        assert spec["grid"]["cols"] * spec["grid"]["rows"] == len(spec["grid"]["cells"])
        assert len(spec["layers"]) <= 400
        for layer in spec["layers"]:
            assert layer["kind"] in MODEL_LAYERS
            assert 0.0 <= layer["t0"] <= spec["duration"]
            assert layer["dur"] > 0
            assert layer["gain"] >= 0
            assert -1.0 <= layer.get("pan", 0.0) <= 1.0


def test_each_model_actually_differs_in_mechanism():
    """The whole point of the rewrite: models must not share one mechanism."""
    shape = {}
    for model in ALL_MODELS:
        # a synthetic frame with hot, green, water, white and dark cells, so
        # every model has something to read
        frame = np.full((240, 480, 3), 96, np.uint8)
        frame[20:100, 40:200] = (30, 90, 220)      # hot / fire (BGR)
        frame[20:100, 240:400] = (70, 150, 70)     # green canopy
        frame[120:200, 40:200] = (190, 150, 60)    # water
        frame[120:200, 240:400] = (240, 240, 240)  # white cloud
        frame[200:238, :] = 10                     # dark
        spec = build_spec(frame, {"model": model})
        shape[model] = tuple(sorted({layer["model"] for layer in spec["layers"]}))
    # rain and fire are impact-based; wind is turbulence; space is a scan tone
    assert "droplet" in shape["storm"]
    assert "crackle" in shape["fire"]
    assert "turbulence" in shape["wind"]
    assert "scan" in shape["space"]
    assert len(set(shape.values())) == len(ALL_MODELS)


def test_measurement_grid_is_shared_and_physical():
    grid = measure_grid(get_frame("wildfire-smoke"))
    assert grid["cols"] == 12 and grid["rows"] == 6
    cells = grid["cells"]
    assert len(cells) == 72
    for c in cells:
        for key in ("brightness", "saturation", "turbulence", "edges", "gradient"):
            assert 0.0 <= c[key] <= 1.0
        for key in ("hot", "green", "water", "white", "dark"):
            assert 0.0 <= c[key] <= 1.0
    assert max(c["white"] for c in cells) > 0.1


def test_fire_reads_hot_pixels_and_storm_counts_raindrops():
    fire = spec_for("wildfire-smoke")
    storm = spec_for("hurricane-maria")
    assert fire["model"] == "fire" and storm["model"] == "storm"
    assert any(layer["model"] == "crackle" for layer in fire["layers"])
    assert fire["crackle_count"] > 50
    assert storm["drop_count"] > 200
    assert any(layer["model"] == "droplet" for layer in storm["layers"])
    # every droplet keeps its own pan, so the rain is wide, not one mono bed
    pans = {d["p"] for layer in storm["layers"] if layer["model"] == "droplet" for d in layer["drops"]}
    assert len(pans) > 20


def test_storm_is_not_just_noise():
    """The complaint that started this: rain must be impacts, not a noise bed."""
    storm = spec_for("hurricane-maria")
    impacts = sum(len(layer.get("drops", [])) for layer in storm["layers"])
    beds = [layer for layer in storm["layers"] if layer["model"] == "body"]
    assert impacts > 200, "rain must be made of individual drops"
    assert len(beds) == 1, "only one body bed is allowed for the cloud's mass"
    audio = _mono(storm)
    # an impact train is peaky; a noise bed is not
    rms = float(np.sqrt((audio**2).mean()))
    assert float(np.abs(audio).max()) / rms > 4.0


def test_models_are_spectrally_distinct():
    """fire crackles bright; ocean swells low; they must not share a spectrum."""
    fire = _centroid(_mono(spec_for("wildfire-smoke")))
    ocean = _centroid(_mono(spec_for("perpetual-ocean")))
    assert fire > 1500, f"fire should be bright, centroid was {fire:.0f} Hz"
    assert ocean > 100 and ocean < fire


def test_space_scan_is_audible_on_a_dark_frame():
    """A starfield is mostly black; it must still produce sound."""
    spec = spec_for("caldwell-73")
    audio = _mono(spec)
    assert float(np.sqrt((audio**2).mean())) > 0.02
    # left-to-right is time: the scan must have content across the whole file
    third = len(audio) // 3
    for chunk in (audio[:third], audio[third:2 * third], audio[2 * third:]):
        assert float(np.sqrt((chunk**2).mean())) > 0.005


def test_render_is_audible_stereo_and_normalised():
    wav = render_spec_wav(spec_for("hurricane-maria"))
    with wave.open(io.BytesIO(wav), "rb") as wf:
        assert wf.getnchannels() == 2
        assert wf.getframerate() == 44100
        data = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(np.float32) / 32768
    data = data.reshape(-1, 2)
    assert float(np.abs(data).max()) > 0.5
    assert float(np.sqrt((data**2).mean())) > 0.005
    assert np.abs(data[:, 0] - data[:, 1]).max() > 0.001, "render is mono"


@pytest.mark.parametrize("dataset_id", ["wind", "night-lights", "forest-height"])
def test_spec_build_is_fast_enough_for_the_browser(dataset_id):
    spec = spec_for(dataset_id)
    assert spec["duration"] <= 60
    assert len(spec["layers"]) <= 400


def test_flat_image_cannot_invent_variation():
    flat = np.full((240, 480, 3), 128, np.uint8)
    spec = build_spec(flat, {"model": "wind"})
    for key in ("brightness", "saturation", "turbulence", "edges", "gradient"):
        values = [c[key] for c in spec["grid"]["cells"]]
        assert max(values) - min(values) < 1e-6, f"{key} varied on a flat frame"
    # a flat frame gets one bed per row, not one per cell
    assert len(spec["layers"]) <= 8
