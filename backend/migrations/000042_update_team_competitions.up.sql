ALTER TABLE team_competitions ADD COLUMN IF NOT EXISTS notes_equip TEXT;

ALTER TABLE team_competition_participants ADD COLUMN IF NOT EXISTS kms NUMERIC(6,2);
ALTER TABLE team_competition_participants ADD COLUMN IF NOT EXISTS ciutat_origen VARCHAR(255);

ALTER TABLE team_competition_participants DROP CONSTRAINT IF EXISTS team_competition_participants_objectiu_check;
ALTER TABLE team_competition_participants ADD CONSTRAINT team_competition_participants_objectiu_check CHECK (objectiu IN ('acabar', 'competir', 'entrenament', 'A', 'B', 'C'));
