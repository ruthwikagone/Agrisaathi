"""Train and evaluate a crop recommender from the prepared real dataset.

This command never contains precomputed scores.  It creates the metrics JSON only
after evaluating the newly trained artifact on its held-out test split.
"""

from __future__ import annotations

import argparse
import os
import sys
import tempfile
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ml.common import (
    CliError,
    ML_ROOT,
    emit_json,
    error_payload,
    log,
    read_json_file,
    sha256_file,
    utc_now,
    write_json_atomic,
)
from ml.scripts.prepare_crop_dataset import FEATURES, TARGET


MODEL_VERSION = "crop-random-forest-v1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=Path,
        default=ML_ROOT / "datasets" / "crop" / "processed" / "crop_recommendation_clean.csv",
    )
    parser.add_argument("--model-output", type=Path, default=ML_ROOT / "models" / "crop_model.joblib")
    parser.add_argument(
        "--metadata-output", type=Path, default=ML_ROOT / "models" / "crop_model_metadata.json"
    )
    parser.add_argument(
        "--metrics-output", type=Path, default=ML_ROOT / "reports" / "crop" / "metrics.json"
    )
    parser.add_argument("--test-size", type=float, default=0.20)
    parser.add_argument("--random-state", type=int, default=42)
    parser.add_argument("--estimators", type=int, default=350)
    parser.add_argument("--max-depth", type=int, default=None)
    parser.add_argument("--n-jobs", type=int, default=-1)
    return parser.parse_args()


def atomic_joblib_dump(model: object, destination: Path) -> str:
    try:
        import joblib
    except ImportError as exc:
        raise CliError("dependency_missing", "joblib is required; install ml/requirements.txt.") from exc
    destination.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{destination.stem}.", suffix=".joblib.tmp", dir=str(destination.parent)
    )
    os.close(descriptor)
    temporary_path = Path(temporary_name)
    try:
        joblib.dump(model, temporary_path)
        artifact_hash = sha256_file(temporary_path)
        os.replace(temporary_path, destination)
        return artifact_hash
    except Exception:
        try:
            temporary_path.unlink()
        except FileNotFoundError:
            pass
        raise


def source_manifest_for(dataset_path: Path) -> dict[str, object] | None:
    manifest = dataset_path.parent / "manifest.json"
    if not manifest.is_file():
        return None
    try:
        return read_json_file(manifest)
    except CliError:
        # The raw data hash is still captured below; malformed optional provenance
        # should not be silently represented as valid metadata.
        raise CliError("invalid_dataset", "The prepared crop dataset manifest is invalid.")


def main() -> int:
    args = parse_args()
    if not 0.05 <= args.test_size < 0.5:
        raise CliError("invalid_input", "--test-size must be at least 0.05 and less than 0.5.")
    if args.estimators < 1:
        raise CliError("invalid_input", "--estimators must be at least 1.")
    if args.max_depth is not None and args.max_depth < 1:
        raise CliError("invalid_input", "--max-depth must be positive when supplied.")

    try:
        import pandas as pd
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.metrics import accuracy_score, precision_recall_fscore_support
        from sklearn.model_selection import train_test_split
        from sklearn.pipeline import Pipeline
    except ImportError as exc:
        raise CliError("dependency_missing", "scikit-learn and pandas are required; install ml/requirements.txt.") from exc

    input_path = args.input.resolve()
    model_path = args.model_output.resolve()
    metadata_path = args.metadata_output.resolve()
    metrics_path = args.metrics_output.resolve()
    if not input_path.is_file():
        raise CliError("dataset_not_found", "Prepared crop data is unavailable. Run prepare_crop_dataset.py first.")
    try:
        frame = pd.read_csv(input_path)
    except Exception as exc:
        raise CliError("invalid_dataset", "Prepared crop data could not be read as CSV.") from exc
    missing = [column for column in FEATURES + [TARGET] if column not in frame.columns]
    if missing:
        raise CliError("invalid_dataset", "Prepared crop data has an unexpected schema.", details={"missing_columns": missing})
    if frame[FEATURES].isna().any().any() or frame[TARGET].isna().any():
        raise CliError("invalid_dataset", "Prepared crop data contains missing values.")
    class_counts = frame[TARGET].value_counts()
    if len(class_counts) < 2 or int(class_counts.min()) < 2:
        raise CliError("invalid_dataset", "At least two records per crop label are required for training.")

    features = frame[FEATURES]
    labels = frame[TARGET].astype(str)
    try:
        x_train, x_test, y_train, y_test = train_test_split(
            features,
            labels,
            test_size=args.test_size,
            random_state=args.random_state,
            stratify=labels,
        )
    except ValueError as exc:
        raise CliError(
            "split_failed",
            "Could not create a stratified crop train/test split. Increase the dataset size or test split.",
        ) from exc

    classifier = RandomForestClassifier(
        n_estimators=args.estimators,
        random_state=args.random_state,
        n_jobs=args.n_jobs,
        max_depth=args.max_depth,
        class_weight=None,
    )
    model = Pipeline([("classifier", classifier)])
    log("Training crop recommendation model...")
    model.fit(x_train, y_train)
    predicted = model.predict(x_test)
    accuracy = float(accuracy_score(y_test, predicted))
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_test, predicted, average="macro", zero_division=0
    )
    trained_classifier = model.named_steps["classifier"]
    feature_importances = {
        feature: float(importance)
        for feature, importance in zip(FEATURES, trained_classifier.feature_importances_, strict=True)
    }

    input_hash = sha256_file(input_path)
    provenance = source_manifest_for(input_path)
    metrics = {
        "generated_at": utc_now(),
        "model_version": MODEL_VERSION,
        "evaluation": "held_out_stratified_test_split",
        "test_size_requested": args.test_size,
        "random_state": args.random_state,
        "train_rows": int(len(x_train)),
        "test_rows": int(len(x_test)),
        "classes": sorted(str(value) for value in model.classes_),
        "accuracy": accuracy,
        "macro_precision": float(precision),
        "macro_recall": float(recall),
        "macro_f1": float(f1),
        "feature_importances": feature_importances,
    }
    write_json_atomic(metrics_path, metrics)
    artifact_hash = atomic_joblib_dump(model, model_path)
    metadata = {
        "artifact_sha256": artifact_hash,
        "artifact_type": "scikit-learn Pipeline serialized with joblib",
        "classes": sorted(str(value) for value in model.classes_),
        "created_at": utc_now(),
        "dataset_path": str(input_path),
        "dataset_sha256": input_hash,
        "dataset_manifest": provenance,
        "feature_order": FEATURES,
        "metrics_path": str(metrics_path),
        "metrics_sha256": sha256_file(metrics_path),
        "model_version": MODEL_VERSION,
        "target": TARGET,
        "training_parameters": {
            "algorithm": "RandomForestClassifier",
            "estimators": args.estimators,
            "max_depth": args.max_depth,
            "n_jobs": args.n_jobs,
            "random_state": args.random_state,
            "test_size": args.test_size,
        },
    }
    write_json_atomic(metadata_path, metadata)
    emit_json(
        {
            "ok": True,
            "model_path": str(model_path),
            "metadata_path": str(metadata_path),
            "metrics_path": str(metrics_path),
            "model_version": MODEL_VERSION,
            "classes": len(model.classes_),
            "evaluated": True,
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
        emit_json(error_payload(CliError("cancelled", "Crop model training was cancelled.")))
        raise SystemExit(130)
    except Exception as exc:  # pragma: no cover - subprocess safety boundary
        log(f"Unexpected failure: {exc!r}")
        emit_json(error_payload(exc))
        raise SystemExit(1)
