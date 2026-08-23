package service

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/anthskti/voicely/internal/config"
	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

const ExportObjectTTL = time.Hour

type S3Store struct {
	client     *s3.Client
	presign    *s3.PresignClient
	bucket     string
	region     string
	publicBase string
}

type UploadResult struct {
	URL       string
	ObjectKey string
	ExpiresAt time.Time
}

func NewS3Store(ctx context.Context, cfg config.Config) (*S3Store, error) {
	if strings.TrimSpace(cfg.AWSS3Bucket) == "" {
		return nil, fmt.Errorf("AWS_S3_BUCKET is not set. see backend/docs/s3-iam.md")
	}
	region := cfg.AWSRegion
	if region == "" {
		region = "us-east-2"
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(region),
		// Avoid signing x-amz-checksum-mode into presigned GETs — browsers don't send it,
		// which causes SignatureDoesNotMatch when opening export_url.
		awsconfig.WithRequestChecksumCalculation(aws.RequestChecksumCalculationWhenRequired),
		awsconfig.WithResponseChecksumValidation(aws.ResponseChecksumValidationWhenRequired),
	)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg)
	return &S3Store{
		client:     client,
		presign:    s3.NewPresignClient(client),
		bucket:     cfg.AWSS3Bucket,
		region:     region,
		publicBase: strings.TrimRight(cfg.AWSS3PublicBase, "/"),
	}, nil
}

func (s *S3Store) UploadMP4(ctx context.Context, key, filePath, downloadName string) (*UploadResult, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("open export mp4: %w", err)
	}
	defer f.Close()

	_, err = s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:             aws.String(s.bucket),
		Key:                aws.String(key),
		Body:               f,
		ContentType:        aws.String("video/mp4"),
		ContentDisposition: aws.String(fmt.Sprintf(`inline; filename="%s"`, downloadName)),
		CacheControl:       aws.String("private, max-age=3600"),
	})
	if err != nil {
		return nil, fmt.Errorf("s3 put object: %w", err)
	}

	expiresAt := time.Now().UTC().Add(ExportObjectTTL)
	url, err := s.PresignGet(ctx, key, ExportObjectTTL)
	if err != nil {
		return nil, err
	}

	s.scheduleDelete(key, ExportObjectTTL)

	return &UploadResult{
		URL:       url,
		ObjectKey: key,
		ExpiresAt: expiresAt,
	}, nil
}

func (s *S3Store) PresignGet(ctx context.Context, key string, ttl time.Duration) (string, error) {
	if ttl <= 0 {
		return "", fmt.Errorf("presign ttl must be positive")
	}
	if ttl > ExportObjectTTL {
		ttl = ExportObjectTTL
	}
	out, err := s.presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(ttl))
	if err != nil {
		return "", fmt.Errorf("s3 presign get: %w", err)
	}
	return out.URL, nil
}

func (s *S3Store) DeleteObject(ctx context.Context, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("s3 delete object: %w", err)
	}
	return nil
}

func (s *S3Store) scheduleDelete(key string, after time.Duration) {
	go func() {
		timer := time.NewTimer(after)
		defer timer.Stop()
		<-timer.C
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if err := s.DeleteObject(ctx, key); err != nil {
			log.Printf("export delete %s: %v", key, err)
			return
		}
		log.Printf("export deleted after TTL: %s", key)
	}()
}

// PublicURL is for public scene assets (not exports).
func (s *S3Store) PublicURL(key string) string {
	if s.publicBase != "" {
		return s.publicBase + "/" + key
	}
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.bucket, s.region, key)
}
