package store

import (
	"context"

	"trainee-backend/internal/models"
)

func (s *PostgresStore) ListTeamCompetitions(ctx context.Context, currentUserID string) ([]models.TeamCompetition, error) {
	// Check if current user is entrenador
	var rol string
	_ = s.pool.QueryRow(ctx, `SELECT rol FROM usuaris WHERE id = $1`, currentUserID).Scan(&rol)
	isCoachOrAdmin := rol == "entrenador"

	query := `
		SELECT tc.id, tc.nom, TO_CHAR(tc.data_inici, 'YYYY-MM-DD'),
		       CASE WHEN tc.data_fi IS NOT NULL THEN TO_CHAR(tc.data_fi, 'YYYY-MM-DD') ELSE NULL END,
		       tc.localitzacio, tc.modalitat, tc.distancia_km, tc.desnivell_positiu,
		       tc.web_oficial, tc.fitxer_gpx, tc.creat_per::text,
		       tc.created_at, tc.updated_at
		FROM team_competitions tc
		ORDER BY tc.data_inici ASC
	`
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.TeamCompetition
	for rows.Next() {
		var c models.TeamCompetition
		var dist *float64
		if err := rows.Scan(
			&c.ID, &c.Nom, &c.DataInici, &c.DataFi,
			&c.Localitzacio, &c.Modalitat, &dist, &c.DesnivellPositiu,
			&c.WebOficial, &c.FitxerGpx, &c.CreatPer,
			&c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		c.DistanciaKm = dist
		c.Participants = []models.TeamCompetitionParticipant{}
		result = append(result, c)
	}

	// Fetch all participants
	pQuery := `
		SELECT p.id, p.team_competition_id::text, p.usuari_id::text, u.nom,
		       p.estat, p.objectiu, p.disposa_cotxe, p.places_lliures,
		       p.privacitat, p.comentari, p.created_at, p.updated_at
		FROM team_competition_participants p
		JOIN usuaris u ON u.id = p.usuari_id
		ORDER BY p.created_at ASC
	`
	pRows, err := s.pool.Query(ctx, pQuery)
	if err != nil {
		return nil, err
	}
	defer pRows.Close()

	// Map participants to competitions
	for pRows.Next() {
		var p models.TeamCompetitionParticipant
		if err := pRows.Scan(
			&p.ID, &p.TeamCompetitionID, &p.UsuariID, &p.UsuariNom,
			&p.Estat, &p.Objectiu, &p.DisposaCotxe, &p.PlacesLliures,
			&p.Privacitat, &p.Comentari, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}

		for i := range result {
			if result[i].ID == p.TeamCompetitionID {
				if p.UsuariID == currentUserID {
					pCopy := p
					result[i].UserParticipant = &pCopy
				}

				if p.DisposaCotxe && p.PlacesLliures > 0 {
					result[i].TotalPlacesCotxe += p.PlacesLliures
				}

				// Check visibility: public or own or coach
				if p.Privacitat == "equip" || p.UsuariID == currentUserID || isCoachOrAdmin {
					result[i].Participants = append(result[i].Participants, p)
					result[i].ParticipantsCount++
				}
				break
			}
		}
	}

	return result, nil
}

func (s *PostgresStore) CreateTeamCompetition(ctx context.Context, usuariID string, req models.CreateTeamCompetitionRequest) (*models.TeamCompetition, error) {
	query := `
		INSERT INTO team_competitions (
			nom, data_inici, data_fi, localitzacio, modalitat,
			distancia_km, desnivell_positiu, web_oficial, fitxer_gpx, creat_per,
			created_at, updated_at
		) VALUES (
			$1, $2::date, $3::date, $4, $5,
			$6, $7, $8, $9, $10,
			now(), now()
		)
		RETURNING id, nom, TO_CHAR(data_inici, 'YYYY-MM-DD'),
		          CASE WHEN data_fi IS NOT NULL THEN TO_CHAR(data_fi, 'YYYY-MM-DD') ELSE NULL END,
		          localitzacio, modalitat, distancia_km, desnivell_positiu,
		          web_oficial, fitxer_gpx, creat_per::text, created_at, updated_at
	`
	var c models.TeamCompetition
	var dist *float64
	err := s.pool.QueryRow(ctx, query,
		req.Nom, req.DataInici, req.DataFi, req.Localitzacio, req.Modalitat,
		req.DistanciaKm, req.DesnivellPositiu, req.WebOficial, req.FitxerGpx, usuariID,
	).Scan(
		&c.ID, &c.Nom, &c.DataInici, &c.DataFi,
		&c.Localitzacio, &c.Modalitat, &dist, &c.DesnivellPositiu,
		&c.WebOficial, &c.FitxerGpx, &c.CreatPer, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	c.DistanciaKm = dist
	c.Participants = []models.TeamCompetitionParticipant{}
	return &c, nil
}

func (s *PostgresStore) JoinTeamCompetition(ctx context.Context, teamCompetitionID, usuariID string, req models.JoinTeamCompetitionRequest) error {
	query := `
		INSERT INTO team_competition_participants (
			team_competition_id, usuari_id, estat, objectiu,
			disposa_cotxe, places_lliures, privacitat, comentari,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7, $8,
			now(), now()
		)
		ON CONFLICT (team_competition_id, usuari_id)
		DO UPDATE SET
			estat = EXCLUDED.estat,
			objectiu = EXCLUDED.objectiu,
			disposa_cotxe = EXCLUDED.disposa_cotxe,
			places_lliures = EXCLUDED.places_lliures,
			privacitat = EXCLUDED.privacitat,
			comentari = EXCLUDED.comentari,
			updated_at = now()
	`
	_, err := s.pool.Exec(ctx, query,
		teamCompetitionID, usuariID, req.Estat, req.Objectiu,
		req.DisposaCotxe, req.PlacesLliures, req.Privacitat, req.Comentari,
	)
	return err
}

func (s *PostgresStore) LeaveTeamCompetition(ctx context.Context, teamCompetitionID, usuariID string) error {
	query := `DELETE FROM team_competition_participants WHERE team_competition_id = $1 AND usuari_id = $2`
	_, err := s.pool.Exec(ctx, query, teamCompetitionID, usuariID)
	return err
}
