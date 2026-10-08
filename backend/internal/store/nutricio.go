package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"trainee-backend/internal/models"
)

func (s *PostgresStore) CreateNutricioPlan(ctx context.Context, entrenadorID string, req models.CreateNutricioPlanRequest) (*models.NutricioPlanWithDetails, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Resolve atleta_id to atletes(id) if usuari_id was provided
	var actualAtletaID string
	err = tx.QueryRow(ctx, `SELECT id FROM atletes WHERE id::text = $1 OR usuari_id::text = $1 LIMIT 1`, req.AtletaID).Scan(&actualAtletaID)
	if err == nil && actualAtletaID != "" {
		req.AtletaID = actualAtletaID
	}

	// Resolve entrenador_id to entrenadors(id) if usuari_id was provided
	var actualEntrenadorID string
	err = tx.QueryRow(ctx, `SELECT id FROM entrenadors WHERE id::text = $1 OR usuari_id::text = $1 LIMIT 1`, entrenadorID).Scan(&actualEntrenadorID)
	if err == nil && actualEntrenadorID != "" {
		entrenadorID = actualEntrenadorID
	}

	var p models.NutricioPlan
	err = tx.QueryRow(ctx, `
		INSERT INTO nutricio_plans (atleta_id, entrenador_id, titol, estat)
		VALUES ($1, $2, $3, 'actiu')
		RETURNING id, atleta_id, entrenador_id, titol, estat, created_at
	`, req.AtletaID, entrenadorID, req.Titol).Scan(&p.ID, &p.AtletaID, &p.EntrenadorID, &p.Titol, &p.Estat, &p.CreatedAt)
	if err != nil {
		return nil, err
	}

	var rev models.NutricioRevision
	var dataRev *time.Time
	if req.DataRevisio != nil && *req.DataRevisio != "" {
		t, err := time.Parse("2006-01-02", *req.DataRevisio)
		if err == nil {
			dataRev = &t
		}
	}

	err = tx.QueryRow(ctx, `
		INSERT INTO nutricio_revisions (plan_id, versio, objectiu_ch_g_h, objectiu_sodi_mg_h, objectiu_fluid_ml_h, productes_propostes, instruccions, data_revisio)
		VALUES ($1, 1, $2, $3, $4, $5, $6, $7)
		RETURNING id, plan_id, versio, objectiu_ch_g_h, objectiu_sodi_mg_h, objectiu_fluid_ml_h, productes_propostes, instruccions, data_revisio::text, created_at
	`, p.ID, req.ObjectiuChGH, req.ObjectiuSodiMgH, req.ObjectiuFluidMlH, req.ProductesPropostes, req.Instruccions, dataRev).Scan(
		&rev.ID, &rev.PlanID, &rev.Versio, &rev.ObjectiuChGH, &rev.ObjectiuSodiMgH, &rev.ObjectiuFluidMlH, &rev.ProductesPropostes, &rev.Instruccions, &rev.DataRevisio, &rev.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	rev.Feedbacks = []models.NutricioFeedback{}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	res := &models.NutricioPlanWithDetails{
		NutricioPlan: p,
		Revisions:    []models.NutricioRevision{rev},
	}
	return res, nil
}

func (s *PostgresStore) CreateNutricioRevision(ctx context.Context, planID string, req models.CreateNutricioRevisionRequest) (*models.NutricioRevision, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var currentMax int
	err = tx.QueryRow(ctx, `SELECT COALESCE(MAX(versio), 0) FROM nutricio_revisions WHERE plan_id = $1`, planID).Scan(&currentMax)
	if err != nil {
		return nil, err
	}

	nextVersio := currentMax + 1

	var dataRev *time.Time
	if req.DataRevisio != nil && *req.DataRevisio != "" {
		t, err := time.Parse("2006-01-02", *req.DataRevisio)
		if err == nil {
			dataRev = &t
		}
	}

	var rev models.NutricioRevision
	err = tx.QueryRow(ctx, `
		INSERT INTO nutricio_revisions (plan_id, versio, objectiu_ch_g_h, objectiu_sodi_mg_h, objectiu_fluid_ml_h, productes_propostes, instruccions, data_revisio)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, plan_id, versio, objectiu_ch_g_h, objectiu_sodi_mg_h, objectiu_fluid_ml_h, productes_propostes, instruccions, data_revisio::text, created_at
	`, planID, nextVersio, req.ObjectiuChGH, req.ObjectiuSodiMgH, req.ObjectiuFluidMlH, req.ProductesPropostes, req.Instruccions, dataRev).Scan(
		&rev.ID, &rev.PlanID, &rev.Versio, &rev.ObjectiuChGH, &rev.ObjectiuSodiMgH, &rev.ObjectiuFluidMlH, &rev.ProductesPropostes, &rev.Instruccions, &rev.DataRevisio, &rev.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	rev.Feedbacks = []models.NutricioFeedback{}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &rev, nil
}

func (s *PostgresStore) AddNutricioFeedback(ctx context.Context, revisionID, atletaID string, req models.CreateNutricioFeedbackRequest) (*models.NutricioFeedback, error) {
	dataSortida, err := time.Parse("2006-01-02", req.DataSortida)
	if err != nil {
		return nil, errors.New("data_sortida ha de ser YYYY-MM-DD")
	}

	var fb models.NutricioFeedback
	err = s.pool.QueryRow(ctx, `
		INSERT INTO nutricio_feedbacks (revision_id, atleta_id, data_sortida, durada_hores, productes_consumits, ch_g_h_real, sodi_mg_h_real, fluid_ml_h_real, sensacions)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, revision_id, atleta_id, data_sortida::text, durada_hores, productes_consumits, ch_g_h_real, sodi_mg_h_real, fluid_ml_h_real, sensacions, created_at
	`, revisionID, atletaID, dataSortida, req.DuradaHores, req.ProductesConsumits, req.ChGHReal, req.SodiMgHReal, req.FluidMlHReal, req.Sensacions).Scan(
		&fb.ID, &fb.RevisionID, &fb.AtletaID, &fb.DataSortida, &fb.DuradaHores, &fb.ProductesConsumits, &fb.ChGHReal, &fb.SodiMgHReal, &fb.FluidMlHReal, &fb.Sensacions, &fb.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &fb, nil
}

func (s *PostgresStore) GetNutricioPlanDetails(ctx context.Context, planID string) (*models.NutricioPlanWithDetails, error) {
	queryPlan := `
		SELECT p.id, p.atleta_id, p.entrenador_id, p.titol, p.estat, p.created_at,
		       COALESCE(u_atl.nom, u_atl_direct.nom, 'Atleta'), 
		       COALESCE(u_atl.cognoms, u_atl_direct.cognoms, ''), 
		       COALESCE(u_ent.nom, u_ent_direct.nom, e.nom, 'Entrenador')
		FROM nutricio_plans p
		LEFT JOIN atletes a ON (a.id = p.atleta_id OR a.usuari_id = p.atleta_id)
		LEFT JOIN usuaris u_atl ON u_atl.id = a.usuari_id
		LEFT JOIN usuaris u_atl_direct ON u_atl_direct.id = p.atleta_id
		LEFT JOIN entrenadors e ON (e.id = p.entrenador_id OR e.usuari_id = p.entrenador_id)
		LEFT JOIN usuaris u_ent ON u_ent.id = e.usuari_id
		LEFT JOIN usuaris u_ent_direct ON u_ent_direct.id = p.entrenador_id
		WHERE p.id = $1
	`
	var p models.NutricioPlanWithDetails
	err := s.pool.QueryRow(ctx, queryPlan, planID).Scan(
		&p.ID, &p.AtletaID, &p.EntrenadorID, &p.Titol, &p.Estat, &p.CreatedAt,
		&p.AtletaNom, &p.AtletaCognoms, &p.EntrenadorNom,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("plan not found")
	} else if err != nil {
		return nil, err
	}

	queryRevisions := `
		SELECT id, plan_id, versio, objectiu_ch_g_h, objectiu_sodi_mg_h, objectiu_fluid_ml_h, productes_propostes, instruccions, data_revisio::text, created_at
		FROM nutricio_revisions
		WHERE plan_id = $1
		ORDER BY versio DESC
	`
	rows, err := s.pool.Query(ctx, queryRevisions, planID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var revisions []models.NutricioRevision
	for rows.Next() {
		var rev models.NutricioRevision
		if err := rows.Scan(&rev.ID, &rev.PlanID, &rev.Versio, &rev.ObjectiuChGH, &rev.ObjectiuSodiMgH, &rev.ObjectiuFluidMlH, &rev.ProductesPropostes, &rev.Instruccions, &rev.DataRevisio, &rev.CreatedAt); err != nil {
			return nil, err
		}
		revisions = append(revisions, rev)
	}
	rows.Close()

	for i, rev := range revisions {
		queryFB := `
			SELECT f.id, f.revision_id, f.atleta_id, f.data_sortida::text, f.durada_hores, f.productes_consumits, f.ch_g_h_real, f.sodi_mg_h_real, f.fluid_ml_h_real, f.sensacions, f.created_at, COALESCE(u.nom, u_direct.nom, 'Atleta')
			FROM nutricio_feedbacks f
			LEFT JOIN atletes a ON (a.id = f.atleta_id OR a.usuari_id = f.atleta_id)
			LEFT JOIN usuaris u ON u.id = a.usuari_id
			LEFT JOIN usuaris u_direct ON u_direct.id = f.atleta_id
			WHERE f.revision_id = $1
			ORDER BY f.data_sortida DESC, f.created_at DESC
		`
		fbRows, err := s.pool.Query(ctx, queryFB, rev.ID)
		if err != nil {
			return nil, err
		}
		var feedbacks []models.NutricioFeedback
		for fbRows.Next() {
			var fb models.NutricioFeedback
			if err := fbRows.Scan(&fb.ID, &fb.RevisionID, &fb.AtletaID, &fb.DataSortida, &fb.DuradaHores, &fb.ProductesConsumits, &fb.ChGHReal, &fb.SodiMgHReal, &fb.FluidMlHReal, &fb.Sensacions, &fb.CreatedAt, &fb.AtletaNom); err != nil {
				fbRows.Close()
				return nil, err
			}
			feedbacks = append(feedbacks, fb)
		}
		fbRows.Close()
		if feedbacks == nil {
			feedbacks = []models.NutricioFeedback{}
		}
		revisions[i].Feedbacks = feedbacks
	}

	if revisions == nil {
		revisions = []models.NutricioRevision{}
	}
	p.Revisions = revisions

	return &p, nil
}

func (s *PostgresStore) ListNutricioPlansByAtleta(ctx context.Context, atletaID string) ([]models.NutricioPlanWithDetails, error) {
	query := `
		SELECT p.id 
		FROM nutricio_plans p
		WHERE p.atleta_id = $1
		   OR p.atleta_id IN (SELECT id FROM atletes WHERE usuari_id = $1 OR id = $1)
		   OR p.atleta_id IN (SELECT usuari_id FROM atletes WHERE id = $1 OR usuari_id = $1)
		ORDER BY p.created_at DESC
	`
	rows, err := s.pool.Query(ctx, query, atletaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var planIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		planIDs = append(planIDs, id)
	}
	rows.Close()

	var result []models.NutricioPlanWithDetails
	for _, id := range planIDs {
		details, err := s.GetNutricioPlanDetails(ctx, id)
		if err == nil && details != nil {
			result = append(result, *details)
		}
	}

	if result == nil {
		result = []models.NutricioPlanWithDetails{}
	}
	return result, nil
}

func (s *PostgresStore) ListNutricioPlansByEntrenador(ctx context.Context, entrenadorID string) ([]models.NutricioPlanWithDetails, error) {
	query := `
		SELECT p.id 
		FROM nutricio_plans p
		WHERE p.entrenador_id = $1
		   OR p.entrenador_id IN (SELECT id FROM entrenadors WHERE usuari_id = $1 OR id = $1)
		   OR p.entrenador_id IN (SELECT usuari_id FROM entrenadors WHERE id = $1 OR usuari_id = $1)
		ORDER BY p.created_at DESC
	`
	rows, err := s.pool.Query(ctx, query, entrenadorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var planIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		planIDs = append(planIDs, id)
	}
	rows.Close()

	var result []models.NutricioPlanWithDetails
	for _, id := range planIDs {
		details, err := s.GetNutricioPlanDetails(ctx, id)
		if err == nil && details != nil {
			result = append(result, *details)
		}
	}

	if result == nil {
		result = []models.NutricioPlanWithDetails{}
	}
	return result, nil
}

func (s *PostgresStore) ListAllNutricioPlans(ctx context.Context) ([]models.NutricioPlanWithDetails, error) {
	query := `SELECT id FROM nutricio_plans ORDER BY created_at DESC`
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var planIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		planIDs = append(planIDs, id)
	}
	rows.Close()

	var result []models.NutricioPlanWithDetails
	for _, id := range planIDs {
		details, err := s.GetNutricioPlanDetails(ctx, id)
		if err == nil && details != nil {
			result = append(result, *details)
		}
	}

	if result == nil {
		result = []models.NutricioPlanWithDetails{}
	}
	return result, nil
}

func (s *PostgresStore) UpdateNutricioPlanEstat(ctx context.Context, planID, estat string) error {
	_, err := s.pool.Exec(ctx, `UPDATE nutricio_plans SET estat = $1 WHERE id = $2`, estat, planID)
	return err
}

func (s *PostgresStore) DeleteNutricioPlan(ctx context.Context, planID string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM nutricio_plans WHERE id = $1`, planID)
	return err
}
