package service

import (
	"sync"

	"github.com/anthskti/voicely/internal/model"
)

// ExportJobStore is in-process job state for async FFmpeg. Fine for a single Render instance.
type ExportJobStore struct {
	mu   sync.RWMutex
	jobs map[string]*model.ExportJob
}

func NewExportJobStore() *ExportJobStore {
	return &ExportJobStore{jobs: make(map[string]*model.ExportJob)}
}

func (s *ExportJobStore) Put(job *model.ExportJob) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.jobs[job.ID] = job
}

func (s *ExportJobStore) Get(id string) (*model.ExportJob, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	job, ok := s.jobs[id]
	if !ok {
		return nil, false
	}
	copy := *job
	return &copy, true
}

func (s *ExportJobStore) Complete(id, url string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if job, ok := s.jobs[id]; ok {
		job.Status = model.ExportStatusReady
		job.ExportURL = url
		job.Error = ""
	}
}

func (s *ExportJobStore) Fail(id, errMsg string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if job, ok := s.jobs[id]; ok {
		job.Status = model.ExportStatusFailed
		job.Error = errMsg
	}
}
