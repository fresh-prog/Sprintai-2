# Security

## Threat model (summary)

| Asset | Threat | Mitigation |
|---|---|---|
| Biometric pose data | Exfiltration in transit | TLS-only in prod; raw video stays in browser by default |
| Credentials | Brute force | bcrypt (cost 12), per-IP + per-account rate limits |
| Session cookies | XSS theft | refresh token in `httpOnly`, `sameSite=lax`, `secure` |
| Refresh tokens | Replay after leak | Rotated on every refresh; revoked-list in DB |
| Uploaded video | Path traversal, malicious payload | Stored under randomized UUID names; `mime` validated; size capped |
| Postgres | Injection | Prisma parameterized queries — no raw SQL on user input |
| Admin endpoints | Privilege escalation | `role === 'ADMIN'` checked in middleware, audited |

## Hardening checklist

- [x] Helmet with sane CSP
- [x] CORS allow-list driven by `CORS_ORIGIN`
- [x] `express-rate-limit` on `/auth/*` and `/api/*`
- [x] Zod validation on every request body / params / query
- [x] Centralized error handler — never leak stack traces in prod
- [x] Argon2 considered; bcrypt chosen for native bindings simplicity
- [x] JWTs: short access (15 m) + rotating refresh (7 d)
- [x] Cookies: `httpOnly`, `secure` (prod), `sameSite=lax`
- [x] CSRF token on state-changing cookie-auth endpoints
- [x] File upload: size cap, mime sniff, randomized names, served via auth-checked endpoint
- [x] Logs scrub PII (email lowercased + hashed in logs)
- [x] `npm audit` / `pip-audit` in CI; Dependabot on
- [x] Docker images run as non-root

## Secrets management

- **Dev**: `.env` is gitignored; rotate on first clone.
- **Prod**: inject via environment (Docker secrets, systemd `EnvironmentFile`,
  or Vault). Never bake secrets into images.

## Responsible disclosure

Email `security@<your-domain>` (or open a private security advisory on the
repo). We aim to acknowledge within 48 h.
