package store

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"trainee-backend/internal/models"
)

func (s *PostgresStore) CreateCompeticio(ctx context.Context, atletaID, entrenadorID string, req models.CreateCompeticioRequest) (*models.Competicio, error) {
	var c models.Competicio
	err := s.pool.QueryRow(ctx,
		`INSERT INTO competicions (atleta_id, entrenador_id, nom, data, tipus, kms, desnivell, enllac, track_gpx_path, comentaris, estat)
		 VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10, 'activa')
		 RETURNING id, atleta_id, entrenador_id, nom, TO_CHAR(data, 'YYYY-MM-DD'), tipus, kms, desnivell, enllac, track_gpx_path, comentaris, registrat, estat, created_at`,
		atletaID, entrenadorID, req.Nom, req.Data, req.Tipus, req.Kms, req.Desnivell, req.Enllac, req.TrackGpxPath, req.Comentaris,
	).Scan(&c.ID, &c.AtletaID, &c.EntrenadorID, &c.Nom, &c.Data, &c.Tipus, &c.Kms, &c.Desnivell, &c.Enllac, &c.TrackGpxPath, &c.Comentaris, &c.Registrat, &c.Estat, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *PostgresStore) ListCompeticionsByAtleta(ctx context.Context, atletaID string) ([]models.Competicio, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, atleta_id, entrenador_id, nom, TO_CHAR(data, 'YYYY-MM-DD'), tipus, kms, desnivell, enllac, track_gpx_path, comentaris, registrat, estat, created_at
		 FROM competicions
		 WHERE atleta_id = $1
		 ORDER BY data ASC`,
		atletaID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.Competicio
	for rows.Next() {
		var c models.Competicio
		if err := rows.Scan(&c.ID, &c.AtletaID, &c.EntrenadorID, &c.Nom, &c.Data, &c.Tipus, &c.Kms, &c.Desnivell, &c.Enllac, &c.TrackGpxPath, &c.Comentaris, &c.Registrat, &c.Estat, &c.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, c)
	}
	return result, nil
}

func (s *PostgresStore) GetCompeticioByID(ctx context.Context, id string) (*models.Competicio, error) {
	var c models.Competicio
	err := s.pool.QueryRow(ctx,
		`SELECT c.id, c.atleta_id, c.entrenador_id, c.nom, TO_CHAR(c.data, 'YYYY-MM-DD'), c.tipus, c.kms, c.desnivell, c.enllac, c.track_gpx_path, c.comentaris, c.registrat, c.estat, c.created_at, a.nom as atleta_nom
		 FROM competicions c
		 JOIN atletes at ON at.id = c.atleta_id
		 JOIN usuaris a ON a.id = at.usuari_id
		 WHERE c.id = $1`,
		id,
	).Scan(&c.ID, &c.AtletaID, &c.EntrenadorID, &c.Nom, &c.Data, &c.Tipus, &c.Kms, &c.Desnivell, &c.Enllac, &c.TrackGpxPath, &c.Comentaris, &c.Registrat, &c.Estat, &c.CreatedAt, &c.AtletaNom)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *PostgresStore) ListPendingCompeticionsByEntrenador(ctx context.Context, entrenadorID string) ([]models.Competicio, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT c.id, c.atleta_id, c.entrenador_id, c.nom, TO_CHAR(c.data, 'YYYY-MM-DD'), c.tipus, c.kms, c.desnivell, c.enllac, c.track_gpx_path, c.comentaris, c.registrat, c.estat, c.created_at, a.nom as atleta_nom
		 FROM competicions c
		 JOIN atletes at ON at.id = c.atleta_id
		 JOIN usuaris a ON a.id = at.usuari_id
		 WHERE c.entrenador_id = $1 AND c.registrat = false AND c.estat = 'activa'
		 ORDER BY c.data ASC`,
		entrenadorID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.Competicio
	for rows.Next() {
		var c models.Competicio
		if err := rows.Scan(&c.ID, &c.AtletaID, &c.EntrenadorID, &c.Nom, &c.Data, &c.Tipus, &c.Kms, &c.Desnivell, &c.Enllac, &c.TrackGpxPath, &c.Comentaris, &c.Registrat, &c.Estat, &c.CreatedAt, &c.AtletaNom); err != nil {
			return nil, err
		}
		result = append(result, c)
	}
	return result, nil
}

func (s *PostgresStore) ListHistoricCompeticionsByEntrenador(ctx context.Context, entrenadorID string) ([]models.Competicio, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT c.id, c.atleta_id, c.entrenador_id, c.nom, TO_CHAR(c.data, 'YYYY-MM-DD'), c.tipus, c.kms, c.desnivell, c.enllac, c.track_gpx_path, c.comentaris, c.registrat, c.estat, c.created_at, a.nom as atleta_nom
		 FROM competicions c
		 JOIN atletes at ON at.id = c.atleta_id
		 JOIN usuaris a ON a.id = at.usuari_id
		 WHERE c.entrenador_id = $1
		 ORDER BY c.data DESC`,
		entrenadorID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.Competicio
	for rows.Next() {
		var c models.Competicio
		if err := rows.Scan(&c.ID, &c.AtletaID, &c.EntrenadorID, &c.Nom, &c.Data, &c.Tipus, &c.Kms, &c.Desnivell, &c.Enllac, &c.TrackGpxPath, &c.Comentaris, &c.Registrat, &c.Estat, &c.CreatedAt, &c.AtletaNom); err != nil {
			return nil, err
		}
		result = append(result, c)
	}
	return result, nil
}

func (s *PostgresStore) ListAllCompeticionsByAtletaAndEntrenador(ctx context.Context, atletaID, entrenadorID string) ([]models.Competicio, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT c.id, c.atleta_id, c.entrenador_id, c.nom, TO_CHAR(c.data, 'YYYY-MM-DD'), c.tipus, c.kms, c.desnivell, c.enllac, c.track_gpx_path, c.comentaris, c.registrat, c.estat, c.created_at, a.nom as atleta_nom
		 FROM competicions c
		 JOIN atletes at ON at.id = c.atleta_id
		 JOIN usuaris a ON a.id = at.usuari_id
		 WHERE c.atleta_id = $1 AND c.entrenador_id = $2
		 ORDER BY c.data ASC`,
		atletaID, entrenadorID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.Competicio
	for rows.Next() {
		var c models.Competicio
		if err := rows.Scan(&c.ID, &c.AtletaID, &c.EntrenadorID, &c.Nom, &c.Data, &c.Tipus, &c.Kms, &c.Desnivell, &c.Enllac, &c.TrackGpxPath, &c.Comentaris, &c.Registrat, &c.Estat, &c.CreatedAt, &c.AtletaNom); err != nil {
			return nil, err
		}
		result = append(result, c)
	}
	return result, nil
}

func (s *PostgresStore) TraspassarCompeticio(ctx context.Context, entrenadorID, competicioID string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Fetch competition
	var c models.Competicio
	var dataDate time.Time
	err = tx.QueryRow(ctx,
		`SELECT atleta_id, nom, data, kms, desnivell, enllac, track_gpx_path, comentaris 
		 FROM competicions WHERE id = $1 AND entrenador_id = $2 FOR UPDATE`,
		competicioID, entrenadorID,
	).Scan(&c.AtletaID, &c.Nom, &dataDate, &c.Kms, &c.Desnivell, &c.Enllac, &c.TrackGpxPath, &c.Comentaris)
	if err != nil {
		return err
	}

	// 2. Find the activity ID for "Competición"
	var activitatID string
	err = tx.QueryRow(ctx, `SELECT id FROM activitats WHERE nom = 'Competición' LIMIT 1`).Scan(&activitatID)
	if err != nil {
		return fmt.Errorf("no s'ha trobat l'activitat base 'Competición'")
	}

	// 3. Calculate week start (Monday) and day index (0-6)
	weekday := int(dataDate.Weekday()) // Sunday = 0, Monday = 1
	var daysSinceMonday int
	if weekday == 0 {
		daysSinceMonday = 6 // Sunday is the 6th day
	} else {
		daysSinceMonday = weekday - 1
	}
	
	weekStart := dataDate.AddDate(0, 0, -daysSinceMonday).Format("2006-01-02")
	diaIndex := daysSinceMonday

	// 4. Ensure managed_weeks exists or create as inactiva
	var weekEstat string
	err = tx.QueryRow(ctx, 
		`SELECT estat FROM managed_weeks WHERE entrenador_id = $1 AND week_start = $2::date`, 
		entrenadorID, weekStart).Scan(&weekEstat)
	if err != nil {
		if err == pgx.ErrNoRows {
			_, err = tx.Exec(ctx, 
				`INSERT INTO managed_weeks (entrenador_id, week_start, estat) VALUES ($1, $2::date, 'inactiva')`,
				entrenadorID, weekStart)
			if err != nil {
				return err
			}
		} else {
			return err
		}
	}

	// 5. Ensure weekly_submissions exists
	var submissionID string
	err = tx.QueryRow(ctx,
		`SELECT id FROM weekly_submissions WHERE atleta_id = $1 AND week_start = $2::date`,
		c.AtletaID, weekStart).Scan(&submissionID)
	
	if err != nil {
		if err == pgx.ErrNoRows {
			err = tx.QueryRow(ctx,
				`INSERT INTO weekly_submissions (atleta_id, week_start, updated_at) VALUES ($1, $2::date, now()) RETURNING id`,
				c.AtletaID, weekStart).Scan(&submissionID)
			if err != nil {
				return err
			}
		} else {
			return err
		}
	}

	// 6. Find max ordre for that day
	var currentMaxOrdre *int
	err = tx.QueryRow(ctx, 
		`SELECT MAX(ordre) FROM slot_entries WHERE submission_id = $1 AND dia = $2`, 
		submissionID, diaIndex).Scan(&currentMaxOrdre)
	if err != nil {
		return err
	}
	
	newOrdre := 0
	if currentMaxOrdre != nil {
		newOrdre = *currentMaxOrdre + 1
	}

	// 7. Insert slot_entry
	notes := fmt.Sprintf("Cursa: %s", c.Nom)
	if c.Kms != nil {
		notes += fmt.Sprintf("\nKms: %.2f", *c.Kms)
	}
	if c.Desnivell != nil {
		notes += fmt.Sprintf("\nDesnivell: %.2f", *c.Desnivell)
	}
	if c.Enllac != "" {
		notes += fmt.Sprintf("\nEnllaç: %s", c.Enllac)
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO slot_entries (submission_id, dia, ordre, activitat_id, durada_hores, notes, competicio_id) 
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		submissionID, diaIndex, newOrdre, activitatID, 1.0, notes, competicioID)
	if err != nil {
		return err
	}

	// 8. Mark competition as registered
	_, err = tx.Exec(ctx, `UPDATE competicions SET registrat = true WHERE id = $1`, competicioID)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (s *PostgresStore) UpdateCompeticioTipus(ctx context.Context, id, tipus string) error {
	_, err := s.pool.Exec(ctx, `UPDATE competicions SET tipus = $1 WHERE id = $2`, tipus, id)
	return err
}

func (s *PostgresStore) UpdateCompeticio(ctx context.Context, competicioID string, req models.UpdateCompeticioRequest) (*models.Competicio, error) {
	var c models.Competicio
	
	// If a new track_gpx_path is provided, update it. Otherwise keep the existing one.
	if req.TrackGpxPath != nil {
		err := s.pool.QueryRow(ctx,
			`UPDATE competicions 
			 SET nom = $1, data = $2::date, tipus = $3, kms = $4, desnivell = $5, enllac = $6, comentaris = $7, estat = $8, track_gpx_path = $9
			 WHERE id = $10
			 RETURNING id, atleta_id, entrenador_id, nom, TO_CHAR(data, 'YYYY-MM-DD'), tipus, kms, desnivell, enllac, track_gpx_path, comentaris, registrat, estat, created_at`,
			req.Nom, req.Data, req.Tipus, req.Kms, req.Desnivell, req.Enllac, req.Comentaris, req.Estat, req.TrackGpxPath, competicioID,
		).Scan(&c.ID, &c.AtletaID, &c.EntrenadorID, &c.Nom, &c.Data, &c.Tipus, &c.Kms, &c.Desnivell, &c.Enllac, &c.TrackGpxPath, &c.Comentaris, &c.Registrat, &c.Estat, &c.CreatedAt)
		if err != nil {
			return nil, err
		}
	} else {
		err := s.pool.QueryRow(ctx,
			`UPDATE competicions 
			 SET nom = $1, data = $2::date, tipus = $3, kms = $4, desnivell = $5, enllac = $6, comentaris = $7, estat = $8
			 WHERE id = $9
			 RETURNING id, atleta_id, entrenador_id, nom, TO_CHAR(data, 'YYYY-MM-DD'), tipus, kms, desnivell, enllac, track_gpx_path, comentaris, registrat, estat, created_at`,
			req.Nom, req.Data, req.Tipus, req.Kms, req.Desnivell, req.Enllac, req.Comentaris, req.Estat, competicioID,
		).Scan(&c.ID, &c.AtletaID, &c.EntrenadorID, &c.Nom, &c.Data, &c.Tipus, &c.Kms, &c.Desnivell, &c.Enllac, &c.TrackGpxPath, &c.Comentaris, &c.Registrat, &c.Estat, &c.CreatedAt)
		if err != nil {
			return nil, err
		}
	}

	return &c, nil
}
