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

	rows, err := pool.Query(context.Background(), "SELECT email, idioma FROM usuaris")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var email, idioma string
		rows.Scan(&email, &idioma)
		fmt.Printf("Email: '%s', Idioma: %s\n", email, idioma)
	}
}
