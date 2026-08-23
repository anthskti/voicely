package repository

import (
	"github.com/anthskti/voicely/internal/model"
	"gorm.io/gorm"
)

type SessionRepository struct {
	db *gorm.DB
}

func NewSessionRepository(db *gorm.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

// saves a practice attempt
func (r *SessionRepository) Create(session *model.Session) error {
	return r.db.Create(session).Error
}

func (r *SessionRepository) GetByID(id string) (*model.Session, error) {
	var session model.Session
	err := r.db.First(&session, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *SessionRepository) UpdateExport(id, status, url, errMsg string) error {
	updates := map[string]any{
		"export_status": status,
	}
	if url != "" {
		updates["export_url"] = url
	}
	if errMsg != "" {
		updates["export_error"] = errMsg
	} else if status == model.ExportStatusReady {
		updates["export_error"] = nil
	}
	return r.db.Model(&model.Session{}).Where("id = ?", id).Updates(updates).Error
}

// lists all sessions for a user or scene
func (r *SessionRepository) List(userID, sceneID string) ([]model.Session, error) {
	q := r.db.Order("created_at DESC")
	if userID != "" {
		q = q.Where("user_id = ?", userID)
	}
	if sceneID != "" {
		q = q.Where("scene_id = ?", sceneID)
	}

	var sessions []model.Session
	err := q.Find(&sessions).Error
	return sessions, err
}
