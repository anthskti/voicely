# Bruno collection (Phase 0)

Open this folder in Bruno. Select environment **local** (`http://localhost:8080`).

| Request | Purpose |
|---------|---------|
| `grade/Grade scene_01 (good takes)` | Happy-path multipart with 6 Valorant WAVs |
| `scenes/List scenes` | GET all scenes from Postgres |
| `scenes/Get scene_valorant` | GET one scene + chunks |
| `sessions/Create session` | POST save after grade |
| `export/Start export (Valorant takes)` | POST async FFmpeg mux |
| `export/Get export status` | Poll until `export_url` |

**Phase 0:** collection + fixtures only — requests will fail until Phase 1 (`docker compose` Go + grader).

File paths in `@file(...)` are relative to each `.bru` file (`../../fixtures/audio/...`).

After Phase 3, switch environment to **render** and set `baseUrl` to your real Render `voicely-api` URL (Dashboard → service → `.onrender.com`).
