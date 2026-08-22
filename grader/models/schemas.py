from pydantic import BaseModel, Field


class ChunkBreakdown(BaseModel):
    chunk_index: int
    grade: str
    score_raw: float
    pitch: float
    cadence: float
    timbre: float
    notes: str


class GraderResponse(BaseModel):
    session_id: str
    overall_grade: str
    overall_score_raw: float
    pros: list[str] = Field(default_factory=list)
    cons: list[str] = Field(default_factory=list)
    chunk_breakdowns: list[ChunkBreakdown] = Field(default_factory=list)
