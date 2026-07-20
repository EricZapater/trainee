package store

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"trainee-backend/internal/models"
)

func (s *PostgresStore) GetMaterialProductes(ctx context.Context, onlyActive bool) ([]models.MaterialProducte, error) {
	query := `
		SELECT id, nom, descripcio, talles, requereix_talla, imatges, preu, actiu, created_at, updated_at
		FROM material_productes
	`
	if onlyActive {
		query += " WHERE actiu = true"
	}
	query += " ORDER BY created_at DESC"

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("error consultant productes de material: %w", err)
	}
	defer rows.Close()

	productes := []models.MaterialProducte{}
	for rows.Next() {
		var p models.MaterialProducte
		if err := rows.Scan(
			&p.ID,
			&p.Nom,
			&p.Descripcio,
			&p.Talles,
			&p.RequereixTalla,
			&p.Imatges,
			&p.Preu,
			&p.Actiu,
			&p.CreatedAt,
			&p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("error llegint producte de material: %w", err)
		}
		if p.Talles == nil {
			p.Talles = []string{}
		}
		if p.Imatges == nil {
			p.Imatges = []string{}
		}
		productes = append(productes, p)
	}

	return productes, nil
}

func (s *PostgresStore) GetMaterialProducteByID(ctx context.Context, id string) (*models.MaterialProducte, error) {
	query := `
		SELECT id, nom, descripcio, talles, requereix_talla, imatges, preu, actiu, created_at, updated_at
		FROM material_productes
		WHERE id = $1
	`
	var p models.MaterialProducte
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&p.ID,
		&p.Nom,
		&p.Descripcio,
		&p.Talles,
		&p.RequereixTalla,
		&p.Imatges,
		&p.Preu,
		&p.Actiu,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error consultant producte %s: %w", id, err)
	}
	if p.Talles == nil {
		p.Talles = []string{}
	}
	if p.Imatges == nil {
		p.Imatges = []string{}
	}
	return &p, nil
}

func (s *PostgresStore) CreateMaterialProducte(ctx context.Context, req models.CreateMaterialProducteRequest) (*models.MaterialProducte, error) {
	if req.Talles == nil {
		req.Talles = []string{}
	}
	if req.Imatges == nil {
		req.Imatges = []string{}
	}

	query := `
		INSERT INTO material_productes (nom, descripcio, talles, requereix_talla, imatges, preu, actiu, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
		RETURNING id, nom, descripcio, talles, requereix_talla, imatges, preu, actiu, created_at, updated_at
	`
	var p models.MaterialProducte
	err := s.pool.QueryRow(ctx, query,
		req.Nom,
		req.Descripcio,
		req.Talles,
		req.RequereixTalla,
		req.Imatges,
		req.Preu,
		req.Actiu,
	).Scan(
		&p.ID,
		&p.Nom,
		&p.Descripcio,
		&p.Talles,
		&p.RequereixTalla,
		&p.Imatges,
		&p.Preu,
		&p.Actiu,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error creant producte de material: %w", err)
	}
	return &p, nil
}

func (s *PostgresStore) UpdateMaterialProducte(ctx context.Context, id string, req models.UpdateMaterialProducteRequest) (*models.MaterialProducte, error) {
	if req.Talles == nil {
		req.Talles = []string{}
	}
	if req.Imatges == nil {
		req.Imatges = []string{}
	}

	query := `
		UPDATE material_productes
		SET nom = $1, descripcio = $2, talles = $3, requereix_talla = $4, imatges = $5, preu = $6, actiu = $7, updated_at = now()
		WHERE id = $8
		RETURNING id, nom, descripcio, talles, requereix_talla, imatges, preu, actiu, created_at, updated_at
	`
	var p models.MaterialProducte
	err := s.pool.QueryRow(ctx, query,
		req.Nom,
		req.Descripcio,
		req.Talles,
		req.RequereixTalla,
		req.Imatges,
		req.Preu,
		req.Actiu,
		id,
	).Scan(
		&p.ID,
		&p.Nom,
		&p.Descripcio,
		&p.Talles,
		&p.RequereixTalla,
		&p.Imatges,
		&p.Preu,
		&p.Actiu,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error actualitzant producte de material: %w", err)
	}
	return &p, nil
}

func (s *PostgresStore) DeleteMaterialProducte(ctx context.Context, id string) error {
	query := `DELETE FROM material_productes WHERE id = $1`
	_, err := s.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("error eliminant producte de material: %w", err)
	}
	return nil
}

func (s *PostgresStore) GetMaterialSettings(ctx context.Context) (*models.MaterialComandesSettings, error) {
	query := `SELECT value FROM system_settings WHERE key = 'material_comandes_enabled'`
	var rawJSON []byte
	err := s.pool.QueryRow(ctx, query).Scan(&rawJSON)
	if err != nil {
		// Default enabled: false if not found
		return &models.MaterialComandesSettings{Enabled: false}, nil
	}

	var st models.MaterialComandesSettings
	if err := json.Unmarshal(rawJSON, &st); err != nil {
		return &models.MaterialComandesSettings{Enabled: false}, nil
	}
	return &st, nil
}

