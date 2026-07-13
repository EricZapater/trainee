package store

import (
	"context"
)

func (s *PostgresStore) IncrementAutoReminder(ctx context.Context, atletaID string, weekStart string) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO weekly_submission_reminders (atleta_id, week_start, reminders_auto, reminders_manual)
		 VALUES ($1, $2::date, 1, 0)
		 ON CONFLICT (atleta_id, week_start)
		 DO UPDATE SET reminders_auto = weekly_submission_reminders.reminders_auto + 1`,
		atletaID, weekStart,
	)
	return err
}

func (s *PostgresStore) IncrementManualReminder(ctx context.Context, atletaID string, weekStart string) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO weekly_submission_reminders (atleta_id, week_start, reminders_auto, reminders_manual)
		 VALUES ($1, $2::date, 0, 1)
		 ON CONFLICT (atleta_id, week_start)
		 DO UPDATE SET reminders_manual = weekly_submission_reminders.reminders_manual + 1`,
		atletaID, weekStart,
	)
	return err
}
