package model

import "time"

type Scene struct {
	ID            string    `gorm:"primaryKey" json:"id"`
	Title         string    `gorm:"not null" json:"title"`
	Difficulty    string    `gorm:"not null" json:"difficulty"`
	ThumbnailURL  *string   `json:"thumbnail_url,omitempty"`
	VideoURL      string    `gorm:"not null" json:"video_url"`
	SoundtrackURL string    `gorm:"not null" json:"soundtrack_url"`
	VocalsURL     *string   `json:"vocals_url,omitempty"`
	Chunks        []Chunk   `gorm:"serializer:json;type:jsonb;not null" json:"chunks"`
	CreatedAt     time.Time `json:"created_at"`
}
