# Voicely grader

FastAPI microservice that scores user takes against reference audio.

## Stack

- **Resemblyzer** — timbre / voice similarity (primary signal)
- Duration ratio — cadence stand-in
- Energy-envelope correlation — pitch stand-in until tuned further
- Local `ASSETS_ROOT` fallback for `reference_audio_urls` (Phase 0 `example.invalid` URLs)

## Run

```bash
cd grader
cp .env.example .env  
uv sync
uv run uvicorn main:app --reload --port 8000
```

- `GET /healthz`
- `POST /evaluate` — multipart per [`contracts/go-to-grader.multipart.md`](../contracts/go-to-grader.multipart.md)

Go API default: `GRADER_SERVICE_URL=http://localhost:8000/evaluate`.

Python is pinned to **3.12** (Resemblyzer/torch are not reliable on 3.14 yet).

```bash
ASSETS_ROOT=../assets uv run uvicorn main:app --reload --port 8000
```