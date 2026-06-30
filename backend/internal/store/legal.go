package store

import (
	"context"
)

func (s *PostgresStore) RecordLegalConsent(ctx context.Context, userID, version, ip string) error {
	query := `
		INSERT INTO legal_consents (user_id, policy_version, ip_address)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, policy_version) DO NOTHING
	`
	_, err := s.pool.Exec(ctx, query, userID, version, ip)
	return err
}

func (s *PostgresStore) HasLegalConsent(ctx context.Context, userID, version string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM legal_consents
			WHERE user_id = $1 AND policy_version = $2
		)
	`
	var exists bool
	err := s.pool.QueryRow(ctx, query, userID, version).Scan(&exists)
	return exists, err
}
