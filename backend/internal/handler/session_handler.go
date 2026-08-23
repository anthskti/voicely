package handler

import (
	"net/http"
	"slices"
	"strings"

	"github.com/anthskti/voicely/internal/middleware"
	"github.com/anthskti/voicely/internal/model"
	"github.com/anthskti/voicely/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SessionHandler struct {
	sessions *repository.SessionRepository
	scenes   *repository.SceneRepository
}

func NewSessionHandler(sessions *repository.SessionRepository, scenes *repository.SceneRepository) *SessionHandler {
	return &SessionHandler{sessions: sessions, scenes: scenes}
}

func (h *SessionHandler) CreateSession(c *gin.Context) {
	var req model.CreateSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON body", "detail": err.Error()})
		return
	}

	req.UserID = strings.TrimSpace(req.UserID)
	req.SceneID = strings.TrimSpace(req.SceneID)
	req.OverallGrade = strings.TrimSpace(req.OverallGrade)

	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	req.UserID = userID

	if req.SceneID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "scene_id is required"})
		return
	}
	if req.OverallGrade == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "overall_grade is required"})
		return
	}
	if !slices.Contains(validGrades, req.OverallGrade) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "overall_grade must be one of S+, S, A, B, C, D, F",
			"detail": req.OverallGrade,
		})
		return
	}
	if req.OverallScoreRaw < 0 || req.OverallScoreRaw > 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "overall_score_raw must be between 0 and 1"})
		return
	}

	exists, err := h.scenes.Exists(req.SceneID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify scene", "detail": err.Error()})
		return
	}
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "scene_id not found", "detail": req.SceneID})
		return
	}

	session := model.Session{
		ID:              uuid.NewString(),
		UserID:          req.UserID,
		SceneID:         req.SceneID,
		OverallGrade:    req.OverallGrade,
		OverallScoreRaw: req.OverallScoreRaw,
	}
	if url := strings.TrimSpace(req.ExportURL); url != "" {
		session.ExportURL = &url
		session.ExportStatus = model.ExportStatusReady
	}

	if err := h.sessions.Create(&session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create session", "detail": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, session)
}

// lists all sessions for the authenticated user
func (h *SessionHandler) ListSessions(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	sceneID := strings.TrimSpace(c.Query("scene_id"))

	sessions, err := h.sessions.List(userID, sceneID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list sessions", "detail": err.Error()})
		return
	}
	if sessions == nil {
		sessions = []model.Session{}
	}
	c.JSON(http.StatusOK, gin.H{"sessions": sessions})
}
