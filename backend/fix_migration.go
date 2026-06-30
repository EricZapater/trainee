package main

import (
	"database/sql"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	db, err := sql.Open("postgres", "postgres://ubuntu:J0ab%23271106@localhost:5432/trainee?sslmode=disable")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	_, err = db.Exec("UPDATE schema_migrations SET version = 23, dirty = false")
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Database forced to version 23 and dirty = false")
}
