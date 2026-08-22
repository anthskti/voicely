# Bruno collection (Phase 0)

Open this folder in [Bruno](https://www.usebruno.com/). Select environment **local** (`http://localhost:8080`).

| Request | Purpose |
|---------|---------|
| `grade/Grade scene_01 (good takes)` | Happy-path multipart with 3 fixture WAVs |
| `grade/Grade scene_01 (short + quiet edge takes)` | Edge audio for stub scorer later |
| `grade/Grade scene_02 (good takes)` | Second scene id + transcripts |

**Phase 0:** collection + fixtures only — requests will fail until Phase 1 (`docker compose` Go + grader).

File paths in `@file(...)` are relative to each `.bru` file (`../../fixtures/audio/...`).

After Phase 3, switch environment to **render** and set `baseUrl` to your real Render service URL.