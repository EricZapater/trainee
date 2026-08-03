package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"trainee-backend/internal/models"
)

func (s *PostgresStore) ListForms(ctx context.Context) ([]models.FormWithQuestions, error) {
	query := `
		SELECT f.id, f.titol, f.descripcio, f.imatges, f.actiu, f.notificar_entrenadors, f.created_at,
		       (SELECT COUNT(*) FROM form_responses WHERE form_id = f.id) as responses_count
		FROM forms f
		ORDER BY f.created_at DESC
	`
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var forms []models.FormWithQuestions
	for rows.Next() {
		var f models.FormWithQuestions
		var imatges []string
		if err := rows.Scan(&f.ID, &f.Titol, &f.Descripcio, &imatges, &f.Actiu, &f.NotificarEntrenadors, &f.CreatedAt, &f.ResponsesCount); err != nil {
			return nil, err
		}
		f.Imatges = imatges
		if f.Imatges == nil {
			f.Imatges = []string{}
		}
		f.Questions = []models.FormQuestion{}
		forms = append(forms, f)
	}

	if forms == nil {
		forms = []models.FormWithQuestions{}
	}
	return forms, nil
}

func (s *PostgresStore) CreateForm(ctx context.Context, req models.CreateFormRequest) (*models.Form, error) {
	query := `
		INSERT INTO forms (titol, descripcio, imatges, actiu, notificar_entrenadors)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, titol, descripcio, imatges, actiu, notificar_entrenadors, created_at
	`
	var f models.Form
	imatges := req.Imatges
	if imatges == nil {
		imatges = []string{}
	}
	err := s.pool.QueryRow(ctx, query, req.Titol, req.Descripcio, imatges, req.Actiu, req.NotificarEntrenadors).Scan(
		&f.ID, &f.Titol, &f.Descripcio, &f.Imatges, &f.Actiu, &f.NotificarEntrenadors, &f.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (s *PostgresStore) GetFormDetails(ctx context.Context, id string) (*models.FormWithQuestions, error) {
	query := `
		SELECT id, titol, descripcio, imatges, actiu, notificar_entrenadors, created_at,
		       (SELECT COUNT(*) FROM form_responses WHERE form_id = $1) as responses_count
		FROM forms WHERE id = $1
	`
	var f models.FormWithQuestions
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&f.ID, &f.Titol, &f.Descripcio, &f.Imatges, &f.Actiu, &f.NotificarEntrenadors, &f.CreatedAt, &f.ResponsesCount,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("form not found")
	} else if err != nil {
		return nil, err
	}

	if f.Imatges == nil {
		f.Imatges = []string{}
	}

	f.Questions, err = s.getFormQuestions(ctx, id)
	return &f, err
}

func (s *PostgresStore) GetPublicForm(ctx context.Context, id string) (*models.FormWithQuestions, error) {
	query := `
		SELECT id, titol, descripcio, imatges, actiu, notificar_entrenadors, created_at
		FROM forms WHERE id = $1 AND actiu = true
	`
	var f models.FormWithQuestions
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&f.ID, &f.Titol, &f.Descripcio, &f.Imatges, &f.Actiu, &f.NotificarEntrenadors, &f.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("form not found or inactive")
	} else if err != nil {
		return nil, err
	}

	if f.Imatges == nil {
		f.Imatges = []string{}
	}

	f.Questions, err = s.getFormQuestions(ctx, id)
	return &f, err
}

func (s *PostgresStore) getFormQuestions(ctx context.Context, formID string) ([]models.FormQuestion, error) {
	query := `
		SELECT id, form_id, pregunta, tipus, opcions, obligatori, ordre, imatges, created_at
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
		if err := rows.Scan(&q.ID, &q.FormID, &q.Pregunta, &q.Tipus, &q.Opcions, &q.Obligatori, &q.Ordre, &q.Imatges, &q.CreatedAt); err != nil {
			return nil, err
		}
		if q.Imatges == nil {
			q.Imatges = []string{}
		}
		questions = append(questions, q)
	}
	if questions == nil {
		questions = []models.FormQuestion{}
	}
	return questions, nil
}

func (s *PostgresStore) UpdateForm(ctx context.Context, id string, req models.UpdateFormRequest) error {
	imatges := req.Imatges
	if imatges == nil {
		imatges = []string{}
	}
	cmd, err := s.pool.Exec(ctx, `
		UPDATE forms SET titol = $1, descripcio = $2, imatges = $3, actiu = $4, notificar_entrenadors = $5
		WHERE id = $6
	`, req.Titol, req.Descripcio, imatges, req.Actiu, req.NotificarEntrenadors, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("not found or forbidden")
	}
	return nil
}

func (s *PostgresStore) DeleteForm(ctx context.Context, id string) error {
	cmd, err := s.pool.Exec(ctx, `DELETE FROM forms WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("not found or forbidden")
	}
	return nil
}

