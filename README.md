# Consentia — working demo build

A real, running implementation of the Consentia consent-management platform, built from
the prototype UI, Architecture v2.0 and FSD v2.0 in `/docs`. This is **not** a static
mockup: the spine described in Architecture v2.0 §2–3 is implemented against a real
PostgreSQL database — append-only event ledger, fail-closed Validation Engine,
hash-chained Evidence Vault, and orchestration fan-out with retries and a dead-letter
queue.

## Stack

- **Backend** — Node.js + TypeScript, Express, Prisma, PostgreSQL (`/backend`)
- **Frontend** — React + TypeScript, Vite, react-router (`/frontend`)

## Running it

### Option A — Docker (zero setup)

```bash
docker compose up --build
```

That's it. It starts Postgres, runs migrations, seeds the demo data, and starts both
servers — open **http://localhost:5173**. Every restart re-seeds to a clean, known demo
state (the seed script truncates first), so it's safe to `docker compose down && docker
compose up` any time you want a fresh Meera Nair.

> Built and validated with `docker compose config`, but not run end-to-end here — this
> sandbox doesn't have a usable Docker daemon. If anything doesn't come up cleanly, the
> logs from `docker compose up` (no `-d`) will show which service failed and why — send
> them over and I'll fix it.

### Option B — run natively

```bash
# 1. Postgres (adjust to your setup)
createuser consentia --pwprompt --createdb   # password: consentia_dev (or edit backend/.env)
createdb -O consentia consentia

# 2. Backend
cd backend
cp .env.example .env   # if present, else create with DATABASE_URL + PORT (see below)
npm install
npm run prisma:migrate      # applies schema
npm run prisma:seed         # loads demo data (Meridian Bank, Meera Nair, etc.)
npm run dev                 # http://localhost:4000

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173, proxies /v1 to :4000
```

`backend/.env`:
```
DATABASE_URL="postgresql://consentia:consentia_dev@localhost:5432/consentia?schema=public"
PORT=4000
```

## What's actually live vs. illustrative

Per FSD v2.0 §8 ("Honest status of the prototype"), every module in the nav is labelled.
Modules **not** marked `ILLUS.` read and write real Postgres data through the real API:

| Live (real backend) | Illustrative (static fixture UI) |
|---|---|
| Dashboard | Workflow Builder |
| Consent Capture | Notifications |
| Consent Drives | Reports |
| Consent Repository | AI Compliance |
| Consent Health | Breach Response |
| Validation Engine (+ Permission Grid) | SDF Pack |
| Privacy Center (DSR queue) | Administration |
| Preference Center | Settings |
| Orchestration (+ DLQ, with real retry/backoff) | |
| Enterprise Usage | |
| Audit Center (+ live hash-chain verification) | |
| Children's Data | |
| Developers (real curl-able endpoints) | |

The illustrative modules render the same UI patterns as the prototype over static data —
consistent with the FSD's own scope note: *"connectors are simulated, the AI is
scripted... nothing in this FSD should be represented to a client as live until its
module passes acceptance against a real environment."* These were deliberately left
illustrative because they depend on things a demo can't have (a real Slack/email
integration, a real LLM behind AI Compliance, a real DPIA workflow) — the live modules
above are the actual product spine per Architecture v2.0 §6's build order.

## Architecture notes worth knowing

- **Append-only ledger** (`ConsentEvent`) — the service layer never issues UPDATE/DELETE;
  current state (`ConsentState`) is a derived read model recomputed after every event.
- **Hash-chained evidence log** (`AuditEvent`) — every consent event, decision, DSR and
  orchestration command transition appends one entry embedding the previous entry's hash.
  Because concurrent writers (e.g. two connectors retrying at once) could otherwise race
  on "what's the latest hash", writes are serialized with a Postgres advisory lock
  (`backend/src/lib/ledger.ts`). `GET /v1/audit/verify` recomputes and checks the whole
  chain on demand.
- **Fail-closed validation** (`backend/src/services/validationService.ts`) — any unknown
  customer/purpose, minor without a verified guardian, or unexpected error resolves to
  `BLOCK`, and the decision is still written to the evidence log before the response
  returns.
- **Orchestration** — attempt 1 is synchronous (so the API response reflects it); retries
  run on in-process timers with backoff, landing in the dead-letter queue with an
  assigned owner after 3 failed attempts. Replay is available from the Orchestration page.

## Known simplifications (demo scope)

- Single Node process — orchestration retries use in-process timers, not a real job queue.
- Connectors are simulated (health/latency/failure are seeded config, not live heartbeats).
- No auth/RBAC yet — every request acts as the seeded DPO.
- Single-tenant `Entity` row only, matching SYS-11, but multi-entity UI isn't built.
