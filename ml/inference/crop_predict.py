"""Return top crop recommendations from a trained artifact as one JSON document.

Example (safe for a Node.js ``spawn`` call):
    python ml/inference/crop_predict.py --input-json '{"N":90,"P":42,"K":43,"temperature":25,"humidity":80,"ph":6.5,"rainfall":200}'

Only a model created by ``ml/training/train_crop_model.py`` is accepted.  If the
artifact or its metadata is absent, this command returns a structured unavailable
result and does not invent recommendations.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ml.common import (
    CliError,
    ML_ROOT,
    emit_json,
    error_payload,
    load_json_input,
    log,
    read_json_file,
    relative_to_ml,
    sha256_file,
    validate_finite_number,
)
from ml.scripts.prepare_crop_dataset import FEATURES


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-json", help="A single JSON request object.")
    parser.add_argument("--input-file", help="Path to a JSON request object.")
    parser.add_argument("--model", type=Path, default=ML_ROOT / "models" / "crop_model.joblib")
    parser.add_argument(
        "--metadata", type=Path, default=ML_ROOT / "models" / "crop_model_metadata.json"
    )
    return parser.parse_args()


def validated_features(payload: dict[str, object]) -> tuple[dict[str, float], int]:
    missing = [feature for feature in FEATURES if feature not in payload]
    if missing:
        raise CliError("invalid_input", "Crop prediction is missing required feature values.", details={"missing": missing})
    features = {feature: validate_finite_number(payload[feature], feature) for feature in FEATURES}
    if features["N"] < 0 or features["P"] < 0 or features["K"] < 0:
        raise CliError("invalid_input", "N, P, and K cannot be negative.")
    if not 0 <= features["humidity"] <= 100:
        raise CliError("invalid_input", "humidity must be between 0 and 100.")
    if not 0 <= features["ph"] <= 14:
        raise CliError("invalid_input", "ph must be between 0 and 14.")
    if features["rainfall"] < 0:
        raise CliError("invalid_input", "rainfall cannot be negative.")
    top_k_raw = payload.get("top_k", 3)
    if isinstance(top_k_raw, bool):
        raise CliError("invalid_input", "top_k must be an integer.")
    try:
        top_k = int(top_k_raw)
    except (TypeError, ValueError) as exc:
        raise CliError("invalid_input", "top_k must be an integer.") from exc
    if str(top_k_raw).strip() not in {str(top_k), f"{top_k}.0"} if isinstance(top_k_raw, str) else False:
        raise CliError("invalid_input", "top_k must be an integer.")
    if top_k < 1:
        raise CliError("invalid_input", "top_k must be at least 1.")
    return features, top_k


def load_artifact(model_path: Path, metadata_path: Path) -> tuple[object, dict[str, object]]:
    if not model_path.is_file() or not metadata_path.is_file():
        raise CliError(
            "model_unavailable",
            "Crop recommendation model is currently unavailable. Train and deploy the model artifact first.",
            details={"model_exists": model_path.is_file(), "metadata_exists": metadata_path.is_file()},
        )
    metadata = read_json_file(metadata_path)
    expected_hash = metadata.get("artifact_sha256")
    if not isinstance(expected_hash, str) or len(expected_hash) != 64:
        raise CliError("invalid_metadata", "Crop model metadata does not contain a valid artifact checksum.")
    actual_hash = sha256_file(model_path)
    if actual_hash != expected_hash:
        raise CliError(
            "model_integrity_error",
            "Crop model checksum does not match its metadata; inference was refused.",
        )
    expected_features = metadata.get("feature_order")
    if expected_features != FEATURES:
        raise CliError("invalid_metadata", "Crop model feature schema is incompatible with this service.")
    try:
        import joblib
    except ImportError as exc:
        raise CliError("dependency_missing", "joblib is required; install ml/requirements.txt.") from exc
    try:
        model = joblib.load(model_path)
    except Exception as exc:
        raise CliError("model_load_failed", "Crop model artifact could not be loaded.") from exc
    if not hasattr(model, "predict_proba") or not hasattr(model, "classes_"):
        raise CliError("invalid_model", "Crop model does not expose class probabilities.")
    return model, metadata


def main() -> int:
    args = parse_args()
    payload = load_json_input(input_json=args.input_json, input_file=args.input_file)
    features, top_k = validated_features(payload)
    model_path = args.model.resolve()
    metadata_path = args.metadata.resolve()
    model, metadata = load_artifact(model_path, metadata_path)
    try:
        import pandas as pd
    except ImportError as exc:
        raise CliError("dependency_missing", "pandas is required; install ml/requirements.txt.") from exc
    try:
        probabilities = model.predict_proba(pd.DataFrame([features], columns=FEATURES))[0]
    except Exception as exc:
        raise CliError("prediction_failed", "Crop model could not process the supplied inputs.") from exc
    classes = [str(value) for value in model.classes_]
    if len(classes) != len(probabilities) or not classes:
        raise CliError("invalid_model", "Crop model returned an invalid probability vector.")
    if top_k > len(classes):
        top_k = len(classes)
    ranked = sorted(zip(classes, probabilities, strict=True), key=lambda item: float(item[1]), reverse=True)[:top_k]
    recommendations = [{"crop": crop, "probability": float(probability)} for crop, probability in ranked]
    emit_json(
        {
            "ok": True,
            "model": {
                "version": metadata.get("model_version"),
                "artifact": relative_to_ml(model_path),
            },
            "input": features,
            "top_k": top_k,
            "recommendations": recommendations,
        }
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except CliError as exc:
        emit_json(error_payload(exc))
        raise SystemExit(2)
    except KeyboardInterrupt:
        emit_json(error_payload(CliError("cancelled", "Crop prediction was cancelled.")))
        raise SystemExit(130)
    except Exception as exc:  # pragma: no cover
        log(f"Unexpected failure: {exc!r}")
        emit_json(error_payload(exc))
        raise SystemExit(1)
