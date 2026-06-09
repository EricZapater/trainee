package store

import (
	"context"

	"trainee-backend/internal/models"
)

func (s *PostgresStore) ListActivitats(ctx context.Context, onlyActive bool) ([]models.Activitat, error) {
	query := `SELECT id, nom, icona, color, ordre, activa, created_at FROM activitats`
	if onlyActive {
		query += ` WHERE activa = true`
	}
	query += ` ORDER BY activa DESC, ordre ASC`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	activitats := []models.Activitat{}
	for rows.Next() {
		var a models.Activitat
		if err := rows.Scan(&a.ID, &a.Nom, &a.Icona, &a.Color, &a.Ordre, &a.Activa, &a.CreatedAt); err != nil {
			return nil, err
		}
		activitats = append(activitats, a)
	}
	return activitats, rows.Err()
}

func (s *PostgresStore) CreateActivitat(ctx context.Context, nom, icona, color string) (*models.Activitat, error) {
	var a models.Activitat
	err := s.pool.QueryRow(ctx,
		`INSERT INTO activitats (nom, icona, color, ordre)
		 VALUES ($1, $2, $3, (SELECT COALESCE(MAX(ordre), 0) + 1 FROM activitats))
		 RETURNING id, nom, icona, color, ordre, activa, created_at`,
		nom, icona, color,
	).Scan(&a.ID, &a.Nom, &a.Icona, &a.Color, &a.Ordre, &a.Activa, &a.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (s *PostgresStore) UpdateActivitat(ctx context.Context, id string, req models.UpdateActivitatRequest) (*models.Activitat, error) {
	var a models.Activitat
	err := s.pool.QueryRow(ctx,
		`UPDATE activitats SET
			nom = COALESCE($1, nom),
			icona = COALESCE($2, icona),
			color = COALESCE($3, color),
			activa = COALESCE($4, activa)
		 WHERE id = $5
		 RETURNING id, nom, icona, color, ordre, activa, created_at`,
		req.Nom, req.Icona, req.Color, req.Activa, id,
	).Scan(&a.ID, &a.Nom, &a.Icona, &a.Color, &a.Ordre, &a.Activa, &a.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (s *PostgresStore) ReorderActivitats(ctx context.Context, items []models.ReorderItem) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, item := range items {
		_, err := tx.Exec(ctx,
			`UPDATE activitats SET ordre = $1 WHERE id = $2`,
			item.Ordre, item.ID,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (s *PostgresStore) SoftDeleteActivitat(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE activitats SET activa = false WHERE id = $1`,
		id,
	)
	return err
}
