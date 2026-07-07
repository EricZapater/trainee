package store

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type BrevoSync interface {
	SyncContact(email, name, surname string, active bool) (*int64, error)
	DeleteContact(email string) error
}

type PostgresStore struct {
	pool  *pgxpool.Pool
	brevo BrevoSync
}

func NewPostgresStore(ctx context.Context, dbURL string) (*PostgresStore, error) {
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		return nil, fmt.Errorf("error connectant a la base de dades: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("error fent ping a la base de dades: %w", err)
	}
	return &PostgresStore{pool: pool}, nil
}

func (s *PostgresStore) SetBrevo(b BrevoSync) {
	s.brevo = b
}

func (s *PostgresStore) Close() {
	s.pool.Close()
}
