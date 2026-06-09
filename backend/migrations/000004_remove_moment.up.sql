-- Eliminar restricció d'unicitat prèvia (que forçava 1 activitat per moment i dia)
ALTER TABLE slot_entries DROP CONSTRAINT IF EXISTS slot_entries_submission_id_dia_moment_key;

-- Eliminar columna moment
ALTER TABLE slot_entries DROP COLUMN IF EXISTS moment;

-- Afegir columna ordre per poder mantenir el sort manual
ALTER TABLE slot_entries ADD COLUMN ordre INT NOT NULL DEFAULT 0;
