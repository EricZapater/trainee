package store

import (
	"context"
	"fmt"

	"trainee-backend/internal/models"
)

func (s *PostgresStore) ListTeamCompetitions(ctx context.Context, currentUserID string) ([]models.TeamCompetition, error) {
	// Check if current user is coach or admin
	var rol string
	_ = s.pool.QueryRow(ctx, `SELECT rol FROM usuaris WHERE id = $1`, currentUserID).Scan(&rol)
	isCoachOrAdmin := rol == "entrenador" || rol == "admin"

	query := `
		SELECT tc.id, tc.nom, TO_CHAR(tc.data_inici, 'YYYY-MM-DD'),
		       CASE WHEN tc.data_fi IS NOT NULL THEN TO_CHAR(tc.data_fi, 'YYYY-MM-DD') ELSE NULL END,
		       tc.localitzacio, tc.modalitat, tc.distancia_km, tc.desnivell_positiu,
		       tc.web_oficial, tc.fitxer_gpx, tc.notes_equip, tc.creat_per::text,
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
			&c.WebOficial, &c.FitxerGpx, &c.NotesEquip, &c.CreatPer,
			&c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		c.DistanciaKm = dist
		// Set aliases
		c.Data = c.DataInici
		c.Poblacio = c.Localitzacio
		c.Kms = c.DistanciaKm
		c.Desnivell = c.DesnivellPositiu
		c.EnllacOficial = c.WebOficial
		c.GpxURL = c.FitxerGpx
		c.Participants = []models.TeamCompetitionParticipant{}
		c.Atletes = []models.TeamCompetitionParticipant{}
		result = append(result, c)
	}

	// Fetch all participants
	pQuery := `
		SELECT p.id, p.team_competition_id::text, p.usuari_id::text, u.nom, COALESCE(u.cognoms, ''),
		       p.estat, p.objectiu, p.disposa_cotxe, p.places_lliures,
		       p.privacitat, p.comentari, p.kms, p.ciutat_origen, p.created_at, p.updated_at
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
		var uNom, uCognoms string
		if err := pRows.Scan(
			&p.ID, &p.TeamCompetitionID, &p.UsuariID, &uNom, &uCognoms,
			&p.Estat, &p.Objectiu, &p.DisposaCotxe, &p.PlacesLliures,
			&p.Privacitat, &p.Comentari, &p.Kms, &p.CiutatOrigen, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}

		// Fill participant aliases
		p.UsuariNom = uNom
		if uCognoms != "" {
			p.UsuariNom = fmt.Sprintf("%s %s", uNom, uCognoms)
		}
		p.AtletaID = p.UsuariID
		p.Nom = p.UsuariNom
		p.Cognoms = uCognoms
		p.TipusObjectiu = p.Objectiu
		p.ComparteixTransport = p.DisposaCotxe
		if p.CiutatOrigen != nil {
			p.CiutatOrigenTransport = *p.CiutatOrigen
		}
		p.EsPrivada = (p.Privacitat == "privat")

		for i := range result {
			if result[i].ID == p.TeamCompetitionID {
				if p.UsuariID == currentUserID {
					pCopy := p
					result[i].UserParticipant = &pCopy
				}

				if p.DisposaCotxe && p.PlacesLliures > 0 {
					result[i].TotalPlacesCotxe += p.PlacesLliures
				}

				// Check visibility: public, own participant, or coach/admin
				if p.Privacitat == "equip" || p.UsuariID == currentUserID || isCoachOrAdmin {
					result[i].Participants = append(result[i].Participants, p)
					result[i].Atletes = append(result[i].Atletes, p)
					result[i].ParticipantsCount++
					result[i].TotalInscrits++
					if p.Privacitat == "equip" {
						result[i].TotalPublics++
					}
				}
				break
			}
		}
	}

	return result, nil
}

