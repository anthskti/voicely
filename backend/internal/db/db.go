package db

import (
	"fmt"
	"log"

	"github.com/anthskti/voicely/internal/model"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Open(databaseURL string) (*gorm.DB, error) {
	gdb, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  databaseURL,
		PreferSimpleProtocol: true,
	}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	sqlDB, err := gdb.DB()
	if err != nil {
		return nil, fmt.Errorf("get sql db: %w", err)
	}
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}

	if err := gdb.AutoMigrate(&model.Scene{}, &model.Session{}, &model.User{}, &model.AuthSession{}); err != nil {
		return nil, fmt.Errorf("auto migrate: %w", err)
	}

	log.Println("database connected and pushed")
	return gdb, nil
}
