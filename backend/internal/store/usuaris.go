package store

import (
	"context"
	"fmt"

	"trainee-backend/internal/models"
)

func (s *PostgresStore) CreateUsuari(ctx context.Context, nom, email, passwordHash, rol string) (*models.Usuari, error) {
	var u models.Usuari
	err := s.pool.QueryRow(ctx,
		`INSERT INTO usuaris (nom, email, password_hash, rol)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, nom, email, password_hash, rol, created_at`,
		nom, email, passwordHash, rol,
	).Scan(&u.ID, &u.Nom, &u.Email, &u.PasswordHash, &u.Rol, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *PostgresStore) GetUsuariByEmail(ctx context.Context, email string) (*models.Usuari, error) {
	var u models.Usuari
	err := s.pool.QueryRow(ctx,
		`SELECT id, nom, email, password_hash, rol, created_at
		 FROM usuaris WHERE email = $1`,
		email,
	).Scan(&u.ID, &u.Nom, &u.Email, &u.PasswordHash, &u.Rol, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *PostgresStore) GetUsuariByID(ctx context.Context, id string) (*models.Usuari, error) {
	var u models.Usuari
	err := s.pool.QueryRow(ctx,
		`SELECT id, nom, email, password_hash, rol, created_at
		 FROM usuaris WHERE id = $1`,
		id,
	).Scan(&u.ID, &u.Nom, &u.Email, &u.PasswordHash, &u.Rol, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *PostgresStore) UpdateUsuariPassword(ctx context.Context, id, passwordHash string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE usuaris SET password_hash = $1 WHERE id = $2`,
		passwordHash, id,
	)
	return err
}

func (s *PostgresStore) ListEntrenadors(ctx context.Context) ([]models.Entrenador, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, usuari_id, nom, created_at
		 FROM entrenadors ORDER BY nom`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entrenadors := []models.Entrenador{}
	for rows.Next() {
		var e models.Entrenador
		if err := rows.Scan(&e.ID, &e.UsuariID, &e.Nom, &e.CreatedAt); err != nil {
			return nil, err
		}
		entrenadors = append(entrenadors, e)
	}
	return entrenadors, rows.Err()
}

func (s *PostgresStore) GetEntrenadorByUsuariID(ctx context.Context, usuariID string) (*models.Entrenador, error) {
	var e models.Entrenador
	err := s.pool.QueryRow(ctx,
		`SELECT id, usuari_id, nom, created_at
		 FROM entrenadors WHERE usuari_id = $1`,
		usuariID,
	).Scan(&e.ID, &e.UsuariID, &e.Nom, &e.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (s *PostgresStore) ClaimEntrenador(ctx context.Context, entrenadorID, usuariID string) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE entrenadors SET usuari_id = $1
		 WHERE id = $2 AND usuari_id IS NULL`,
		usuariID, entrenadorID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("perfil d'entrenador no disponible o ja reclamat")
	}
	return nil
}

func (s *PostgresStore) CreateAtleta(ctx context.Context, usuariID, entrenadorID string) (*models.Atleta, error) {
	var a models.Atleta
	err := s.pool.QueryRow(ctx,
		`INSERT INTO atletes (usuari_id, entrenador_id)
		 VALUES ($1, $2)
		 RETURNING id, usuari_id, entrenador_id, created_at`,
		usuariID, entrenadorID,
	).Scan(&a.ID, &a.UsuariID, &a.EntrenadorID, &a.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (s *PostgresStore) GetAtletaByUsuariID(ctx context.Context, usuariID string) (*models.Atleta, error) {
	var a models.Atleta
	err := s.pool.QueryRow(ctx,
		`SELECT a.id, a.usuari_id, a.entrenador_id, a.created_at, u.nom, u.email
		 FROM atletes a
		 JOIN usuaris u ON u.id = a.usuari_id
		 WHERE a.usuari_id = $1`,
		usuariID,
	).Scan(&a.ID, &a.UsuariID, &a.EntrenadorID, &a.CreatedAt, &a.Nom, &a.Email)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (s *PostgresStore) ListAtletesByEntrenadorID(ctx context.Context, entrenadorID string) ([]models.Atleta, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT a.id, a.usuari_id, a.entrenador_id, a.created_at, u.nom, u.email
		 FROM atletes a
		 JOIN usuaris u ON u.id = a.usuari_id
		 WHERE a.entrenador_id = $1
		 ORDER BY u.nom`,
		entrenadorID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	atletes := []models.Atleta{}
	for rows.Next() {
		var a models.Atleta
		if err := rows.Scan(&a.ID, &a.UsuariID, &a.EntrenadorID, &a.CreatedAt, &a.Nom, &a.Email); err != nil {
			return nil, err
		}
		atletes = append(atletes, a)
	}
	return atletes, rows.Err()
}
