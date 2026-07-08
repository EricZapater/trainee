package store

import (
	"context"
	"fmt"
	"trainee-backend/internal/models"
)

func (s *PostgresStore) ListWeekTemplatesByAtleta(ctx context.Context, atletaID string) ([]models.WeekTemplate, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, atleta_id, nom, created_at FROM week_templates WHERE atleta_id = $1 ORDER BY nom ASC`,
		atletaID,
	)
	if err != nil {
		return nil, fmt.Errorf("error select templates: %w", err)
	}
	defer rows.Close()

	var templates []models.WeekTemplate
	for rows.Next() {
		var t models.WeekTemplate
		var createdAt interface{}
		err := rows.Scan(&t.ID, &t.AtletaID, &t.Nom, &createdAt)
		if err != nil {
			return nil, fmt.Errorf("error scanning template: %w", err)
		}
		if createdAt != nil {
			t.CreatedAt = fmt.Sprintf("%v", createdAt)
		}
		t.Slots = []models.TemplateSlot{}
		templates = append(templates, t)
	}

	for i := range templates {
		t := &templates[i]
		slotRows, err := s.pool.Query(ctx,
			`SELECT dia, ordre, activitat_id, durada_hores, notes FROM week_template_slots WHERE template_id = $1 ORDER BY dia ASC, ordre ASC`,
			t.ID,
		)
		if err != nil {
			return nil, fmt.Errorf("error select template slots: %w", err)
		}
		defer slotRows.Close()

		for slotRows.Next() {
			var slot models.TemplateSlot
			var notes *string
			err := slotRows.Scan(&slot.Dia, &slot.Ordre, &slot.ActivitatID, &slot.DuradaHores, &notes)
			if err != nil {
				return nil, fmt.Errorf("error scanning template slot: %w", err)
			}
			if notes != nil {
				slot.Notes = *notes
			}
			t.Slots = append(t.Slots, slot)
		}
	}

	if templates == nil {
		templates = []models.WeekTemplate{}
	}

	return templates, nil
}

func (s *PostgresStore) CreateWeekTemplate(ctx context.Context, atletaID, nom string, slots []models.TemplateSlotRequest) (*models.WeekTemplate, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var t models.WeekTemplate
	var createdAt interface{}
	err = tx.QueryRow(ctx,
		`INSERT INTO week_templates (atleta_id, nom) VALUES ($1, $2) RETURNING id, atleta_id, nom, created_at`,
		atletaID, nom,
	).Scan(&t.ID, &t.AtletaID, &t.Nom, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("error inserting template: %w", err)
	}
	if createdAt != nil {
		t.CreatedAt = fmt.Sprintf("%v", createdAt)
	}

	t.Slots = []models.TemplateSlot{}

	for _, slot := range slots {
		var ns models.TemplateSlot
		var notes *string
		err = tx.QueryRow(ctx,
			`INSERT INTO week_template_slots (template_id, dia, ordre, activitat_id, durada_hores, notes)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 RETURNING dia, ordre, activitat_id, durada_hores, notes`,
			t.ID, slot.Dia, slot.Ordre, slot.ActivitatID, slot.DuradaHores, slot.Notes,
		).Scan(&ns.Dia, &ns.Ordre, &ns.ActivitatID, &ns.DuradaHores, &notes)
		if err != nil {
			return nil, fmt.Errorf("error inserting template slot: %w", err)
		}
		if notes != nil {
			ns.Notes = *notes
		}
		t.Slots = append(t.Slots, ns)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("error committing transaction: %w", err)
	}

	return &t, nil
}

func (s *PostgresStore) DeleteWeekTemplate(ctx context.Context, id, atletaID string) error {
	res, err := s.pool.Exec(ctx,
		`DELETE FROM week_templates WHERE id = $1 AND atleta_id = $2`,
		id, atletaID,
	)
	if err != nil {
		return fmt.Errorf("error deleting template: %w", err)
	}
	rowsAffected := res.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("template not found or not owned by athlete")
	}
	return nil
}
