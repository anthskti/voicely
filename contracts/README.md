# API contracts (Phase 0)

Frozen shapes for the grade pipeline. Implement Go/Python against these files; do not invent fields.

| File | Direction | Transport |
|------|-----------|-----------|
| [`frontend-to-go.export.md`](frontend-to-go.export.md) | Browser → Go | `multipart/form-data` then poll JSON |
| [`go-to-grader.multipart.md`](go-to-grader.multipart.md) | Go → Python | `multipart/form-data` (raw audio files) |
| [`grader-to-go.response.json`](grader-to-go.response.json) | Python → Go → Browser | JSON body |
| [`scenes.collection.json`](scenes.collection.json) | Base44 `Scenes` document shape | NoSQL |
| [`sessions.collection.json`](sessions.collection.json) | Base44 `Sessions` document shape | NoSQL |

Audio is never base64 in these contracts. Grades use letter bands: `S+`, `S`, `A`, `B`, `C`, `D`, `F`.

Bruno collection: [`../bruno/`](../bruno/). Sample scenes: [`../assets/scenes/`](../assets/scenes/).
