package middleware

import (
	"log"
	"net/http"
	"time"
)

// wrappedResponseWriter wraps http.ResponseWriter so we can capture the status
// code written by the handler (the standard interface does not expose this).
type wrappedResponseWriter struct {
	http.ResponseWriter
	status int
}

// WriteHeader captures the status code before delegating to the real writer.
func (w *wrappedResponseWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

// Logger is middleware that logs each request's method, URI, remote address,
// response status code, and duration. It runs after the handler completes,
// so it accurately captures the status code set by downstream middleware or handlers.
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Default to 200 because handlers that call w.Write without WriteHeader implicitly send 200.
		wrapped := &wrappedResponseWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(wrapped, r)

		log.Printf("[%s] %s %s — %d (%v)",
			r.Method, r.RequestURI, r.RemoteAddr, wrapped.status, time.Since(start))
	})
}
