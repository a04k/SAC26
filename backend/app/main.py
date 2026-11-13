"""Terra Jukebox API — FastAPI application.

Endpoints:
  GET  /api/health
  GET  /api/datasets
  GET  /api/datasets/{id}
  GET  /api/datasets/{id}/frame.png   procedural EIC-style frame
  GET  /api/datasets/{id}/features    OpenCV features + sonification params
  GET  /api/datasets/{id}/render.wav  offline-rendered 16s audio loop
  POST /api/analyze                   upload any image -> features + params
"""

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from .datasets import DATASETS, DATASETS_BY_ID
from .frames import frame_png_bytes, get_frame
from .sonify import features_to_params
from .synth import render_wav
from .vision import extract_features

app = FastAPI(title="Terra Jukebox API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "datasets": len(DATASETS)}


@app.get("/api/datasets")
def list_datasets() -> list[dict]:
    return [d.to_dict() for d in DATASETS]


@app.get("/api/datasets/{dataset_id}")
def get_dataset(dataset_id: str) -> dict:
    ds = DATASETS_BY_ID.get(dataset_id)
    if ds is None:
        raise HTTPException(404, "unknown dataset")
    return ds.to_dict()


@app.get("/api/datasets/{dataset_id}/frame.png")
def get_frame_png(dataset_id: str) -> Response:
    if dataset_id not in DATASETS_BY_ID:
        raise HTTPException(404, "unknown dataset")
    return Response(frame_png_bytes(dataset_id), media_type="image/png")


@app.get("/api/datasets/{dataset_id}/features")
def get_features(dataset_id: str) -> JSONResponse:
    ds = DATASETS_BY_ID.get(dataset_id)
    if ds is None:
        raise HTTPException(404, "unknown dataset")
    features = extract_features(get_frame(dataset_id))
    params = features_to_params(features, ds)
    return JSONResponse({"dataset": ds.to_dict(), "features": features, "params": params})


@app.get("/api/datasets/{dataset_id}/render.wav")
def get_render(dataset_id: str) -> Response:
    ds = DATASETS_BY_ID.get(dataset_id)
    if ds is None:
        raise HTTPException(404, "unknown dataset")
    features = extract_features(get_frame(dataset_id))
    params = features_to_params(features, ds)
    wav = render_wav(params, features, seed_text=dataset_id)
    return Response(
        wav,
        media_type="audio/wav",
        headers={"Content-Disposition": f'attachment; filename="terra-{dataset_id}.wav"'},
    )


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)) -> JSONResponse:
    raw = await file.read()
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "could not decode image")
    # Use the first dataset's recipe as the default instrument/scale shell;
    # params still come entirely from the uploaded pixels.
    ds = DATASETS[0]
    features = extract_features(img)
    params = features_to_params(features, ds)
    return JSONResponse(
        {"filename": file.filename, "features": features, "params": params}
    )
