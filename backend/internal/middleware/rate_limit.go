package middleware

import (
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// PerIPLimiter is an in-process token bucket keyed by client IP.
// Fine for a single API instance (local Docker / one Render service).
type PerIPLimiter struct {
	mu       sync.Mutex
	limiters map[string]*rate.Limiter
	rate     rate.Limit
	burst    int
}

func NewPerIPLimiter(perMinute float64, burst int) *PerIPLimiter {
	if burst < 1 {
		burst = 1
	}
	return &PerIPLimiter{
		limiters: make(map[string]*rate.Limiter),
		rate:     rate.Limit(perMinute / 60.0),
		burst:    burst,
	}
}

func (p *PerIPLimiter) get(ip string) *rate.Limiter {
	p.mu.Lock()
	defer p.mu.Unlock()
	if lim, ok := p.limiters[ip]; ok {
		return lim
	}
	lim := rate.NewLimiter(p.rate, p.burst)
	p.limiters[ip] = lim
	return lim
}

func (p *PerIPLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if ip == "" {
			ip = "unknown"
		}
		if !p.get(ip).Allow() {
			c.Header("Retry-After", "60")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":  "rate limit exceeded",
				"detail": "too many requests from this IP — try again shortly",
			})
			return
		}
		c.Next()
	}
}

// Defaults for expensive routes (~per minute / IP).
var (
	GradeLimiter  = NewPerIPLimiter(10, 4) // ~10/min, burst 4
	ExportLimiter = NewPerIPLimiter(5, 3)  // ~5/min, burst 3
)
