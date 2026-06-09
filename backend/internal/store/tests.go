package store

import (
	"context"
	"fmt"

	"trainee-backend/internal/models"
)

func (s *PostgresStore) CreateTest(ctx context.Context, entrenadorID string, req models.CreateTestRequest) (*models.Test, error) {
	var c models.Test
	err := s.pool.QueryRow(ctx,
		`INSERT INTO tests (atleta_id, entrenador_id, titol, data_test, comentaris, data_recordatori, estat_recordatori, registrat)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, false)
		 RETURNING id, atleta_id, entrenador_id, titol, TO_CHAR(data_test, 'YYYY-MM-DD'), comentaris, TO_CHAR(data_recordatori, 'YYYY-MM-DD'), estat_recordatori, registrat, created_at`,
		req.AtletaID,
		entrenadorID,
		req.Titol,
		req.DataTest,
		req.Comentaris,
		req.DataRecordatori,
		func() string {
			if req.DataRecordatori != nil && *req.DataRecordatori != "" {
				return "pendent"
			}
			return "cap"
		}(),
	).Scan(&c.ID, &c.AtletaID, &c.EntrenadorID, &c.Titol, &c.DataTest, &c.Comentaris, &c.DataRecordatori, &c.EstatRecordatori, &c.Registrat, &c.CreatedAt)

	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *PostgresStore) GetTestByID(ctx context.Context, id string) (*models.Test, error) {
	var c models.Test
	err := s.pool.QueryRow(ctx,
		`SELECT c.id, c.atleta_id, c.entrenador_id, c.titol, TO_CHAR(c.data_test, 'YYYY-MM-DD'), c.comentaris, TO_CHAR(c.data_recordatori, 'YYYY-MM-DD'), c.estat_recordatori, c.registrat, c.created_at, a.nom as atleta_nom
		 FROM tests c
		 JOIN atletes at ON at.id = c.atleta_id
		 JOIN usuaris a ON a.id = at.usuari_id
		 WHERE c.id = $1`,
		id,
	).Scan(&c.ID, &c.AtletaID, &c.EntrenadorID, &c.Titol, &c.DataTest, &c.Comentaris, &c.DataRecordatori, &c.EstatRecordatori, &c.Registrat, &c.CreatedAt, &c.AtletaNom)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *PostgresStore) ListPendingTestsByEntrenador(ctx context.Context, entrenadorID string) ([]models.Test, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT c.id, c.atleta_id, c.entrenador_id, c.titol, TO_CHAR(c.data_test, 'YYYY-MM-DD'), c.comentaris, TO_CHAR(c.data_recordatori, 'YYYY-MM-DD'), c.estat_recordatori, c.registrat, c.created_at, a.nom as atleta_nom
		 FROM tests c
		 JOIN atletes at ON at.id = c.atleta_id
		 JOIN usuaris a ON a.id = at.usuari_id
		 WHERE c.entrenador_id = $1 AND c.registrat = false
		 ORDER BY c.data_test ASC`,
		entrenadorID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.Test
	for rows.Next() {
		var c models.Test
		if err := rows.Scan(&c.ID, &c.AtletaID, &c.EntrenadorID, &c.Titol, &c.DataTest, &c.Comentaris, &c.DataRecordatori, &c.EstatRecordatori, &c.Registrat, &c.CreatedAt, &c.AtletaNom); err != nil {
			return nil, err
		}
		result = append(result, c)
	}
	return result, nil
}

func (s *PostgresStore) ListRecordatorisByEntrenador(ctx context.Context, entrenadorID string) ([]models.Test, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT c.id, c.atleta_id, c.entrenador_id, c.titol, TO_CHAR(c.data_test, 'YYYY-MM-DD'), c.comentaris, TO_CHAR(c.data_recordatori, 'YYYY-MM-DD'), c.estat_recordatori, c.registrat, c.created_at, a.nom as atleta_nom
		 FROM tests c
		 JOIN atletes at ON at.id = c.atleta_id
		 JOIN usuaris a ON a.id = at.usuari_id
		 WHERE c.entrenador_id = $1 AND c.estat_recordatori = 'pendent'
		 ORDER BY c.data_recordatori ASC`,
		entrenadorID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.Test
	for rows.Next() {
		var c models.Test
		if err := rows.Scan(&c.ID, &c.AtletaID, &c.EntrenadorID, &c.Titol, &c.DataTest, &c.Comentaris, &c.DataRecordatori, &c.EstatRecordatori, &c.Registrat, &c.CreatedAt, &c.AtletaNom); err != nil {
			return nil, err
		}
		result = append(result, c)
	}
	return result, nil
}

