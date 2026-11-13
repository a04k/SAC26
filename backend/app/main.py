"""Terra Jukebox API — direct pixel-to-sound engine.

Endpoints
  GET  /api/health
  GET  /api/datasets                       catalog + provenance
  GET  /api/datasets/{id}
  GET  /api/datasets/{id}/frame.png        the real bundled NASA frame
  GET  /api/datasets/{id}/assets/{asset}.png   time-series frames, if any
  GET  /api/datasets/{id}/scan             the playable score (per latitude band)
  GET  /api/datasets/{id}/spectrum         FFT band energies per row (visual overlay)
  GET  /api/datasets/{id}/render.wav       offline render of the scan
  POST /api/analyze                        scan any uploaded image
"""

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from .datasets import DATASETS, DATASETS_BY_ID
from .frames import asset_ids, frame_png_bytes, get_asset, get_frame
from .scan import band_rows, frame_scan, series_scan
from .synth import read_image, render_frame_wav

app = FastAPI(title="Terra Jukebox API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _dataset(dataset_id: str):
    ds = DATASETS_BY_ID.get(dataset_id)
    if ds is None:
        raise HTTPException(404, "unknown dataset")
    return ds


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "datasets": len(DATASETS), "assets": len(asset_ids())}


@app.get("/api/datasets")
def list_datasets() -> list[dict]:
    return [d.to_dict() for d in DATASETS]


@app.get("/api/datasets/{dataset_id}")
def get_dataset(dataset_id: str) -> dict:
    return _dataset(dataset_id).to_dict()


@app.get("/api/datasets/{dataset_id}/frame.png")
def get_frame_png(dataset_id: str) -> Response:
    _dataset(dataset_id)
    return Response(frame_png_bytes(dataset_id), media_type="image/png")


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


@app.get("/api/datasets/{dataset_id}/scan")
def get_scan(dataset_id: str, seconds: float = 24.0) -> JSONResponse:
    ds = _dataset(dataset_id)
    frame = get_frame(dataset_id)
    scan = frame_scan(frame, seconds=seconds)
    payload: dict = {"dataset": ds.to_dict(), "scan": scan}
    if ds.series:
        frames = [get_asset(a) for a, _ in ds.series]
        labels = [label for _, label in ds.series]
        payload["series"] = series_scan(frames, labels)
    return JSONResponse(payload)


@app.get("/api/datasets/{dataset_id}/spectrum")
def get_spectrum(dataset_id: str) -> JSONResponse:
    """Per-row FFT energy — lets the viewer draw where the sound comes from."""
    _dataset(dataset_id)
    frame = get_frame(dataset_id)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    rows = 24
    bands = []
    for b in range(rows):
        y0, y1 = int(b * gray.shape[0] / rows), int((b + 1) * gray.shape[0] / rows)
        row = gray[y0:y1].mean(axis=0)
        spec = np.abs(np.fft.rfft(row - row.mean()))
        edges = [0.0, 0.1, 0.25, 0.5, 1.0]
        energies = []
        for i in range(4):
            lo, hi = int(edges[i] * len(spec)), int(edges[i + 1] * len(spec))
            energies.append(float(spec[lo:hi].mean()) if hi > lo else 0.0)
        m = max(energies) or 1.0
        bands.append({"band": b, "energy": [round(e / m, 3) for e in energies]})
    return JSONResponse({"bands": bands, "rows": rows})


@app.get("/api/datasets/{dataset_id}/render.wav")
def get_render(dataset_id: str) -> Response:
    _dataset(dataset_id)
    wav = render_frame_wav(get_frame(dataset_id))
    return Response(
        wav,
        media_type="audio/wav",
        headers={"Content-Disposition": f'attachment; filename="terra-{dataset_id}.wav"'},
    )


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)) -> JSONResponse:
    raw = await file.read()
    try:
        img = read_image(raw)
    except ValueError:
        raise HTTPException(400, "could not decode image")
    scan = frame_scan(img)
    return JSONResponse(
        {
            "filename": file.filename,
            "width": int(img.shape[1]),
            "height": int(img.shape[0]),
            "bands": band_rows(img),
            "scan": scan,
        }
    )
