package model

import "time"

const (
	ExportStatusProcessing = "processing"
	ExportStatusReady      = "ready"
	ExportStatusFailed     = "failed"
	ExportStatusExpired    = "expired"
)

type ExportJob struct {
	ID        string     `json:"export_id"`
	Status    string     `json:"status"`
	ExportURL string     `json:"export_url,omitempty"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	Error     string     `json:"error,omitempty"`
	UserID    string     `json:"-"`
	SceneID   string     `json:"-"`
	SessionID string     `json:"-"`
	ObjectKey string     `json:"-"`
}

type ExportStartResponse struct {
	ExportID string `json:"export_id"`
	Status   string `json:"status"`
}
