package service

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/anthskti/voicely/internal/model"
)

const (
	soundtrackVolume  = 0.80
	voiceVolume       = 1.15
	exportHTTPTimeout = 60 * time.Second
)

type Exporter struct {
	s3         *S3Store
	httpClient *http.Client
}

func NewExporter(s3 *S3Store) *Exporter {
	return &Exporter{
		s3: s3,
		httpClient: &http.Client{
			Timeout: exportHTTPTimeout,
		},
	}
}

func (e *Exporter) Ready() error {
	if e == nil || e.s3 == nil {
		return fmt.Errorf("S3 is not configured — set AWS_S3_BUCKET and credentials (backend/.idea/s3.md)")
	}
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		return fmt.Errorf("ffmpeg not found on PATH")
	}
	return nil
}

func (e *Exporter) Run(ctx context.Context, job *model.ExportJob, scene *model.Scene, takes [][]byte) (string, error) {
	if err := e.Ready(); err != nil {
		return "", err
	}
	if scene == nil {
		return "", fmt.Errorf("scene is required")
	}
	if len(takes) != len(scene.Chunks) {
		return "", fmt.Errorf("got %d audio takes, scene has %d chunks", len(takes), len(scene.Chunks))
	}

	dir, err := os.MkdirTemp("", "voicely-export-*")
	if err != nil {
		return "", fmt.Errorf("temp dir: %w", err)
	}
	defer os.RemoveAll(dir)

	videoPath := filepath.Join(dir, "video.mp4")
	soundtrackPath := filepath.Join(dir, "soundtrack"+extFromURL(scene.SoundtrackURL, ".mp3"))
	outPath := filepath.Join(dir, "out.mp4")

	if err := e.download(ctx, scene.VideoURL, videoPath); err != nil {
		return "", fmt.Errorf("download video: %w", err)
	}
	if err := e.download(ctx, scene.SoundtrackURL, soundtrackPath); err != nil {
		return "", fmt.Errorf("download soundtrack: %w", err)
	}

	takePaths := make([]string, len(takes))
	for i, data := range takes {
		if len(data) == 0 {
			return "", fmt.Errorf("audio take %d is empty", i)
		}
		p := filepath.Join(dir, fmt.Sprintf("take_%02d%s", i, suffixForAudio(data)))
		if err := os.WriteFile(p, data, 0o600); err != nil {
			return "", fmt.Errorf("write take %d: %w", i, err)
		}
		takePaths[i] = p
	}

	if err := runFFmpeg(ctx, videoPath, soundtrackPath, takePaths, scene.Chunks, outPath); err != nil {
		return "", err
	}

	key := fmt.Sprintf("exports/%s/%s.mp4", safePathPart(job.UserID), job.ID)
	downloadName := fmt.Sprintf("voicely-%s.mp4", safePathPart(scene.ID))
	url, err := e.s3.UploadMP4(ctx, key, outPath, downloadName)
	if err != nil {
		return "", err
	}
	return url, nil
}

func (e *Exporter) download(ctx context.Context, url, dest string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "voicely-export/1.0")

	resp, err := e.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("GET %s: status %d", url, resp.StatusCode)
	}

	f, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer f.Close()
	if _, err := io.Copy(f, resp.Body); err != nil {
		return err
	}
	info, err := f.Stat()
	if err != nil {
		return err
	}
	if info.Size() == 0 {
		return fmt.Errorf("empty file from %s", url)
	}
	return nil
}

func runFFmpeg(ctx context.Context, video, soundtrack string, takes []string, chunks []model.Chunk, out string) error {
	ffmpeg, err := exec.LookPath("ffmpeg")
	if err != nil {
		return fmt.Errorf("ffmpeg not found on PATH")
	}

	args := []string{
		"-hide_banner",
		"-loglevel", "error",
		"-y",
		"-i", video,
		"-i", soundtrack,
	}
	for _, t := range takes {
		args = append(args, "-i", t)
	}
	args = append(args,
		"-filter_complex", buildFilterComplex(chunks),
		"-map", "0:v:0",
		"-map", "[a]",
		"-c:v", "copy",
		"-c:a", "aac",
		"-b:a", "192k",
		"-shortest",
		"-movflags", "+faststart",
		out,
	)

	cmd := exec.CommandContext(ctx, ffmpeg, args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		detail := strings.TrimSpace(stderr.String())
		if detail == "" {
			detail = err.Error()
		}
		return fmt.Errorf("ffmpeg: %s", truncateStr(detail, 800))
	}
	info, err := os.Stat(out)
	if err != nil || info.Size() == 0 {
		return fmt.Errorf("ffmpeg produced an empty mp4")
	}
	return nil
}

// Muted video is mapped separately. This graph:
// soundtrack bed + each take trimmed to (end-start), faded, delayed to start_time_sec.
func buildFilterComplex(chunks []model.Chunk) string {
	var b strings.Builder
	fmt.Fprintf(&b, "[1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=%s[bg];",
		fmtFloat(soundtrackVolume))

	for i, ch := range chunks {
		dur := ch.EndTimeSec - ch.StartTimeSec
		if dur < 0.05 {
			dur = 0.05
		}
		fadeIn := 0.02
		fadeOut := 0.04
		if dur < 0.12 {
			fadeIn = 0.01
			fadeOut = math.Min(0.02, dur/4)
		}
		fadeOutStart := dur - fadeOut
		if fadeOutStart < 0 {
			fadeOutStart = 0
		}
		delayMs := int(math.Round(ch.StartTimeSec * 1000))
		if delayMs < 0 {
			delayMs = 0
		}
		// input 0 = video, 1 = soundtrack, takes start at 2
		fmt.Fprintf(&b,
			"[%d:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,atrim=0:%s,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=%s,afade=t=out:st=%s:d=%s,adelay=%d:all=1,volume=%s[u%d];",
			i+2, fmtFloat(dur), fmtFloat(fadeIn), fmtFloat(fadeOutStart), fmtFloat(fadeOut), delayMs, fmtFloat(voiceVolume), i,
		)
	}

	b.WriteString("[bg]")
	for i := range chunks {
		fmt.Fprintf(&b, "[u%d]", i)
	}
	fmt.Fprintf(&b, "amix=inputs=%d:duration=first:dropout_transition=0:normalize=0[a]", 1+len(chunks))
	return b.String()
}

func fmtFloat(v float64) string {
	return strconv.FormatFloat(v, 'f', 3, 64)
}

func suffixForAudio(data []byte) string {
	if bytes.HasPrefix(data, []byte("RIFF")) {
		return ".wav"
	}
	if bytes.HasPrefix(data, []byte{0x1a, 0x45, 0xdf, 0xa3}) {
		return ".webm"
	}
	if len(data) >= 8 && string(data[4:8]) == "ftyp" {
		return ".mp4"
	}
	if bytes.HasPrefix(data, []byte("OggS")) {
		return ".ogg"
	}
	if bytes.HasPrefix(data, []byte("ID3")) || (len(data) >= 2 && (data[0] == 0xff && (data[1] == 0xfb || data[1] == 0xf3))) {
		return ".mp3"
	}
	return ".webm"
}

func extFromURL(url, fallback string) string {
	path := url
	if i := strings.Index(path, "?"); i >= 0 {
		path = path[:i]
	}
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".mp3", ".wav", ".m4a", ".aac", ".ogg":
		return ext
	default:
		return fallback
	}
}

func safePathPart(s string) string {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, "/", "_")
	s = strings.ReplaceAll(s, "..", "_")
	s = strings.ReplaceAll(s, " ", "_")
	if s == "" {
		return "anon"
	}
	return s
}

func truncateStr(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