func (s *PostgresStore) CloneForm(ctx context.Context, id string) (string, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	var f models.Form
	err = tx.QueryRow(ctx, `SELECT titol, descripcio, imatges, notificar_entrenadors FROM forms WHERE id = $1`, id).Scan(&f.Titol, &f.Descripcio, &f.Imatges, &f.NotificarEntrenadors)
	if err != nil {
		return "", errors.New("form not found")
	}
	if f.Imatges == nil {
		f.Imatges = []string{}
	}

	nouTitol := f.Titol + " (Clon)"

	var newFormID string
	err = tx.QueryRow(ctx, `
		INSERT INTO forms (titol, descripcio, imatges, actiu, notificar_entrenadors)
		VALUES ($1, $2, $3, false, $4)
		RETURNING id
	`, nouTitol, f.Descripcio, f.Imatges, f.NotificarEntrenadors).Scan(&newFormID)
	if err != nil {
		return "", err
	}

	rows, err := tx.Query(ctx, `SELECT pregunta, tipus, opcions, obligatori, ordre, imatges FROM form_questions WHERE form_id = $1`, id)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	var qs []models.FormQuestion
	for rows.Next() {
		var q models.FormQuestion
		if err := rows.Scan(&q.Pregunta, &q.Tipus, &q.Opcions, &q.Obligatori, &q.Ordre, &q.Imatges); err != nil {
			return "", err
		}
		if q.Imatges == nil {
			q.Imatges = []string{}
		}
		qs = append(qs, q)
	}
	rows.Close()

	for _, q := range qs {
		_, err = tx.Exec(ctx, `
			INSERT INTO form_questions (form_id, pregunta, tipus, opcions, obligatori, ordre, imatges)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, newFormID, q.Pregunta, q.Tipus, q.Opcions, q.Obligatori, q.Ordre, q.Imatges)
		if err != nil {
			return "", err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return "", err
	}
	return newFormID, nil
}

func (s *PostgresStore) checkResponsesCount(ctx context.Context, formID string) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, `
		SELECT (SELECT COUNT(*) FROM form_responses WHERE form_id = f.id)
		FROM forms f WHERE f.id = $1
	`, formID).Scan(&count)
	return count, err
}

func (s *PostgresStore) AddFormQuestion(ctx context.Context, formID string, req models.CreateFormQuestionRequest) (*models.FormQuestion, error) {
	count, err := s.checkResponsesCount(ctx, formID)
	if err != nil {
		return nil, errors.New("form not found")
	}
	if count > 0 {
		return nil, errors.New("cannot modify questions of a form with responses")
	}

	var q models.FormQuestion
	imatges := req.Imatges
	if imatges == nil {
		imatges = []string{}
	}
	err = s.pool.QueryRow(ctx, `
		INSERT INTO form_questions (form_id, pregunta, tipus, opcions, obligatori, ordre, imatges)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, form_id, pregunta, tipus, opcions, obligatori, ordre, imatges, created_at
	`, formID, req.Pregunta, req.Tipus, req.Opcions, req.Obligatori, req.Ordre, imatges).Scan(
		&q.ID, &q.FormID, &q.Pregunta, &q.Tipus, &q.Opcions, &q.Obligatori, &q.Ordre, &q.Imatges, &q.CreatedAt,
	)
	return &q, err
}

func (s *PostgresStore) UpdateFormQuestion(ctx context.Context, formID, questionID string, req models.CreateFormQuestionRequest) error {
	count, err := s.checkResponsesCount(ctx, formID)
	if err != nil {
		return errors.New("form not found")
	}
	if count > 0 {
		return errors.New("cannot modify questions of a form with responses")
	}

	imatges := req.Imatges
	if imatges == nil {
		imatges = []string{}
	}
	_, err = s.pool.Exec(ctx, `
		UPDATE form_questions SET pregunta = $1, tipus = $2, opcions = $3, obligatori = $4, ordre = $5, imatges = $6
		WHERE id = $7 AND form_id = $8
	`, req.Pregunta, req.Tipus, req.Opcions, req.Obligatori, req.Ordre, imatges, questionID, formID)
	return err
}

func (s *PostgresStore) DeleteFormQuestion(ctx context.Context, formID, questionID string) error {
	count, err := s.checkResponsesCount(ctx, formID)
	if err != nil {
		return errors.New("form not found")
	}
	if count > 0 {
		return errors.New("cannot delete questions of a form with responses")
	}

	_, err = s.pool.Exec(ctx, `DELETE FROM form_questions WHERE id = $1 AND form_id = $2`, questionID, formID)
	return err
}

func (s *PostgresStore) ReorderFormQuestions(ctx context.Context, formID string, req []models.ReorderFormQuestionRequest) error {
	count, err := s.checkResponsesCount(ctx, formID)
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

func (s *PostgresStore) GetFormResponses(ctx context.Context, formID string) ([]models.FormResponseWithAnswers, error) {
	var exists bool
	err := s.pool.QueryRow(ctx, `SELECT true FROM forms WHERE id = $1`, formID).Scan(&exists)
	if err != nil {
		return nil, errors.New("forbidden")
	}

	rows, err := s.pool.Query(ctx, `
		SELECT fr.id, fr.form_id, fr.nom_candidat, fr.email_candidat, fr.telefon_candidat, fr.estat, COALESCE(fr.is_interesting, false), fr.comentari, fr.created_at,
		       fr.atleta_id, fr.entrenador_id,
		       u.nom || ' ' || COALESCE(u.cognoms, ''),
		       e.nom
		FROM form_responses fr
		LEFT JOIN atletes a ON a.id = fr.atleta_id
		LEFT JOIN usuaris u ON u.id = a.usuari_id
		LEFT JOIN entrenadors e ON e.id = fr.entrenador_id
		WHERE fr.form_id = $1
		ORDER BY fr.created_at DESC
	`, formID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var responses []models.FormResponseWithAnswers
	for rows.Next() {
		var r models.FormResponseWithAnswers
		if err := rows.Scan(&r.ID, &r.FormID, &r.NomCandidat, &r.EmailCandidat, &r.TelefonCandidat, &r.Estat, &r.IsInteresting, &r.Comentari, &r.CreatedAt, &r.AtletaID, &r.EntrenadorID, &r.AtletaNom, &r.EntrenadorNom); err != nil {
			return nil, err
		}
		responses = append(responses, r)
	}
	rows.Close()

	for i, r := range responses {
		ansRows, err := s.pool.Query(ctx, `
			SELECT id, response_id, question_id, valor, COALESCE(is_interesting, false), comentari, created_at 
			FROM form_answers WHERE response_id = $1
			ORDER BY created_at ASC
		`, r.ID)
		if err != nil {
			return nil, err
		}
		var answers []models.FormAnswer
		for ansRows.Next() {
			var a models.FormAnswer
			if err := ansRows.Scan(&a.ID, &a.ResponseID, &a.QuestionID, &a.Valor, &a.IsInteresting, &a.Comentari, &a.CreatedAt); err != nil {
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

func (s *PostgresStore) UpdateResponseStatus(ctx context.Context, responseID, estat string) error {
	cmd, err := s.pool.Exec(ctx, `
		UPDATE form_responses
		SET estat = $1
		WHERE id = $2
	`, estat, responseID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("not found or forbidden")
	}
	return nil
}

func (s *PostgresStore) UpdateFormResponseDetails(ctx context.Context, responseID string, req models.UpdateFormResponseRequest) error {
	if req.Estat != nil {
		_, err := s.pool.Exec(ctx, `UPDATE form_responses SET estat = $1 WHERE id = $2`, *req.Estat, responseID)
		if err != nil {
			return err
		}
	}
	if req.IsInteresting != nil {
		_, err := s.pool.Exec(ctx, `UPDATE form_responses SET is_interesting = $1 WHERE id = $2`, *req.IsInteresting, responseID)
		if err != nil {
			return err
		}
	}
	if req.Comentari != nil {
		_, err := s.pool.Exec(ctx, `UPDATE form_responses SET comentari = $1 WHERE id = $2`, *req.Comentari, responseID)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *PostgresStore) UpdateFormAnswer(ctx context.Context, answerID string, req models.UpdateFormAnswerRequest) error {
	if req.IsInteresting != nil {
		_, err := s.pool.Exec(ctx, `UPDATE form_answers SET is_interesting = $1 WHERE id = $2`, *req.IsInteresting, answerID)
		if err != nil {
			return err
		}
	}
	if req.Comentari != nil {
		_, err := s.pool.Exec(ctx, `UPDATE form_answers SET comentari = $1 WHERE id = $2`, *req.Comentari, answerID)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *PostgresStore) SubmitFormResponse(ctx context.Context, formID string, req models.SubmitFormResponseRequest, userID string) error {
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

	var atletaID *string
	var entrenadorID *string
	if userID != "" {
		var aID string
		var eID string
		err = s.pool.QueryRow(ctx, `SELECT id, entrenador_id FROM atletes WHERE usuari_id = $1`, userID).Scan(&aID, &eID)
		if err == nil {
			atletaID = &aID
			entrenadorID = &eID
		} else {
			err = s.pool.QueryRow(ctx, `SELECT id FROM entrenadors WHERE usuari_id = $1`, userID).Scan(&eID)
			if err == nil {
				entrenadorID = &eID
			}
		}
	}

	err = tx.QueryRow(ctx, `
		INSERT INTO form_responses (form_id, nom_candidat, email_candidat, telefon_candidat, estat, atleta_id, entrenador_id)
		VALUES ($1, $2, $3, $4, 'pendent', $5, $6)
		RETURNING id
	`, formID, req.NomCandidat, req.EmailCandidat, tel, atletaID, entrenadorID).Scan(&responseID)
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

func (s *PostgresStore) AssignFormResponseEntrenador(ctx context.Context, responseID string, entrenadorID *string) error {
	_, err := s.pool.Exec(ctx, `UPDATE form_responses SET entrenador_id = $1 WHERE id = $2`, entrenadorID, responseID)
	return err
}
