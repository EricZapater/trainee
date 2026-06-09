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

	h := handlers.NewHandler(s, cfg.JWTSecret)

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
	api.GET("/entrenadors", h.ListEntrenadors)

	authenticated := api.Group("")
	authenticated.Use(middleware.JWTAuth(cfg.JWTSecret))
	{
		authenticated.POST("/auth/change-password", h.ChangePassword)

		atletesAuth := authenticated.Group("/atletes")
		atletesAuth.Use(middleware.RequireRole("atleta"))
		atletesAuth.GET("/me", h.GetMe)
		atletesAuth.GET("/me/informe", h.GetInformeMe)
		atletesAuth.GET("/competicions", h.ListAtletaCompeticions)
		atletesAuth.POST("/competicions", h.CreateCompeticio)
		authenticated.GET("/activitats", h.ListActivitats)
		authenticated.GET("/weeks", h.ListOpenWeeks)

		authenticated.POST("/submissions", h.CreateSubmission)
		authenticated.GET("/submissions/me", h.GetMySubmission)
	}

	entrenadorRoutes := api.Group("/entrenador")
	entrenadorRoutes.Use(middleware.JWTAuth(cfg.JWTSecret), middleware.RequireRole("entrenador"))
	{
		entrenadorRoutes.GET("/submissions", h.GetEntrenadorSubmissions)
		entrenadorRoutes.GET("/atletes", h.ListAtletes)
		entrenadorRoutes.GET("/atletes/:id/informe", h.GetInformeAtleta)
		entrenadorRoutes.GET("/weeks", h.ListEntrenadorWeeks)
		entrenadorRoutes.POST("/weeks", h.CreateWeek)
		entrenadorRoutes.PATCH("/weeks/:id", h.UpdateWeek)
		entrenadorRoutes.GET("/competicions", h.ListEntrenadorCompeticions)
		entrenadorRoutes.POST("/competicions/:id/traspassar", h.TraspassarCompeticio)
		
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
	}

	authenticated.GET("/competicions/:id", h.GetCompeticio)
	authenticated.GET("/tests/:id", h.GetTest)

	addr := ":" + cfg.Port
	log.Printf("Servidor iniciat a %s (env: %s)", addr, cfg.Env)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Error iniciant el servidor: %v", err)
	}
}
