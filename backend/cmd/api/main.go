package main

import (
	"context"
	"log"

	"github.com/anthskti/voicely/internal/config"
	"github.com/anthskti/voicely/internal/db"
	"github.com/anthskti/voicely/internal/handler"
	"github.com/anthskti/voicely/internal/middleware"
	"github.com/anthskti/voicely/internal/repository"
	"github.com/anthskti/voicely/internal/seed"
	"github.com/anthskti/voicely/internal/service"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	gdb, err := db.Open(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	if err := seed.Run(gdb); err != nil {
		log.Fatalf("seed: %v", err)
	}

	sceneRepo := repository.NewSceneRepository(gdb)
	sessionRepo := repository.NewSessionRepository(gdb)

	graderClient := service.NewGraderClient(cfg.GraderServiceURL)
	gradeHandler := handler.NewGraderHandler(graderClient)
	sceneHandler := handler.NewSceneHandler(sceneRepo)
	sessionHandler := handler.NewSessionHandler(sessionRepo, sceneRepo)

	var s3Store *service.S3Store
	s3Store, err = service.NewS3Store(context.Background(), cfg)
	if err != nil {
		log.Printf("export disabled: %v", err)
		s3Store = nil
	}
	exporter := service.NewExporter(s3Store)
	exportJobs := service.NewExportJobStore()
	exportHandler := handler.NewExportHandler(sceneRepo, sessionRepo, exporter, exportJobs)

	r := gin.Default()
	r.Use(middleware.CORS())

	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "Voicely Backend is running."})
	})

	v1 := r.Group("/api/v1")
	{
		v1.POST("/grade", gradeHandler.HandleGradeSubmission)
		v1.GET("/scenes", sceneHandler.ListScenes)
		v1.GET("/scenes/:id", sceneHandler.GetScene)
		v1.POST("/sessions", sessionHandler.CreateSession)
		v1.GET("/sessions", sessionHandler.ListSessions)
		v1.POST("/export", exportHandler.StartExport)
		v1.GET("/exports/:id", exportHandler.GetExport)
	}

	addr := ":" + cfg.Port
	log.Printf("Voicely api listening on %s (grader=%s)", addr, cfg.GraderServiceURL)
	if err := r.Run(addr); err != nil {
		log.Fatal(err)
	}
}
