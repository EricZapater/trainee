package store

import (
	"context"

	"trainee-backend/internal/models"
)

// AddSystemLog adds a new log entry to the system_logs table
func (s *PostgresStore) AddSystemLog(ctx context.Context, accio, nivell, missatge string, detalls *string) error {
	query := `
		INSERT INTO system_logs (accio, nivell, missatge, detalls)
		VALUES ($1, $2, $3, $4)
	`
	_, err := s.pool.Exec(ctx, query, accio, nivell, missatge, detalls)
	return err
}

// GetSystemLogs retrieves system logs with pagination
func (s *PostgresStore) GetSystemLogs(ctx context.Context, limit, offset int) ([]models.SystemLog, error) {
	query := `
		SELECT id, accio, nivell, missatge, detalls, created_at
		FROM system_logs
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := s.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	logs := make([]models.SystemLog, 0)
	for rows.Next() {
		var log models.SystemLog
		if err := rows.Scan(
			&log.ID,
			&log.Accio,
			&log.Nivell,
			&log.Missatge,
			&log.Detalls,
			&log.CreatedAt,
		); err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return logs, nil
}
