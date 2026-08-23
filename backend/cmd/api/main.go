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
	authRepo := repository.NewAuthRepository(gdb)

	graderClient := service.NewGraderClient(cfg.GraderServiceURL)
	gradeHandler := handler.NewGraderHandler(graderClient)
	sceneHandler := handler.NewSceneHandler(sceneRepo)
	sessionHandler := handler.NewSessionHandler(sessionRepo, sceneRepo)
	authHandler := handler.NewAuthHandler(authRepo, cfg)

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
	r.Use(middleware.CORS(cfg.FrontendOrigin))

	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "Voicely Backend is running."})
	})

	authRequired := middleware.RequireAuth(authRepo)

	v1 := r.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		{
			auth.POST("/signup", authHandler.Signup)
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authHandler.Logout)
			auth.GET("/me", authHandler.Me)
		}

		v1.GET("/scenes", sceneHandler.ListScenes)
		v1.GET("/scenes/:id", sceneHandler.GetScene)

		v1.POST("/grade", authRequired, middleware.GradeLimiter.Middleware(), gradeHandler.HandleGradeSubmission)
		v1.POST("/sessions", authRequired, sessionHandler.CreateSession)
		v1.GET("/sessions", authRequired, sessionHandler.ListSessions)
		v1.POST("/export", authRequired, middleware.ExportLimiter.Middleware(), exportHandler.StartExport)
		v1.GET("/exports/:id", authRequired, exportHandler.GetExport)
	}

	addr := ":" + cfg.Port
	log.Printf("Voicely api listening on %s (grader=%s frontend=%s cookie_secure=%v)", addr, cfg.GraderServiceURL, cfg.FrontendOrigin, cfg.AuthCookieSecure)
	if err := r.Run(addr); err != nil {
		log.Fatal(err)
	}
}
