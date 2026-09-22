# AGRISAATHI

AgriSaathi is a local-first multilingual farm decision-support application. It
serves a vanilla JavaScript frontend and JSON API from one Node.js process,
persists the local farm workspace in SQLite, retrieves weather from Open-Meteo,
and invokes local Python ML artifacts only when they are present and verified.

## Current verified state

- The same-origin frontend, Node.js API, SQLite farm profile/history, weather
  integration, calculators, conservative fertilizer record review and IPM
  guidance, deterministic local copilot, and browser speech controls are
  implemented.
- Crop recommendations use a locally trained random-forest artifact when its
  SHA-256 matches its metadata. The current local training run used the Kaggle
  crop dataset and produced a 22-class model. See [MODEL_CARD.md](MODEL_CARD.md).
- Crop-health uploads validate a JSON data-URI image payload (JPEG/PNG/WebP)
  and fail closed because no disease model/inference script exists yet.
- Yield prediction, verified seed catalogue data, authentication, and disease
  model training are not implemented. Their APIs show an explicit unavailable
  response instead of fabricated output.

This is not a production deployment. The disease and yield features must not be
represented as operational until their documented model/data work is complete.

## Architecture

```text
Browser (frontend/index.html, app.js, styles.css)
        │ same-origin JSON
        ▼
Node.js 24 HTTP server (backend/server.js)
  ├─ SQLite local workspace and history
  ├─ Open-Meteo weather retrieval and farm rules
  ├─ optional OpenAI Responses API copilot
  └─ local Python crop inference / model integrity checks
        │
        └─ ml/ datasets, training, reports, and artifacts (ignored by Git)
```

## Requirements

- Node.js 24 or later.
- Python 3.10 or later.
- Python packages from `ml/requirements.txt` for crop data preparation,
  training, validation, and inference.
- Outbound access to Open-Meteo for live weather and to Kaggle when acquiring
  the crop dataset.

## Run locally

1. Copy the environment example and review the paths and optional keys.

   ```powershell
   Copy-Item .env.example .env
   ```

2. Install Python ML dependencies if you will prepare/train/infer a crop model.

   ```powershell
   python -m venv ml\.venv
   ml\.venv\Scripts\Activate.ps1
   python -m pip install -r ml\requirements.txt
   ```

3. Start the application.

   ```powershell
   node backend/server.js
   ```

   Open `http://127.0.0.1:3000`. Save a farm profile with coordinates before
   requesting weather-dependent features.

On Windows systems that block `npm.ps1`, use `npm.cmd`:

```powershell
npm.cmd run lint
npm.cmd test
```

## Crop-model pipeline

The following commands are reproducible and write source manifests, processed
data manifests, model metadata, and measured evaluation output. Large data and
artifacts are ignored by Git.

```powershell
python ml/scripts/download_crop_dataset.py
python ml/scripts/prepare_crop_dataset.py --drop-invalid --drop-duplicates
python ml/training/train_crop_model.py
```

For a PowerShell-safe direct inference check, send the input on standard input:

```powershell
'{"N":90,"P":42,"K":43,"temperature":25,"humidity":80,"ph":6.5,"rainfall":200}' |
  python ml/inference/crop_predict.py
```

The seven model features are N, P, K, temperature, humidity, pH, and rainfall.
Location, soil type, season, water availability, and farm size are saved as
request context but are not hidden model inputs.

## API and safety behavior

- `GET /api/health` reports backend, SQLite, weather, AI configuration, and ML
  state without claiming unavailable services are healthy.
- `GET /api/ml/health` checks the presence and integrity of model artifacts and
  exposes version/classes only from metadata.
- All successful API responses have `{ "ok": true, "data": ... }`; errors have
  a stable `{ "ok": false, "error": ... }` shape.
- Image data must be JPEG, PNG, or WebP; a file signature check is performed
  before the disease-model availability response.
- Pesticide arithmetic only accepts a user-entered verified label dosage and
  always returns a label-verification warning.

See [API_INVENTORY.md](API_INVENTORY.md) for the precise current contract,
[DATASETS.md](DATASETS.md) for acquisition/provenance, and
[SYSTEM_AUDIT.md](SYSTEM_AUDIT.md) for the current feature audit.

## Important limitations

- The crop model's held-out score is not field-validation evidence. It has not
  been validated for every region, season, soil lab, crop variety, or farm.
- Seed prices, pesticide dosage, fertilizer rates, and yield ranges are never
  invented. Missing authoritative data stays unavailable.
- The local copilot is deterministic when no OpenAI key is configured. It is
  decision support, not a diagnosis or agronomic prescription.
- This local single-user workspace is not a substitute for authentication and
  authorization in a multi-user deployment.

## Documentation

- [Current system audit](SYSTEM_AUDIT.md)
- [API inventory](API_INVENTORY.md)
- [Dataset register](DATASETS.md)
- [Model card](MODEL_CARD.md)
- [Deployment checklist](DEPLOYMENT.md)
