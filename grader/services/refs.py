"""Resolve reference audio bytes from URL or local assets mirror."""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlparse

import httpx

// temp
_ASSETS_ROOT = Path(
    os.getenv(
        "ASSETS_ROOT",
        str(Path(__file__).resolve().parents[2] / "assets"),
    )
).resolve()


def load_reference_audio(url: str, timeout: float = 30.0) -> bytes:
    """
    Load reference audio for a chunk.

    1. If ASSETS_ROOT is set, try mapping URL path suffix under assets/
       ex. .../scenes/scene_01/refs/chunk_00.wav -> ASSETS_ROOT/scenes/scene_01/refs/chunk_00.wav
    2. Otherwise (or on miss), HTTP GET the URL.
    """
    local = _local_path_for_url(url)
    if local is not None and local.is_file():
        return local.read_bytes()

    parsed = urlparse(url)
    if parsed.scheme in ("http", "https"):
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            resp = client.get(url)
            resp.raise_for_status()
            return resp.content

    raise FileNotFoundError(
        f"could not resolve reference audio: {url!r} "
        f"(tried local under {_ASSETS_ROOT} and HTTP)"
    )


def _local_path_for_url(url: str) -> Path | None:
    parsed = urlparse(url)
    path = parsed.path if parsed.scheme else url
    # Prefer the scenes/... suffix used in repos asset pack.
    marker = "/scenes/"
    if marker in path:
        rel = path[path.index(marker) + 1 :]  # scenes/...
        return _ASSETS_ROOT / rel
    # Bare relative path
    candidate = Path(path)
    if not candidate.is_absolute():
        return _ASSETS_ROOT / candidate
    return None
