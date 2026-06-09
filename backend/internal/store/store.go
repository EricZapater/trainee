package store

import (
	"context"

	"trainee-backend/internal/models"
)

type Store interface {
	// Usuaris
	CreateUsuari(ctx context.Context, nom, email, passwordHash, rol string) (*models.Usuari, error)
	GetUsuariByEmail(ctx context.Context, email string) (*models.Usuari, error)
	GetUsuariByID(ctx context.Context, id string) (*models.Usuari, error)

	// Entrenadors
	ListEntrenadors(ctx context.Context) ([]models.Entrenador, error)
	GetEntrenadorByUsuariID(ctx context.Context, usuariID string) (*models.Entrenador, error)
	ClaimEntrenador(ctx context.Context, entrenadorID, usuariID string) error

	// Atletes
	CreateAtleta(ctx context.Context, usuariID, entrenadorID string) (*models.Atleta, error)
	GetAtletaByUsuariID(ctx context.Context, usuariID string) (*models.Atleta, error)
	ListAtletesByEntrenadorID(ctx context.Context, entrenadorID string) ([]models.Atleta, error)

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

	// Submissions
	UpsertSubmission(ctx context.Context, atletaID string, req models.SubmissionRequest) (*models.SubmissionResponse, error)
	GetSubmissionByAtletaAndWeek(ctx context.Context, atletaID, weekStart string) (*models.MySubmissionResponse, error)
	GetSubmissionsByEntrenadorAndWeek(ctx context.Context, entrenadorID, weekStart string) (*models.EntrenadorSubmissionsResponse, error)
	GetInformeAtleta(ctx context.Context, atletaID string, start, end string) (*models.InformeResponse, error)

	// Competicions
	CreateCompeticio(ctx context.Context, atletaID, entrenadorID string, req models.CreateCompeticioRequest) (*models.Competicio, error)
	GetCompeticioByID(ctx context.Context, id string) (*models.Competicio, error)
	ListCompeticionsByAtleta(ctx context.Context, atletaID string) ([]models.Competicio, error)
	ListPendingCompeticionsByEntrenador(ctx context.Context, entrenadorID string) ([]models.Competicio, error)
	TraspassarCompeticio(ctx context.Context, entrenadorID, competicioID string) error

	// Tests
	CreateTest(ctx context.Context, entrenadorID string, req models.CreateTestRequest) (*models.Test, error)
	GetTestByID(ctx context.Context, id string) (*models.Test, error)
	ListPendingTestsByEntrenador(ctx context.Context, entrenadorID string) ([]models.Test, error)
	ListRecordatorisByEntrenador(ctx context.Context, entrenadorID string) ([]models.Test, error)
	TraspassarTest(ctx context.Context, entrenadorID, testID string) error
	UpdateEstatRecordatori(ctx context.Context, entrenadorID, testID, estat string) error

	// Setmanes
}
