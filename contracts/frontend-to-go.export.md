# `POST /api/v1/export` (Frontend → Go)

`Content-Type: multipart/form-data`

Starts an async FFmpeg job. Poll `GET /api/v1/exports/:id`.

| Field | Type | Notes |
|-------|------|-------|
| `scene_id` | text | Go loads video + soundtrack + chunk timings from Postgres |
| `user_id` | text | Used in the S3 key `exports/{user_id}/{export_id}.mp4` |
| `session_id` | text, optional | If set, `sessions.export_url` is updated when ready |
| `audio_chunks` | file, repeated | Same takes as grade; length must equal scene chunk count |

Do **not** send video or soundtrack. Go fetches them from the scene row.

`202`:

```json
{ "export_id": "…", "status": "processing" }
```

`GET /api/v1/exports/:id`:

```json
{
  "export_id": "…",
  "status": "ready",
  "export_url": "https://….amazonaws.com/exports/…?X-Amz-…",
  "expires_at": "2026-08-23T04:00:00Z"
}
```

`export_url` is a **presigned GET** (private object). Access and object lifetime are capped at **1 hour** from creation (`expires_at`). Polling refreshes the signature until then; after that `status` becomes `expired` (`410 Gone`).

`status` is `processing` | `ready` | `failed` | `expired`.
