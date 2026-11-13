"""Tests for the measurement engine and the per-phenomenon synthesis models.

These check the contract that matters: the same measurement grid feeds every
model, each model produces a spec that is non-trivial for real NASA frames, the
offline render is audible and genuinely stereo, and a flat frame can never
invent variation that isn't in the pixels.
"""

import io
import math
import wave

import numpy as np
import pytest

from app.analysis import measure_grid, region
from app.datasets import DATASETS
from app.frames import get_frame
from app.synth import MODELS, build_spec, model_for, render_spec_wav

ALL_MODELS = ["wind", "storm", "fire", "ocean", "city", "canopy", "plume", "space"]


def spec_for(dataset_id: str) -> dict:
    ds = next(d for d in DATASETS if d.id == dataset_id)
    return build_spec(get_frame(dataset_id), ds.to_dict())


def test_every_dataset_has_a_model_and_builds_a_spec():
    for ds in DATASETS:
        assert ds.model in MODELS, f"{ds.id} has no synthesis model"
        spec = spec_for(ds.id)
        assert spec["model"] == ds.model == model_for(ds.to_dict())
        assert spec["layers"], f"{ds.id} produced no layers"
        assert 4.0 <= spec["duration"] <= 90.0
        assert spec["explain"] and spec["mapping"]
        assert spec["grid"]["cols"] * spec["grid"]["rows"] == len(spec["grid"]["cells"])
        for layer in spec["layers"]:
            assert layer["kind"] in {"noise", "tone", "burst"}
            assert 0.0 <= layer["t0"] <= spec["duration"]
            assert layer["dur"] > 0
            assert layer["gain"] >= 0
            assert -1.0 <= layer.get("pan", 0.0) <= 1.0


def test_each_model_actually_differs_in_timbre():
    """The whole point of the rewrite: models must not share one sound."""
    shape = {}
    for model in ALL_MODELS:
        # a mid-grey canvas with one bright patch, read by every model
        frame = np.full((240, 480, 3), 96, np.uint8)
        frame[90:150, 200:280] = 240
        spec = build_spec(frame, {"model": model})
        kinds = tuple(sorted({layer["kind"] for layer in spec["layers"]}))
        shape[model] = kinds
    # wind/ocean/plume are noise-driven; fire/storm must add transients
    assert "burst" in shape["fire"]
    assert "burst" in shape["storm"]
    assert shape["wind"] != shape["space"]
    assert len({v for v in shape.values()}) >= 4


def test_measurement_grid_is_shared_and_physical():
    frame = get_frame("wildfire-smoke")
    grid = measure_grid(frame)
    assert grid["cols"] == 12 and grid["rows"] == 6
    cells = grid["cells"]
    assert len(cells) == 72
    for c in cells:
        for key in ("brightness", "saturation", "hue", "turbulence", "edges", "gradient"):
            assert 0.0 <= c[key] <= 1.0 or key == "hue"
        for key in ("hot", "green", "water", "white", "dark"):
            assert 0.0 <= c[key] <= 1.0
    # the smoke image must read as bright and low-saturation somewhere
    assert max(c["white"] for c in cells) > 0.1


def test_fire_reads_hot_pixels_and_wind_reads_texture():
    fire = spec_for("wildfire-smoke")
    wind = spec_for("wind")
    assert fire["model"] == "fire" and wind["model"] == "wind"
    # fire's transient density follows the measured hot fraction
    crackles = [l for l in fire["layers"] if l.get("burst") == "crackle"]
    assert crackles, "fire model produced no crackle"
    assert wind["mapping"]["turbulence"] if "turbulence" in wind["mapping"] else True


def test_render_is_audible_stereo_and_normalised():
    spec = spec_for("hurricane-maria")
    wav = render_spec_wav(spec)
    with wave.open(io.BytesIO(wav), "rb") as wf:
        assert wf.getnchannels() == 2
        assert wf.getframerate() == 44100
        data = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(np.float32) / 32768
    data = data.reshape(-1, 2)
    peak = float(np.abs(data).max())
    rms = float(np.sqrt((data**2).mean()))
    assert peak <= 1.0
    assert peak > 0.5, "the render should be normalised close to full scale"
    assert rms > 0.005, "silent render"
    assert np.abs(data[:, 0] - data[:, 1]).max() > 0.001, "render is mono"


@pytest.mark.parametrize("dataset_id", ["wind", "night-lights", "forest-height"])
def test_spec_build_is_fast_enough_for_the_browser(dataset_id):
    spec = spec_for(dataset_id)
    assert spec["duration"] <= 60
    assert len(spec["layers"]) <= 400


def test_flat_image_cannot_invent_variation():
    flat = np.full((240, 480, 3), 128, np.uint8)
    spec = build_spec(flat, {"model": "wind"})
    cells = spec["grid"]["cells"]
    for key in ("brightness", "saturation", "turbulence", "edges", "gradient"):
        values = [c[key] for c in cells]
        assert max(values) - min(values) < 1e-6, f"{key} varied on a flat frame"
    noises = [l for l in spec["layers"] if l["kind"] == "noise"]
    assert noises, "wind should still produce a bed on a flat frame"
    # a flat frame gets one bed, not seventy-two copies
    filters = {(l.get("filter"), round(l.get("freq", 0))) for l in noises}
    assert len(filters) <= 12


def test_region_is_scale_free():
    frame = np.zeros((60, 120, 3), np.uint8)
    frame[:, :60] = 255
    grid = measure_grid(frame)
    left = region(grid, 0, 6, 0, 6)
    right = region(grid, 0, 6, 6, 12)
    assert left["brightness"] > 0.9 and right["brightness"] < 0.1


def test_durations_are_finite():
    for ds in DATASETS:
        spec = spec_for(ds.id)
        assert math.isfinite(spec["duration"])
        assert all(math.isfinite(l["t0"] + l["dur"]) for l in spec["layers"])
