# AGRISAATHI model card

Agrisaathi is decision support, not a substitute for local agronomy, lab soil
testing, product labels, or qualified crop-health guidance.

## Crop recommender — current local artifact

| Field | Record |
| --- | --- |
| Status | Available locally after artifact/metadata SHA-256 verification. |
| Model version | `crop-random-forest-v1` |
| Algorithm | scikit-learn `RandomForestClassifier`, 350 estimators, random state 42 |
| Artifact | `ml/models/crop_model.joblib` |
| Artifact SHA-256 | `4a93429eaa9b2659c178ec031922df8dc3a3a2763aa16f11a2e7928062096525` |
| Metadata | `ml/models/crop_model_metadata.json` |
| Source | Kaggle `atharvaingle/crop-recommendation-dataset`; reported Apache-2.0 at acquisition |
| Prepared data | 2,200 rows, 22 labels, zero invalid/duplicate rows after validation |
| Feature order | N, P, K, temperature, humidity, pH, rainfall |
| Target | `label` |
| Split | Stratified 80/20 train/test split, random state 42 |
| Train / test rows | 1,760 / 440 |
| Test accuracy | 0.99545 |
| Test macro precision | 0.99567 |
| Test macro recall | 0.99545 |
| Test macro F1 | 0.99545 |
| Metrics record | `ml/reports/crop/metrics.json` |

### Intended use

Provide a ranking of the model's 22 known labels for an input that has valid
values for its seven trained features. The backend normalizes browser inputs
`nitrogen`, `phosphorus`, and `potassium` to N/P/K and records non-model context
(location, soil type, season, water availability, farm size) separately.

The artifact is served only if the model file, metadata file, declared feature
order, and SHA-256 checksum are valid. `/api/ml/health` exposes actual artifact
state, version, and classes rather than a made-up loaded state.

### Output semantics

The prediction output contains the top three labels and random-forest class
probabilities. A probability is **not calibrated confidence**, a guarantee of
crop success, local suitability, profitability, yield, or a prescription. The
frontend labels it accordingly.

The backend explains exactly which seven fields informed the current model and
states that stored location, soil, season, water, and area context were not
unseen model features.

### Known limitations

- The hold-out score is measured on the source dataset only. It is not a field
  trial, external validation, seasonal validation, or validation for Telangana
  or any individual farm.
- The source data may not represent local soil-test units, irrigation regimes,
  cultivars, management, pests, market conditions, or climate variability.
- The model only selects among 22 known labels. It cannot establish that a
  crop outside those labels is unsuitable or absent.
- The model does not predict disease, pesticide dosage, seed price, yield,
  profitability, or irrigation volume.

## Plant-disease classifier — unavailable

| Field | Record |
| --- | --- |
| Status | Unavailable. |
| Artifact / labels / metadata | None in the workspace. |
| Inference script | None in the workspace. |
| Dataset | PlantVillage is only a candidate; it has not been acquired or accepted. |
| Metrics | None. |

The application validates selected JPEG/PNG/WebP crop images and then returns
an explicit `DISEASE_MODEL_UNAVAILABLE` error. It never invents a disease label
or probability.

Before this feature can be enabled, the project needs explicit source-terms
review, a documented class taxonomy, corruption/duplicate handling,
deterministic train/validation/test split, transfer-learning training/export,
ordered labels, artifact checksum/metadata, measured test metrics and confusion
matrix, low-confidence policy backed by evaluation, and field-image assessment.

## Monitoring and change control

- A retraining run must generate a new artifact hash, metadata version, source
  / prepared-data hashes, exact feature order, and real evaluation report.
- Retain prior artifact metadata long enough to interpret historical
  recommendations.
- Monitor inference failures and input-schema failures. Do not silently fall
  back to a fixed label or stale artifact.
- Reassess geographic representativeness and safety before deployment or a
  material change in dataset, input units, class taxonomy, or target users.
