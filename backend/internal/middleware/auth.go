package middleware

import (
	"net/http"

	"github.com/anthskti/voicely/internal/repository"
	"github.com/anthskti/voicely/internal/service"
	"github.com/gin-gonic/gin"
)

const ContextUserIDKey = "user_id"

func RequireAuth(authRepo *repository.AuthRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(service.SessionCookieName)
		if err != nil || token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}

		authSession, err := authRepo.GetAuthSessionByTokenHash(service.HashSessionToken(token))
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired session"})
			return
		}

		c.Set(ContextUserIDKey, authSession.UserID)
		c.Next()
	}
}

func GetUserID(c *gin.Context) (string, bool) {
	userID, ok := c.Get(ContextUserIDKey)
	if !ok {
		return "", false
	}
	id, ok := userID.(string)
	return id, ok && id != ""
}
