"""Shared, dependency-light helpers for the ML command-line tools.

Every public command writes a single JSON document to stdout.  Human-readable
progress belongs on stderr so a Node.js caller can reliably parse stdout.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import json
import math
import os
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, BinaryIO, Mapping


ML_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ML_ROOT.parent


class CliError(Exception):
    """An expected error that can safely be returned to an API caller."""

    def __init__(self, code: str, message: str, *, details: Mapping[str, Any] | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = dict(details or {})


def utc_now() -> str:
    """Return an unambiguous timestamp suitable for manifests."""

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def emit_json(payload: Mapping[str, Any]) -> None:
    """Emit exactly one JSON value on stdout.

    ``allow_nan=False`` protects downstream JSON parsers from NaN/Infinity.
    """

    sys.stdout.write(json.dumps(payload, ensure_ascii=False, sort_keys=True, allow_nan=False))
    sys.stdout.write("\n")
    sys.stdout.flush()


def log(message: str) -> None:
    """Write diagnostic progress without contaminating the JSON response."""

    print(message, file=sys.stderr, flush=True)


def error_payload(error: CliError | Exception) -> dict[str, Any]:
    if isinstance(error, CliError):
        payload: dict[str, Any] = {
            "ok": False,
            "error": {"code": error.code, "message": error.message},
        }
        if error.details:
            payload["error"]["details"] = error.details
        return payload
    return {
        "ok": False,
        "error": {
            "code": "internal_error",
            "message": "The ML command failed unexpectedly. Check the service logs.",
        },
    }


def validate_finite_number(value: Any, field: str) -> float:
    """Convert a JSON number/string to a finite float with a useful error."""

    if isinstance(value, bool):
        raise CliError("invalid_input", f"'{field}' must be a number, not a boolean.")
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:
        raise CliError("invalid_input", f"'{field}' must be a finite number.") from exc
    if not math.isfinite(result):
        raise CliError("invalid_input", f"'{field}' must be a finite number.")
    return result


def require_object(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise CliError("invalid_input", "Input JSON must be an object.")
    return payload


def load_json_input(
    *, input_json: str | None, input_file: str | None, stdin: BinaryIO | None = None
) -> dict[str, Any]:
    """Read one JSON object from an argument, file, or stdin.

    The explicit choices make subprocess integration straightforward while the
    stdin fallback supports ``spawn(...).stdin.write(JSON.stringify(payload))``.
    """

    supplied = sum(value is not None for value in (input_json, input_file))
    if supplied > 1:
        raise CliError("invalid_input", "Use only one of --input-json or --input-file.")

    try:
        if input_json is not None:
            raw: Any = json.loads(input_json)
        elif input_file is not None:
            path = Path(input_file)
            if not path.is_file():
                raise CliError("input_not_found", "The JSON input file does not exist.")
            raw = json.loads(path.read_text(encoding="utf-8"))
        else:
            source = stdin or sys.stdin.buffer
            data = source.read()
            if isinstance(data, bytes):
                data = data.decode("utf-8")
            if not data or not str(data).strip():
                raise CliError(
                    "missing_input",
                    "Provide --input-json, --input-file, or one JSON object on stdin.",
                )
            raw = json.loads(data)
    except json.JSONDecodeError as exc:
        raise CliError("invalid_json", "Input is not valid JSON.") from exc

    return require_object(raw)


def sha256_file(path: Path, *, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json_atomic(path: Path, payload: Mapping[str, Any]) -> None:
    """Write metadata without leaving a partial file if a process is interrupted."""

    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True, allow_nan=False)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent)
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(encoded)
            handle.write("\n")
        os.replace(temporary_name, path)
    except Exception:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass
        raise


def read_json_file(path: Path, *, code: str = "invalid_metadata") -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise CliError("metadata_not_found", "Required model metadata is missing.") from exc
    except json.JSONDecodeError as exc:
        raise CliError(code, "Model metadata is not valid JSON.") from exc
    return require_object(value)


def decode_base64_image(value: Any, *, max_bytes: int) -> bytes:
    """Decode a base64 data URI/string with a strict decoded-size limit."""

    if not isinstance(value, str) or not value.strip():
        raise CliError("invalid_input", "'image_base64' must be a non-empty base64 string.")
    encoded = value.strip()
    if encoded.startswith("data:"):
        if "," not in encoded:
            raise CliError("invalid_input", "The image data URI is malformed.")
        encoded = encoded.split(",", 1)[1]
    # Base64 expands data by approximately 4/3. Reject early as well as after decoding.
    if len(encoded) > (max_bytes * 4 // 3) + 8:
        raise CliError("image_too_large", "The decoded image exceeds the allowed size.")
    try:
        decoded = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise CliError("invalid_input", "'image_base64' is not valid base64.") from exc
    if len(decoded) > max_bytes:
        raise CliError("image_too_large", "The decoded image exceeds the allowed size.")
    return decoded


def relative_to_ml(path: Path) -> str:
    """Use a stable relative representation in API responses where possible."""

    try:
        return path.resolve().relative_to(ML_ROOT.resolve()).as_posix()
    except ValueError:
        return str(path.resolve())