func (s *PostgresStore) UpdateMaterialSettings(ctx context.Context, enabled bool) error {
	st := models.MaterialComandesSettings{Enabled: enabled}
	rawJSON, err := json.Marshal(st)
	if err != nil {
		return fmt.Errorf("error codificant configuracio de material: %w", err)
	}

	query := `
		INSERT INTO system_settings (key, value, updated_at)
		VALUES ('material_comandes_enabled', $1, now())
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
	`
	_, err = s.pool.Exec(ctx, query, rawJSON)
	if err != nil {
		return fmt.Errorf("error guardant configuracio de material: %w", err)
	}
	return nil
}

func (s *PostgresStore) CreateMaterialComandes(ctx context.Context, atletaID string, items []models.CreateMaterialComandaItem) ([]models.MaterialComanda, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("error iniciant transaccio de comandes: %w", err)
	}
	defer tx.Rollback(ctx)

	createdList := []models.MaterialComanda{}

	for _, item := range items {
		// Obtenir informacio del producte per preu i validacio de talla
		var pNom string
		var pPreu float64
		var reqTalla bool
		var talles []string

		errP := tx.QueryRow(ctx, `SELECT nom, preu, requereix_talla, talles FROM material_productes WHERE id = $1 AND actiu = true`, item.ProducteID).
			Scan(&pNom, &pPreu, &reqTalla, &talles)
		if errP != nil {
			return nil, fmt.Errorf("producte %s no trobat o inactiu", item.ProducteID)
		}

		if reqTalla && strings.TrimSpace(item.Talla) == "" {
			return nil, fmt.Errorf("la talla es obligatoria per al producte %s", pNom)
		}

		preuTotal := pPreu * float64(item.Quantitat)

		var c models.MaterialComanda
		errC := tx.QueryRow(ctx, `
			INSERT INTO material_comandes (atleta_id, producte_id, talla, quantitat, preu_unitari, preu_total, estat, notes, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, 'pendent', $7, now(), now())
			RETURNING id, atleta_id, producte_id, talla, quantitat, preu_unitari, preu_total, estat, notes, created_at, updated_at
		`, atletaID, item.ProducteID, item.Talla, item.Quantitat, pPreu, preuTotal, item.Notes).Scan(
			&c.ID,
			&c.AtletaID,
			&c.ProducteID,
			&c.Talla,
			&c.Quantitat,
			&c.PreuUnitari,
			&c.PreuTotal,
			&c.Estat,
			&c.Notes,
			&c.CreatedAt,
			&c.UpdatedAt,
		)
		if errC != nil {
			return nil, fmt.Errorf("error inserint comanda per a producte %s: %w", pNom, errC)
		}

		createdList = append(createdList, c)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("error confirmant comandes: %w", err)
	}

	return createdList, nil
}

func (s *PostgresStore) GetMaterialComandes(ctx context.Context, atletaID string, startDate string, endDate string, estat string) ([]models.MaterialComandaWithDetails, error) {
	var sb strings.Builder
	params := []interface{}{}
	paramIdx := 1

	sb.WriteString(`
		SELECT 
			c.id, c.atleta_id, c.producte_id, c.talla, c.quantitat, c.preu_unitari, c.preu_total, c.estat, c.notes, c.created_at, c.updated_at,
			u.nom AS atleta_nom, u.cognoms AS atleta_cognoms, u.email AS atleta_email,
			p.nom AS producte_nom
		FROM material_comandes c
		JOIN atletes a ON a.id = c.atleta_id
		JOIN usuaris u ON u.id = a.usuari_id
		JOIN material_productes p ON p.id = c.producte_id
		WHERE 1=1
	`)

	if atletaID != "" {
		sb.WriteString(fmt.Sprintf(" AND c.atleta_id = $%d", paramIdx))
		params = append(params, atletaID)
		paramIdx++
	}

	if startDate != "" {
		sb.WriteString(fmt.Sprintf(" AND c.created_at >= $%d::timestamptz", paramIdx))
		params = append(params, startDate)
		paramIdx++
	}

	if endDate != "" {
		// Afegir 23:59:59 si només ve data YYYY-MM-DD
		if len(endDate) == 10 {
			endDate += " 23:59:59"
		}
		sb.WriteString(fmt.Sprintf(" AND c.created_at <= $%d::timestamptz", paramIdx))
		params = append(params, endDate)
		paramIdx++
	}

	if estat != "" {
		sb.WriteString(fmt.Sprintf(" AND c.estat = $%d", paramIdx))
		params = append(params, estat)
		paramIdx++
	}

	sb.WriteString(" ORDER BY c.created_at DESC")

	rows, err := s.pool.Query(ctx, sb.String(), params...)
	if err != nil {
		return nil, fmt.Errorf("error consultant comandes de material: %w", err)
	}
	defer rows.Close()

	list := []models.MaterialComandaWithDetails{}
	for rows.Next() {
		var c models.MaterialComandaWithDetails
		if err := rows.Scan(
			&c.ID,
			&c.AtletaID,
			&c.ProducteID,
			&c.Talla,
			&c.Quantitat,
			&c.PreuUnitari,
			&c.PreuTotal,
			&c.Estat,
			&c.Notes,
			&c.CreatedAt,
			&c.UpdatedAt,
			&c.AtletaNom,
			&c.AtletaCognoms,
			&c.AtletaEmail,
			&c.ProducteNom,
		); err != nil {
			return nil, fmt.Errorf("error llegint linia de comanda: %w", err)
		}
		list = append(list, c)
	}

	return list, nil
}

