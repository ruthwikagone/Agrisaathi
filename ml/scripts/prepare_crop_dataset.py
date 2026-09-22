"""Validate and prepare the Crop Recommendation CSV for reproducible training."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ml.common import CliError, ML_ROOT, emit_json, error_payload, log, sha256_file, utc_now, write_json_atomic


FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
TARGET = "label"
REQUIRED_COLUMNS = FEATURES + [TARGET]
ALIASES = {
    "n": "N",
    "nitrogen": "N",
    "p": "P",
    "phosphorus": "P",
    "k": "K",
    "potassium": "K",
    "temperature": "temperature",
    "humidity": "humidity",
    "ph": "ph",
    "soil_ph": "ph",
    "rainfall": "rainfall",
    "label": "label",
    "crop": "label",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=Path,
        default=ML_ROOT / "datasets" / "crop" / "raw" / "Crop_recommendation.csv",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ML_ROOT / "datasets" / "crop" / "processed" / "crop_recommendation_clean.csv",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=ML_ROOT / "datasets" / "crop" / "processed" / "manifest.json",
    )
    parser.add_argument(
        "--drop-invalid",
        action="store_true",
        help="Drop rows with invalid/missing values instead of failing. Counts are recorded in the manifest.",
    )
    parser.add_argument(
        "--drop-duplicates",
        action="store_true",
        help="Drop exact duplicate rows instead of retaining them. Counts are recorded in the manifest.",
    )
    parser.add_argument("--force", action="store_true", help="Replace an existing prepared CSV.")
    return parser.parse_args()


def canonical_column_name(column: object) -> str | None:
    normalized = str(column).strip().lower().replace(" ", "_")
    return ALIASES.get(normalized)


def main() -> int:
    args = parse_args()
    try:
        import pandas as pd
    except ImportError as exc:
        raise CliError("dependency_missing", "pandas is required; install ml/requirements.txt.") from exc

    input_path = args.input.resolve()
    output_path = args.output.resolve()
    manifest_path = args.manifest.resolve()
    if not input_path.is_file():
        raise CliError("dataset_not_found", "Raw crop CSV is unavailable. Run download_crop_dataset.py first.")
    if output_path.exists() and not args.force:
        raise CliError("output_exists", "Prepared crop CSV already exists. Use --force to replace it intentionally.")

    try:
        frame = pd.read_csv(input_path)
    except Exception as exc:
        raise CliError("invalid_dataset", "The crop dataset could not be read as CSV.") from exc
    original_rows = int(len(frame))
    renamed: dict[object, str] = {}
    seen: set[str] = set()
    for column in frame.columns:
        canonical = canonical_column_name(column)
        if canonical:
            if canonical in seen:
                raise CliError("invalid_dataset", f"Dataset has duplicate columns mapping to '{canonical}'.")
            renamed[column] = canonical
            seen.add(canonical)
    frame = frame.rename(columns=renamed)
    missing = [column for column in REQUIRED_COLUMNS if column not in frame.columns]
    if missing:
        raise CliError(
            "invalid_dataset",
            "Crop dataset does not contain the required training columns.",
            details={"missing_columns": missing, "available_columns": [str(c) for c in frame.columns]},
        )
    frame = frame[REQUIRED_COLUMNS].copy()
    for feature in FEATURES:
        frame[feature] = pd.to_numeric(frame[feature], errors="coerce")
    frame[TARGET] = frame[TARGET].astype("string").str.strip()
    invalid = frame[FEATURES].isna().any(axis=1) | frame[TARGET].isna() | (frame[TARGET] == "")
    # These broad physical bounds catch clearly malformed records while preserving
    # the source dataset rather than inventing imputed values.
    invalid |= (frame["N"] < 0) | (frame["P"] < 0) | (frame["K"] < 0)
    invalid |= (frame["humidity"] < 0) | (frame["humidity"] > 100)
    invalid |= (frame["ph"] < 0) | (frame["ph"] > 14)
    invalid |= frame["rainfall"] < 0
    invalid |= (frame["temperature"] < -50) | (frame["temperature"] > 70)
    invalid_rows = int(invalid.sum())
    if invalid_rows and not args.drop_invalid:
        raise CliError(
            "invalid_dataset",
            "Crop dataset contains invalid rows. Inspect it or rerun with --drop-invalid to explicitly discard them.",
            details={"invalid_rows": invalid_rows, "total_rows": original_rows},
        )
    if invalid_rows:
        frame = frame.loc[~invalid].copy()

    duplicate_rows = int(frame.duplicated().sum())
    if duplicate_rows and args.drop_duplicates:
        frame = frame.drop_duplicates().copy()
    if frame.empty:
        raise CliError("invalid_dataset", "No usable crop rows remain after validation.")
    class_counts = frame[TARGET].value_counts().sort_index()
    if len(class_counts) < 2:
        raise CliError("invalid_dataset", "Crop dataset needs at least two crop labels for classification.")
    if int(class_counts.min()) < 2:
        sparse_labels = class_counts[class_counts < 2].index.tolist()
        raise CliError(
            "invalid_dataset",
            "Each crop label needs at least two rows for a reproducible train/test split.",
            details={"labels": sparse_labels},
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    log("Writing validated crop dataset...")
    frame.to_csv(output_path, index=False, lineterminator="\n")
    manifest = {
        "prepared_at": utc_now(),
        "input_path": str(input_path),
        "input_sha256": sha256_file(input_path),
        "output_path": str(output_path),
        "output_sha256": sha256_file(output_path),
        "features": FEATURES,
        "target": TARGET,
        "original_rows": original_rows,
        "invalid_rows": invalid_rows,
        "invalid_rows_dropped": bool(args.drop_invalid),
        "duplicate_rows_after_validation": duplicate_rows,
        "duplicate_rows_dropped": bool(args.drop_duplicates),
        "prepared_rows": int(len(frame)),
        "class_counts": {str(label): int(count) for label, count in class_counts.items()},
    }
    write_json_atomic(manifest_path, manifest)
    emit_json(
        {
            "ok": True,
            "prepared_dataset": str(output_path),
            "manifest": str(manifest_path),
            "rows": int(len(frame)),
            "classes": int(len(class_counts)),
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
        emit_json(error_payload(CliError("cancelled", "Dataset preparation was cancelled.")))
        raise SystemExit(130)
    except Exception as exc:  # pragma: no cover
        log(f"Unexpected failure: {exc!r}")
        emit_json(error_payload(exc))
        raise SystemExit(1)
