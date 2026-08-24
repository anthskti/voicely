package seed

import (
	"embed"
	"encoding/json"
	"fmt"
	"log"

	"github.com/anthskti/voicely/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

//go:embed scene_*.json
var sceneFiles embed.FS

func Run(gdb *gorm.DB) error {
	entries, err := sceneFiles.ReadDir(".")
	if err != nil {
		return fmt.Errorf("read seed dir: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		raw, err := sceneFiles.ReadFile(entry.Name())
		if err != nil {
			return fmt.Errorf("read %s: %w", entry.Name(), err)
		}

		var scene model.Scene
		if err := json.Unmarshal(raw, &scene); err != nil {
			return fmt.Errorf("parse %s: %w", entry.Name(), err)
		}

		if err := gdb.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"title", "difficulty", "thumbnail_url", "video_url",
				"soundtrack_url", "vocals_url", "chunks",
			}),
		}).Create(&scene).Error; err != nil {
			return fmt.Errorf("upsert %s: %w", scene.ID, err)
		}

		log.Printf("seeded scene %q", scene.ID)
	}

	return nil
}
