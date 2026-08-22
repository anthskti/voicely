package main

import (
	"log"

	"github.com/anthskti/voicely/internal/config"
	"github.com/anthskti/voicely/internal/handler"
	"github.com/anthskti/voicely/internal/middleware"
	"github.com/anthskti/voicely/internal/service"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	graderClient := service.NewGraderClient(cfg.GraderServiceURL)
	gradeHandler := handler.NewGraderHandler(graderClient)

	r := gin.Default()
	r.Use(middleware.CORS())

	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "Voicely Backend is running."})
	})
	r.POST("/api/v1/grade", gradeHandler.HandleGradeSubmission)

	addr := ":" + cfg.Port
	log.Printf("Voicely api listening on %s (grader=%s)", addr, cfg.GraderServiceURL)
	if err := r.Run(addr); err != nil {
		log.Fatal(err)
	}
}
