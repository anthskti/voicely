package service

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/anthskti/voicely/internal/config"
	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Store struct {
	client     *s3.Client
	bucket     string
	region     string
	publicBase string
}

func NewS3Store(ctx context.Context, cfg config.Config) (*S3Store, error) {
	if strings.TrimSpace(cfg.AWSS3Bucket) == "" {
		return nil, fmt.Errorf("AWS_S3_BUCKET is not set — see backend/.idea/s3.md")
	}
	region := cfg.AWSRegion
	if region == "" {
		region = "us-east-2"
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	return &S3Store{
		client:     s3.NewFromConfig(awsCfg),
		bucket:     cfg.AWSS3Bucket,
		region:     region,
		publicBase: strings.TrimRight(cfg.AWSS3PublicBase, "/"),
	}, nil
}

func (s *S3Store) UploadMP4(ctx context.Context, key, filePath, downloadName string) (string, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("open export mp4: %w", err)
	}
	defer f.Close()

	_, err = s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:             aws.String(s.bucket),
		Key:                aws.String(key),
		Body:               f,
		ContentType:        aws.String("video/mp4"),
		ContentDisposition: aws.String(fmt.Sprintf(`inline; filename="%s"`, downloadName)),
		CacheControl:       aws.String("public, max-age=31536000"),
	})
	if err != nil {
		return "", fmt.Errorf("s3 put object: %w", err)
	}
	return s.PublicURL(key), nil
}

func (s *S3Store) PublicURL(key string) string {
	if s.publicBase != "" {
		return s.publicBase + "/" + key
	}
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.bucket, s.region, key)
}
