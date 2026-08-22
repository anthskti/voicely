"""Audio grading: Resemblyzer timbre + simple pitch/cadence heuristics."""

from __future__ import annotations

import uuid
from pathlib import Path

import numpy as np
import soundfile as sf
from resemblyzer import VoiceEncoder, preprocess_wav

from models.schemas import ChunkBreakdown, GraderResponse
from services.audio import materialize_wav

_encoder: VoiceEncoder | None = None


def get_encoder() -> VoiceEncoder:
    global _encoder
    if _encoder is None:
        _encoder = VoiceEncoder(device="cpu")
    return _encoder


def score_to_grade(score: float) -> str:
    if score >= 0.95:
        return "S+"
    if score >= 0.90:
        return "S"
    if score >= 0.80:
        return "A"
    if score >= 0.70:
        return "B"
    if score >= 0.60:
        return "C"
    if score >= 0.50:
        return "D"
    return "F"


def _wav_from_path(path: Path) -> np.ndarray:
    """Preprocess for Resemblyzer (16 kHz mono + VAD)."""
    return preprocess_wav(path)


def _duration_seconds(path: Path) -> float:
    """File duration before VAD so cadence still works on synthetic tones."""
    info = sf.info(str(path))
    if info.frames <= 0 or info.samplerate <= 0:
        return 1e-6
    return float(info.frames) / float(info.samplerate)


def _timbre_similarity(ref_wav: np.ndarray, user_wav: np.ndarray) -> float:
    encoder = get_encoder()
    ref_emb = encoder.embed_utterance(ref_wav)
    user_emb = encoder.embed_utterance(user_wav)
    sim = float(np.clip(ref_emb @ user_emb, 0.0, 1.0))
    return sim


def _cadence_similarity(ref_dur: float, user_dur: float) -> float:
    """Duration ratio: how closely the take length matches the reference."""
    ref_dur = max(ref_dur, 1e-6)
    user_dur = max(user_dur, 1e-6)
    return float(min(ref_dur, user_dur) / max(ref_dur, user_dur))


def _pitch_similarity(ref_wav: np.ndarray, user_wav: np.ndarray) -> float:
    """
    Lightweight stand-in until a dedicated pitch model (librosa pyin) is tuned, idk.
    Compares normalized RMS energy envelopes via correlation.
    """
    def envelope(x: np.ndarray, win: int = 512) -> np.ndarray:
        if len(x) < win:
            return np.array([float(np.sqrt(np.mean(x**2)))], dtype=np.float64)
        n = len(x) // win
        clipped = x[: n * win].reshape(n, win)
        env = np.sqrt(np.mean(clipped**2, axis=1))
        peak = float(np.max(env)) or 1.0
        return env / peak

    a = envelope(ref_wav)
    b = envelope(user_wav)
    n = min(len(a), len(b))
    if n < 2:
        return 0.5
    a = a[:n] - a[:n].mean()
    b = b[:n] - b[:n].mean()
    denom = float(np.linalg.norm(a) * np.linalg.norm(b)) or 1e-6
    corr = float(np.dot(a, b) / denom)
    return float(np.clip((corr + 1.0) / 2.0, 0.0, 1.0))


def score_chunk(
    index: int,
    transcript: str,
    ref_audio: bytes,
    user_audio: bytes,
) -> ChunkBreakdown:
    ref_path = materialize_wav(ref_audio)
    user_path = materialize_wav(user_audio)
    try:
        ref_dur = _duration_seconds(ref_path)
        user_dur = _duration_seconds(user_path)
        ref_wav = _wav_from_path(ref_path)
        user_wav = _wav_from_path(user_path)
    finally:
        ref_path.unlink(missing_ok=True)
        user_path.unlink(missing_ok=True)

    timbre = _timbre_similarity(ref_wav, user_wav)
    cadence = _cadence_similarity(ref_dur, user_dur)
    pitch = _pitch_similarity(ref_wav, user_wav)

    # Timbre (Resemblyzer) weighted highest for this prototype.
    score_raw = 0.5 * timbre + 0.25 * cadence + 0.25 * pitch
    grade = score_to_grade(score_raw)

    notes_parts: list[str] = []
    if timbre >= 0.85:
        notes_parts.append("Strong timbre match (Resemblyzer).")
    elif timbre < 0.55:
        notes_parts.append("Timbre diverged from the reference voice.")
    if cadence < 0.75:
        notes_parts.append("Timing/length drifted vs reference.")
    if pitch < 0.6:
        notes_parts.append("Energy contour differed from reference.")
    if not notes_parts:
        notes_parts.append(f"Line scored {grade}.")
    if transcript:
        notes_parts.append(f'Target: "{transcript[:48]}"')

    return ChunkBreakdown(
        chunk_index=index,
        grade=grade,
        score_raw=round(score_raw, 4),
        pitch=round(pitch, 4),
        cadence=round(cadence, 4),
        timbre=round(timbre, 4),
        notes=" ".join(notes_parts),
    )


def build_response(scene_id: str, breakdowns: list[ChunkBreakdown]) -> GraderResponse:
    if not breakdowns:
        overall = 0.0
    else:
        overall = float(sum(b.score_raw for b in breakdowns) / len(breakdowns))

    pros: list[str] = []
    cons: list[str] = []
    for b in breakdowns:
        if b.score_raw >= 0.85:
            pros.append(f"Chunk {b.chunk_index}: solid {b.grade} ({b.notes})")
        elif b.score_raw < 0.7:
            cons.append(f"Chunk {b.chunk_index}: {b.notes}")

    if not pros and breakdowns:
        pros.append("Completed all lines for grading.")
    if not cons and breakdowns:
        cons.append("No major issues flagged by the prototype scorer.")

    return GraderResponse(
        session_id=f"sess_{scene_id}_{uuid.uuid4().hex[:8]}",
        overall_grade=score_to_grade(overall),
        overall_score_raw=round(overall, 4),
        pros=pros[:5],
        cons=cons[:5],
        chunk_breakdowns=breakdowns,
    )
