package model

type GraderRequest struct {
	SceneID string
	Chunks  []ChunkPayload
}

type ChunkPayload struct {
	ChunkIndex        int
	Transcript        string
	ReferenceAudioURL string
	UserAudio         []byte
	Filename          string // just for development, bruno
}

type GraderResponse struct {
	SessionID       string           `json:"session_id"`
	OverallGrade    string           `json:"overall_grade"`
	OverallScoreRaw float64          `json:"overall_score_raw"`
	Pros            []string         `json:"pros"`
	Cons            []string         `json:"cons"`
	ChunkBreakdowns []ChunkBreakdown `json:"chunk_breakdowns"`
}

type ChunkBreakdown struct {
	ChunkIndex int     `json:"chunk_index"`
	Grade      string  `json:"grade"`
	ScoreRaw   float64 `json:"score_raw"`
	Pitch      float64 `json:"pitch"`
	Cadence    float64 `json:"cadence"`
	Timbre     float64 `json:"timbre"`
	Notes      string  `json:"notes"`
}
