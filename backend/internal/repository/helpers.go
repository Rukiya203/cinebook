package repository

import (
	"encoding/json"
	"fmt"
)

// unmarshalPrices decodes the JSONB prices column (stored as {"regular":12,"premium":18,"vip":25})
// into a Go map. Used by showtime and booking repository scanners.
func unmarshalPrices(data []byte) (map[string]float64, error) {
	var prices map[string]float64
	if err := json.Unmarshal(data, &prices); err != nil {
		return nil, fmt.Errorf("unmarshal prices: %w", err)
	}
	return prices, nil
}
