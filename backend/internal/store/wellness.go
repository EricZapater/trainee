package store

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"trainee-backend/internal/models"
)

func (s *PostgresStore) SubmitWellness(ctx context.Context, atletaID string, req models.SubmitWellnessRequest) error {
	zonesJSON, err := json.Marshal(req.ZonesDolor)
	if err != nil {
		zonesJSON = []byte("[]")
	}

	score := req.Fatiga + req.SonQualitat + req.DolorMuscular + req.Estres + req.Humor

	query := `
		INSERT INTO weekly_submissions (
			atleta_id, week_start,
			wellness_fatiga, wellness_son_qualitat, wellness_dolor_muscular,
			wellness_estres, wellness_humor, wellness_rpe_setmanal,
			wellness_zones_dolor, wellness_notes, wellness_score, wellness_submitted_at,
			updated_at
		) VALUES (
			$1, $2::date,
			$3, $4, $5, $6, $7, $8, $9, $10, $11, now(),
			now()
		)
		ON CONFLICT (atleta_id, week_start)
		DO UPDATE SET
			wellness_fatiga = EXCLUDED.wellness_fatiga,
			wellness_son_qualitat = EXCLUDED.wellness_son_qualitat,
			wellness_dolor_muscular = EXCLUDED.wellness_dolor_muscular,
			wellness_estres = EXCLUDED.wellness_estres,
			wellness_humor = EXCLUDED.wellness_humor,
			wellness_rpe_setmanal = EXCLUDED.wellness_rpe_setmanal,
			wellness_zones_dolor = EXCLUDED.wellness_zones_dolor,
			wellness_notes = EXCLUDED.wellness_notes,
			wellness_score = EXCLUDED.wellness_score,
			wellness_submitted_at = now(),
			updated_at = now()
	`

	_, err = s.pool.Exec(ctx, query,
		atletaID, req.WeekStart,
		req.Fatiga, req.SonQualitat, req.DolorMuscular,
		req.Estres, req.Humor, req.RPESetmanal,
		zonesJSON, req.Notes, score,
	)
	return err
}

func (s *PostgresStore) GetWellnessByAtletaAndWeek(ctx context.Context, atletaID, weekStart string) (*models.WellnessData, error) {
	query := `
		SELECT wellness_fatiga, wellness_son_qualitat, wellness_dolor_muscular,
		       wellness_estres, wellness_humor, wellness_rpe_setmanal,
		       COALESCE(wellness_zones_dolor, '[]'::jsonb), COALESCE(wellness_notes, '')
		FROM weekly_submissions
		WHERE atleta_id = $1 AND week_start = $2::date
	`
	var w models.WellnessData
	var zonesJSON []byte
	var f, sq, dm, e, h, rpe *int

	err := s.pool.QueryRow(ctx, query, atletaID, weekStart).Scan(
		&f, &sq, &dm, &e, &h, &rpe, &zonesJSON, &w.Notes,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	if f == nil {
		return nil, nil
	}

	w.Fatiga = *f
	w.SonQualitat = *sq
	w.DolorMuscular = *dm
	w.Estres = *e
	w.Humor = *h
	w.RPESetmanal = *rpe
	_ = json.Unmarshal(zonesJSON, &w.ZonesDolor)

	return &w, nil
}

func (s *PostgresStore) GetEntrenadorWellnessOverview(ctx context.Context, entrenadorID, weekStart string) (*models.EntrenadorWellnessOverviewResponse, error) {
	atletes, err := s.ListAtletesByEntrenadorID(ctx, entrenadorID)
	if err != nil {
		return nil, err
	}

	resp := &models.EntrenadorWellnessOverviewResponse{
		WeekStart: weekStart,
		Atletes:   make([]models.AthleteWellnessSummary, 0, len(atletes)),
	}

	for _, a := range atletes {
		summary := models.AthleteWellnessSummary{
			AtletaID:  a.ID,
			Nom:       a.Nom,
			Cognoms:   a.Cognoms,
			HaRespost: false,
			Alerta:    "pendent",
		}

		query := `
			SELECT id, wellness_fatiga, wellness_son_qualitat, wellness_dolor_muscular,
			       wellness_estres, wellness_humor, wellness_rpe_setmanal,
			       wellness_zones_dolor, wellness_notes, wellness_score, wellness_submitted_at
			FROM weekly_submissions
			WHERE atleta_id = $1 AND week_start = $2::date
		`
		var subID string
		var f, sq, dm, e, h, rpe, score *int
		var zonesJSON []byte
		var notes *string
		var submittedAt *time.Time

		err := s.pool.QueryRow(ctx, query, a.ID, weekStart).Scan(
			&subID, &f, &sq, &dm, &e, &h, &rpe, &zonesJSON, &notes, &score, &submittedAt,
		)
		if err == nil && f != nil {
			summary.SubmissionID = &subID
			summary.HaRespost = true
			summary.Fatiga = f
			summary.SonQualitat = sq
			summary.DolorMuscular = dm
			summary.Estres = e
			summary.Humor = h
			summary.RPESetmanal = rpe
			summary.Notes = notes
			summary.Score = score
			summary.SubmittedAt = submittedAt

			var zones []string
			if len(zonesJSON) > 0 {
				_ = json.Unmarshal(zonesJSON, &zones)
			}
			summary.ZonesDolor = zones

			rpeVal := 0
			if rpe != nil {
				rpeVal = *rpe
			}
			scoreVal := 0
			if score != nil {
				scoreVal = *score
			}

			if scoreVal >= 20 || rpeVal >= 9 {
				summary.Alerta = "vermell"
			} else if scoreVal >= 15 || rpeVal >= 7 || len(zones) > 0 {
				summary.Alerta = "groc"
			} else {
				summary.Alerta = "verd"
			}
		}

		resp.Atletes = append(resp.Atletes, summary)
	}

	return resp, nil
}
