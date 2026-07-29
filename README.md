# Splunk Log Viewer & Troubleshooting Tool

A web UI for searching, filtering, and troubleshooting Splunk logs without logging
into Splunk's own web console. A FastAPI backend authenticates to the Splunk REST
API with a service account and proxies searches; a React frontend gives engineers
fast filtering, a trend chart, grouping, saved searches, and shareable deep links.

## Architecture

```
Browser (React/Vite, :5173)
  -> /api/*  (same-origin, proxied by Vite dev server)
    -> FastAPI backend (:8000)
      -> Splunk REST API (https://<splunk-host>:8089)
```

The browser never talks to Splunk and never sees Splunk credentials. The backend
logs in once with the service account against `/services/auth/login`, caches the
resulting session key, and sends `Authorization: Splunk <token>` on every search
call. If Splunk returns a 401 (expired/invalidated session), the backend
transparently re-authenticates and retries the call once.

## Setup

### 1. Configure the service account

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

| Variable | Description |
|---|---|
| `SPLUNK_HOST` / `SPLUNK_PORT` / `SPLUNK_SCHEME` | Splunk management API endpoint (default port `8089`) |
| `SPLUNK_VERIFY_SSL` | Set `false` only for self-signed lab instances |
| `SPLUNK_USERNAME` / `SPLUNK_PASSWORD` | Service account credentials, never committed |
| `SPLUNK_LEVEL_FIELD` | Field name that holds log severity in your events (`log_level`, `level`, `severity`, ...) |
| `SPLUNK_DEFAULT_INDEXES` | Comma-separated indexes to pre-fill in the UI, e.g. `1003865` |

`backend/.env` is git-ignored — never commit real credentials.

### 2. Run it

**Docker (single command):**

```bash
docker-compose up --build
```

UI: http://localhost:5173 — Backend: http://localhost:8000/docs

**Or run each service directly:**

```bash
# backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Requires Python 3.10+ and Node 18+.

**Or deploy to Kubernetes:** see [`k8s/README.md`](k8s/README.md) — credentials
go in a `Secret`, non-secret config in a `ConfigMap`, and the frontend is
served by nginx (production build) which reverse-proxies `/api` to the
backend Service instead of using the Vite dev server.

## Using the UI

- **Index** — enter one or more indexes (comma-separated).
- **Log level** — ERROR and WARN are checked by default; enable INFO when needed.
  The Splunk field name checked is configurable per-search ("Level field name"),
  since environments differ (`level`, `severity`, `log_level`, ...).
- **Keyword** — filtered into the SPL query itself (exception name, transaction
  ID, service name, etc.).
- **Time range** — presets (1/3/5/15 min, 1 hr, 24 hr, 7 days) or a custom
  start/end.
- **Run / Cancel** — runs an async Splunk search job and polls it; Cancel stops
  polling and cancels the job in Splunk.
- **SPL preview** — shows the exact query being run; check "Edit query directly"
  to hand-tune it for advanced cases (it's sent verbatim instead of the
  generated query).
- **Trend chart** — bucketed ERROR/WARN/INFO counts across the selected time
  range so spikes are visible at a glance.
- **Quick filters** — chips for the most common host/sourcetype/source values in
  the current result set; click to filter without retyping a query.
- **Table / Grouped view** — table is sortable and paginated with an expandable
  raw event; Grouped view collapses similar messages (numbers/UUIDs/hex ids
  normalized away) into "seen Nx" counts to cut through incident noise.
- **Export** — CSV or JSON of the currently filtered result set.
- **Saved searches** — save the current index/filters/keyword/time range as a
  named shortcut; stored server-side in `backend/data/saved_searches.json`.
- **Deep links** — the URL always reflects the current search, so it can be
  pasted to a teammate.
- **Auto-refresh** — re-runs the search every 30s for live incident monitoring.

## Example generated SPL

```
search (index=1003865) (log_level=ERROR OR log_level=WARN) "connection timeout"
| sort - _time
```

## API surface (backend)

- `POST /api/search` — build/accept SPL, create a Splunk search job, return `job_id` + `spl`
- `GET /api/search/{job_id}/status` — poll job progress
- `GET /api/search/{job_id}/results?offset=&count=` — fetch parsed events
- `DELETE /api/search/{job_id}` — cancel a running job
- `GET /api/saved-searches` / `POST /api/saved-searches` / `DELETE /api/saved-searches/{id}`
- `GET /api/config` — non-secret defaults for the frontend (default indexes, level field, host)
- `GET /api/health` — confirms Splunk is reachable and credentials are valid

## Notes

- Request timeouts and Splunk connection/auth failures surface as readable error
  banners in the UI (502/504/401 mapped from `SplunkQueryError` /
  `SplunkConnectionError` / `SplunkAuthError`).
- A search requires at least one index; the UI and backend both validate this.
