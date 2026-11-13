"""Render the whole catalog offline: frames, specs and WAVs.

For every record this writes the bundled frame, the measured grid + synthesis
spec (JSON) and the rendered audio — the same spec the web app synthesises live
in the browser, so the WAVs are exactly what you hear.

    cd backend
    .venv/bin/python scripts/render_playlist.py --out ../playlist
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
from app.synth import build_spec, render_spec_wav  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT.parent / "playlist"))
    args = ap.parse_args()

    out = Path(args.out)
    for sub in ("frames", "audio", "specs"):
        (out / sub).mkdir(parents=True, exist_ok=True)

    manifest = []
    for i, ds in enumerate(DATASETS, start=1):
        frame = get_frame(ds.id)
        spec = build_spec(frame, ds.to_dict())
        spec.pop("dataset", None)
        wav = render_spec_wav(spec)

        slug = f"{i:02d}-{ds.id}"
        cv2.imwrite(
            str(out / "frames" / f"{slug}.jpg"), frame, [cv2.IMWRITE_JPEG_QUALITY, 92]
        )
        (out / "audio" / f"{slug}.wav").write_bytes(wav)
        (out / "specs" / f"{slug}.json").write_text(json.dumps(spec, indent=2))

        manifest.append(
            {
                "index": i,
                "id": ds.id,
                "title": ds.title,
                "short": ds.short,
                "model": spec["model"],
                "duration": spec["duration"],
                "layers": len(spec["layers"]),
                "svs": ds.svs_id,
                "source": ds.svs_url,
                "credit": ds.credit,
                "sensor": ds.sensor,
                "frame": f"frames/{slug}.jpg",
                "audio": f"audio/{slug}.wav",
                "spec": f"specs/{slug}.json",
            }
        )
        print(
            f"{i:02d}  {ds.id:<20} {spec['model']:<7} "
            f"{len(spec['layers']):>4} layers  {spec['duration']:>5.1f}s  {len(wav) // 1024:>5} KiB"
        )

    (out / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"\n→ {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
