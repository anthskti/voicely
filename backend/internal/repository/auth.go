package repository

import (
	"errors"
	"strings"
	"time"

	"github.com/anthskti/voicely/internal/model"
	"gorm.io/gorm"
)

type AuthRepository struct {
	db *gorm.DB
}

func NewAuthRepository(db *gorm.DB) *AuthRepository {
	return &AuthRepository{db: db}
}

func (r *AuthRepository) CreateUser(user *model.User) error {
	return r.db.Create(user).Error
}

func (r *AuthRepository) GetUserByEmail(email string) (*model.User, error) {
	var user model.User
	err := r.db.Where("email = ?", strings.ToLower(strings.TrimSpace(email))).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *AuthRepository) GetUserByID(id string) (*model.User, error) {
	var user model.User
	err := r.db.First(&user, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *AuthRepository) CreateAuthSession(session *model.AuthSession) error {
	return r.db.Create(session).Error
}

func (r *AuthRepository) GetAuthSessionByTokenHash(tokenHash string) (*model.AuthSession, error) {
	var session model.AuthSession
	err := r.db.Where("token_hash = ? AND expires_at > ?", tokenHash, time.Now()).First(&session).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *AuthRepository) DeleteAuthSessionByTokenHash(tokenHash string) error {
	result := r.db.Where("token_hash = ?", tokenHash).Delete(&model.AuthSession{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *AuthRepository) DeleteExpiredAuthSessions() error {
	return r.db.Where("expires_at <= ?", time.Now()).Delete(&model.AuthSession{}).Error
}

func IsDuplicateEmail(err error) bool {
	return errors.Is(err, gorm.ErrDuplicatedKey) ||
		strings.Contains(strings.ToLower(err.Error()), "duplicate") ||
		strings.Contains(strings.ToLower(err.Error()), "unique constraint")
}
