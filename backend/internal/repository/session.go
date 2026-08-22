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
