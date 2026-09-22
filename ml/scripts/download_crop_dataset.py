"""Download the real Crop Recommendation Dataset without committing it to git.

Default source: https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset
The source page currently identifies the dataset as Apache-2.0.  The downloader
records the URL, timestamp, and SHA-256 of the exact CSV it obtained so a later
training run is traceable to a concrete input artifact.
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import tempfile
import urllib.error
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ml.common import CliError, ML_ROOT, emit_json, error_payload, log, sha256_file, utc_now, write_json_atomic


DEFAULT_DATASET_SLUG = "atharvaingle/crop-recommendation-dataset"
DEFAULT_URL = f"https://www.kaggle.com/api/v1/datasets/download/{DEFAULT_DATASET_SLUG}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=DEFAULT_URL, help="Dataset archive/CSV URL.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=ML_ROOT / "datasets" / "crop" / "raw",
        help="Directory in which Crop_recommendation.csv and source_manifest.json are stored.",
    )
    parser.add_argument(
        "--expected-sha256",
        help="Optional SHA-256 for the final CSV. A mismatch aborts without publishing it.",
    )
    parser.add_argument(
        "--max-download-mb",
        type=int,
        default=100,
        help="Fail if the remote response exceeds this size (default: 100 MB).",
    )
    parser.add_argument("--force", action="store_true", help="Replace an existing raw CSV.")
    parser.add_argument("--dry-run", action="store_true", help="Print the planned acquisition without network access.")
    return parser.parse_args()


def download_to(url: str, destination: Path, *, max_bytes: int) -> int:
    request = urllib.request.Request(url, headers={"User-Agent": "AgriSaathi-ML-Dataset-Downloader/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=60) as response, destination.open("wb") as output:
            raw_length = response.headers.get("Content-Length")
            if raw_length is not None and int(raw_length) > max_bytes:
                raise CliError(
                    "download_too_large",
                    "The remote crop dataset exceeds the configured download limit.",
                    details={"content_length": int(raw_length), "max_bytes": max_bytes},
                )
            total = 0
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise CliError(
                        "download_too_large",
                        "The remote crop dataset exceeds the configured download limit.",
                        details={"max_bytes": max_bytes},
                    )
                output.write(chunk)
            return total
    except urllib.error.HTTPError as exc:
        hint = " Kaggle may require accepted terms or configured credentials."
        raise CliError("download_failed", f"Dataset server returned HTTP {exc.code}.{hint}") from exc
    except urllib.error.URLError as exc:
        raise CliError("download_failed", "Could not connect to the crop dataset source.") from exc


def choose_csv(archive_or_csv: Path, temporary_dir: Path) -> Path:
    """Extract only a safe CSV member from a Kaggle archive, if applicable."""

    if not zipfile.is_zipfile(archive_or_csv):
        target = temporary_dir / "Crop_recommendation.csv"
        shutil.copy2(archive_or_csv, target)
        return target

    with zipfile.ZipFile(archive_or_csv) as archive:
        candidates = []
        for member in archive.infolist():
            member_path = PurePosixPath(member.filename)
            if member.is_dir() or member_path.is_absolute() or ".." in member_path.parts:
                continue
            if member_path.suffix.lower() == ".csv":
                candidates.append(member)
        if not candidates:
            raise CliError("invalid_dataset_archive", "The dataset archive did not contain a CSV file.")

        preferred = [
            member
            for member in candidates
            if member.filename.rsplit("/", 1)[-1].lower() == "crop_recommendation.csv"
        ]
        if len(preferred) == 1:
            selected = preferred[0]
        elif len(candidates) == 1:
            selected = candidates[0]
        else:
            raise CliError(
                "ambiguous_dataset_archive",
                "The dataset archive has multiple CSV files; pass a direct CSV URL instead.",
                details={"csv_members": [member.filename for member in candidates]},
            )
        target = temporary_dir / "Crop_recommendation.csv"
        with archive.open(selected, "r") as source, target.open("wb") as output:
            shutil.copyfileobj(source, output)
        return target


def main() -> int:
    args = parse_args()
    if args.max_download_mb < 1:
        raise CliError("invalid_input", "--max-download-mb must be at least 1.")
    expected_hash = args.expected_sha256.lower() if args.expected_sha256 else None
    if expected_hash is not None and (len(expected_hash) != 64 or any(c not in "0123456789abcdef" for c in expected_hash)):
        raise CliError("invalid_input", "--expected-sha256 must be a 64-character hexadecimal SHA-256.")

    output_dir = args.output_dir.resolve()
    final_csv = output_dir / "Crop_recommendation.csv"
    if final_csv.exists() and not args.force:
        raise CliError(
            "output_exists",
            "Raw crop data already exists. Use --force only when replacing it intentionally.",
            details={"path": str(final_csv)},
        )

    if args.dry_run:
        emit_json(
            {
                "ok": True,
                "dry_run": True,
                "source_url": args.url,
                "output": str(final_csv),
                "max_download_bytes": args.max_download_mb * 1024 * 1024,
            }
        )
        return 0

    output_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="crop-download-", dir=str(output_dir)) as temporary_name:
        temporary_dir = Path(temporary_name)
        archive_path = temporary_dir / "download"
        log("Downloading crop recommendation dataset...")
        bytes_downloaded = download_to(args.url, archive_path, max_bytes=args.max_download_mb * 1024 * 1024)
        extracted_csv = choose_csv(archive_path, temporary_dir)
        actual_hash = sha256_file(extracted_csv)
        if expected_hash is not None and actual_hash != expected_hash:
            raise CliError(
                "checksum_mismatch",
                "The downloaded crop CSV did not match --expected-sha256.",
                details={"expected": expected_hash, "actual": actual_hash},
            )
        os.replace(extracted_csv, final_csv)

    manifest_path = output_dir / "source_manifest.json"
    manifest = {
        "dataset": "Crop Recommendation Dataset",
        "dataset_slug": DEFAULT_DATASET_SLUG if args.url == DEFAULT_URL else None,
        "license": "Apache-2.0 (reported by the source dataset page; verify before redistribution)",
        "source_url": args.url,
        "downloaded_at": utc_now(),
        "download_bytes": bytes_downloaded,
        "file": final_csv.name,
        "sha256": sha256_file(final_csv),
    }
    write_json_atomic(manifest_path, manifest)
    emit_json(
        {
            "ok": True,
            "dataset_path": str(final_csv),
            "manifest_path": str(manifest_path),
            "sha256": manifest["sha256"],
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
        emit_json(error_payload(CliError("cancelled", "Dataset download was cancelled.")))
        raise SystemExit(130)
    except Exception as exc:  # pragma: no cover - defensive boundary for subprocess callers
        log(f"Unexpected failure: {exc!r}")
        emit_json(error_payload(exc))
        raise SystemExit(1)
