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

	rows, err := pool.Query(context.Background(), "SELECT id, usuari_id, entrenador_id FROM atletes WHERE usuari_id = '1c76aaba-35fb-4e85-af89-72576095137e'")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var id, usuari_id, entrenador_id string
		rows.Scan(&id, &usuari_id, &entrenador_id)
		fmt.Printf("Atleta ID: %s, Usuari ID: %s, Entrenador ID: %s\n", id, usuari_id, entrenador_id)
	}
}
