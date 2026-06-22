package store

import (
	"context"
	"fmt"

	"trainee-backend/internal/models"
)

func (s *PostgresStore) CreateUsuari(ctx context.Context, nom, email, passwordHash, rol, idioma string) (*models.Usuari, error) {
	var u models.Usuari
	err := s.pool.QueryRow(ctx,
		`INSERT INTO usuaris (nom, email, password_hash, rol, idioma)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, nom, email, password_hash, rol, actiu, idioma, created_at`,
		nom, email, passwordHash, rol, idioma,
	).Scan(&u.ID, &u.Nom, &u.Email, &u.PasswordHash, &u.Rol, &u.Actiu, &u.Idioma, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *PostgresStore) GetUsuariByEmail(ctx context.Context, email string) (*models.Usuari, error) {
	var u models.Usuari
	err := s.pool.QueryRow(ctx,
		`SELECT id, nom, email, password_hash, rol, actiu, idioma, created_at
		 FROM usuaris WHERE email = $1`,
		email,
	).Scan(&u.ID, &u.Nom, &u.Email, &u.PasswordHash, &u.Rol, &u.Actiu, &u.Idioma, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *PostgresStore) GetUsuariByID(ctx context.Context, id string) (*models.Usuari, error) {
	var u models.Usuari
	err := s.pool.QueryRow(ctx,
		`SELECT id, nom, email, password_hash, rol, actiu, idioma, created_at
		 FROM usuaris WHERE id = $1`,
		id,
	).Scan(&u.ID, &u.Nom, &u.Email, &u.PasswordHash, &u.Rol, &u.Actiu, &u.Idioma, &u.CreatedAt)
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

func (s *PostgresStore) UpdateUsuariIdioma(ctx context.Context, id, idioma string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE usuaris SET idioma = $1 WHERE id = $2`,
		idioma, id,
	)
	return err
}

func (s *PostgresStore) ListAllUsuaris(ctx context.Context) ([]models.Usuari, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, nom, email, rol, actiu, idioma, created_at
		 FROM usuaris ORDER BY nom`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var usuaris []models.Usuari
	for rows.Next() {
		var u models.Usuari
		if err := rows.Scan(&u.ID, &u.Nom, &u.Email, &u.Rol, &u.Actiu, &u.Idioma, &u.CreatedAt); err != nil {
			return nil, err
		}
		usuaris = append(usuaris, u)
	}
	return usuaris, rows.Err()
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

func (s *PostgresStore) GetUsuariByEntrenadorID(ctx context.Context, entrenadorID string) (*models.Usuari, error) {
	var u models.Usuari
	err := s.pool.QueryRow(ctx,
		`SELECT u.id, u.nom, u.email, u.password_hash, u.rol, u.actiu, u.idioma, u.created_at
		 FROM usuaris u
		 JOIN entrenadors e ON u.id = e.usuari_id
		 WHERE e.id = $1`,
		entrenadorID,
	).Scan(&u.ID, &u.Nom, &u.Email, &u.PasswordHash, &u.Rol, &u.Actiu, &u.Idioma, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
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
		`SELECT a.id, a.usuari_id, a.entrenador_id, a.created_at, u.nom, u.email, u.actiu
		 FROM atletes a
		 JOIN usuaris u ON u.id = a.usuari_id
		 WHERE a.usuari_id = $1`,
		usuariID,
	).Scan(&a.ID, &a.UsuariID, &a.EntrenadorID, &a.CreatedAt, &a.Nom, &a.Email, &a.Actiu)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (s *PostgresStore) ReassignAtleta(ctx context.Context, atletaID, nouEntrenadorID string) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE atletes SET entrenador_id = $1 WHERE id = $2`,
		nouEntrenadorID, atletaID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("atleta no trobat o no actualitzat")
	}
	return nil
}

func (s *PostgresStore) ListAtletesByEntrenadorID(ctx context.Context, entrenadorID string) ([]models.Atleta, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT a.id, a.usuari_id, a.entrenador_id, a.created_at, u.nom, u.email, u.actiu
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
		if err := rows.Scan(&a.ID, &a.UsuariID, &a.EntrenadorID, &a.CreatedAt, &a.Nom, &a.Email, &a.Actiu); err != nil {
			return nil, err
		}
		atletes = append(atletes, a)
	}
	return atletes, rows.Err()
}

func (s *PostgresStore) ListAllActiveAtletes(ctx context.Context) ([]models.Atleta, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT a.id, a.usuari_id, a.entrenador_id, a.created_at, u.nom, u.email, u.actiu, u.idioma
		 FROM atletes a
		 JOIN usuaris u ON u.id = a.usuari_id
		 WHERE u.actiu = true
		 ORDER BY u.nom`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	atletes := []models.Atleta{}
	for rows.Next() {
		var a models.Atleta
		if err := rows.Scan(&a.ID, &a.UsuariID, &a.EntrenadorID, &a.CreatedAt, &a.Nom, &a.Email, &a.Actiu, &a.Idioma); err != nil {
			return nil, err
		}
		atletes = append(atletes, a)
	}
	return atletes, rows.Err()
}

func (s *PostgresStore) ToggleUserStatus(ctx context.Context, usuariID string, actiu bool, changedBy *string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `UPDATE usuaris SET actiu = $1 WHERE id = $2`, actiu, usuariID)
	if err != nil {
		return err
	}

	accio := "deactivate"
	if actiu {
		accio = "activate"
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO user_status_history (usuari_id, accio, changed_by) VALUES ($1, $2, $3)`,
		usuariID, accio, changedBy,
	)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (s *PostgresStore) GetUserStatusHistory(ctx context.Context, usuariID string) ([]models.UserStatusHistory, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, usuari_id, accio, changed_by, created_at
		 FROM user_status_history
		 WHERE usuari_id = $1
		 ORDER BY created_at DESC`,
		usuariID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []models.UserStatusHistory
	for rows.Next() {
		var h models.UserStatusHistory
		if err := rows.Scan(&h.ID, &h.UsuariID, &h.Accio, &h.ChangedBy, &h.CreatedAt); err != nil {
			return nil, err
		}
		history = append(history, h)
	}
	return history, nil
}
