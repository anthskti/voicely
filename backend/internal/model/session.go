package model

import "time"

type Session struct {
	ID              string    `gorm:"primaryKey" json:"id"`
	UserID          string    `gorm:"not null;index" json:"user_id"`
	SceneID         string    `gorm:"not null;index" json:"scene_id"`
	OverallGrade    string    `gorm:"not null" json:"overall_grade"`
	OverallScoreRaw float64   `gorm:"not null" json:"overall_score_raw"`
	ExportURL       *string   `json:"export_url,omitempty"`
	ExportStatus    string    `json:"export_status,omitempty"`
	ExportError     *string   `json:"export_error,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

type CreateSessionRequest struct {
	UserID          string  `json:"user_id"`
	SceneID         string  `json:"scene_id"`
	OverallGrade    string  `json:"overall_grade"`
	OverallScoreRaw float64 `json:"overall_score_raw"`
	ExportURL       string  `json:"export_url,omitempty"`
}
