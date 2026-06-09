ALTER TABLE slot_entries DROP COLUMN IF EXISTS competicio_id;

DROP TABLE IF EXISTS competicions;

UPDATE managed_weeks SET estat = 'tancada' WHERE estat = 'inactiva';

ALTER TABLE managed_weeks DROP CONSTRAINT IF EXISTS managed_weeks_estat_check;
ALTER TABLE managed_weeks ADD CONSTRAINT managed_weeks_estat_check CHECK (estat IN ('oberta', 'tancada', 'traspassada'));
