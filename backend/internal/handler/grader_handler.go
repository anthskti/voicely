package handler

import (
	"fmt"
	"io"
	"net/http"

	"github.com/anthskti/voicely/internal/model"
	"github.com/anthskti/voicely/internal/service"
	"github.com/gin-gonic/gin"
)


// Controller Equivalent in Golang
const multipartMemoryLimit = 32 << 20 // 32 MiB

type GraderHandler struct {
	client *service.GraderClient
}

func NewGraderHandler(client *service.GraderClient) *GraderHandler {
	return &GraderHandler{client: client}
}

func (h *GraderHandler) HandleGradeSubmission(c *gin.Context) {
	if err := c.Request.ParseMultipartForm(multipartMemoryLimit); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid multipart form", "detail": err.Error()})
		return
	}

	sceneID := c.PostForm("scene_id")
	userID := c.PostForm("user_id")
	if sceneID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "scene_id is required"})
		return
	}
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id is required"})
		return
	}

	transcripts := c.PostFormArray("chunk_transcripts")
	refURLs := c.PostFormArray("reference_audio_urls")

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read multipart form", "detail": err.Error()})
		return
	}
	files := form.File["audio_chunks"]
	
	if len(transcripts) == 0 || len(refURLs) == 0 || len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "chunk_transcripts, reference_audio_urls, and audio_chunks are required",
		})
		return
	}
	if len(transcripts) != len(refURLs) || len(transcripts) != len(files) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "chunk_transcripts, reference_audio_urls, and audio_chunks must have the same length",
			"detail": gin.H{
				"chunk_transcripts":    len(transcripts),
				"reference_audio_urls": len(refURLs),
				"audio_chunks":         len(files),
			},
		})
		return
	}

	chunks := make([]model.ChunkPayload, 0, len(files))
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
			c.JSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("audio_chunks[%d] is empty", i),
			})
			return
		}

		chunks = append(chunks, model.ChunkPayload{
			ChunkIndex:        i,
			Transcript:        transcripts[i],
			ReferenceAudioURL: refURLs[i],
			UserAudio:          audioBytes,
			Filename:          fh.Filename,
		})
	}

	// user_id is validated for the frontend contract; the grader payload is scene + chunks only.
	_ = userID

	req := model.GraderRequest{
		SceneID: sceneID,
		Chunks:  chunks,
	}

	resp, err := h.client.EvaluateTakes(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "grader request failed", "detail": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}
