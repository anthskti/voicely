# API contracts (Phase 0)

Frozen shapes for the grade pipeline. Implement Go/Python against these files; do not invent fields.

| File | Direction | Transport |
|------|-----------|-----------|
| [`frontend-to-go.multipart.md`](frontend-to-go.multipart.md) | Browser → Go | `multipart/form-data` |
| [`go-to-grader.request.json`](go-to-grader.request.json) | Go → Python | JSON body |
| [`grader-to-go.response.json`](grader-to-go.response.json) | Python → Go → Browser | JSON body |
| [`scenes.collection.json`](scenes.collection.json) | Base44 `Scenes` document shape | NoSQL |
| [`sessions.collection.json`](sessions.collection.json) | Base44 `Sessions` document shape | NoSQL |

Grades use letter bands: `S+`, `S`, `A`, `B`, `C`, `D`, `F`.

Bruno collection: [`../bruno/`](../bruno/). Sample scenes: [`../assets/scenes/`](../assets/scenes/).