func (s *PostgresStore) GetMaterialComandaByID(ctx context.Context, id string) (*models.MaterialComandaWithDetails, error) {
	query := `
		SELECT 
			c.id, c.atleta_id, c.producte_id, c.talla, c.quantitat, c.preu_unitari, c.preu_total, c.estat, c.notes, c.created_at, c.updated_at,
			u.nom AS atleta_nom, u.cognoms AS atleta_cognoms, u.email AS atleta_email,
			p.nom AS producte_nom
		FROM material_comandes c
		JOIN atletes a ON a.id = c.atleta_id
		JOIN usuaris u ON u.id = a.usuari_id
		JOIN material_productes p ON p.id = c.producte_id
		WHERE c.id = $1
	`
	var c models.MaterialComandaWithDetails
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&c.ID,
		&c.AtletaID,
		&c.ProducteID,
		&c.Talla,
		&c.Quantitat,
		&c.PreuUnitari,
		&c.PreuTotal,
		&c.Estat,
		&c.Notes,
		&c.CreatedAt,
		&c.UpdatedAt,
		&c.AtletaNom,
		&c.AtletaCognoms,
		&c.AtletaEmail,
		&c.ProducteNom,
	)
	if err != nil {
		return nil, fmt.Errorf("error consultant comanda %s: %w", id, err)
	}
	return &c, nil
}

func (s *PostgresStore) UpdateMaterialComanda(ctx context.Context, id string, req models.UpdateMaterialComandaRequest) (*models.MaterialComanda, error) {
	// Re-calcula preu_total si canvia quantitat
	var preuUnitari float64
	errP := s.pool.QueryRow(ctx, `SELECT preu_unitari FROM material_comandes WHERE id = $1`, id).Scan(&preuUnitari)
	if errP != nil {
		return nil, fmt.Errorf("error trobant comanda: %w", errP)
	}

	preuTotal := preuUnitari * float64(req.Quantitat)

	query := `
		UPDATE material_comandes
		SET talla = $1, quantitat = $2, preu_total = $3, notes = $4, updated_at = now()
	`
	params := []interface{}{req.Talla, req.Quantitat, preuTotal, req.Notes}
	paramIdx := 5

	if req.Estat != nil {
		query += fmt.Sprintf(", estat = $%d", paramIdx)
		params = append(params, *req.Estat)
		paramIdx++
	}

	query += fmt.Sprintf(" WHERE id = $%d RETURNING id, atleta_id, producte_id, talla, quantitat, preu_unitari, preu_total, estat, notes, created_at, updated_at", paramIdx)
	params = append(params, id)

	var c models.MaterialComanda
	err := s.pool.QueryRow(ctx, query, params...).Scan(
		&c.ID,
		&c.AtletaID,
		&c.ProducteID,
		&c.Talla,
		&c.Quantitat,
		&c.PreuUnitari,
		&c.PreuTotal,
		&c.Estat,
		&c.Notes,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error actualitzant comanda de material: %w", err)
	}
	return &c, nil
}

func (s *PostgresStore) DeleteMaterialComanda(ctx context.Context, id string) error {
	query := `DELETE FROM material_comandes WHERE id = $1`
	_, err := s.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("error eliminant comanda de material: %w", err)
	}
	return nil
}

func (s *PostgresStore) BulkUpdateMaterialComandesState(ctx context.Context, comandaIDs []string, nouEstat string) error {
	if len(comandaIDs) == 0 {
		return nil
	}

	query := `
		UPDATE material_comandes
		SET estat = $1, updated_at = now()
		WHERE id = ANY($2)
	`
	_, err := s.pool.Exec(ctx, query, nouEstat, comandaIDs)
	if err != nil {
		return fmt.Errorf("error actualitzant estat en massa de comandes: %w", err)
	}
	return nil
}
