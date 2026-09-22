"""Validate PlantVillage images and identify corrupt or exact-duplicate files.

The validator never deletes images.  It writes a report suitable for review by a
data steward and fails if any image cannot be decoded.  Exact duplicate hashes are
reported; use ``--fail-on-duplicates`` when a no-duplicate policy is required.
"""

from __future__ import annotations

import argparse
import collections
import sys
import warnings
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ml.common import CliError, ML_ROOT, emit_json, error_payload, log, sha256_file, utc_now, write_json_atomic


IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=ML_ROOT / "datasets" / "plantvillage" / "source" / "raw" / "color",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ML_ROOT / "reports" / "plant_disease" / "validation.json",
    )
    parser.add_argument("--fail-on-duplicates", action="store_true")
    parser.add_argument(
        "--detail-limit",
        type=int,
        default=1000,
        help="Maximum corrupt/duplicate paths embedded in the report (counts remain complete).",
    )
    return parser.parse_args()


def image_files(root: Path) -> list[tuple[str, Path]]:
    classes = sorted(path for path in root.iterdir() if path.is_dir() and not path.name.startswith("."))
    if not classes:
        raise CliError("invalid_dataset", "PlantVillage color directory has no class directories.")
    files: list[tuple[str, Path]] = []
    for class_dir in classes:
        for path in sorted(class_dir.rglob("*")):
            if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES:
                files.append((class_dir.name, path))
    if not files:
        raise CliError("invalid_dataset", "PlantVillage color directory has no supported image files.")
    return files


def inspect_image(path: Path) -> tuple[int, int]:
    try:
        from PIL import Image
    except ImportError as exc:
        raise CliError("dependency_missing", "Pillow is required; install ml/requirements.txt.") from exc
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(path) as image:
                image.verify()
            with Image.open(path) as image:
                image.load()
                return image.size
    except Exception as exc:
        raise CliError("corrupt_image", str(exc)) from exc


def main() -> int:
    args = parse_args()
    if args.detail_limit < 0:
        raise CliError("invalid_input", "--detail-limit cannot be negative.")
    dataset_dir = args.dataset_dir.resolve()
    report_path = args.report.resolve()
    if not dataset_dir.is_dir():
        raise CliError("dataset_not_found", "PlantVillage source images are unavailable. Run download_plantvillage.py first.")
    files = image_files(dataset_dir)
    log(f"Validating {len(files)} PlantVillage image files...")
    corrupt: list[dict[str, str]] = []
    hashes: dict[str, list[tuple[str, str]]] = collections.defaultdict(list)
    per_class: collections.Counter[str] = collections.Counter()
    dimensions: collections.Counter[str] = collections.Counter()
    for index, (label, path) in enumerate(files, start=1):
        relative = path.relative_to(dataset_dir).as_posix()
        try:
            width, height = inspect_image(path)
            image_hash = sha256_file(path)
        except CliError as exc:
            if len(corrupt) < args.detail_limit:
                corrupt.append({"path": relative, "reason": exc.message[:500]})
            continue
        per_class[label] += 1
        dimensions[f"{width}x{height}"] += 1
        hashes[image_hash].append((label, relative))
        if index % 1000 == 0:
            log(f"Validated {index}/{len(files)} images...")

    duplicate_groups = [members for members in hashes.values() if len(members) > 1]
    duplicate_files = sum(len(members) - 1 for members in duplicate_groups)
    cross_label_groups = sum(1 for members in duplicate_groups if len({label for label, _ in members}) > 1)
    duplicate_examples = [
        {"sha256": image_hash, "files": [relative for _, relative in members]}
        for image_hash, members in hashes.items()
        if len(members) > 1
    ][: args.detail_limit]
    corrupt_count = len(files) - sum(per_class.values())
    report = {
        "validated_at": utc_now(),
        "dataset_dir": str(dataset_dir),
        "status": "failed" if corrupt_count else "passed",
        "total_candidate_files": len(files),
        "valid_images": sum(per_class.values()),
        "corrupt_images": corrupt_count,
        "corrupt_examples": corrupt,
        "class_counts": dict(sorted(per_class.items())),
        "image_dimensions": dict(sorted(dimensions.items())),
        "exact_duplicate_groups": len(duplicate_groups),
        "exact_duplicate_files_beyond_first": duplicate_files,
        "cross_label_duplicate_groups": cross_label_groups,
        "duplicate_examples": duplicate_examples,
        "hash_algorithm": "sha256",
    }
    write_json_atomic(report_path, report)
    if corrupt_count:
        raise CliError(
            "dataset_validation_failed",
            "PlantVillage validation found corrupt or undecodable images; no prepared split was created.",
            details={"report": str(report_path), "corrupt_images": corrupt_count},
        )
    if args.fail_on_duplicates and duplicate_groups:
        raise CliError(
            "dataset_validation_failed",
            "PlantVillage validation found exact duplicate images under a strict duplicate policy.",
            details={"report": str(report_path), "duplicate_groups": len(duplicate_groups)},
        )
    emit_json(
        {
            "ok": True,
            "report": str(report_path),
            "valid_images": report["valid_images"],
            "classes": len(per_class),
            "exact_duplicate_groups": len(duplicate_groups),
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
        emit_json(error_payload(CliError("cancelled", "PlantVillage validation was cancelled.")))
        raise SystemExit(130)
    except Exception as exc:  # pragma: no cover
        log(f"Unexpected failure: {exc!r}")
        emit_json(error_payload(exc))
        raise SystemExit(1)
