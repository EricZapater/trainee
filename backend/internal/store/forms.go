package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"trainee-backend/internal/models"
)

func (s *PostgresStore) ListEntrenadorForms(ctx context.Context, entrenadorID string) ([]models.FormWithQuestions, error) {
	query := `
		SELECT f.id, f.entrenador_id, f.titol, f.descripcio, f.actiu, f.created_at,
		       (SELECT COUNT(*) FROM form_responses WHERE form_id = f.id) as responses_count
		FROM forms f
		WHERE f.entrenador_id = $1
		ORDER BY f.created_at DESC
	`
	rows, err := s.pool.Query(ctx, query, entrenadorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var forms []models.FormWithQuestions
	for rows.Next() {
		var f models.FormWithQuestions
		if err := rows.Scan(&f.ID, &f.EntrenadorID, &f.Titol, &f.Descripcio, &f.Actiu, &f.CreatedAt, &f.ResponsesCount); err != nil {
			return nil, err
		}
		f.Questions = []models.FormQuestion{}
		forms = append(forms, f)
	}

	if forms == nil {
		forms = []models.FormWithQuestions{}
	}
	return forms, nil
}

func (s *PostgresStore) CreateForm(ctx context.Context, entrenadorID string, req models.CreateFormRequest) (*models.Form, error) {
	query := `
		INSERT INTO forms (entrenador_id, titol, descripcio, actiu)
		VALUES ($1, $2, $3, $4)
		RETURNING id, entrenador_id, titol, descripcio, actiu, created_at
	`
	var f models.Form
	err := s.pool.QueryRow(ctx, query, entrenadorID, req.Titol, req.Descripcio, req.Actiu).Scan(
		&f.ID, &f.EntrenadorID, &f.Titol, &f.Descripcio, &f.Actiu, &f.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (s *PostgresStore) GetFormDetails(ctx context.Context, id string) (*models.FormWithQuestions, error) {
	query := `
		SELECT id, entrenador_id, titol, descripcio, actiu, created_at,
		       (SELECT COUNT(*) FROM form_responses WHERE form_id = $1) as responses_count
		FROM forms WHERE id = $1
	`
	var f models.FormWithQuestions
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&f.ID, &f.EntrenadorID, &f.Titol, &f.Descripcio, &f.Actiu, &f.CreatedAt, &f.ResponsesCount,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("form not found")
	} else if err != nil {
		return nil, err
	}

	f.Questions, err = s.getFormQuestions(ctx, id)
	return &f, err
}

func (s *PostgresStore) GetPublicForm(ctx context.Context, id string) (*models.FormWithQuestions, error) {
	query := `
		SELECT id, entrenador_id, titol, descripcio, actiu, created_at
		FROM forms WHERE id = $1 AND actiu = true
	`
	var f models.FormWithQuestions
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&f.ID, &f.EntrenadorID, &f.Titol, &f.Descripcio, &f.Actiu, &f.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("form not found or inactive")
	} else if err != nil {
		return nil, err
	}

	f.Questions, err = s.getFormQuestions(ctx, id)
	return &f, err
}

func (s *PostgresStore) getFormQuestions(ctx context.Context, formID string) ([]models.FormQuestion, error) {
	query := `
		SELECT id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at
		FROM form_questions
		WHERE form_id = $1
		ORDER BY ordre ASC
	`
	rows, err := s.pool.Query(ctx, query, formID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var questions []models.FormQuestion
	for rows.Next() {
		var q models.FormQuestion
		if err := rows.Scan(&q.ID, &q.FormID, &q.Pregunta, &q.Tipus, &q.Opcions, &q.Obligatori, &q.Ordre, &q.CreatedAt); err != nil {
			return nil, err
		}
		questions = append(questions, q)
	}
	if questions == nil {
		questions = []models.FormQuestion{}
	}
	return questions, nil
}

func (s *PostgresStore) UpdateForm(ctx context.Context, id, entrenadorID string, req models.UpdateFormRequest) error {
	cmd, err := s.pool.Exec(ctx, `
		UPDATE forms SET titol = $1, descripcio = $2, actiu = $3
		WHERE id = $4 AND entrenador_id = $5
	`, req.Titol, req.Descripcio, req.Actiu, id, entrenadorID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("not found or forbidden")
	}
	return nil
}

func (s *PostgresStore) DeleteForm(ctx context.Context, id, entrenadorID string) error {
	cmd, err := s.pool.Exec(ctx, `DELETE FROM forms WHERE id = $1 AND entrenador_id = $2`, id, entrenadorID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("not found or forbidden")
	}
	return nil
}

func (s *PostgresStore) CloneForm(ctx context.Context, id, entrenadorID string) (string, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	var f models.Form
	var originalEntrenador string
	err = tx.QueryRow(ctx, `SELECT entrenador_id, titol, descripcio FROM forms WHERE id = $1`, id).Scan(&originalEntrenador, &f.Titol, &f.Descripcio)
	if err != nil {
		return "", errors.New("form not found")
	}

	isVersioning := (originalEntrenador == entrenadorID)
	nouTitol := f.Titol + " (Clon)"
	if isVersioning {
		nouTitol = f.Titol + " (v2)"
	}

	var newFormID string
	err = tx.QueryRow(ctx, `
		INSERT INTO forms (entrenador_id, titol, descripcio, actiu)
		VALUES ($1, $2, $3, false)
		RETURNING id
	`, entrenadorID, nouTitol, f.Descripcio).Scan(&newFormID)
	if err != nil {
		return "", err
	}

	rows, err := tx.Query(ctx, `SELECT pregunta, tipus, opcions, obligatori, ordre FROM form_questions WHERE form_id = $1`, id)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	var qs []models.FormQuestion
	for rows.Next() {
		var q models.FormQuestion
		if err := rows.Scan(&q.Pregunta, &q.Tipus, &q.Opcions, &q.Obligatori, &q.Ordre); err != nil {
			return "", err
		}
		qs = append(qs, q)
	}
	rows.Close()

	for _, q := range qs {
		_, err = tx.Exec(ctx, `
			INSERT INTO form_questions (form_id, pregunta, tipus, opcions, obligatori, ordre)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, newFormID, q.Pregunta, q.Tipus, q.Opcions, q.Obligatori, q.Ordre)
		if err != nil {
			return "", err
		}
	}

	if isVersioning {
		_, err = tx.Exec(ctx, `UPDATE forms SET actiu = false WHERE id = $1`, id)
		if err != nil {
			return "", err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return "", err
	}
	return newFormID, nil
}

func (s *PostgresStore) checkResponsesCount(ctx context.Context, formID, entrenadorID string) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, `
		SELECT (SELECT COUNT(*) FROM form_responses WHERE form_id = f.id)
		FROM forms f WHERE f.id = $1 AND f.entrenador_id = $2
	`, formID, entrenadorID).Scan(&count)
	return count, err
}

func (s *PostgresStore) AddFormQuestion(ctx context.Context, formID, entrenadorID string, req models.CreateFormQuestionRequest) (*models.FormQuestion, error) {
	count, err := s.checkResponsesCount(ctx, formID, entrenadorID)
	if err != nil {
		return nil, errors.New("form not found")
	}
	if count > 0 {
		return nil, errors.New("cannot modify questions of a form with responses")
	}

	var q models.FormQuestion
	err = s.pool.QueryRow(ctx, `
		INSERT INTO form_questions (form_id, pregunta, tipus, opcions, obligatori, ordre)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, form_id, pregunta, tipus, opcions, obligatori, ordre, created_at
	`, formID, req.Pregunta, req.Tipus, req.Opcions, req.Obligatori, req.Ordre).Scan(
		&q.ID, &q.FormID, &q.Pregunta, &q.Tipus, &q.Opcions, &q.Obligatori, &q.Ordre, &q.CreatedAt,
	)
	return &q, err
}

func (s *PostgresStore) UpdateFormQuestion(ctx context.Context, formID, questionID, entrenadorID string, req models.CreateFormQuestionRequest) error {
	count, err := s.checkResponsesCount(ctx, formID, entrenadorID)
	if err != nil {
		return errors.New("form not found")
	}
	if count > 0 {
		return errors.New("cannot modify questions of a form with responses")
	}

	_, err = s.pool.Exec(ctx, `
		UPDATE form_questions SET pregunta = $1, tipus = $2, opcions = $3, obligatori = $4, ordre = $5
		WHERE id = $6 AND form_id = $7
	`, req.Pregunta, req.Tipus, req.Opcions, req.Obligatori, req.Ordre, questionID, formID)
	return err
}

func (s *PostgresStore) DeleteFormQuestion(ctx context.Context, formID, questionID, entrenadorID string) error {
	count, err := s.checkResponsesCount(ctx, formID, entrenadorID)
	if err != nil {
		return errors.New("form not found")
	}
	if count > 0 {
		return errors.New("cannot delete questions of a form with responses")
	}

	_, err = s.pool.Exec(ctx, `DELETE FROM form_questions WHERE id = $1 AND form_id = $2`, questionID, formID)
	return err
}

func (s *PostgresStore) ReorderFormQuestions(ctx context.Context, formID, entrenadorID string, req []models.ReorderFormQuestionRequest) error {
	count, err := s.checkResponsesCount(ctx, formID, entrenadorID)
	if err != nil {
		return errors.New("form not found")
	}
	if count > 0 {
		return errors.New("cannot reorder questions of a form with responses")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, item := range req {
		_, err = tx.Exec(ctx, `UPDATE form_questions SET ordre = $1 WHERE id = $2 AND form_id = $3`, item.Ordre, item.ID, formID)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (s *PostgresStore) GetFormResponses(ctx context.Context, formID, entrenadorID string) ([]models.FormResponseWithAnswers, error) {
	var exists bool
	err := s.pool.QueryRow(ctx, `SELECT true FROM forms WHERE id = $1 AND entrenador_id = $2`, formID, entrenadorID).Scan(&exists)
	if err != nil {
		return nil, errors.New("forbidden")
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, form_id, nom_candidat, email_candidat, telefon_candidat, estat, created_at
		FROM form_responses
		WHERE form_id = $1
		ORDER BY created_at DESC
	`, formID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var responses []models.FormResponseWithAnswers
	for rows.Next() {
		var r models.FormResponseWithAnswers
		if err := rows.Scan(&r.ID, &r.FormID, &r.NomCandidat, &r.EmailCandidat, &r.TelefonCandidat, &r.Estat, &r.CreatedAt); err != nil {
			return nil, err
		}
		responses = append(responses, r)
	}
	rows.Close()

	for i, r := range responses {
		ansRows, err := s.pool.Query(ctx, `
			SELECT id, response_id, question_id, valor, created_at 
			FROM form_answers WHERE response_id = $1
		`, r.ID)
		if err != nil {
			return nil, err
		}
		var answers []models.FormAnswer
		for ansRows.Next() {
			var a models.FormAnswer
			if err := ansRows.Scan(&a.ID, &a.ResponseID, &a.QuestionID, &a.Valor, &a.CreatedAt); err != nil {
				ansRows.Close()
				return nil, err
			}
			answers = append(answers, a)
		}
		ansRows.Close()
		if answers == nil {
			answers = []models.FormAnswer{}
		}
		responses[i].Answers = answers
	}

	if responses == nil {
		responses = []models.FormResponseWithAnswers{}
	}
	return responses, nil
}

func (s *PostgresStore) UpdateResponseStatus(ctx context.Context, responseID, entrenadorID, estat string) error {
	cmd, err := s.pool.Exec(ctx, `
		UPDATE form_responses
		SET estat = $1
		WHERE id = $2 AND form_id IN (SELECT id FROM forms WHERE entrenador_id = $3)
	`, estat, responseID, entrenadorID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("not found or forbidden")
	}
	return nil
}

func (s *PostgresStore) SubmitFormResponse(ctx context.Context, formID string, req models.SubmitFormResponseRequest) error {
	var actiu bool
	err := s.pool.QueryRow(ctx, `SELECT actiu FROM forms WHERE id = $1`, formID).Scan(&actiu)
	if err != nil {
		return errors.New("form not found")
	}
	if !actiu {
		return errors.New("form inactive")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var responseID string
	var tel *string
	if req.TelefonCandidat != "" {
		tel = &req.TelefonCandidat
	}

	err = tx.QueryRow(ctx, `
		INSERT INTO form_responses (form_id, nom_candidat, email_candidat, telefon_candidat, estat)
		VALUES ($1, $2, $3, $4, 'pendent')
		RETURNING id
	`, formID, req.NomCandidat, req.EmailCandidat, tel).Scan(&responseID)
	if err != nil {
		return err
	}

	for _, ans := range req.Answers {
		_, err = tx.Exec(ctx, `
			INSERT INTO form_answers (response_id, question_id, valor)
			VALUES ($1, $2, $3)
		`, responseID, ans.QuestionID, ans.Valor)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}
