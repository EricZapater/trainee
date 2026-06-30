package store

import (
	"context"

	"trainee-backend/internal/models"
)

type Store interface {
	// Usuaris
	CreateUsuari(ctx context.Context, nom, email, passwordHash, rol, idioma string) (*models.Usuari, error)
	GetUsuariByEmail(ctx context.Context, email string) (*models.Usuari, error)
	GetUsuariByID(ctx context.Context, id string) (*models.Usuari, error)
	ListAllUsuaris(ctx context.Context) ([]models.Usuari, error)
	UpdateUsuariPassword(ctx context.Context, id, passwordHash string) error
	UpdateUsuariIdioma(ctx context.Context, id, idioma string) error
	UpdateUsuariProfile(ctx context.Context, id, nom, email string) error
	ToggleUserStatus(ctx context.Context, usuariID string, actiu bool, changedBy *string) error
	GetUserStatusHistory(ctx context.Context, usuariID string) ([]models.UserStatusHistory, error)

	// Legal
	RecordLegalConsent(ctx context.Context, userID, version, ip string) error
	HasLegalConsent(ctx context.Context, userID, version string) (bool, error)

	// Entrenadors
	ListEntrenadors(ctx context.Context) ([]models.Entrenador, error)
	GetEntrenadorByUsuariID(ctx context.Context, usuariID string) (*models.Entrenador, error)
	GetUsuariByEntrenadorID(ctx context.Context, entrenadorID string) (*models.Usuari, error)
	ClaimEntrenador(ctx context.Context, entrenadorID, usuariID string) error

	// Atletes
	CreateAtleta(ctx context.Context, usuariID, entrenadorID string) (*models.Atleta, error)
	GetAtletaByUsuariID(ctx context.Context, usuariID string) (*models.Atleta, error)
	ListAtletesByEntrenadorID(ctx context.Context, entrenadorID string) ([]models.Atleta, error)
	ListAllActiveAtletes(ctx context.Context) ([]models.Atleta, error)
	ReassignAtleta(ctx context.Context, atletaID, nouEntrenadorID string) error

	// Activitats
	ListActivitats(ctx context.Context, onlyActive bool) ([]models.Activitat, error)
	CreateActivitat(ctx context.Context, nom, icona, color string) (*models.Activitat, error)
	UpdateActivitat(ctx context.Context, id string, req models.UpdateActivitatRequest) (*models.Activitat, error)
	ReorderActivitats(ctx context.Context, items []models.ReorderItem) error
	SoftDeleteActivitat(ctx context.Context, id string) error

	// ManagedWeeks
	ListManagedWeeksByEntrenador(ctx context.Context, entrenadorID string) ([]models.ManagedWeekWithCount, error)
	ListOpenWeeksByEntrenador(ctx context.Context, entrenadorID string) ([]models.ManagedWeek, error)
	CreateManagedWeek(ctx context.Context, entrenadorID, weekStart, estat string) (*models.ManagedWeek, error)
	UpdateManagedWeekEstat(ctx context.Context, id, estat string) (*models.ManagedWeek, error)
	GetManagedWeekByEntrenadorAndDate(ctx context.Context, entrenadorID, weekStart string) (*models.ManagedWeek, error)
	EnsureManagedWeekExists(ctx context.Context, entrenadorID, weekStart, estat string) error

	// Submissions
	UpsertSubmission(ctx context.Context, atletaID string, req models.SubmissionRequest) (*models.SubmissionResponse, error)
	GetSubmissionByAtletaAndWeek(ctx context.Context, atletaID, weekStart string) (*models.MySubmissionResponse, error)
	GetSubmissionsByEntrenadorAndWeek(ctx context.Context, entrenadorID, weekStart string) (*models.EntrenadorSubmissionsResponse, error)
	ToggleSubmissionGestionat(ctx context.Context, submissionID string, entrenadorID string, gestionat bool) error
	GetInformeAtleta(ctx context.Context, atletaID string, start, end string) (*models.InformeResponse, error)

	// Competicions
	CreateCompeticio(ctx context.Context, atletaID, entrenadorID string, req models.CreateCompeticioRequest) (*models.Competicio, error)
	GetCompeticioByID(ctx context.Context, id string) (*models.Competicio, error)
	ListCompeticionsByAtleta(ctx context.Context, atletaID string) ([]models.Competicio, error)
	ListPendingCompeticionsByEntrenador(ctx context.Context, entrenadorID string) ([]models.Competicio, error)
	ListHistoricCompeticionsByEntrenador(ctx context.Context, entrenadorID string) ([]models.Competicio, error)
	ListAllCompeticionsByAtletaAndEntrenador(ctx context.Context, atletaID, entrenadorID string) ([]models.Competicio, error)
	TraspassarCompeticio(ctx context.Context, entrenadorID, competicioID string) error
	UpdateCompeticioTipus(ctx context.Context, id, tipus string) error
	UpdateCompeticio(ctx context.Context, competicioID string, req models.UpdateCompeticioRequest) (*models.Competicio, error)

	// Tests
	CreateTest(ctx context.Context, entrenadorID string, req models.CreateTestRequest) (*models.Test, error)
	GetTestByID(ctx context.Context, id string) (*models.Test, error)
	ListPendingTestsByEntrenador(ctx context.Context, entrenadorID string) ([]models.Test, error)
	ListRecordatorisByEntrenador(ctx context.Context, entrenadorID string) ([]models.Test, error)
	TraspassarTest(ctx context.Context, entrenadorID, testID string) error
	UpdateEstatRecordatori(ctx context.Context, entrenadorID, testID, estat string) error

	// Setmanes

	// Forms / Onboarding
	ListForms(ctx context.Context) ([]models.FormWithQuestions, error)
	CreateForm(ctx context.Context, req models.CreateFormRequest) (*models.Form, error)
	GetFormDetails(ctx context.Context, id string) (*models.FormWithQuestions, error)
	GetPublicForm(ctx context.Context, id string) (*models.FormWithQuestions, error)
	UpdateForm(ctx context.Context, id string, req models.UpdateFormRequest) error
	DeleteForm(ctx context.Context, id string) error
	CloneForm(ctx context.Context, id string) (string, error)

	AddFormQuestion(ctx context.Context, formID string, req models.CreateFormQuestionRequest) (*models.FormQuestion, error)
	UpdateFormQuestion(ctx context.Context, formID, questionID string, req models.CreateFormQuestionRequest) error
	DeleteFormQuestion(ctx context.Context, formID, questionID string) error
	ReorderFormQuestions(ctx context.Context, formID string, req []models.ReorderFormQuestionRequest) error

	GetFormResponses(ctx context.Context, formID string) ([]models.FormResponseWithAnswers, error)
	UpdateResponseStatus(ctx context.Context, responseID string, estat string) error
	SubmitFormResponse(ctx context.Context, formID string, req models.SubmitFormResponseRequest) error

	// System Logs
	AddSystemLog(ctx context.Context, accio, nivell, missatge string, detalls *string) error
	GetSystemLogs(ctx context.Context, limit, offset int) ([]models.SystemLog, error)

	// System Settings
	GetSystemSetting(ctx context.Context, key string) ([]byte, error)
	UpdateSystemSetting(ctx context.Context, key string, value []byte) error

	// Anuncis
	ListAnuncis(ctx context.Context) ([]models.Anunci, error)
	CreateAnunci(ctx context.Context, autorID string, req models.CreateAnunciRequest, estat string) (*models.Anunci, error)
	UpdateAnunciStatus(ctx context.Context, id string, actiu bool) error
	UpdateAnunciEstat(ctx context.Context, id string, estat string) error
	GetAnunciByID(ctx context.Context, id string) (*models.Anunci, error)
	GetUniqueAnunciTags(ctx context.Context) ([]string, error)
}
