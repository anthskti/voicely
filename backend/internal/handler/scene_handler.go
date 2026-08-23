package handler

import (
	"errors"
	"net/http"

	"github.com/anthskti/voicely/internal/model"
	"github.com/anthskti/voicely/internal/repository"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var validGrades = []string{"S+", "S", "A", "B", "C", "D", "F"}

type SceneHandler struct {
	scenes *repository.SceneRepository
}

func NewSceneHandler(scenes *repository.SceneRepository) *SceneHandler {
	return &SceneHandler{scenes: scenes}
}

func (h *SceneHandler) ListScenes(c *gin.Context) {
	scenes, err := h.scenes.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list scenes", "detail": err.Error()})
		return
	}
	if scenes == nil {
		scenes = []model.Scene{}
	}
	c.JSON(http.StatusOK, gin.H{"scenes": scenes})
}

func (h *SceneHandler) GetScene(c *gin.Context) {
	scene, err := h.scenes.GetByID(c.Param("id"))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "scene not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get scene", "detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, scene)
}
