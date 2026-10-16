# Backend alpha (v0.3)

This is a working Node.js built-in HTTP API designed for **single-instance local or staging deployments**, not a production-ready multi-server service.

## Start

Requires Node.js 22+. From repository root:

```sh
node --test engine/core.test.mjs server/index.test.mjs
node server/index.mjs
```

Visit http://127.0.0.1:8787/workspace for account-based practice. Visit http://127.0.0.1:8787/ for the separate browser-only demonstration. Data is written to `server/data/store.json` by default. Set `COURT_DATA_PATH` to an isolated writable location in development; do not commit data files, passwords, or credentials. Start with `COOKIE_SECURE=1` when deployed behind HTTPS.

## Endpoints

POST /api/register {email,password} (min 12 characters)
POST /api/login {email,password} -> HttpOnly SameSite=Strict cookie
POST /api/logout {}
GET /api/me
GET /api/cases
POST /api/cases {role}
GET /api/cases/:id
POST /api/cases/:id/actions {kind,payload,idempotencyKey}

Users may only access their own cases. The server reconstructs case state from the event log on every action, checks role permissions, and serializes writes in a single process. Passwords use salted scrypt and token hashes are persisted instead of raw bearer tokens.

## Release checklist: NOT YET COMPLETE

- [x] Server-side case ownership and role enforcement
- [x] Hash passwords with salt and store only token digests
- [x] JSON persistence with atomic rename for a single process
- [x] Idempotent command dispatch and event replay
- [x] Automated API tests written and CI configured
- [ ] CI tests confirmed passing
- [ ] Deploy durable managed database with schema migrations and transaction locks
- [ ] Implement account recovery, email verification, rate limiting, CSRF hardening, audit retention and backups
- [ ] Reverse-proxy/IP trust configuration, HTTPS, centralized logs and monitoring
- [ ] Human-reviewed legal knowledge service and versioned jurisdiction rules
- [ ] Security assessment, penetration testing, accessibility testing, and monitored staging deployment

**Educational simulation only.** The example is a fictional contract dispute. No authoritative legal deadlines, rulings, filings, court integrations, live AI adjudication, or reliable litigation predictions are included. The local JSON store must not be used for real client or confidential case data. The original ZIP in repository root and published website have not been replaced.
