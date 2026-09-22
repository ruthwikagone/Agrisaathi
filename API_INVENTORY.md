# AGRISAATHI API inventory

## Current contract

The Node server exposes the following same-origin JSON API. Successful responses
are `{ "ok": true, "data": ... }`; failures are
`{ "ok": false, "error": { "code", "message", "details"? } }`.

When `API_TOKEN` is empty, the application runs in local single-user mode. When
it is set, **every** `/api/*` endpoint requires
`Authorization: Bearer <API_TOKEN>`. This is a deployment guard, not a
substitute for account authentication or ownership authorization.

| Method | Endpoint | Input | Output / storage | Current state |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | None | Backend, SQLite, Open-Meteo probe, AI configuration, ML artifact state | Implemented; dependency states are truthful. |
| GET | `/api/ml/health` | None | Crop/disease script/artifact/metadata/integrity/version/classes state | Implemented; crop is available locally when its artifact checksum matches metadata. |
| GET | `/api/profile` | None | Local farm profile or `null` | Implemented; `farm_profiles`. |
| PUT | `/api/profile` | Full validated profile: `farmerName`, `location`, `latitude`, `longitude`, `farmArea`; optional soil/crop/language fields | Saved profile and history record | Implemented. `farmerName`, coordinates, and area are required. |
| PATCH | `/api/profile` | Exactly `{ "preferredLanguage": "en" \| "te" \| "hi" }` | Updated profile / history | Implemented; does not overwrite profile data. |
| GET | `/api/weather` | Saved profile with coordinates | Current, hourly, and seven-day Open-Meteo data; weather snapshot | Implemented; `WEATHER_UNAVAILABLE` on provider failure. |
| GET | `/api/alerts` | Saved profile with coordinates | Live weather-derived alerts; alert upsert | Implemented as rules, not an ML alert model. |
| GET | `/api/plan` | Saved profile with coordinates | Live weather-derived farm plan; history | Implemented as conservative rules. |
| GET | `/api/history?limit=1..100` | Optional `limit` | Local history records | Implemented. |
| POST | `/api/crop/recommendations` | N/P/K, temperature, humidity, pH, rainfall; omitted core values may come from profile/weather where available | Top three local model recommendations, input/context, history, model version | Implemented when crop artifact is available; otherwise `CROP_MODEL_UNAVAILABLE`. |
| POST | `/api/seed/recommendations` | Crop/context fields | Configured catalog result/history | Implemented boundary; default is honest `available: false` because no verified catalog is configured. |
| POST | `/api/irrigation/advice` | Crop/stage/soil/moisture context | Weather-based conservative irrigation guidance/history | Implemented; does not supply water volumes. |
| POST | `/api/fertilizer/advice` | `crop` (or profile crop), optional `growthStage` and N/P/K (each may use profile values) | Validated nutrient interpretation/history | Implemented boundary; does not generate fertilizer rates. |
| POST | `/api/pest-management` | Required `crop` (or profile crop) and observed `problem` | Validated general prevention/IPM guidance/history | Implemented boundary; no diagnosis or dosage. |
| POST | `/api/pesticide/calculate` | `farmArea`, `verifiedDosage`, `waterPerAcre`, `tankCapacity`, units/optional product | Arithmetic/history | Implemented; user must supply verified label dosage. |
| POST | `/api/calculations/farm` | `area`, `expectedYieldPerAcre`, `sellingPrice`; optional cost categories | Transparent revenue/cost/profit arithmetic/history | Implemented. |
| POST | `/api/yield/predictions` | Any JSON object | Explicit unavailable error and unavailable history record | Intentionally unavailable; no yield model exists. |
| POST | `/api/disease/analyze` | JSON `{ fileName, mimeType, imageBase64, crop? }`; allowed JPEG/PNG/WebP data URI or Base64, max configured bytes | Validated private temporary file; actual inference only if model exists | Upload validation implemented; currently returns `DISEASE_MODEL_UNAVAILABLE`. |
| POST | `/api/copilot/messages` | `{ message, language? }` | Local deterministic guidance or configured OpenAI response; history | Implemented with explicit provider limitation/error behavior. |

## Crop input semantics

The current crop model accepts only these trained features: `N`, `P`, `K`,
`temperature`, `humidity`, `ph`, and `rainfall`. The API accepts browser-facing
aliases `nitrogen`, `phosphorus`, and `potassium` and normalizes them before
Python inference. Location, soil type, season, water availability, and farm
size are retained in the request context; they are not presented to the model
as untrained features.

Returned `probability` values are random-forest class probabilities. They are
shown as **model probability**, not calibrated confidence.

## Image boundary

The disease endpoint intentionally uses JSON rather than multipart form data.
The browser converts a selected image to a data URI, the server checks the
declared MIME type, decoded size, canonical Base64 encoding, and JPEG/PNG/WebP
file signature, then writes a random private temporary path. The temporary file
is removed after inference or an unavailable-model response.

This does not mean disease analysis is operational: no disease inference script,
artifact, label map, or validation report exists in the current workspace.

## Not implemented

The following target capabilities have no public route yet: account
registration/login/session management, user-scoped record access, weather alert
settings/delivery, disease-history detail, video analysis, voice API endpoints,
farm-simulation comparison records, and model-backed yield prediction.
