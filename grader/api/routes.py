from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from models.schemas import GraderResponse
from services.refs import load_reference_audio
from services.scoring import build_response, score_chunk

router = APIRouter()


@router.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "Voicely Grader is running"}


@router.post("/evaluate", response_model=GraderResponse)
async def evaluate(
    scene_id: str = Form(...),
    chunk_transcripts: list[str] = Form(...),
    reference_audio_urls: list[str] = Form(...),
    audio_chunks: list[UploadFile] = File(...),
) -> GraderResponse:
    n_t = len(chunk_transcripts)
    n_u = len(reference_audio_urls)
    n_a = len(audio_chunks)
    if n_t == 0 or n_u == 0 or n_a == 0:
        raise HTTPException(
            status_code=400,
            detail="chunk_transcripts, reference_audio_urls, and audio_chunks are required",
        )
    if not (n_t == n_u == n_a):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "field lengths must match",
                "chunk_transcripts": n_t,
                "reference_audio_urls": n_u,
                "audio_chunks": n_a,
            },
        )

    breakdowns = []
    for i in range(n_t):
        try:
            ref_bytes = load_reference_audio(reference_audio_urls[i])
        except Exception as exc:  # noqa: BLE001 — surface resolve/fetch errors to client
            raise HTTPException(
                status_code=400,
                detail=f"failed to load reference_audio_urls[{i}]: {exc}",
            ) from exc

        user_bytes = await audio_chunks[i].read()
        if not user_bytes:
            raise HTTPException(status_code=400, detail=f"audio_chunks[{i}] is empty")

        try:
            breakdowns.append(
                score_chunk(
                    index=i,
                    transcript=chunk_transcripts[i],
                    ref_audio=ref_bytes,
                    user_audio=user_bytes,
                )
            )
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=500,
                detail=f"failed to score chunk {i}: {exc}",
            ) from exc

    return build_response(scene_id, breakdowns)
