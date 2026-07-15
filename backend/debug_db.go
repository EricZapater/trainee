package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dsn := "postgres://ubuntu:J0ab%23271106@localhost:5432/trainee?sslmode=disable"
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatalf("No s'ha pogut connectar a la db: %v", err)
	}
	defer pool.Close()

	rows, err := pool.Query(ctx, "SELECT id, titol, descripcio, imatges, actiu FROM forms")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("=== Formularis ===")
	for rows.Next() {
		var id, titol, descripcio string
		var imatges []string
		var actiu bool
		// Handle nullable description
		var descPtr *string
		if err := rows.Scan(&id, &titol, &descPtr, &imatges, &actiu); err != nil {
			log.Fatal(err)
		}
		if descPtr != nil {
			descripcio = *descPtr
		}
		fmt.Printf("ID: %s | Titol: %s | Desc: %s | Actiu: %t | Imatges: %v\n", id, titol, descripcio, actiu, imatges)

		// Print questions for this form
		qRows, err := pool.Query(ctx, "SELECT id, pregunta, imatges FROM form_questions WHERE form_id = $1", id)
		if err == nil {
			for qRows.Next() {
				var qID, pregunta string
				var qImatges []string
				qRows.Scan(&qID, &pregunta, &qImatges)
				fmt.Printf("  -> Question ID: %s | Pregunta: %s | Imatges: %v\n", qID, pregunta, qImatges)
			}
			qRows.Close()
		}
	}
}
