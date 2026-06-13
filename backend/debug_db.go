package main

import (
	"context"
	"fmt"
	"log"

	"trainee-backend/internal/store"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dsn := "postgres://ubuntu:J0ab%23271106@localhost:5432/trainee?sslmode=disable"
	ctx := context.Background()

	s, err := store.NewPostgresStore(ctx, dsn)
	if err != nil {
		log.Fatalf("No s'ha pogut connectar a la db: %v", err)
	}

	entrenadors, _ := s.ListEntrenadors(ctx)
	fmt.Printf("Total entrenadors: %d\n", len(entrenadors))
	for _, e := range entrenadors {
		fmt.Printf("- Entrenador ID: %s, Nom: %s\n", e.ID, e.Nom)
	}

	pool, _ := pgxpool.New(ctx, dsn)
	defer pool.Close()

	rows, err := pool.Query(ctx, "SELECT id, entrenador_id, week_start, estat FROM managed_weeks ORDER BY week_start DESC LIMIT 10")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("\nSetmanes creades recentment:")
	for rows.Next() {
		var id, e_id, estat string
        var w_start interface{}
		if err := rows.Scan(&id, &e_id, &w_start, &estat); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("ID: %s, Entrenador: %s, WeekStart: %v, Estat: %s\n", id, e_id, w_start, estat)
	}

	logs, err := pool.Query(ctx, "SELECT action_type, description, status, details, created_at FROM system_logs ORDER BY created_at DESC LIMIT 5")
	if err != nil {
		log.Fatal(err)
	}
	defer logs.Close()

	fmt.Println("\nÚltims logs:")
	for logs.Next() {
		var a, d, st, det, created string
		logs.Scan(&a, &d, &st, &det, &created)
		fmt.Printf("[%s] %s: %s | %s | %s\n", created, a, st, d, det)
	}
}
