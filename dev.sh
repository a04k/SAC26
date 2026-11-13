#!/usr/bin/env bash
# Terra Jukebox — one-command dev launcher (backend + frontend).
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d backend/.venv ]; then
  echo "→ creating Python venv…"
  python3 -m venv backend/.venv
  backend/.venv/bin/pip install -q --upgrade pip
  backend/.venv/bin/pip install -q -r backend/requirements.txt
fi

if [ ! -d frontend/node_modules ]; then
  echo "→ installing frontend dependencies…"
  (cd frontend && npm install --no-audit --no-fund)
fi

cleanup() { echo; echo "→ shutting down"; kill 0 2>/dev/null || true; }
trap cleanup EXIT INT TERM

echo "→ sonification API on :8000"
(cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000) &
echo "→ Terra Jukebox on :5173"
(cd frontend && npm run dev) &

wait
