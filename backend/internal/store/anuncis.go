package store

import (
	"context"
	"trainee-backend/internal/models"
)

func (s *PostgresStore) ListAnuncis(ctx context.Context) ([]models.Anunci, error) {
	query := `
		SELECT a.id, a.autor_id, u.nom as autor_nom, a.titol, a.descripcio, a.enllac, a.imatges, a.tags, a.estat, a.actiu, a.created_at
		FROM anuncis a
		JOIN usuaris u ON a.autor_id = u.id
		ORDER BY 
			CASE WHEN a.estat = 'pendent' THEN 1 ELSE 2 END ASC,
			a.created_at DESC
	`
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var anuncis []models.Anunci
	for rows.Next() {
		var a models.Anunci
		var imatges []string
		var tags []string
		err := rows.Scan(
			&a.ID,
			&a.AutorID,
			&a.AutorNom,
			&a.Titol,
			&a.Descripcio,
			&a.Enllac,
			&imatges,
			&tags,
			&a.Estat,
			&a.Actiu,
			&a.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		a.Imatges = imatges
		if a.Imatges == nil {
			a.Imatges = []string{}
		}
		a.Tags = tags
		anuncis = append(anuncis, a)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	
	if anuncis == nil {
		anuncis = []models.Anunci{}
	}
	
	return anuncis, nil
}

func (s *PostgresStore) CreateAnunci(ctx context.Context, autorID string, req models.CreateAnunciRequest, estat string) (*models.Anunci, error) {
	query := `
		INSERT INTO anuncis (autor_id, titol, descripcio, enllac, imatges, tags, estat, actiu)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at
	`
	var a models.Anunci
	a.AutorID = autorID
	a.Titol = req.Titol
	a.Descripcio = req.Descripcio
	a.Enllac = req.Enllac
	a.Imatges = req.Imatges
	if a.Imatges == nil {
		a.Imatges = []string{}
	}
	a.Tags = req.Tags
	if a.Tags == nil {
		a.Tags = []string{}
	}
	a.Estat = estat
	a.Actiu = req.Actiu

	err := s.pool.QueryRow(ctx, query, autorID, req.Titol, req.Descripcio, req.Enllac, a.Imatges, a.Tags, estat, req.Actiu).Scan(&a.ID, &a.CreatedAt)
	if err != nil {
		return nil, err
	}

	return &a, nil
}

func (s *PostgresStore) UpdateAnunciStatus(ctx context.Context, id string, actiu bool) error {
	query := `UPDATE anuncis SET actiu = $1 WHERE id = $2`
	_, err := s.pool.Exec(ctx, query, actiu, id)
	return err
}

func (s *PostgresStore) UpdateAnunciEstat(ctx context.Context, id string, estat string) error {
	query := `UPDATE anuncis SET estat = $1 WHERE id = $2`
	_, err := s.pool.Exec(ctx, query, estat, id)
	return err
}

func (s *PostgresStore) GetAnunciByID(ctx context.Context, id string) (*models.Anunci, error) {
	query := `
		SELECT a.id, a.autor_id, u.nom as autor_nom, a.titol, a.descripcio, a.enllac, a.imatges, a.tags, a.estat, a.actiu, a.created_at
		FROM anuncis a
		JOIN usuaris u ON a.autor_id = u.id
		WHERE a.id = $1
	`
	var a models.Anunci
	var tags []string
	var imatges []string
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&a.ID,
		&a.AutorID,
		&a.AutorNom,
		&a.Titol,
		&a.Descripcio,
		&a.Enllac,
		&imatges,
		&tags,
		&a.Estat,
		&a.Actiu,
		&a.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	a.Imatges = imatges
	if a.Imatges == nil {
		a.Imatges = []string{}
	}
	a.Tags = tags
	if a.Tags == nil {
		a.Tags = []string{}
	}
	return &a, nil
}

func (s *PostgresStore) GetUniqueAnunciTags(ctx context.Context) ([]string, error) {
	query := `SELECT DISTINCT unnest(tags) FROM anuncis WHERE tags IS NOT NULL`
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []string
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return nil, err
		}
		if tag != "" {
			tags = append(tags, tag)
		}
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	if tags == nil {
		tags = []string{}
	}
	return tags, nil
}
