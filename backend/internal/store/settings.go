package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

// GetSystemSetting retrieves a setting value by key
func (s *PostgresStore) GetSystemSetting(ctx context.Context, key string) ([]byte, error) {
	var value []byte
	query := `SELECT value FROM system_settings WHERE key = $1`
	err := s.pool.QueryRow(ctx, query, key).Scan(&value)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // Return nil if not found, let caller handle defaults
		}
		return nil, err
	}
	return value, nil
}

// UpdateSystemSetting inserts or updates a setting by key
func (s *PostgresStore) UpdateSystemSetting(ctx context.Context, key string, value []byte) error {
	query := `
		INSERT INTO system_settings (key, value) 
		VALUES ($1, $2)
		ON CONFLICT (key) DO UPDATE 
		SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
	`
	_, err := s.pool.Exec(ctx, query, key, value)
	return err
}