func (s *PostgresStore) UpdateEstatRecordatori(ctx context.Context, entrenadorID, testID, estat string) error {
	cmd, err := s.pool.Exec(ctx,
		`UPDATE tests SET estat_recordatori = $1 WHERE id = $2 AND entrenador_id = $3`,
		estat, testID, entrenadorID,
	)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("no s'ha trobat el test o no tens permís")
	}
	return nil
}

func (s *PostgresStore) TraspassarTest(ctx context.Context, entrenadorID, testID string) error {
	// Comencem transacció
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Obtenir el test
	var atletaID, dataTest string
	err = tx.QueryRow(ctx,
		`SELECT atleta_id, TO_CHAR(data_test, 'YYYY-MM-DD') FROM tests WHERE id = $1 AND entrenador_id = $2`,
		testID, entrenadorID,
	).Scan(&atletaID, &dataTest)
	if err != nil {
		return fmt.Errorf("no s'ha trobat el test o no pertany a l'entrenador: %v", err)
	}

	// 2. Determinar la setmana (Dilluns de dataTest)
	var weekStart string
	err = tx.QueryRow(ctx,
		`SELECT TO_CHAR(DATE_TRUNC('week', $1::DATE), 'YYYY-MM-DD')`,
		dataTest,
	).Scan(&weekStart)
	if err != nil {
		return err
	}

	// 3. Obtenir el dia de la setmana (0-6) on 0 = Dilluns
	var dia int
	err = tx.QueryRow(ctx,
		`SELECT EXTRACT(ISODOW FROM $1::DATE) - 1`,
		dataTest,
	).Scan(&dia)
	if err != nil {
		return err
	}

	// 4. Assegurar que la setmana existeix (si no, inactiva)
	_, err = tx.Exec(ctx,
		`INSERT INTO managed_weeks (entrenador_id, week_start, estat)
		 VALUES ($1, $2, 'inactiva')
		 ON CONFLICT (entrenador_id, week_start) DO NOTHING`,
		entrenadorID, weekStart,
	)
	if err != nil {
		return err
	}

	// 5. Assegurar que el weekly_submission de l'atleta existeix
	var submissionID string
	err = tx.QueryRow(ctx,
		`INSERT INTO weekly_submissions (atleta_id, week_start)
		 VALUES ($1, $2)
		 ON CONFLICT (atleta_id, week_start) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
		 RETURNING id`,
		atletaID, weekStart,
	).Scan(&submissionID)
	if err != nil {
		return err
	}

	// 6. Assegurar que existeix l'activitat base de Test per a l'entrenador
	var actID string
	err = tx.QueryRow(ctx,
		`SELECT id FROM activitats WHERE nom = 'Test' LIMIT 1`,
	).Scan(&actID)
	if err != nil {
		// Crear-la si no existeix
		err = tx.QueryRow(ctx,
			`INSERT INTO activitats (nom, icona, color, ordre) VALUES ('Test', 'ti-clipboard-data', '#6366f1', 99) RETURNING id`,
		).Scan(&actID)
		if err != nil {
			return err
		}
	}

	// 7. Obtenir el següent ordre pel dia
	var nextOrdre int
	err = tx.QueryRow(ctx,
		`SELECT COALESCE(MAX(ordre) + 1, 0) FROM slot_entries WHERE submission_id = $1 AND dia = $2`,
		submissionID, dia,
	).Scan(&nextOrdre)
	if err != nil {
		return err
	}

	// 8. Crear l'slot_entry amb test_id
	_, err = tx.Exec(ctx,
		`INSERT INTO slot_entries (submission_id, dia, ordre, activitat_id, test_id, durada_hores)
		 VALUES ($1, $2, $3, $4, $5, 0)`,
		submissionID, dia, nextOrdre, actID, testID,
	)
	if err != nil {
		return err
	}

	// 9. Marcar el test com a registrat
	_, err = tx.Exec(ctx,
		`UPDATE tests SET registrat = true WHERE id = $1`,
		testID,
	)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}
