package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port             string
	GraderServiceURL string
	DatabaseURL      string
}

func Load() Config {
	loadEnvFile()

	return Config{
		Port:             getEnv("PORT", ""),
		GraderServiceURL: getEnv("GRADER_SERVICE_URL", ""),
		DatabaseURL:      getEnv("DATABASE_URL", ""),
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
