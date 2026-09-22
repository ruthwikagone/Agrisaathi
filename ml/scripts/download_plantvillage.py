"""Acquire PlantVillage color images reproducibly without putting them in git.

The source repository is large.  This command therefore does nothing until the
operator explicitly passes ``--accept-source-terms``.  PlantVillage's repository
does not provide this pipeline with a machine-verifiable redistribution license;
the acknowledgement records that the operator has reviewed the source terms.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ml.common import CliError, ML_ROOT, emit_json, error_payload, log, utc_now, write_json_atomic


DEFAULT_REPOSITORY = "https://github.com/spMohanty/PlantVillage-Dataset.git"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository-url", default=DEFAULT_REPOSITORY)
    parser.add_argument("--revision", default="master", help="Git branch, tag, or commit to fetch.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=ML_ROOT / "datasets" / "plantvillage" / "source",
        help="Destination containing raw/color and source_manifest.json.",
    )
    parser.add_argument(
        "--accept-source-terms",
        action="store_true",
        help="Required acknowledgement that source access, license, and use terms were reviewed.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Show the acquisition plan without cloning.")
    return parser.parse_args()


def run_git(command: list[str]) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(command, check=True, text=True, capture_output=True)
    except FileNotFoundError as exc:
        raise CliError("dependency_missing", "git is required to acquire PlantVillage.") from exc
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or "").strip()
        raise CliError(
            "download_failed",
            "PlantVillage clone failed. Check network access, revision, and source availability.",
            details={"git_error": stderr[-1000:] if stderr else "git exited unsuccessfully"},
        ) from exc


def main() -> int:
    args = parse_args()
    output_dir = args.output_dir.resolve()
    if output_dir.exists():
        raise CliError(
            "output_exists",
            "PlantVillage destination already exists. Choose a new --output-dir to avoid replacing data.",
            details={"path": str(output_dir)},
        )
    plan = {
        "repository_url": args.repository_url,
        "revision": args.revision,
        "output_dir": str(output_dir),
        "sparse_paths": ["raw/color"],
        "requires_source_terms_acknowledgement": True,
    }
    if args.dry_run:
        emit_json({"ok": True, "dry_run": True, **plan})
        return 0
    if not args.accept_source_terms:
        raise CliError(
            "source_terms_not_acknowledged",
            "Review PlantVillage source/licensing terms and rerun with --accept-source-terms before downloading.",
        )

    output_dir.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="plantvillage-download-", dir=str(output_dir.parent)) as temporary_name:
        temporary_dir = Path(temporary_name)
        clone_dir = temporary_dir / "repository"
        log("Cloning PlantVillage raw/color with Git sparse checkout; this can take substantial time and disk space...")
        run_git(
            [
                "git",
                "clone",
                "--depth",
                "1",
                "--filter=blob:none",
                "--sparse",
                "--branch",
                args.revision,
                args.repository_url,
                str(clone_dir),
            ]
        )
        run_git(["git", "-C", str(clone_dir), "sparse-checkout", "set", "raw/color"])
        commit = run_git(["git", "-C", str(clone_dir), "rev-parse", "HEAD"]).stdout.strip()
        source_color = clone_dir / "raw" / "color"
        if not source_color.is_dir():
            raise CliError(
                "invalid_dataset_source",
                "The requested PlantVillage revision did not contain raw/color images.",
            )
        output_dir.mkdir()
        shutil.copytree(source_color, output_dir / "raw" / "color")

    class_count = len([path for path in (output_dir / "raw" / "color").iterdir() if path.is_dir()])
    manifest_path = output_dir / "source_manifest.json"
    write_json_atomic(
        manifest_path,
        {
            "dataset": "PlantVillage Dataset",
            "source_repository": args.repository_url,
            "requested_revision": args.revision,
            "resolved_commit": commit,
            "downloaded_at": utc_now(),
            "variant": "raw/color",
            "class_directories": class_count,
            "license_status": (
                "Not asserted by this pipeline. Operator acknowledged responsibility to review "
                "the source repository's current license and use terms."
            ),
        },
    )
    emit_json(
        {
            "ok": True,
            "dataset_dir": str(output_dir / "raw" / "color"),
            "manifest_path": str(manifest_path),
            "resolved_commit": commit,
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
        emit_json(error_payload(CliError("cancelled", "PlantVillage download was cancelled.")))
        raise SystemExit(130)
    except Exception as exc:  # pragma: no cover
        log(f"Unexpected failure: {exc!r}")
        emit_json(error_payload(exc))
        raise SystemExit(1)
