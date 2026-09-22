# AGRISAATHI deployment checklist

## Current status

This repository has been exercised locally, not deployed to production. It is a
single-process Node.js 24 application with SQLite and local Python inference.
It must not be deployed as a multi-user farming service until the security and
operational gaps below are addressed.

## Runtime topology

```text
TLS reverse proxy (recommended)
        │
        ▼
Node.js 24 process
  ├─ serves frontend/ and /api/*
  ├─ SQLite database at DATABASE_PATH
  ├─ private temporary image directory at UPLOADS_DIR
  ├─ Python executable at PYTHON_BIN for crop inference
  └─ outbound HTTPS to Open-Meteo and explicitly configured providers
```

Keep database files, uploads, models, datasets, and reports outside the public
frontend directory. SQLite is appropriate for this local/single-writer design;
do not place the same SQLite database on multiple independently running app
instances.

## Environment

Create a protected `.env` from `.env.example` and set deployment-specific
absolute paths where appropriate:

| Variable | Current behavior |
| --- | --- |
| `HOST`, `PORT` | Server bind address and port. |
| `DATABASE_PATH` | SQLite file path, resolved relative to project root if not absolute. |
| `UPLOADS_DIR` | Private temporary image directory. |
| `PYTHON_BIN` | Python used by local crop inference. |
| `MAX_JSON_BYTES`, `MAX_IMAGE_BYTES` | Server-side request/image limits; JSON limit must allow Base64 expansion. |
| `API_TOKEN` | Optional global bearer guard for local deployment; not multi-user auth. |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Optional OpenAI Responses API copilot integration. |
| `SEED_CATALOG_URL` | Optional verified seed catalogue endpoint. |

Never expose `.env`, SQLite files, temporary uploads, raw datasets, artifacts,
or reports through static serving. Rotate any exposed provider key immediately.

## Release procedure

1. Run the automated gates:

   ```powershell
   npm.cmd run lint
   npm.cmd test
   python -m compileall -q ml
   ```

2. Build or stage Python dependencies from `ml/requirements.txt` using the
   same interpreter configured by `PYTHON_BIN`.
3. If crop recommendations are enabled, acquire/prepare/train only through the
   scripts in `DATASETS.md`, then verify `/api/ml/health` reports crop artifact
   `status: available` and `artifactIntegrity: true`.
4. Start the service behind HTTPS and a reverse proxy with request-body limits,
   timeouts, and access logs.
5. Verify static frontend delivery, profile persistence across restart,
   `/api/health`, `/api/ml/health`, weather success/failure behavior, crop
   recommendation, calculations, and unavailable disease/yield behavior.
6. Take a consistent SQLite backup before traffic and prove a restore process.

## Required work before production

- Implement real users, password/session or external identity handling,
  record ownership, authorization, and CSRF/rate-limit strategy.
- Add a migration/versioning strategy rather than relying on schema creation
  alone; test upgrades against a database backup.
- Add production request-rate controls, structured logging, monitoring, backup
  retention, disk-capacity alarms, and incident ownership.
- Establish upload retention/privacy/deletion and malware-scanning policy.
- Only enable a disease model after its documented data pipeline, model card,
  artifact integrity, metrics, and field-image evaluation exist.
- Select authoritative regional data sources before enabling seed prices,
  fertilizer rates, pesticide labels, or yield predictions.
- Have Telugu/Hindi strings and agricultural advice reviewed by qualified
  native-language and local-agronomy reviewers.

## Deployment acceptance checklist

- [ ] Node 24 and the configured Python interpreter are installed and match the
      tested local versions.
- [ ] `.env` is protected and no secret/private file is static-served or logged.
- [ ] Database and uploads use persistent, access-restricted storage.
- [ ] Database backup and restore have been proven.
- [ ] `/api/health` reports actual backend/database/weather states.
- [ ] `/api/ml/health` reports actual model script/artifact/metadata/checksum
      status and does not claim an absent disease model is loaded.
- [ ] All enabled providers have valid terms, credentials, error handling, and
      monitoring.
- [ ] Authentication/authorization, request limits, HTTPS, and operational
      monitoring are in place for the intended user population.