func (s *PostgresStore) CreateTeamCompetition(ctx context.Context, usuariID string, req models.CreateTeamCompetitionRequest) (*models.TeamCompetition, error) {
	dataInici := req.DataInici
	if dataInici == "" {
		dataInici = req.Data
	}
	if dataInici == "" {
		return nil, fmt.Errorf("la data d'inici és obligatòria")
	}

	localitzacio := req.Localitzacio
	if localitzacio == nil {
		localitzacio = req.Poblacio
	}

	distancia := req.DistanciaKm
	if distancia == nil {
		distancia = req.Kms
	}

	desnivell := req.DesnivellPositiu
	if desnivell == nil {
		desnivell = req.Desnivell
	}

	web := req.WebOficial
	if web == nil {
		web = req.EnllacOficial
	}

	query := `
		INSERT INTO team_competitions (
			nom, data_inici, data_fi, localitzacio, modalitat,
			distancia_km, desnivell_positiu, web_oficial, fitxer_gpx, notes_equip, creat_per,
			created_at, updated_at
		) VALUES (
			$1, $2::date, $3::date, $4, $5,
			$6, $7, $8, $9, $10, $11,
			now(), now()
		)
		RETURNING id, nom, TO_CHAR(data_inici, 'YYYY-MM-DD'),
		          CASE WHEN data_fi IS NOT NULL THEN TO_CHAR(data_fi, 'YYYY-MM-DD') ELSE NULL END,
		          localitzacio, modalitat, distancia_km, desnivell_positiu,
		          web_oficial, fitxer_gpx, notes_equip, creat_per::text, created_at, updated_at
	`
	var c models.TeamCompetition
	var dist *float64
	err := s.pool.QueryRow(ctx, query,
		req.Nom, dataInici, req.DataFi, localitzacio, req.Modalitat,
		distancia, desnivell, web, req.FitxerGpx, req.NotesEquip, usuariID,
	).Scan(
		&c.ID, &c.Nom, &c.DataInici, &c.DataFi,
		&c.Localitzacio, &c.Modalitat, &dist, &c.DesnivellPositiu,
		&c.WebOficial, &c.FitxerGpx, &c.NotesEquip, &c.CreatPer, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	c.DistanciaKm = dist
	c.Data = c.DataInici
	c.Poblacio = c.Localitzacio
	c.Kms = c.DistanciaKm
	c.Desnivell = c.DesnivellPositiu
	c.EnllacOficial = c.WebOficial
	c.GpxURL = c.FitxerGpx
	c.Participants = []models.TeamCompetitionParticipant{}
	c.Atletes = []models.TeamCompetitionParticipant{}
	return &c, nil
}

func (s *PostgresStore) DeleteTeamCompetition(ctx context.Context, compID, usuariID string, isCoachOrAdmin bool) error {
	var query string
	var args []interface{}
	if isCoachOrAdmin {
		query = `DELETE FROM team_competitions WHERE id = $1`
		args = []interface{}{compID}
	} else {
		query = `DELETE FROM team_competitions WHERE id = $1 AND creat_per = $2`
		args = []interface{}{compID, usuariID}
	}

	tag, err := s.pool.Exec(ctx, query, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("cursa no trobada o no tens permisos per eliminar-la")
	}
	return nil
}

func (s *PostgresStore) JoinTeamCompetition(ctx context.Context, teamCompetitionID, usuariID string, req models.JoinTeamCompetitionRequest) error {
	estat := req.Estat
	if estat == "" {
		estat = "inscrit"
	}

	objectiu := req.Objectiu
	if objectiu == "" && req.TipusObjectiu != "" {
		objectiu = req.TipusObjectiu
	}
	if objectiu == "" {
		objectiu = "A"
	}

	disposaCotxe := false
	if req.DisposaCotxe != nil {
		disposaCotxe = *req.DisposaCotxe
	} else if req.ComparteixTransport != nil {
		disposaCotxe = *req.ComparteixTransport
	}

	privacitat := "equip"
	if req.Privacitat != "" {
		privacitat = req.Privacitat
	} else if req.VisibilitatEquip != nil {
		if *req.VisibilitatEquip {
			privacitat = "equip"
		} else {
			privacitat = "privat"
		}
	}

	ciutatOrigen := req.CiutatOrigen
	if ciutatOrigen == nil {
		ciutatOrigen = req.CiutatOrigenTransport
	}

	kms := req.Kms

	query := `
		INSERT INTO team_competition_participants (
			team_competition_id, usuari_id, estat, objectiu,
			disposa_cotxe, places_lliures, privacitat, comentari, kms, ciutat_origen,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7, $8, $9, $10,
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
			kms = COALESCE(EXCLUDED.kms, team_competition_participants.kms),
			ciutat_origen = COALESCE(EXCLUDED.ciutat_origen, team_competition_participants.ciutat_origen),
			updated_at = now()
	`
	_, err := s.pool.Exec(ctx, query,
		teamCompetitionID, usuariID, estat, objectiu,
		disposaCotxe, req.PlacesLliures, privacitat, req.Comentari, kms, ciutatOrigen,
	)
	return err
}

func (s *PostgresStore) LeaveTeamCompetition(ctx context.Context, teamCompetitionID, usuariID string) error {
	query := `DELETE FROM team_competition_participants WHERE team_competition_id = $1 AND usuari_id = $2`
	_, err := s.pool.Exec(ctx, query, teamCompetitionID, usuariID)
	return err
}
