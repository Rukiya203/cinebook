// Package cache provides a generic in-memory TTL cache safe for concurrent use.
package cache

import (
	"runtime"
	"sync"
	"time"
)

type item[V any] struct {
	value     V
	expiresAt time.Time
}

// TTLCache is a generic, goroutine-safe in-memory cache where every entry
// expires after a fixed TTL. A background goroutine evicts stale entries
// periodically so memory does not grow unbounded.
//
// Call Stop() when the cache is no longer needed to terminate the eviction
// goroutine and release its resources.
type TTLCache[K comparable, V any] struct {
	mu    sync.RWMutex
	items map[K]item[V]
	ttl   time.Duration
	stop  chan struct{}
}

// New creates a TTLCache with the given TTL and starts the background eviction
// goroutine. Call Stop() to shut it down cleanly when the cache is discarded.
func New[K comparable, V any](ttl time.Duration) *TTLCache[K, V] {
	c := &TTLCache[K, V]{
		items: make(map[K]item[V]),
		ttl:   ttl,
		stop:  make(chan struct{}),
	}
	go c.evict()
	return c
}

// Stop signals the background eviction goroutine to exit. Safe to call multiple
// times; subsequent calls are no-ops. Always call Stop when discarding a cache
// to prevent goroutine leaks.
func (c *TTLCache[K, V]) Stop() {
	select {
	case <-c.stop: // already stopped
	default:
		close(c.stop)
	}
}

// Get returns the cached value and true if the key exists and has not expired.
func (c *TTLCache[K, V]) Get(key K) (V, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	it, ok := c.items[key]
	if !ok || time.Now().After(it.expiresAt) {
		var zero V
		return zero, false
	}
	return it.value, true
}

// Set stores a value under key with the cache's TTL.
func (c *TTLCache[K, V]) Set(key K, value V) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items[key] = item[V]{value: value, expiresAt: time.Now().Add(c.ttl)}
}

// Delete removes a single key. No-op if the key does not exist.
func (c *TTLCache[K, V]) Delete(key K) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.items, key)
}

// Flush removes all entries. Use after a write that invalidates all cached values.
func (c *TTLCache[K, V]) Flush() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items = make(map[K]item[V])
}

// evict runs on a ticker and removes expired entries without holding the write
// lock for the full scan, so Get and Set calls are not starved on large caches.
//
// Algorithm:
//  1. Snapshot expired keys under a short read lock (no writes blocked during scan).
//  2. Delete in batches of 100 under a write lock, re-checking expiry inside the
//     lock to avoid a TOCTOU race where a concurrent Set() refreshed a key between
//     the scan and the delete.
//  3. Yield between batches so other goroutines get scheduled.
func (c *TTLCache[K, V]) evict() {
	ticker := time.NewTicker(c.ttl * 2)
	defer ticker.Stop()
	for {
		select {
		case <-c.stop:
			return
		case <-ticker.C:
			c.evictExpired()
		}
	}
}

const evictBatchSize = 100

func (c *TTLCache[K, V]) evictExpired() {
	now := time.Now()

	// Phase 1: collect expired keys under read lock — no writes blocked.
	c.mu.RLock()
	expired := make([]K, 0)
	for k, it := range c.items {
		if now.After(it.expiresAt) {
			expired = append(expired, k)
		}
	}
	c.mu.RUnlock()

	if len(expired) == 0 {
		return
	}

	// Phase 2: delete in batches under write lock, re-checking expiry to avoid
	// deleting a key that was refreshed by Set() between phase 1 and phase 2.
	for i := 0; i < len(expired); i += evictBatchSize {
		end := min(i+evictBatchSize, len(expired))
		c.mu.Lock()
		for _, k := range expired[i:end] {
			if it, ok := c.items[k]; ok && now.After(it.expiresAt) {
				delete(c.items, k)
			}
		}
		c.mu.Unlock()
		if end < len(expired) {
			runtime.Gosched() // yield between batches so reads/writes can proceed
		}
	}
}
