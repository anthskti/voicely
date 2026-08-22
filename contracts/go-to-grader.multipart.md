# `POST /evaluate` (Go → Python grader)

`Content-Type: multipart/form-data`

User audio stays raw file bytes (`[]byte` on the wire as file parts). Do **not** base64-encode audio in JSON.

| Field | Type | Notes |
|-------|------|-------|
| `scene_id` | text | Same id as frontend / Scenes |
| `chunk_transcripts` | text, repeated | Index order |
| `reference_audio_urls` | text, repeated | Same length/order; grader may fetch refs |
| `audio_chunks` | file, repeated | Raw user takes (WAV/WebM); same length/order |

Field counts for `chunk_transcripts`, `reference_audio_urls`, and `audio_chunks` must match.

`user_id` is **not** sent to the grader (frontend → Go only).

Response: JSON body shaped like [`grader-to-go.response.json`](grader-to-go.response.json).

This mirrors [`frontend-to-go.multipart.md`](frontend-to-go.multipart.md) so Go can forward bytes without re-encoding. Later FFmpeg export in Go can reuse the same `[]byte` / temp files.