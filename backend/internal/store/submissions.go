package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"trainee-backend/internal/models"
)

func (s *PostgresStore) UpsertSubmission(ctx context.Context, atletaID string, req models.SubmissionRequest) (*models.SubmissionResponse, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var submissionID string
	var updatedAt time.Time

	var notesPtr *string
	if req.NotesSetmana != "" {
		notesPtr = &req.NotesSetmana
	}

	err = tx.QueryRow(ctx,
		`INSERT INTO weekly_submissions (atleta_id, week_start, notes_setmana, updated_at)
		 VALUES ($1, $2::date, $3, now())
		 ON CONFLICT (atleta_id, week_start)
		 DO UPDATE SET notes_setmana = EXCLUDED.notes_setmana, updated_at = now()
		 RETURNING id, updated_at`,
		atletaID, req.WeekStart, notesPtr,
	).Scan(&submissionID, &updatedAt)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx,
		`DELETE FROM slot_entries WHERE submission_id = $1`,
		submissionID,
	)
	if err != nil {
		return nil, err
	}

	for _, slot := range req.Slots {
		var notesSlot *string
		if slot.Notes != "" {
			notesSlot = &slot.Notes
		}
		var compID *string
		if slot.CompeticioID != nil && *slot.CompeticioID != "" {
			compID = slot.CompeticioID
		}
		_, err = tx.Exec(ctx,
			`INSERT INTO slot_entries (submission_id, dia, ordre, activitat_id, durada_hores, notes, competicio_id)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			submissionID, slot.Dia, slot.Ordre, slot.ActivitatID, slot.DuradaHores, notesSlot, compID,
		)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &models.SubmissionResponse{
		SubmissionID: submissionID,
		UpdatedAt:    updatedAt.Format(time.RFC3339),
	}, nil
}

func (s *PostgresStore) GetSubmissionByAtletaAndWeek(ctx context.Context, atletaID, weekStart string) (*models.MySubmissionResponse, error) {
	var resp models.MySubmissionResponse
	var submissionID string

	err := s.pool.QueryRow(ctx,
		`SELECT id, TO_CHAR(week_start, 'YYYY-MM-DD'), notes_setmana
		 FROM weekly_submissions
		 WHERE atleta_id = $1 AND week_start = $2::date`,
		atletaID, weekStart,
	).Scan(&submissionID, &resp.WeekStart, &resp.NotesSetmana)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &models.MySubmissionResponse{
				WeekStart: weekStart,
				Slots:     []models.SlotEntry{},
			}, nil
		}
		return nil, err
	}

	rows, err := s.pool.Query(ctx,
		`SELECT se.id, se.submission_id, se.dia, se.ordre, se.activitat_id,
		        se.durada_hores, se.notes, se.competicio_id,
		        a.nom, a.icona, a.color
		 FROM slot_entries se
		 JOIN activitats a ON a.id = se.activitat_id
		 WHERE se.submission_id = $1
		 ORDER BY se.dia, se.ordre`,
		submissionID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	resp.Slots = []models.SlotEntry{}
	for rows.Next() {
		var slot models.SlotEntry
		if err := rows.Scan(
			&slot.ID, &slot.SubmissionID, &slot.Dia, &slot.Ordre,
			&slot.ActivitatID, &slot.DuradaHores, &slot.Notes, &slot.CompeticioID,
			&slot.ActivitatNom, &slot.ActivitatIcona, &slot.ActivitatColor,
		); err != nil {
			return nil, err
		}
		resp.Slots = append(resp.Slots, slot)
	}

	return &resp, rows.Err()
}

func (s *PostgresStore) GetSubmissionsByEntrenadorAndWeek(ctx context.Context, entrenadorID, weekStart string) (*models.EntrenadorSubmissionsResponse, error) {
	atletes, err := s.ListAtletesByEntrenadorID(ctx, entrenadorID)
	if err != nil {
		return nil, err
	}

	resp := &models.EntrenadorSubmissionsResponse{
		WeekStart: weekStart,
		Atletes:   []models.AtletaSubmissionSummary{},
	}

	for _, atleta := range atletes {
		summary := models.AtletaSubmissionSummary{
			AtletaID:  atleta.ID,
			Nom:       atleta.Nom,
			Email:     atleta.Email,
			HaRespost: false,
			Slots:     []models.SlotEntry{},
		}

		var submissionID string
		err := s.pool.QueryRow(ctx,
			`SELECT id FROM weekly_submissions
			 WHERE atleta_id = $1 AND week_start = $2::date`,
			atleta.ID, weekStart,
		).Scan(&submissionID)

		if err == nil {
			summary.HaRespost = true

			rows, err := s.pool.Query(ctx,
				`SELECT se.id, se.submission_id, se.dia, se.ordre, se.activitat_id,
				        se.durada_hores, se.notes, se.competicio_id,
				        a.nom, a.icona, a.color
				 FROM slot_entries se
				 JOIN activitats a ON a.id = se.activitat_id
				 WHERE se.submission_id = $1
				 ORDER BY se.dia, se.ordre`,
				submissionID,
			)
			if err != nil {
				return nil, err
			}

			for rows.Next() {
				var slot models.SlotEntry
				if err := rows.Scan(
					&slot.ID, &slot.SubmissionID, &slot.Dia, &slot.Ordre,
					&slot.ActivitatID, &slot.DuradaHores, &slot.Notes, &slot.CompeticioID,
					&slot.ActivitatNom, &slot.ActivitatIcona, &slot.ActivitatColor,
				); err != nil {
					rows.Close()
					return nil, err
				}
				summary.Slots = append(summary.Slots, slot)
			}
			rows.Close()
			if err := rows.Err(); err != nil {
				return nil, err
			}
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}

		resp.Atletes = append(resp.Atletes, summary)
	}

	return resp, nil
}

func (s *PostgresStore) GetInformeAtleta(ctx context.Context, atletaID string, start, end string) (*models.InformeResponse, error) {
	var atletaNom string
	err := s.pool.QueryRow(ctx, `SELECT u.nom FROM atletes a JOIN usuaris u ON u.id = a.usuari_id WHERE a.id = $1`, atletaID).Scan(&atletaNom)
	if err != nil {
		return nil, err
	}

	resp := &models.InformeResponse{
		AtletaID:        atletaID,
		AtletaNom:       atletaNom,
		ResumActivitats: []models.InformeResumActivitat{},
		DetallPerDies:   []models.InformeDia{},
	}

	resumRows, err := s.pool.Query(ctx,
		`SELECT a.nom, a.icona, a.color, SUM(se.durada_hores) as total_hores
		 FROM weekly_submissions ws
		 JOIN slot_entries se ON se.submission_id = ws.id
		 JOIN activitats a ON a.id = se.activitat_id
		 WHERE ws.atleta_id = $1 AND ws.week_start >= $2::date AND ws.week_start <= $3::date
		 GROUP BY a.id, a.nom, a.icona, a.color
		 ORDER BY total_hores DESC`,
		atletaID, start, end,
	)
	if err != nil {
		return nil, err
	}
	defer resumRows.Close()

	for resumRows.Next() {
		var r models.InformeResumActivitat
		if err := resumRows.Scan(&r.ActivitatNom, &r.ActivitatIcona, &r.ActivitatColor, &r.TotalHores); err != nil {
			return nil, err
		}
		resp.ResumActivitats = append(resp.ResumActivitats, r)
	}
	resumRows.Close()

	detallRows, err := s.pool.Query(ctx,
		`SELECT TO_CHAR(ws.week_start + se.dia, 'YYYY-MM-DD') as data_dia,
		        se.id, se.submission_id, se.dia, se.ordre, se.activitat_id,
		        se.durada_hores, se.notes, se.competicio_id,
		        a.nom, a.icona, a.color
		 FROM weekly_submissions ws
		 JOIN slot_entries se ON se.submission_id = ws.id
		 JOIN activitats a ON a.id = se.activitat_id
		 WHERE ws.atleta_id = $1 AND ws.week_start >= $2::date AND ws.week_start <= $3::date
		 ORDER BY ws.week_start + se.dia ASC, se.ordre ASC`,
		atletaID, start, end,
	)
	if err != nil {
		return nil, err
	}
	defer detallRows.Close()

	diaMap := make(map[string]*models.InformeDia)
	var ordreDies []string

	for detallRows.Next() {
		var dataDia string
		var slot models.SlotEntry
		if err := detallRows.Scan(
			&dataDia,
			&slot.ID, &slot.SubmissionID, &slot.Dia, &slot.Ordre,
			&slot.ActivitatID, &slot.DuradaHores, &slot.Notes, &slot.CompeticioID,
			&slot.ActivitatNom, &slot.ActivitatIcona, &slot.ActivitatColor,
		); err != nil {
			return nil, err
		}

		if _, exists := diaMap[dataDia]; !exists {
			diaMap[dataDia] = &models.InformeDia{
				Data:  dataDia,
				Slots: []models.SlotEntry{},
			}
			ordreDies = append(ordreDies, dataDia)
		}
		diaMap[dataDia].Slots = append(diaMap[dataDia].Slots, slot)
	}

	for _, d := range ordreDies {
		resp.DetallPerDies = append(resp.DetallPerDies, *diaMap[d])
	}

	return resp, nil
}

