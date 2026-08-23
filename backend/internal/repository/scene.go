package repository

import (
	"github.com/anthskti/voicely/internal/model"
	"gorm.io/gorm"
)

type SceneRepository struct {
	db *gorm.DB
}

func NewSceneRepository(db *gorm.DB) *SceneRepository {
	return &SceneRepository{db: db}
}

// get all scenes
func (r *SceneRepository) List() ([]model.Scene, error) {
	var scenes []model.Scene
	err := r.db.Order("created_at ASC").Find(&scenes).Error
	return scenes, err
}

// get scene by id
func (r *SceneRepository) GetByID(id string) (*model.Scene, error) {
	var scene model.Scene
	err := r.db.First(&scene, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &scene, nil
}

// check if scene exists
func (r *SceneRepository) Exists(id string) (bool, error) {
	var count int64
	err := r.db.Model(&model.Scene{}).Where("id = ?", id).Count(&count).Error
	return count > 0, err
}
