package store

import (
	"context"
	"fmt"

	"trainee-backend/internal/models"
)

func (s *PostgresStore) ListFeedbackTickets(ctx context.Context) ([]models.FeedbackTicket, error) {
	query := `
		SELECT f.id, f.informador_id, u.nom, f.tipus, f.resum, f.descripcio, f.imatge_path, f.estat, f.resposta, f.created_at
		FROM feedback_tickets f
		JOIN usuaris u ON f.informador_id = u.id
		ORDER BY f.created_at DESC
	`
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query list feedback tickets: %w", err)
	}
	defer rows.Close()

	tickets := make([]models.FeedbackTicket, 0)
	for rows.Next() {
		var t models.FeedbackTicket
		if err := rows.Scan(
			&t.ID, &t.InformadorID, &t.InformadorNom, &t.Tipus,
			&t.Resum, &t.Descripcio, &t.ImatgePath, &t.Estat, &t.Resposta, &t.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan feedback ticket: %w", err)
		}
		tickets = append(tickets, t)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows feedback tickets: %w", err)
	}
	return tickets, nil
}

func (s *PostgresStore) CreateFeedbackTicket(ctx context.Context, informadorID string, req models.CreateFeedbackRequest, imatgePath *string) (*models.FeedbackTicket, error) {
	query := `
		INSERT INTO feedback_tickets (informador_id, tipus, resum, descripcio, imatge_path, estat)
		VALUES ($1, $2, $3, $4, $5, 'pendent')
		RETURNING id, informador_id, tipus, resum, descripcio, imatge_path, estat, created_at
	`
	var t models.FeedbackTicket
	err := s.pool.QueryRow(ctx, query, informadorID, req.Tipus, req.Resum, req.Descripcio, imatgePath).Scan(
		&t.ID, &t.InformadorID, &t.Tipus, &t.Resum, &t.Descripcio, &t.ImatgePath, &t.Estat, &t.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert feedback ticket: %w", err)
	}
	return &t, nil
}

func (s *PostgresStore) GetFeedbackTicketByID(ctx context.Context, id string) (*models.FeedbackTicket, error) {
	query := `
		SELECT f.id, f.informador_id, u.nom, f.tipus, f.resum, f.descripcio, f.imatge_path, f.estat, f.resposta, f.created_at
		FROM feedback_tickets f
		JOIN usuaris u ON f.informador_id = u.id
		WHERE f.id = $1
	`
	var t models.FeedbackTicket
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&t.ID, &t.InformadorID, &t.InformadorNom, &t.Tipus,
		&t.Resum, &t.Descripcio, &t.ImatgePath, &t.Estat, &t.Resposta, &t.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get feedback ticket by id: %w", err)
	}
	return &t, nil
}

func (s *PostgresStore) UpdateFeedbackTicket(ctx context.Context, id string, estat string, resposta *string) error {
	query := `
		UPDATE feedback_tickets
		SET estat = $1, resposta = $2
		WHERE id = $3
	`
	_, err := s.pool.Exec(ctx, query, estat, resposta, id)
	if err != nil {
		return fmt.Errorf("update feedback ticket: %w", err)
	}
	return nil
}
