package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port             string
	GraderServiceURL string
	DatabaseURL      string
	FrontendOrigin   string
	AuthCookieSecure bool
	AWSRegion        string
	AWSS3Bucket      string
	AWSS3PublicBase  string
}

func Load() Config {
	loadEnvFile()

	frontendOrigin := getEnv("FRONTEND_ORIGIN", "http://localhost:3000")
	authCookieSecure := getEnv("AUTH_COOKIE_SECURE", "") == "true" ||
		getEnv("AUTH_COOKIE_SECURE", "") == "1" ||
		(strings.HasPrefix(frontendOrigin, "https://") && getEnv("AUTH_COOKIE_SECURE", "") != "false")

	return Config{
		Port:             getEnv("PORT", ""),
		GraderServiceURL: getEnv("GRADER_SERVICE_URL", ""),
		DatabaseURL:      getEnv("DATABASE_URL", ""),
		FrontendOrigin:   frontendOrigin,
		AuthCookieSecure: authCookieSecure,
		AWSRegion:        getEnv("AWS_REGION", ""),
		AWSS3Bucket:      getEnv("AWS_S3_BUCKET", ""),
		AWSS3PublicBase:  getEnv("AWS_S3_PUBLIC_BASE_URL", ""),
	}
}

// Existing process env overrides
func loadEnvFile() {
	for _, path := range []string{".env", "backend/.env"} {
		if err := godotenv.Load(path); err == nil {
			log.Printf("loaded env from %s", path)
			return
		}
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
