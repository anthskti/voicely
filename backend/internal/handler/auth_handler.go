package handler

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/anthskti/voicely/internal/config"
	"github.com/anthskti/voicely/internal/model"
	"github.com/anthskti/voicely/internal/repository"
	"github.com/anthskti/voicely/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuthHandler struct {
	auth *repository.AuthRepository
	cfg  config.Config
}

func NewAuthHandler(auth *repository.AuthRepository, cfg config.Config) *AuthHandler {
	return &AuthHandler{auth: auth, cfg: cfg}
}

func (h *AuthHandler) Signup(c *gin.Context) {
	var req model.SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON body", "detail": err.Error()})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Email = service.NormalizeEmail(req.Email)
	req.Password = strings.TrimSpace(req.Password)

	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}
	if req.Email == "" || !strings.Contains(req.Email, "@") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid email is required"})
		return
	}
	if len(req.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password must be at least 6 characters"})
		return
	}

	hash, err := service.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	user := model.User{
		ID:           uuid.NewString(),
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: hash,
	}

	if err := h.auth.CreateUser(&user); err != nil {
		if repository.IsDuplicateEmail(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user", "detail": err.Error()})
		return
	}

	h.issueSession(c, user)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req model.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON body", "detail": err.Error()})
		return
	}

	email := service.NormalizeEmail(req.Email)
	password := strings.TrimSpace(req.Password)

	if email == "" || password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email and password are required"})
		return
	}

	user, err := h.auth.GetUserByEmail(email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load user", "detail": err.Error()})
		return
	}

	if err := service.CheckPassword(user.PasswordHash, password); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	h.issueSession(c, *user)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	token, err := c.Cookie(service.SessionCookieName)
	if err == nil && token != "" {
		_ = h.auth.DeleteAuthSessionByTokenHash(service.HashSessionToken(token))
	}

	h.clearSessionCookie(c)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *AuthHandler) Me(c *gin.Context) {
	token, err := c.Cookie(service.SessionCookieName)
	if err != nil || token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	authSession, err := h.auth.GetAuthSessionByTokenHash(service.HashSessionToken(token))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired session"})
		return
	}

	user, err := h.auth.GetUserByID(authSession.UserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load user", "detail": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user.ToResponse()})
}

func (h *AuthHandler) issueSession(c *gin.Context, user model.User) {
	token, err := service.GenerateSessionToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create session"})
		return
	}

	expiresAt := time.Now().AddDate(0, 0, service.SessionDurationDays)
	authSession := model.AuthSession{
		ID:        uuid.NewString(),
		UserID:    user.ID,
		TokenHash: service.HashSessionToken(token),
		ExpiresAt: expiresAt,
	}

	if err := h.auth.CreateAuthSession(&authSession); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create session", "detail": err.Error()})
		return
	}

	h.setSessionCookie(c, token, expiresAt)
	c.JSON(http.StatusOK, gin.H{"user": user.ToResponse()})
}

func (h *AuthHandler) setSessionCookie(c *gin.Context, token string, expiresAt time.Time) {
	h.writeSessionCookie(c, token, int(time.Until(expiresAt).Seconds()))
}

func (h *AuthHandler) clearSessionCookie(c *gin.Context) {
	h.writeSessionCookie(c, "", -1)
}

func (h *AuthHandler) writeSessionCookie(c *gin.Context, token string, maxAge int) {
	// Cross-site (Vercel → Render) needs None+Secure. Localhost:3000 → :8080 is same-site,
	// so Lax+insecure works. None without Secure is rejected by Chrome, which looks like
	// "signed in" from the login JSON while later API calls have no cookie.
	sameSite := http.SameSiteLaxMode
	if h.cfg.AuthCookieSecure {
		sameSite = http.SameSiteNoneMode
	}

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     service.SessionCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   h.cfg.AuthCookieSecure,
		SameSite: sameSite,
	})
}
