# GOAT OAuth session auth

GOAT uses Express-managed Google/Kakao OAuth login. Supabase Auth is not used; Supabase PostgreSQL stores only application users, SSO identities, hashed sessions, and hashed OAuth states.

## Environment variables

- `DATABASE_URL`
- `PORT`
- `CORS_ORIGINS`
- `TRUST_PROXY`
- `AUTH_BASE_URL`
- `AUTH_SUCCESS_REDIRECT_URL`
- `AUTH_FAILURE_REDIRECT_URL`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `KAKAO_REST_API_KEY`
- `KAKAO_OAUTH_CLIENT_SECRET` (optional; set only when Kakao client secret is enabled)

`AUTH_BASE_URL` must match the OAuth callback origin registered with each provider. For example, `https://api.example.com` produces `https://api.example.com/api/auth/google/callback`.

Set `TRUST_PROXY=true` when the API server is deployed behind a trusted reverse proxy or platform load balancer so Express can read the real client IP for session rows.

## API

- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `GET /api/auth/kakao/start`
- `GET /api/auth/kakao/callback`
- `GET /api/auth/me`
- `POST /api/auth/logout`

The session cookie is `goat.sid`, HttpOnly, SameSite=Lax, Path=/, and has a 14 day Max-Age. Local development uses `Secure=false`; production uses `Secure=true`.

For Kakao, put the Kakao Developers **REST API key** in `KAKAO_REST_API_KEY`. Email is not requested by default because Kakao may require extra app permission; Kakao users can sign in with `email: null`.

## Supabase PostgreSQL apply order

```powershell
$env:DATABASE_URL = "postgresql://..."
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/db run push
psql $env:DATABASE_URL -f .\lib\db\sql\auth-hardening.sql
```

`auth-hardening.sql` enables RLS for auth tables, revokes `anon` and `authenticated` access, and creates `cleanup_expired_auth_rows()`.
