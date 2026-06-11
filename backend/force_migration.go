package main

import (
	"log"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"

	"trainee-backend/config"
	"trainee-backend/migrations"
)

func main() {
	cfg := config.Load()
	migrateURL := cfg.DBURL
	if strings.Contains(migrateURL, "?") {
		migrateURL += "&x-migrations-table=schema_migrations"
	} else {
		migrateURL += "?x-migrations-table=schema_migrations"
	}
	source, err := iofs.New(migrations.FS, ".")
	if err != nil {
		log.Fatal(err)
	}
	m, err := migrate.NewWithSourceInstance("iofs", source, migrateURL)
	if err != nil {
		log.Fatal(err)
	}
	
	if err := m.Force(13); err != nil {
		log.Fatalf("Error forçant la versió: %v", err)
	}
	log.Println("S'ha forçat la base de dades a la versió 13 neta. Ara pots tornar a executar main.go.")
}
