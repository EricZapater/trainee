package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dbURL := "postgres://ubuntu:J0ab%23271106@localhost:5432/trainee?sslmode=disable"
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	rows, err := pool.Query(context.Background(), "SELECT id, nom, email, idioma, rol FROM usuaris WHERE email ILIKE '%ezapaterm%'")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var id, nom, email, idioma, rol string
		rows.Scan(&id, &nom, &email, &idioma, &rol)
		fmt.Printf("ID: %s, Nom: %s, Email: '%s', Idioma: %s, Rol: %s\n", id, nom, email, idioma, rol)
	}
}
