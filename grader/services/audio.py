"""Decode user/reference takes (WAV, WebM, MP4, …) into PCM WAV for scoring."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import soundfile as sf


def materialize_wav(data: bytes) -> Path:
    """Write audio bytes to a 16 kHz mono PCM WAV file. Caller must unlink."""
    if not data:
        raise ValueError("empty audio payload")

    src = _write_temp(data, _suffix_for(data))
    fd, dest_name = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    dest = Path(dest_name)
    try:
        if src.suffix == ".wav" and _is_readable_wav(src):
            shutil.copyfile(src, dest)
            return dest
        _ffmpeg_to_wav(src, dest)
        return dest
    except Exception:
        dest.unlink(missing_ok=True)
        raise
    finally:
        src.unlink(missing_ok=True)


def _write_temp(data: bytes, suffix: str) -> Path:
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(data)
        return Path(tmp.name)


def _suffix_for(data: bytes) -> str:
    if data.startswith(b"RIFF"):
        return ".wav"
    if data.startswith(b"\x1a\x45\xdf\xa3"):
        return ".webm"
    if len(data) >= 8 and data[4:8] == b"ftyp":
        return ".mp4"
    if data.startswith(b"OggS"):
        return ".ogg"
    if data.startswith(b"ID3") or data[:2] in (b"\xff\xfb", b"\xff\xf3"):
        return ".mp3"
    return ".bin"


def _is_readable_wav(path: Path) -> bool:
    try:
        sf.info(str(path))
        return True
    except Exception:
        return False


def _ffmpeg_to_wav(src: Path, dest: Path) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError(
            "ffmpeg is required to decode non-WAV takes (WebM/Opus). Install ffmpeg."
        )
    result = subprocess.run(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(src),
            "-ac",
            "1",
            "-ar",
            "16000",
            "-c:a",
            "pcm_s16le",
            str(dest),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        err = (result.stderr or result.stdout or "ffmpeg failed").strip()
        raise RuntimeError(f"ffmpeg decode failed: {err}")
    if dest.stat().st_size == 0:
        raise RuntimeError("ffmpeg produced an empty wav")
