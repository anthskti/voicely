package model

const (
	ExportStatusProcessing = "processing"
	ExportStatusReady      = "ready"
	ExportStatusFailed     = "failed"
)

type ExportJob struct {
	ID        string `json:"export_id"`
	Status    string `json:"status"`
	ExportURL string `json:"export_url,omitempty"`
	Error     string `json:"error,omitempty"`
	UserID    string `json:"-"`
	SceneID   string `json:"-"`
	SessionID string `json:"-"`
}

type ExportStartResponse struct {
	ExportID string `json:"export_id"`
	Status   string `json:"status"`
}
