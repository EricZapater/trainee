package store

import (
	"context"

	"trainee-backend/internal/models"
)

func (s *PostgresStore) ListManagedWeeksByEntrenador(ctx context.Context, entrenadorID string) ([]models.ManagedWeekWithCount, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT mw.id, mw.entrenador_id, TO_CHAR(mw.week_start, 'YYYY-MM-DD'),
		        mw.estat, mw.created_at,
		        COUNT(ws.id) AS num_atletes_respost
		 FROM managed_weeks mw
		 LEFT JOIN atletes a ON a.entrenador_id = mw.entrenador_id
		 LEFT JOIN weekly_submissions ws ON ws.atleta_id = a.id AND ws.week_start = mw.week_start
		 WHERE mw.entrenador_id = $1
		 GROUP BY mw.id
		 ORDER BY mw.week_start DESC`,
		entrenadorID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	weeks := []models.ManagedWeekWithCount{}
	for rows.Next() {
		var w models.ManagedWeekWithCount
		if err := rows.Scan(&w.ID, &w.EntrenadorID, &w.WeekStart, &w.Estat, &w.CreatedAt, &w.NumAtletesRespost); err != nil {
			return nil, err
		}
		weeks = append(weeks, w)
	}
	return weeks, rows.Err()
}

func (s *PostgresStore) ListOpenWeeksByEntrenador(ctx context.Context, entrenadorID string) ([]models.ManagedWeek, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, entrenador_id, TO_CHAR(week_start, 'YYYY-MM-DD'), estat, created_at
		 FROM managed_weeks
		 WHERE entrenador_id = $1 AND estat = 'oberta'
		 ORDER BY week_start DESC`,
		entrenadorID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	weeks := []models.ManagedWeek{}
	for rows.Next() {
		var w models.ManagedWeek
		if err := rows.Scan(&w.ID, &w.EntrenadorID, &w.WeekStart, &w.Estat, &w.CreatedAt); err != nil {
			return nil, err
		}
		weeks = append(weeks, w)
	}
	return weeks, rows.Err()
}

func (s *PostgresStore) CreateManagedWeek(ctx context.Context, entrenadorID, weekStart, estat string) (*models.ManagedWeek, error) {
	var w models.ManagedWeek
	err := s.pool.QueryRow(ctx,
		`INSERT INTO managed_weeks (entrenador_id, week_start, estat)
		 VALUES ($1, $2::date, $3)
		 RETURNING id, entrenador_id, TO_CHAR(week_start, 'YYYY-MM-DD'), estat, created_at`,
		entrenadorID, weekStart, estat,
	).Scan(&w.ID, &w.EntrenadorID, &w.WeekStart, &w.Estat, &w.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &w, nil
}

func (s *PostgresStore) UpdateManagedWeekEstat(ctx context.Context, id, estat string) (*models.ManagedWeek, error) {
	var w models.ManagedWeek
	err := s.pool.QueryRow(ctx,
		`UPDATE managed_weeks SET estat = $1
		 WHERE id = $2
		 RETURNING id, entrenador_id, TO_CHAR(week_start, 'YYYY-MM-DD'), estat, created_at`,
		estat, id,
	).Scan(&w.ID, &w.EntrenadorID, &w.WeekStart, &w.Estat, &w.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &w, nil
}

func (s *PostgresStore) GetManagedWeekByEntrenadorAndDate(ctx context.Context, entrenadorID, weekStart string) (*models.ManagedWeek, error) {
	var w models.ManagedWeek
	err := s.pool.QueryRow(ctx,
		`SELECT id, entrenador_id, TO_CHAR(week_start, 'YYYY-MM-DD'), estat, created_at
		 FROM managed_weeks
		 WHERE entrenador_id = $1 AND week_start = $2::date`,
		entrenadorID, weekStart,
	).Scan(&w.ID, &w.EntrenadorID, &w.WeekStart, &w.Estat, &w.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &w, nil
}

func (s *PostgresStore) EnsureManagedWeekExists(ctx context.Context, entrenadorID, weekStart, estat string) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO managed_weeks (entrenador_id, week_start, estat)
		 VALUES ($1, $2::date, $3)
		 ON CONFLICT (entrenador_id, week_start) DO NOTHING`,
		entrenadorID, weekStart, estat,
	)
	return err
}
