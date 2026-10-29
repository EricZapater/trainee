package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
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
	resp := &models.EntrenadorWellnessOverviewResponse{
		WeekStart: weekStart,
		Atletes:   []models.AthleteWellnessSummary{},
	}

	query := `
		SELECT 
			a.id, 
			u.nom, 
			COALESCE(u.cognoms, ''),
			ws.id,
			ws.wellness_fatiga,
			ws.wellness_son_qualitat,
			ws.wellness_dolor_muscular,
			ws.wellness_estres,
			ws.wellness_humor,
			ws.wellness_rpe_setmanal,
			COALESCE(ws.wellness_zones_dolor, '[]'::jsonb),
			COALESCE(ws.wellness_notes, ''),
			ws.wellness_score,
			ws.wellness_submitted_at
		FROM atletes a
		JOIN usuaris u ON u.id = a.usuari_id
		LEFT JOIN weekly_submissions ws ON ws.atleta_id = a.id AND ws.week_start = $2::date
		WHERE a.entrenador_id = $1
		ORDER BY u.nom, u.cognoms
	`

	rows, err := s.pool.Query(ctx, query, entrenadorID, weekStart)
	if err != nil {
		return nil, fmt.Errorf("error consultant wellness equip: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var aID, nom, cognoms string
		var subID *string
		var f, sq, dm, e, h, rpe, score *int
		var zonesJSON []byte
		var notes string
		var submittedAt *time.Time

		if err := rows.Scan(
			&aID, &nom, &cognoms,
			&subID, &f, &sq, &dm, &e, &h, &rpe,
			&zonesJSON, &notes, &score, &submittedAt,
		); err != nil {
			log.Printf("[WELLNESS] Error escanejant fila atleta %s: %v", aID, err)
			continue
		}

		nomComplet := strings.TrimSpace(nom + " " + cognoms)

		summary := models.AthleteWellnessSummary{
			AtletaID:  aID,
			Nom:       nom,
			Cognoms:   cognoms,
			AtletaNom: nomComplet,
			HaRespost: false,
			Alerta:    "pendent",
		}

		if f != nil {
			summary.SubmissionID = subID
			summary.HaRespost = true
			summary.Fatiga = f
			summary.SonQualitat = sq
			summary.DolorMuscular = dm
			summary.Estres = e
			summary.Humor = h
			summary.RPESetmanal = rpe
			if notes != "" {
				summary.Notes = &notes
			}
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

	return resp, rows.Err()
}
