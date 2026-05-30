// Package cache provides a generic in-memory TTL cache safe for concurrent use.
package cache

import (
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
type TTLCache[K comparable, V any] struct {
	mu    sync.RWMutex
	items map[K]item[V]
	ttl   time.Duration
}

// New creates a TTLCache with the given TTL and starts the eviction goroutine.
// The goroutine runs for the lifetime of the process — intended for long-lived caches.
func New[K comparable, V any](ttl time.Duration) *TTLCache[K, V] {
	c := &TTLCache[K, V]{
		items: make(map[K]item[V]),
		ttl:   ttl,
	}
	go c.evict()
	return c
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

// evict runs on a ticker and removes entries that have passed their TTL,
// preventing unbounded memory growth from one-time cache keys.
func (c *TTLCache[K, V]) evict() {
	ticker := time.NewTicker(c.ttl * 2)
	defer ticker.Stop()
	for range ticker.C {
		now := time.Now()
		c.mu.Lock()
		for k, it := range c.items {
			if now.After(it.expiresAt) {
				delete(c.items, k)
			}
		}
		c.mu.Unlock()
	}
}
