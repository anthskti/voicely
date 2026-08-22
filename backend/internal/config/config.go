package config

import "os"

type Config struct {
	Port             string
	GraderServiceURL string
}

func Load() Config {
	return Config{
		Port:             getEnv("PORT", "8080"),
		GraderServiceURL: getEnv("GRADER_SERVICE_URL", "http://localhost:8000/evaluate"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
