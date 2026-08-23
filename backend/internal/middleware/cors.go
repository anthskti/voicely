package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func CORS(frontendOrigin string) gin.HandlerFunc {
	allowed := parseOrigins(frontendOrigin)

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" && allowed[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Vary", "Origin")
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func parseOrigins(raw string) map[string]bool {
	allowed := map[string]bool{}
	for _, part := range strings.Split(raw, ",") {
		origin := strings.TrimSpace(part)
		if origin == "" {
			continue
		}
		allowed[origin] = true
	}
	if len(allowed) == 0 {
		allowed["http://localhost:3000"] = true
	}
	if allowed["http://localhost:3000"] {
		allowed["http://127.0.0.1:3000"] = true
	}
	if allowed["http://127.0.0.1:3000"] {
		allowed["http://localhost:3000"] = true
	}
	return allowed
}
