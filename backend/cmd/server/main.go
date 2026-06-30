package main

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"

	"trainee-backend/config"
	"trainee-backend/internal/handlers"
	"trainee-backend/internal/jobs"
	"trainee-backend/internal/mailer"
	"trainee-backend/internal/middleware"
	"trainee-backend/internal/store"
	"trainee-backend/migrations"
)

func runMigrations(dbURL string) error {
	migrateURL := dbURL
	if strings.Contains(migrateURL, "?") {
		migrateURL += "&x-migrations-table=schema_migrations"
	} else {
		migrateURL += "?x-migrations-table=schema_migrations"
	}

	source, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return fmt.Errorf("error creant la font de migracions: %w", err)
	}

	m, err := migrate.NewWithSourceInstance("iofs", source, migrateURL)
	if err != nil {
		return fmt.Errorf("error inicialitzant les migracions: %w", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("error executant les migracions: %w", err)
	}

	return nil
}

func main() {
	cfg := config.Load()

	log.Println("Executant migracions...")
	if err := runMigrations(cfg.DBURL); err != nil {
		log.Fatalf("Error en les migracions: %v", err)
	}
	log.Println("Migracions completades correctament.")

	ctx := context.Background()
	s, err := store.NewPostgresStore(ctx, cfg.DBURL)
	if err != nil {
		log.Fatalf("Error connectant a la base de dades: %v", err)
	}
	defer s.Close()

	// Inicialitzar JobManager (substitueix cron antic)
	mailService := mailer.NewMailer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPass)
	jm := jobs.NewJobManager(s, mailService, cfg.JWTSecret)
	if err := jm.Start(); err != nil {
		log.Printf("Avís: No s'ha pogut iniciar el JobManager: %v", err)
	} else {
		defer jm.Stop()
	}

	h := handlers.NewHandler(s, mailService, cfg.JWTSecret)
	systemLogsHandler := handlers.NewSystemLogsHandler(s)
	settingsHandler := handlers.NewSettingsHandler(s, jm)
	adminHandler := handlers.NewAdminHandler(s, cfg.JWTSecret)

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()
	r.Use(middleware.CORS())

	// Serveix fitxers estàtics de pujada
	r.Static("/api/uploads", "./uploads")

	api := r.Group("/api")

	api.POST("/auth/register", h.Register)
	api.POST("/auth/login", h.Login)
	api.POST("/auth/magic-login", h.MagicLogin)
	api.GET("/entrenadors", h.ListEntrenadors)

	// Rutes que requereixen JWT però NO consentiment
	jwtOnly := api.Group("")
	jwtOnly.Use(middleware.JWTAuth(cfg.JWTSecret))
	{
		jwtOnly.POST("/legal/consent", h.RecordLegalConsent)
	}

	authenticated := api.Group("")
	authenticated.Use(middleware.JWTAuth(cfg.JWTSecret), middleware.RequireConsent(s, "v1.0"))
	{
		authenticated.POST("/auth/change-password", h.ChangePassword)
		authenticated.PATCH("/usuaris/me/idioma", h.UpdateIdioma)
		authenticated.PUT("/usuaris/me", h.UpdateProfile)

		// Anuncis (accessible by all roles)
		authenticated.GET("/anuncis", h.ListAnuncis)
		authenticated.POST("/anuncis", h.CreateAnunci)
		authenticated.PATCH("/anuncis/:id/status", h.UpdateAnunciStatus)
		authenticated.PATCH("/anuncis/:id/estat", h.UpdateAnunciEstat)
		authenticated.GET("/anuncis/tags", h.GetAnunciTags)
		authenticated.POST("/anuncis/upload", h.UploadAnunciImage)

		atletesAuth := authenticated.Group("/atletes")
		atletesAuth.Use(middleware.RequireRole("atleta"))
		atletesAuth.GET("/me", h.GetMe)
		atletesAuth.GET("/me/informe", h.GetInformeMe)
		atletesAuth.GET("/competicions", h.ListAtletaCompeticions)
		atletesAuth.POST("/competicions", h.CreateCompeticio)
		atletesAuth.PATCH("/competicions/:id", h.UpdateCompeticio)
		authenticated.GET("/activitats", h.ListActivitats)
		authenticated.GET("/weeks", h.ListOpenWeeks)

		authenticated.POST("/submissions", h.CreateSubmission)
		authenticated.GET("/submissions/me", h.GetMySubmission)
	}

	adminAndEntrenador := authenticated.Group("")
	adminAndEntrenador.Use(middleware.RequireRole("entrenador"))
	{
		adminAndEntrenador.GET("/feedback", h.GetFeedbackTickets)
		adminAndEntrenador.POST("/feedback", h.CreateFeedbackTicket)
	}

	entrenadorRoutes := api.Group("/entrenador")
	entrenadorRoutes.Use(middleware.JWTAuth(cfg.JWTSecret), middleware.RequireConsent(s, "v1.0"), middleware.RequireRole("entrenador"))
	{
		entrenadorRoutes.GET("/submissions", h.GetEntrenadorSubmissions)
		entrenadorRoutes.PATCH("/submissions/:id/gestionat", h.ToggleSubmissionGestionat)
		entrenadorRoutes.GET("/atletes", h.ListAtletes)
		entrenadorRoutes.GET("/atletes/:id/informe", h.GetInformeAtleta)
		entrenadorRoutes.GET("/weeks", h.ListEntrenadorWeeks)
		entrenadorRoutes.POST("/weeks", h.CreateWeek)
		entrenadorRoutes.PATCH("/weeks/:id", h.UpdateWeek)
		entrenadorRoutes.GET("/competicions", h.ListEntrenadorCompeticions)
		entrenadorRoutes.GET("/competicions/historic", h.ListEntrenadorHistoricCompeticions)
		entrenadorRoutes.PATCH("/competicions/:id/tipus", h.UpdateCompeticioTipus)
		entrenadorRoutes.POST("/competicions/:id/traspassar", h.TraspassarCompeticio)
		entrenadorRoutes.GET("/atletes/:id/competicions", h.GetAtletaCompeticionsTimeline)

		entrenadorRoutes.PATCH("/atletes/:id/status", h.ToggleAtletaStatus)
		entrenadorRoutes.GET("/atletes/:id/history", h.GetAtletaStatusHistory)
		entrenadorRoutes.PATCH("/atletes/:id/reasignar", h.ReasignarAtleta)
		
		entrenadorRoutes.POST("/tests", h.CreateTest)
		entrenadorRoutes.GET("/tests/pendents", h.ListPendingTestsByEntrenador)
		entrenadorRoutes.GET("/tests/recordatoris", h.ListRecordatoris)
		entrenadorRoutes.POST("/tests/:id/traspassar", h.TraspassarTest)
		entrenadorRoutes.PATCH("/tests/:id/recordatori", h.UpdateEstatRecordatori)

		entrenadorRoutes.GET("/activitats", h.ListAllActivitats)
		entrenadorRoutes.POST("/activitats", h.CreateActivitat)
		entrenadorRoutes.PATCH("/activitats/reorder", h.ReorderActivitats)
		entrenadorRoutes.PATCH("/activitats/:id", h.UpdateActivitat)
		entrenadorRoutes.DELETE("/activitats/:id", h.DeleteActivitat)

		entrenadorRoutes.GET("/forms", h.ListForms)
		entrenadorRoutes.POST("/forms", h.CreateForm)
		entrenadorRoutes.GET("/forms/:id", h.GetFormDetails)
		entrenadorRoutes.PUT("/forms/:id", h.UpdateForm)
		entrenadorRoutes.DELETE("/forms/:id", h.DeleteForm)
		entrenadorRoutes.POST("/forms/:id/clone", h.CloneForm)
		
		entrenadorRoutes.POST("/forms/:id/questions", h.AddFormQuestion)
		entrenadorRoutes.PUT("/forms/:id/questions/:questionId", h.UpdateFormQuestion)
		entrenadorRoutes.DELETE("/forms/:id/questions/:questionId", h.DeleteFormQuestion)
		entrenadorRoutes.PUT("/forms/:id/questions/reorder", h.ReorderFormQuestions)

		entrenadorRoutes.GET("/forms/:id/responses", h.GetFormResponses)
		entrenadorRoutes.PUT("/responses/:responseId/status", h.UpdateResponseStatus)

		// Settings
		entrenadorRoutes.GET("/settings/cron", settingsHandler.GetCronSettings)
		entrenadorRoutes.PUT("/settings/cron", settingsHandler.UpdateCronSettings)
	}

	adminRoutes := api.Group("/admin")
	adminRoutes.Use(middleware.JWTAuth(cfg.JWTSecret), middleware.RequireConsent(s, "v1.0"), middleware.RequireRole("admin"))
	{
		adminRoutes.GET("/system-logs", systemLogsHandler.GetSystemLogs)
		adminRoutes.GET("/usuaris", adminHandler.GetUsuaris)
		adminRoutes.POST("/impersonate/:id", adminHandler.Impersonate)
	}

	publicRoutes := api.Group("/public")
	{
		publicRoutes.GET("/forms/:id", h.PublicGetForm)
		publicRoutes.POST("/forms/:id/submit", h.SubmitFormResponse)
	}

	authenticated.GET("/competicions/:id", h.GetCompeticio)
	authenticated.GET("/tests/:id", h.GetTest)

	addr := ":" + cfg.Port
	log.Printf("Servidor iniciat a %s (env: %s)", addr, cfg.Env)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Error iniciant el servidor: %v", err)
	}
}
