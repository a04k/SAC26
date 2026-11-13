"""Render the full jukebox playlist offline.

For every EIC track: save its OpenCV frame, extract features, derive
sonification params, and render a 16-second stereo WAV. Writes a manifest so
the output can be used as a standalone "curated playlist" deliverable.

Usage:
    cd backend
    python scripts/render_playlist.py            # -> ../playlist/
    python scripts/render_playlist.py --seconds 32
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import cv2  # noqa: E402

from app.datasets import DATASETS  # noqa: E402
from app.frames import get_frame  # noqa: E402
from app.sonify import features_to_params  # noqa: E402
from app.synth import render_wav  # noqa: E402
from app.vision import extract_features  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT.parent / "playlist"))
    ap.add_argument("--seconds", type=int, default=16, help="loop length (advisory)")
    args = ap.parse_args()

    out = Path(args.out)
    (out / "frames").mkdir(parents=True, exist_ok=True)
    (out / "audio").mkdir(parents=True, exist_ok=True)

    manifest = []
    for i, ds in enumerate(DATASETS, start=1):
        frame = get_frame(ds.id)
        features = extract_features(frame)
        params = features_to_params(features, ds)

        cv2.imwrite(str(out / "frames" / f"{i:02d}-{ds.id}.png"), frame)
        wav = render_wav(params, features, seed_text=ds.id)
        wav_path = out / "audio" / f"{i:02d}-{ds.id}.wav"
        wav_path.write_bytes(wav)

        manifest.append(
            {
                "index": i,
                "id": ds.id,
                "title": ds.title,
                "svs": ds.svs_url,
                "frame": f"frames/{i:02d}-{ds.id}.png",
                "audio": f"audio/{i:02d}-{ds.id}.wav",
                "instrument": ds.instrument_name,
                "scale": ds.scale_name,
                "params": params,
                "features": {
                    k: features[k]
                    for k in (
                        "edge_density",
                        "entropy",
                        "colorfulness",
                        "mean_hsv",
                        "centroid",
                    )
                },
                "description": ds.accessibility,
            }
        )
        print(f"[{i:02d}] {ds.short:<20} {params['root_note']:<3} {params['scale_name']:<18} "
              f"{params['tempo']:>3} bpm -> {wav_path.name}")

    (out / "manifest.json").write_text(json.dumps(manifest, indent=2))
    (out / "README.md").write_text(
        "# Terra Jukebox — generated playlist\n\n"
        "Each folder pair is one EIC track: the analyzed frame and its\n"
        "sonification rendered offline from the same OpenCV features the live\n"
        "web app uses. `manifest.json` records every parameter.\n"
    )
    print(f"\nPlaylist written to {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
