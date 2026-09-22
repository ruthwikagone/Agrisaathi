# AGRISAATHI SYSTEM AUDIT

**Audit updated:** 2026-09-17 (Asia/Kolkata)  
**Evidence basis:** source inspection, automated API tests, local ML pipeline
execution, and model-artifact integrity checks in this workspace.

## Summary

The project is no longer an empty scaffold. A local single-user application is
implemented and tested for its available paths. The crop recommender is trained
from a documented dataset and is callable through the backend. Several major
capabilities remain deliberately unavailable because their required data,
models, authentication, or authoritative sources do not exist yet.

| Feature | Frontend | Backend/API | Database/ML/data | Current status | Evidence / limitation |
| --- | --- | --- | --- | --- | --- |
| Application shell and navigation | Implemented | Same-origin static serving | N/A | Working locally | `frontend/index.html`, `app.js`, and `styles.css`; automated static-asset test passes. |
| Responsive UI and language switcher | English/Telugu/Hindi catalogs, drawer, browser speech controls | Language preference PATCH endpoint | SQLite profile preference | Implemented | UI language is persisted for a saved local profile; translations should still receive native-speaker review. |
| Backend runtime | N/A | Node 24 built-in HTTP server | N/A | Implemented | `backend/server.js`; syntax and API tests pass. |
| SQLite persistence | N/A | `node:sqlite` schema and local user workspace | `farm_profiles`, history, analysis/calculation tables | Implemented for single-user local mode | No migrations/versioned ownership model or multi-user authentication yet. |
| Health monitoring | Status screen | `/api/health`, `/api/ml/health` | Actual SQLite, weather probe, artifact integrity state | Implemented | It reports crop available only after script/artifact/metadata/checksum checks. |
| Farm profile | Profile form | `GET`, `PUT`, `PATCH /api/profile` | SQLite `farm_profiles` | Implemented | Required farmer name, coordinates, and farm area are validated. |
| Live weather and forecast | Dashboard/weather views | `/api/weather`, `/api/alerts`, `/api/plan` | Open-Meteo request/cache/snapshots | Implemented, network-dependent | Provider failure returns `WEATHER_UNAVAILABLE`; no fake weather fallback. |
| Weather intelligence | Alerts and farm plan displays | Rule-based agronomy service | Persisted alert snapshots/history | Implemented as rules | Guidance is labeled/based on returned weather; it is not an ML forecast. |
| Crop recommendation | Crop form/results | `POST /api/crop/recommendations` launches local Python | Kaggle source, 2,200 validated rows, RF artifact/metadata/metrics | Implemented and tested | Current model has 22 labels and held-out metrics in `ml/reports/crop/metrics.json`; score is not field validation. |
| Crop explanation | Results show inputs/context | Backend adds model-boundary explanation | Model only consumes seven documented features | Implemented | Location, soil, season, water, and farm size are stored context, not hidden model inputs. |
| Seed advisor | Form/results present | `/api/seed/recommendations` | Optional configured catalog URL | Honest unavailable by default | No verified catalog/price source is configured. |
| Disease image upload | File chooser, preview, validation | `POST /api/disease/analyze` validates data URI/type/signature | Private temporary upload path | Honest unavailable after validation | No disease inference script, artifact, labels, or validated evaluation exists. |
| Disease/video model pipeline | Not operational | No training/inference implementation | PlantVillage downloader/validator only | Not implemented | No diagnosis is returned. Video analysis is absent. |
| Pest guidance | Dedicated form/results screen | General IPM endpoint | Saved history | Implemented as conservative guidance | Requires crop and an observed concern; general prevention/IPM only, no diagnosis or label dosage. |
| Fertilizer advisor | Dedicated form/results screen | Conservative nutrient interpretation endpoint | Saved history | Implemented as record review | Validates crop/NPK context and never generates a fertilizer rate without a validated local source. |
| Irrigation advisor | Form/results | `/api/irrigation/advice` | Live weather plus submitted moisture | Implemented as conservative rules | It does not calculate crop-specific irrigation volumes. |
| Farm calculator / what-if | Form/results | `/api/calculations/farm` | `farm_calculations`, history | Implemented | Uses submitted arithmetic; repeated submissions support manual what-if comparison. No separate comparison record yet. |
| Pesticide calculator | Form/results | `/api/pesticide/calculate` | `farm_calculations`, history | Implemented | Requires a user-entered verified label dosage and returns a warning. |
| Yield prediction | Form/error state | `/api/yield/predictions` | Placeholder unavailable record | Not implemented | Returns `YIELD_MODEL_UNAVAILABLE`; no estimate is fabricated. |
| AI Copilot | Text and browser voice controls | Local deterministic support or optional OpenAI Responses API | Profile/weather/history context | Implemented with limitations | No configured key gives bounded deterministic decision support, not a fabricated generative response. |
| Voice input/output | Browser controls | Browser Web Speech APIs | N/A | Browser-dependent | Requires browser support/permission; no server voice provider is implemented. |
| History | Search/list view | `GET /api/history` | `farm_history` | Implemented | Local single-user history; no record-detail route/pagination filters yet. |
| Authentication/authorization | None | Optional static bearer token only | Fixed `local-farmer` user | Not production-ready | Full account/session/ownership security is still required for multi-user use. |
| Dataset pipeline | N/A | Python download/prepare/train/inference scripts | Crop raw/processed/manifests/artifact/report | Crop implemented | PlantVillage acquisition/validation exists but source terms must be accepted and no training path exists. |
| Automated tests | N/A | Node test suite | ML syntax compilation | 12 passing tests | Tests cover profile, language patch, static assets, crop endpoint, calculations, fertilizer/IPM validation, image validation, and unavailable yield behavior. |
| Deployment readiness | N/A | Local-only defaults | Local SQLite/runtime paths | Not deployed | See `DEPLOYMENT.md`; security, backups, rate limits, auth, and target-environment checks remain. |

## Crop-model evidence

| Item | Current record |
| --- | --- |
| Dataset | Kaggle `atharvaingle/crop-recommendation-dataset` |
| Reported license | Apache-2.0; source manifest records the acquisition note |
| Raw CSV SHA-256 | `54a5a6e5408668e668667efc50de2fc867c1b875e0431b4f54dd331b0a109a4e` |
| Prepared rows / labels | 2,200 / 22 |
| Model | `crop-random-forest-v1`, 350-estimator `RandomForestClassifier` |
| Evaluation | 80/20 stratified split, random state 42 |
| Held-out accuracy | 0.99545 |
| Held-out macro F1 | 0.99545 |
| Artifact integrity | SHA-256 verified by `/api/ml/health` before it is advertised as available |

These are reproducible held-out measurements from the source dataset, not
evidence of field accuracy, local suitability, economic viability, or safe
agronomic prescription.

## Highest-priority remaining work

1. Build and evaluate the disease model pipeline after explicit PlantVillage
   terms review; add deterministic preparation/split/training/inference and
   field-image evaluation before enabling diagnoses.
2. Add real multi-user authentication, authorization, migrations, rate limits,
   audit controls, and production operational safeguards before deployment.
3. Select authoritative regional seed/price, fertilizer, pesticide-label, and
   yield sources/models; retain unavailable states until each is validated.
4. Conduct manual responsive/browser and live-weather checks in a real target
   environment, including Telugu/Hindi language review and failure paths.
