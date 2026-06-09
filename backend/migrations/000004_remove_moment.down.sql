-- Eliminar la columna ordre
ALTER TABLE slot_entries DROP COLUMN IF EXISTS ordre;

-- Restaurar la columna moment amb un default per no fallar en files existents
ALTER TABLE slot_entries ADD COLUMN moment TEXT NOT NULL DEFAULT 'mati' CHECK (moment IN ('mati', 'migdia', 'tarda', 'nit'));

-- Restaurar la constraint d'unicitat
ALTER TABLE slot_entries ADD CONSTRAINT slot_entries_submission_id_dia_moment_key UNIQUE (submission_id, dia, moment);
