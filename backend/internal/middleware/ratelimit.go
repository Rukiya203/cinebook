package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/moviebooking/backend/pkg/utils"
)

// bucket holds the token state for a single IP address.
type bucket struct {
	tokens   float64
	lastFill time.Time
}

// RateLimiter implements a per-IP token-bucket algorithm.
//
// Each IP gets its own bucket that refills at `rate` tokens/second up to
// `capacity`. A request costs 1 token; requests that find an empty bucket
// receive HTTP 429. The cleanup goroutine removes idle IPs every 10 minutes.
type RateLimiter struct {
	mu       sync.Mutex
	buckets  map[string]*bucket
	rate     float64 // tokens added per second
	capacity float64 // maximum tokens (== initial tokens == burst size)
}

// NewRateLimiter creates a RateLimiter allowing rps requests per second per IP,
// with an initial burst of burst requests, and starts the cleanup goroutine.
func NewRateLimiter(rps float64, burst int) *RateLimiter {
	rl := &RateLimiter{
		buckets:  make(map[string]*bucket),
		rate:     rps,
		capacity: float64(burst),
	}
	go rl.cleanup()
	return rl
}

// Limit returns an HTTP middleware that applies this rate limiter.
// Blocked requests receive a 429 with a Retry-After: 1 header.
func (rl *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := clientIP(r)
		if !rl.allow(ip) {
			w.Header().Set("Retry-After", "1")
			utils.Error(w, http.StatusTooManyRequests, "rate limit exceeded — try again shortly")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (rl *RateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	b, ok := rl.buckets[ip]
	if !ok {
		b = &bucket{tokens: rl.capacity, lastFill: now}
		rl.buckets[ip] = b
	}

	// Refill proportional to time elapsed since last request.
	elapsed := now.Sub(b.lastFill).Seconds()
	b.tokens = min(rl.capacity, b.tokens+elapsed*rl.rate)
	b.lastFill = now

	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

// cleanup evicts IP buckets that have been idle for more than 10 minutes
// so the map does not grow without bound on long-running servers.
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		cutoff := time.Now().Add(-10 * time.Minute)
		rl.mu.Lock()
		for ip, b := range rl.buckets {
			if b.lastFill.Before(cutoff) {
				delete(rl.buckets, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// clientIP extracts the real client IP from RemoteAddr, stripping the port.
func clientIP(r *http.Request) string {
	// Respect X-Forwarded-For when behind a trusted proxy (load balancer / CDN).
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		return forwarded
	}
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}
