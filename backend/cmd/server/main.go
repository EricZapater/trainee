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
	"trainee-backend/internal/brevo"
	"trainee-backend/internal/handlers"
	"trainee-backend/internal/jobs"
	"trainee-backend/internal/mailer"
	"trainee-backend/internal/middleware"
	"trainee-backend/internal/store"
	"trainee-backend/internal/uploader"
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

	version, dirty, errVer := m.Version()
	if errVer == nil && dirty {
		log.Printf("Avís: Base de dades en estat dirty a la versió %d. Intentant forçar a la versió %d...", version, version-1)
		if errForce := m.Force(int(version - 1)); errForce != nil {
			log.Printf("No s'ha pogut forçar la versió automàticament: %v", errForce)
		}
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		if strings.Contains(err.Error(), "Dirty database") {
			v, d, _ := m.Version()
			if d && v > 0 {
				log.Printf("Re-intentant recuperar base de dades dirty versió %d...", v)
				if errForce := m.Force(int(v - 1)); errForce == nil {
					return m.Up()
				}
			}
		}
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

	if cfg.BrevoAPIKey != "" {
		b := brevo.NewService(cfg.BrevoAPIKey)
		s.SetBrevo(b)
	}

	if cfg.DisableMail {
		log.Println("🔒 [SEGURETAT] Mailing DESACTIVAT per entorn PRE/DISABLE_MAIL. Cap email serà enviat a usuaris reals.")
	}

	// Inicialitzar JobManager (substitueix cron antic)
	mailService := mailer.NewMailer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPass)
	jm := jobs.NewJobManager(s, mailService, cfg.JWTSecret)
	if err := jm.Start(); err != nil {
		log.Printf("Avís: No s'ha pogut iniciar el JobManager: %v", err)
	} else {
		defer jm.Stop()
	}

	fileUploader, err := uploader.NewUploader()
	if err != nil {
		log.Fatalf("Error inicialitzant l'uploader: %v", err)
	}

	h := handlers.NewHandler(s, mailService, cfg.JWTSecret, fileUploader, cfg.FrontendURL)
	systemLogsHandler := handlers.NewSystemLogsHandler(s)
	settingsHandler := handlers.NewSettingsHandler(s, jm)
	adminHandler := handlers.NewAdminHandler(s, mailService, cfg.JWTSecret)
	financesHandler := handlers.NewFinancesHandler(s, fileUploader)

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()
	r.Use(middleware.CORS())

	// Serveix fitxers estàtics de pujada
	r.Static("/api/uploads", "./uploads")

	api := r.Group("/api")

	// Endpoint de health check (actiu només a PRE / no producció)
	if cfg.Env != "production" {
		healthHandler := func(c *gin.Context) {
			dbStatus := "connected"
			httpStatus := 200
			if err := s.Ping(c.Request.Context()); err != nil {
				dbStatus = "disconnected: " + err.Error()
				httpStatus = 503
			}
			c.JSON(httpStatus, gin.H{
				"status":   "ok",
				"env":      cfg.Env,
				"database": dbStatus,
			})
		}
		r.GET("/health", healthHandler)
		api.GET("/health", healthHandler)
	}

	api.POST("/auth/register", h.Register)
	api.POST("/auth/login", h.Login)
	api.POST("/auth/magic-login", h.MagicLogin)
	api.POST("/auth/recover-password", h.RecoverPassword)
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
		authenticated.GET("/auth/me", h.GetAuthMe)
		authenticated.GET("/usuaris/me", h.GetAuthMe)
		authenticated.POST("/auth/change-password", h.ChangePassword)
		authenticated.PATCH("/usuaris/me/idioma", h.UpdateIdioma)
		authenticated.PATCH("/usuaris/me/notificacions-tauler", h.UpdateNotificacionsTauler)
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
		atletesAuth.GET("/templates", h.ListWeekTemplates)
		atletesAuth.POST("/templates", h.CreateWeekTemplate)
		atletesAuth.DELETE("/templates/:id", h.DeleteWeekTemplate)
		authenticated.GET("/activitats", h.ListActivitats)
		authenticated.GET("/weeks", h.ListOpenWeeks)

		authenticated.POST("/submissions", h.CreateSubmission)
		authenticated.GET("/submissions/me", h.GetMySubmission)
		authenticated.POST("/submissions/wellness", h.SubmitWellness)
		authenticated.GET("/submissions/wellness/me", h.GetMyWellness)

		// Curses d'Equip / Team Race Hub (Autenticats)
		authenticated.GET("/competicions/equip", h.ListTeamCompetitions)
		authenticated.POST("/competicions/equip", h.CreateTeamCompetition)
		authenticated.DELETE("/competicions/equip/:id", h.DeleteTeamCompetition)
		authenticated.POST("/competicions/equip/:id/join", h.JoinTeamCompetition)
		authenticated.DELETE("/competicions/equip/:id/leave", h.LeaveTeamCompetition)
		authenticated.POST("/competicions/equip/upload-gpx", h.UploadTeamCompetitionGPX)

		// Material Catàleg i Comandes (Autenticats)
		authenticated.GET("/material/productes", h.ListMaterialProductes)
		authenticated.GET("/material/settings", h.GetMaterialSettings)
		authenticated.GET("/material/comandes", h.ListMaterialComandes)
		authenticated.POST("/material/comandes", h.CreateMaterialComandes)
		authenticated.PUT("/material/comandes/:id", h.UpdateMaterialComanda)
		authenticated.DELETE("/material/comandes/:id", h.DeleteMaterialComanda)

		// Preparació Nutricional (Autenticats)
		authenticated.GET("/nutricio/plans", h.ListNutricioPlans)
		authenticated.GET("/nutricio/plans/:id", h.GetNutricioPlanDetails)
		authenticated.POST("/nutricio/plans", h.CreateNutricioPlan)
		authenticated.POST("/nutricio/plans/:id/revisions", h.CreateNutricioRevision)
		authenticated.POST("/nutricio/revisions/:revisionId/feedbacks", h.AddNutricioFeedback)
		authenticated.PATCH("/nutricio/plans/:id/estat", h.UpdateNutricioPlanEstat)
		authenticated.PUT("/nutricio/plans/:id/estat", h.UpdateNutricioPlanEstat)
		authenticated.DELETE("/nutricio/plans/:id", h.DeleteNutricioPlan)
	}


	adminAndEntrenador := authenticated.Group("")
	adminAndEntrenador.Use(middleware.RequireRole("entrenador"))
	{
		adminAndEntrenador.GET("/feedback", h.GetFeedbackTickets)
		adminAndEntrenador.PATCH("/feedback/:id", h.UpdateFeedbackTicket)
		adminAndEntrenador.POST("/feedback", h.CreateFeedbackTicket)
	}

	entrenadorRoutes := api.Group("/entrenador")
	entrenadorRoutes.Use(middleware.JWTAuth(cfg.JWTSecret), middleware.RequireConsent(s, "v1.0"), middleware.RequireRole("entrenador"))
	{
		entrenadorRoutes.GET("/submissions", h.GetEntrenadorSubmissions)
		entrenadorRoutes.GET("/wellness/overview", h.GetEntrenadorWellnessOverview)
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

		entrenadorRoutes.PATCH("/atletes/:id", h.UpdateAtletaDetails)
		entrenadorRoutes.PATCH("/atletes/:id/status", h.ToggleAtletaStatus)
		entrenadorRoutes.GET("/atletes/:id/history", h.GetAtletaStatusHistory)
		entrenadorRoutes.PATCH("/atletes/:id/reasignar", h.ReasignarAtleta)
		entrenadorRoutes.POST("/atletes/:id/remind", h.SendManualReminder)
		entrenadorRoutes.PATCH("/atletes/:id/absent", h.ToggleAtletaAbsent)
		entrenadorRoutes.GET("/atletes/:id/tests", h.GetAtletaTestsTimeline)
		
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
		entrenadorRoutes.POST("/forms/upload", h.UploadFormImage)
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
		entrenadorRoutes.PUT("/responses/:responseId", h.UpdateFormResponseDetails)
		entrenadorRoutes.PUT("/responses/:responseId/assign", h.AssignFormResponseEntrenador)
		entrenadorRoutes.PUT("/answers/:answerId", h.UpdateFormAnswer)

		// Settings
		entrenadorRoutes.GET("/settings/cron", settingsHandler.GetCronSettings)
		entrenadorRoutes.PUT("/settings/cron", settingsHandler.UpdateCronSettings)

		// Material Catàleg i Comandes (Entrenador)
		entrenadorRoutes.POST("/material/productes", h.CreateMaterialProducte)
		entrenadorRoutes.PUT("/material/productes/:id", h.UpdateMaterialProducte)
		entrenadorRoutes.DELETE("/material/productes/:id", h.DeleteMaterialProducte)
		entrenadorRoutes.POST("/material/upload-image", h.UploadMaterialImage)
		entrenadorRoutes.PUT("/material/settings", h.UpdateMaterialSettings)
		entrenadorRoutes.PUT("/material/comandes/bulk-status", h.BulkUpdateComandesState)
		entrenadorRoutes.GET("/material/comandes/export", h.ExportMaterialComandesCSV)
	}


	adminRoutes := api.Group("/admin")
	adminRoutes.Use(middleware.JWTAuth(cfg.JWTSecret), middleware.RequireConsent(s, "v1.0"), middleware.RequireRole("admin"))
	{
		adminRoutes.GET("/system-logs", systemLogsHandler.GetSystemLogs)
		adminRoutes.GET("/usuaris", adminHandler.GetUsuaris)
		adminRoutes.PATCH("/usuaris/:id/administracio", adminHandler.ToggleUsuariAdministracio)
		adminRoutes.POST("/impersonate/:id", adminHandler.Impersonate)
		adminRoutes.POST("/usuaris/:id/reset-password", adminHandler.ResetPassword)
		adminRoutes.POST("/usuaris/:id/brevo-sync", adminHandler.ForceBrevoSync)
	}

	// Mòdul d'Administració i Finances (Protegit: Admin o Entrenador amb es_administracio=true)
	financesRoutes := api.Group("/finances")
	financesRoutes.Use(middleware.JWTAuth(cfg.JWTSecret), middleware.RequireConsent(s, "v1.0"), middleware.RequireAdministracio(s))
	{
		// Configuració i Mestres
		financesRoutes.GET("/configuracio", financesHandler.GetConfiguracioEmpresa)
		financesRoutes.PUT("/configuracio", financesHandler.UpdateConfiguracioEmpresa)
		financesRoutes.GET("/impostos", financesHandler.ListImpostos)
		financesRoutes.POST("/impostos", financesHandler.CreateImpost)
		financesRoutes.PUT("/impostos/:id", financesHandler.UpdateImpost)
		financesRoutes.DELETE("/impostos/:id", financesHandler.DeleteImpost)

		financesRoutes.GET("/series", financesHandler.ListSeries)
		financesRoutes.POST("/series", financesHandler.CreateSerie)
		financesRoutes.PUT("/series/:id", financesHandler.UpdateSerie)

		financesRoutes.GET("/unitats-negoci", financesHandler.ListUnitatsNegoci)
		financesRoutes.POST("/unitats-negoci", financesHandler.CreateUnitatNegoci)
		financesRoutes.PUT("/unitats-negoci/:id", financesHandler.UpdateUnitatNegoci)

		financesRoutes.GET("/clients", financesHandler.ListClients)
		financesRoutes.POST("/clients", financesHandler.CreateClient)
		financesRoutes.PUT("/clients/:id", financesHandler.UpdateClient)
		financesRoutes.POST("/clients/sync-atletes", financesHandler.SyncAtletesToClients)

		financesRoutes.GET("/proveidors", financesHandler.ListProveidors)
		financesRoutes.POST("/proveidors", financesHandler.CreateProveidor)
		financesRoutes.PUT("/proveidors/:id", financesHandler.UpdateProveidor)

		financesRoutes.GET("/articles", financesHandler.ListArticles)
		financesRoutes.POST("/articles", financesHandler.CreateArticle)
		financesRoutes.PUT("/articles/:id", financesHandler.UpdateArticle)

		// Operativa Vendes, Subscripcions i Camps
		financesRoutes.GET("/subscripcions", financesHandler.ListSubscripcions)
		financesRoutes.POST("/subscripcions", financesHandler.CreateSubscripcio)
		financesRoutes.PUT("/subscripcions/:id", financesHandler.UpdateSubscripcio)
		financesRoutes.POST("/subscripcions/generar-remesa", financesHandler.BatchGenerateSubscripcions)

		financesRoutes.GET("/plans-camp", financesHandler.ListPlansCamp)
		financesRoutes.POST("/plans-camp", financesHandler.CreatePlaCamp)
		financesRoutes.POST("/plans-camp/fites/:fita_id/facturar", financesHandler.FacturarCampFita)

		financesRoutes.GET("/factures", financesHandler.ListFacturesVenda)
		financesRoutes.GET("/factures/:id", financesHandler.GetFacturaVenda)
		financesRoutes.POST("/factures", financesHandler.CreateFacturaVenda)
		financesRoutes.PUT("/factures/:id", financesHandler.UpdateFacturaVenda)
		financesRoutes.DELETE("/factures/:id", financesHandler.DeleteFacturaVenda)
		financesRoutes.POST("/factures/:id/emetre", financesHandler.EmetreFacturaVenda)
		financesRoutes.POST("/factures/:id/conciliar", financesHandler.ConciliarFacturaVenda)
		financesRoutes.POST("/factures/:id/marcar-impagada", financesHandler.MarcarImpagadaFacturaVenda)
		financesRoutes.POST("/factures/:id/abonament", financesHandler.CrearAbonamentFacturaVenda)

		// Compres i Despeses
		financesRoutes.GET("/compres", financesHandler.ListCompres)
		financesRoutes.POST("/compres", financesHandler.CreateCompra)
		financesRoutes.PUT("/compres/:id", financesHandler.UpdateCompra)
		financesRoutes.DELETE("/compres/:id", financesHandler.DeleteCompra)
		financesRoutes.POST("/compres/:id/conciliar", financesHandler.ConciliarCompra)
		financesRoutes.POST("/upload", financesHandler.UploadDocument)

		financesRoutes.GET("/despeses", financesHandler.ListDespeses)
		financesRoutes.POST("/despeses", financesHandler.CreateDespesa)
		financesRoutes.PUT("/despeses/:id", financesHandler.UpdateDespesa)
		financesRoutes.DELETE("/despeses/:id", financesHandler.DeleteDespesa)
		financesRoutes.POST("/despeses/:id/conciliar", financesHandler.ConciliarDespesa)

		financesRoutes.GET("/recurrents-sortida", financesHandler.ListRecurrentsSortida)
		financesRoutes.POST("/recurrents-sortida", financesHandler.CreateRecurrentSortida)
		financesRoutes.DELETE("/recurrents-sortida/:id", financesHandler.DeleteRecurrentSortida)

		// Informes Analítics i Tresoreria
		financesRoutes.GET("/informes/resultats", financesHandler.GetInformeResultats)
		financesRoutes.GET("/informes/resultats/csv", financesHandler.ExportInformeCSV)
		financesRoutes.GET("/tresoreria/cashflow", financesHandler.GetCashflowForecast)
	}

	// Factures per a l'Atleta i descàrrega PDF
	authenticated.GET("/atletes/factures", financesHandler.ListFacturesMe)
	authenticated.GET("/perfil/factures", financesHandler.ListFacturesMe)
	authenticated.GET("/perfil/facturacio", financesHandler.GetMyFacturacio)
	authenticated.PUT("/perfil/facturacio", financesHandler.UpdateMyFacturacio)
	authenticated.GET("/finances/factures/:id/pdf", financesHandler.DownloadFacturaPDF)

	publicRoutes := api.Group("/public")
	{
		publicRoutes.GET("/forms/:id", h.PublicGetForm)
		publicRoutes.GET("/forms/:id/preview", h.PublicFormOGPreview)
		publicRoutes.POST("/forms/:id/submit", middleware.OptionalJWTAuth(cfg.JWTSecret), h.SubmitFormResponse)
	}

	authenticated.GET("/competicions/:id", h.GetCompeticio)
	authenticated.GET("/tests/:id", h.GetTest)

	addr := ":" + cfg.Port
	log.Printf("Servidor iniciat a %s (env: %s)", addr, cfg.Env)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Error iniciant el servidor: %v", err)
	}
}
