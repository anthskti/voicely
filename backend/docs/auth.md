# Auth (Go session cookies)

Users, passwords, and login sessions live in **Postgres on the Go API**. The Next.js frontend has no auth database. It is a thin client: `credentials: "include"` on every API call.

This is **not JWT**. Login issues an opaque `voicely_session` httpOnly cookie. Go looks up that token (hashed) in `auth_sessions` on each protected request.

## Data

Auto-migrated with scenes and practice sessions (`internal/db/db.go`).

**`users`**

| Column | Notes |
|--------|--------|
| `id` | UUID |
| `name` | required |
| `email` | unique, stored lowercase |
| `password_hash` | bcrypt cost 12, never JSON-serialized |
| `created_at` | |

**`auth_sessions`** (login sessions — not practice takes)

| Column | Notes |
|--------|--------|
| `id` | UUID |
| `user_id` | owner |
| `token_hash` | SHA-256 of the cookie value (raw token is never stored) |
| `expires_at` | 30 days from issue |
| `created_at` | |

Practice recordings stay in `sessions` with `user_id` taken from the auth cookie, not from the client body.

## Endpoints

All under `/api/v1/auth`. Cookie is set on signup/login; send it back with `credentials: "include"`.

| Method | Path | Body | Success |
|--------|------|------|---------|
| `POST` | `/signup` | `{ name, email, password }` | `200` `{ "user": { id, name, email } }` + `Set-Cookie` |
| `POST` | `/login` | `{ email, password }` | same |
| `POST` | `/logout` | — | `200` `{ "success": true }` + clear cookie; deletes the DB row |
| `GET` | `/me` | — | `200` `{ "user": { id, name, email } }` or `401` |

Signup rules: name required, email must contain `@`, password at least 6 characters. Duplicate email → `409`. Bad login → `401` `"invalid credentials"`.

## Cookie

Name: `voicely_session`

| Flag | Local (`AUTH_COOKIE_SECURE=false`) | Prod (`AUTH_COOKIE_SECURE=true`) |
|------|-------------------------------------|----------------------------------|
| HttpOnly | yes | yes |
| Path | `/` | `/` |
| Secure | no | yes |
| SameSite | `Lax` | `None` |

`localhost:3000` → `localhost:8080` is same-site (ports do not count), so **Lax** works locally.

Vercel frontend + Render API is **cross-site**. That needs **None + Secure**. Chrome **rejects** `SameSite=None` without `Secure`. If that happens, login JSON still looks signed-in but `/grade` returns `401 authentication required`.

After login, the frontend calls `GET /me` to confirm the cookie actually stuck.

## CORS

`FRONTEND_ORIGIN` is the allowed browser origin (comma-separated). Credentials are enabled only for a matching `Origin`. `*` is not used.

`http://localhost:3000` also allows `http://127.0.0.1:3000` (and the reverse).

## Protected vs public

**Public:** `GET /healthz`, `GET /api/v1/scenes`, `GET /api/v1/scenes/:id`, auth signup/login/logout/me.

**Require cookie** (`middleware.RequireAuth`):

- `POST /api/v1/grade`
- `POST /api/v1/sessions`
- `GET /api/v1/sessions` (only the authenticated user)
- `POST /api/v1/export`
- `GET /api/v1/exports/:id` (must own the job)

Handlers **do not trust client `user_id`**. They use `middleware.GetUserID`.

## Env

| Variable | Local | Prod |
|----------|--------|------|
| `DATABASE_URL` | compose Postgres | Render Postgres |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | Vercel origin, e.g. `https://your-app.vercel.app` |
| `AUTH_COOKIE_SECURE` | `false` | `true` |

If `AUTH_COOKIE_SECURE` is unset and `FRONTEND_ORIGIN` starts with `https://`, Secure cookies are turned on automatically.

Frontend only needs `NEXT_PUBLIC_GO_BACKEND_URL`. No `DATABASE_URL`, no Better Auth secrets.

## Deploy checklist

1. Set `FRONTEND_ORIGIN` to the exact Vercel origin (scheme + host, no trailing slash).
2. Set `AUTH_COOKIE_SECURE=true` on the API.
3. Rebuild/restart the API so CORS and cookie flags match.
4. Existing in-memory Better Auth users do not migrate; people sign up again.

## Code map

| Piece | Path |
|-------|------|
| Models | `internal/model/user.go`, `internal/model/auth_session.go` |
| Hashing / cookie name | `internal/service/auth.go` |
| DB | `internal/repository/auth.go` |
| HTTP | `internal/handler/auth_handler.go` |
| Middleware | `internal/middleware/auth.go` |
| CORS | `internal/middleware/cors.go` |
| Routes | `cmd/api/main.go` |
