"""Terra Tunes API — per-phenomenon sonification of real NASA frames.

Endpoints
  GET  /api/health
  GET  /api/datasets                 the 13 records with provenance
  GET  /api/datasets/{id}
  GET  /api/datasets/{id}/frame.png  the real bundled NASA frame
  GET  /api/datasets/{id}/assets/{asset}.png   time-series frames
  GET  /api/datasets/{id}/spec       measurement grid + phenomenon synthesis spec
  GET  /api/datasets/{id}/render.wav the offline render of the same spec
  POST /api/analyze                  measure any uploaded frame and build a spec
"""

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from .datasets import DATASETS, DATASETS_BY_ID
from .frames import asset_ids, frame_bytes, get_asset, get_frame
from .synth import MODELS, build_spec, model_for, render_spec_wav

app = FastAPI(title="Terra Tunes API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_SIDE = 900  # analysis is scale-independent; keeps uploads fast


def _dataset(dataset_id: str):
    ds = DATASETS_BY_ID.get(dataset_id)
    if ds is None:
        raise HTTPException(404, "unknown dataset")
    return ds


def _downscale(img: np.ndarray, max_side: int = MAX_SIDE) -> np.ndarray:
    h, w = img.shape[:2]
    s = max(h, w)
    if s <= max_side:
        return img
    f = max_side / s
    return cv2.resize(img, (int(w * f), int(h * f)), interpolation=cv2.INTER_AREA)


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "datasets": len(DATASETS),
        "assets": len(asset_ids()),
        "models": sorted(MODELS),
    }


@app.get("/api/datasets")
def list_datasets() -> list[dict]:
    return [d.to_dict() for d in DATASETS]


@app.get("/api/datasets/{dataset_id}")
def get_dataset(dataset_id: str) -> dict:
    return _dataset(dataset_id).to_dict()


@app.get("/api/datasets/{dataset_id}/frame.webp")
def get_frame_webp(dataset_id: str) -> Response:
    """The track's frame, for sleeves, labels and the measurement view."""
    _dataset(dataset_id)
    return Response(
        frame_bytes(dataset_id, ".webp"),
        media_type="image/webp",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@app.get("/api/datasets/{dataset_id}/frame.png")
def get_frame_png(dataset_id: str) -> Response:
    """Same frame, lossless — used by the scanner and available for download."""
    _dataset(dataset_id)
    return Response(
        frame_bytes(dataset_id, ".png"),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@app.get("/api/datasets/{dataset_id}/assets/{asset_id}.png")
def get_asset_png(dataset_id: str, asset_id: str) -> Response:
    _dataset(dataset_id)
    try:
        img = get_asset(asset_id)
    except FileNotFoundError:
        raise HTTPException(404, "unknown asset")
    ok, buf = cv2.imencode(".png", img)
    if not ok:
        raise HTTPException(500, "encode failed")
    return Response(buf.tobytes(), media_type="image/png")


@app.get("/api/datasets/{dataset_id}/spec")
def get_spec(dataset_id: str) -> JSONResponse:
    ds = _dataset(dataset_id)
    spec = build_spec(_downscale(get_frame(dataset_id)), ds.to_dict())
    spec.pop("dataset", None)
    spec["dataset_id"] = dataset_id
    spec["model"] = model_for(ds.to_dict())
    return JSONResponse(spec)


@app.get("/api/datasets/{dataset_id}/render.wav")
def get_render(dataset_id: str) -> Response:
    ds = _dataset(dataset_id)
    spec = build_spec(_downscale(get_frame(dataset_id)), ds.to_dict())
    return Response(
        render_spec_wav(spec),
        media_type="audio/wav",
        headers={"Content-Disposition": f'attachment; filename="terra-{dataset_id}.wav"'},
    )


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...), model: str = "plume") -> JSONResponse:
    raw = await file.read()
    img = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "could not decode image")
    if model not in MODELS:
        raise HTTPException(400, f"model must be one of {sorted(MODELS)}")
    shell = {"model": model, "element": model}
    spec = build_spec(_downscale(img), shell)
    spec.pop("dataset", None)
    spec["filename"] = file.filename
    spec["width"] = int(img.shape[1])
    spec["height"] = int(img.shape[0])
    return JSONResponse(spec)
