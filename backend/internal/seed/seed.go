package seed

import (
	_ "embed"
	"encoding/json"
	"log"

	"github.com/anthskti/voicely/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

//go:embed scene_valorant.json
var sceneValorantJSON []byte

func Run(gdb *gorm.DB) error {
	var scene model.Scene
	if err := json.Unmarshal(sceneValorantJSON, &scene); err != nil {
		return err
	}

	if err := gdb.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"title", "difficulty", "thumbnail_url", "video_url",
			"soundtrack_url", "vocals_url", "chunks",
		}),
	}).Create(&scene).Error; err != nil {
		return err
	}

	log.Printf("seeded scene %q", scene.ID)
	return nil
}
