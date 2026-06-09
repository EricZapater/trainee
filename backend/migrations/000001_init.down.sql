DROP INDEX IF EXISTS idx_activitats_ordre;
DROP INDEX IF EXISTS idx_slot_entries_submission;
DROP INDEX IF EXISTS idx_weekly_submissions_week;
DROP INDEX IF EXISTS idx_weekly_submissions_atleta;
DROP INDEX IF EXISTS idx_managed_weeks_entrenador;
DROP INDEX IF EXISTS idx_atletes_entrenador;

DROP TABLE IF EXISTS slot_entries;
DROP TABLE IF EXISTS weekly_submissions;
DROP TABLE IF EXISTS managed_weeks;
DROP TABLE IF EXISTS activitats;
DROP TABLE IF EXISTS atletes;
DROP TABLE IF EXISTS entrenadors;
DROP TABLE IF EXISTS usuaris;
