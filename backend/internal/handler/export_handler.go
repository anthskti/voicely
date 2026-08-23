package handler

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/anthskti/voicely/internal/model"
	"github.com/anthskti/voicely/internal/repository"
	"github.com/anthskti/voicely/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const exportJobTimeout = 3 * time.Minute

type ExportHandler struct {
	scenes   *repository.SceneRepository
	sessions *repository.SessionRepository
	exporter *service.Exporter
	jobs     *service.ExportJobStore
}

func NewExportHandler(
	scenes *repository.SceneRepository,
	sessions *repository.SessionRepository,
	exporter *service.Exporter,
	jobs *service.ExportJobStore,
) *ExportHandler {
	return &ExportHandler{
		scenes:   scenes,
		sessions: sessions,
		exporter: exporter,
		jobs:     jobs,
	}
}

func (h *ExportHandler) StartExport(c *gin.Context) {
	if err := h.exporter.Ready(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "export is not configured", "detail": err.Error()})
		return
	}

	if err := c.Request.ParseMultipartForm(multipartMemoryLimit); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid multipart form", "detail": err.Error()})
		return
	}

	sceneID := strings.TrimSpace(c.PostForm("scene_id"))
	userID := strings.TrimSpace(c.PostForm("user_id"))
	sessionID := strings.TrimSpace(c.PostForm("session_id"))
	if sceneID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "scene_id is required"})
		return
	}
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id is required"})
		return
	}

	scene, err := h.scenes.GetByID(sceneID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "scene not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load scene", "detail": err.Error()})
		return
	}

	if sessionID != "" {
		if _, err := h.sessions.GetByID(sessionID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "session_id not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load session", "detail": err.Error()})
			return
		}
	}

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read multipart form", "detail": err.Error()})
		return
	}
	files := form.File["audio_chunks"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "audio_chunks are required"})
		return
	}
	if len(files) != len(scene.Chunks) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "audio_chunks length must match scene chunks",
			"detail": gin.H{
				"audio_chunks": len(files),
				"scene_chunks": len(scene.Chunks),
			},
		})
		return
	}

	takes := make([][]byte, 0, len(files))
	for i, fh := range files {
		f, err := fh.Open()
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":  fmt.Sprintf("failed to open audio_chunks[%d]", i),
				"detail": err.Error(),
			})
			return
		}
		audioBytes, err := io.ReadAll(f)
		_ = f.Close()
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":  fmt.Sprintf("failed to read audio_chunks[%d]", i),
				"detail": err.Error(),
			})
			return
		}
		if len(audioBytes) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("audio_chunks[%d] is empty", i)})
			return
		}
		takes = append(takes, audioBytes)
	}

	job := &model.ExportJob{
		ID:        uuid.NewString(),
		Status:    model.ExportStatusProcessing,
		UserID:    userID,
		SceneID:   sceneID,
		SessionID: sessionID,
	}
	h.jobs.Put(job)

	if sessionID != "" {
		_ = h.sessions.UpdateExport(sessionID, model.ExportStatusProcessing, "", "")
	}

	sceneCopy := *scene
	takesCopy := takes
	jobID := job.ID
	go h.runJob(jobID, &sceneCopy, takesCopy)

	c.JSON(http.StatusAccepted, model.ExportStartResponse{
		ExportID: job.ID,
		Status:   model.ExportStatusProcessing,
	})
}

func (h *ExportHandler) GetExport(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	job, ok := h.jobs.Get(id)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "export not found", "detail": "job expired or unknown — retry POST /api/v1/export"})
		return
	}
	c.JSON(http.StatusOK, job)
}

func (h *ExportHandler) runJob(jobID string, scene *model.Scene, takes [][]byte) {
	defer func() {
		if rec := recover(); rec != nil {
			log.Printf("export %s panic: %v", jobID, rec)
			h.jobs.Fail(jobID, fmt.Sprintf("panic: %v", rec))
		}
	}()

	job, ok := h.jobs.Get(jobID)
	if !ok {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), exportJobTimeout)
	defer cancel()

	url, err := h.exporter.Run(ctx, job, scene, takes)
	if err != nil {
		log.Printf("export %s failed: %v", jobID, err)
		h.jobs.Fail(jobID, err.Error())
		if job.SessionID != "" {
			_ = h.sessions.UpdateExport(job.SessionID, model.ExportStatusFailed, "", err.Error())
		}
		return
	}

	h.jobs.Complete(jobID, url)
	if job.SessionID != "" {
		_ = h.sessions.UpdateExport(job.SessionID, model.ExportStatusReady, url, "")
	}
	log.Printf("export %s ready: %s", jobID, url)
}
