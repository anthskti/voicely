package model

type Chunk struct {
	Index             int     `json:"index"`
	StartTimeSec      float64 `json:"start_time_sec"`
	EndTimeSec        float64 `json:"end_time_sec"`
	Transcript        string  `json:"transcript"`
	ReferenceAudioURL string  `json:"reference_audio_url"`
}
