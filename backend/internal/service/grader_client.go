package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"time"

	"github.com/anthskti/voicely/internal/model"
)

type GraderClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewGraderClient(graderURL string) *GraderClient {
	return &GraderClient{
		baseURL: graderURL,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// prep + send multipart form data and returns the grader's JSON response.
func (c *GraderClient) EvaluateTakes(ctx context.Context, req model.GraderRequest) (*model.GraderResponse, error) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	if err := writer.WriteField("scene_id", req.SceneID); err != nil {
		return nil, fmt.Errorf("write scene_id: %w", err)
	}

	for _, chunk := range req.Chunks {
		if err := writer.WriteField("chunk_transcripts", chunk.Transcript); err != nil {
			return nil, fmt.Errorf("write chunk_transcripts[%d]: %w", chunk.ChunkIndex, err)
		}
		if err := writer.WriteField("reference_audio_urls", chunk.ReferenceAudioURL); err != nil {
			return nil, fmt.Errorf("write reference_audio_urls[%d]: %w", chunk.ChunkIndex, err)
		}

		filename := chunk.Filename
		if filename == "" {
			filename = fmt.Sprintf("chunk_%d.wav", chunk.ChunkIndex)
		}
		part, err := createAudioPart(writer, "audio_chunks", filename)
		if err != nil {
			return nil, fmt.Errorf("create audio part[%d]: %w", chunk.ChunkIndex, err)
		}
		if _, err := part.Write(chunk.UserAudio); err != nil {
			return nil, fmt.Errorf("write audio_chunks[%d]: %w", chunk.ChunkIndex, err)
		}
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("close multipart writer: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL, &body)
	if err != nil {
		return nil, fmt.Errorf("create grader request: %w", err)
	}
	httpReq.Header.Set("Content-Type", writer.FormDataContentType())
	httpReq.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("call grader: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read grader response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("grader returned status %d: %s", resp.StatusCode, graderErrorDetail(respBody))
	}

	var out model.GraderResponse
	if err := json.Unmarshal(respBody, &out); err != nil {
		return nil, fmt.Errorf("unmarshal grader response: %w", err)
	}

	return &out, nil
}

func createAudioPart(w *multipart.Writer, fieldName, filename string) (io.Writer, error) {
	header := make(textproto.MIMEHeader)
	header.Set("Content-Disposition",
		fmt.Sprintf(`form-data; name="%s"; filename="%s"`, fieldName, filename))
	header.Set("Content-Type", "application/octet-stream")
	return w.CreatePart(header)
}

func graderErrorDetail(body []byte) string {
	var payload map[string]any
	if json.Unmarshal(body, &payload) == nil {
		if d, ok := payload["detail"]; ok {
			switch v := d.(type) {
			case string:
				return v
			default:
				if b, err := json.Marshal(v); err == nil {
					return string(b)
				}
			}
		}
	}
	return truncate(body, 512)
}

func truncate(b []byte, n int) string {
	if len(b) <= n {
		return string(b)
	}
	return string(b[:n]) + "…"
}
