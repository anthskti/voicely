# `POST /api/v1/grade` (Frontend → Go)

`Content-Type: multipart/form-data`

| Field | Type | Notes |
|-------|------|-------|
| `scene_id` | text | Matches Base44 / `assets/scenes/*/chunks.json` `id` |
| `user_id` | text | Auth subject from Base44 |
| `chunk_transcripts` | text, repeated | One value per chunk, index order |
| `reference_audio_urls` | text, repeated | Same length/order as transcripts |
| `audio_chunks` | file, repeated | User WAV/WebM takes; same length/order |

Field counts for `chunk_transcripts`, `reference_audio_urls`, and `audio_chunks` must match.

Example (Bruno / curl): 3 chunks → 3 transcripts, 3 URLs, 3 files named `audio_chunks`.