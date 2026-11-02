ALTER TABLE team_competitions DROP COLUMN IF EXISTS notes_equip;
ALTER TABLE team_competition_participants DROP COLUMN IF EXISTS kms;
ALTER TABLE team_competition_participants DROP COLUMN IF EXISTS ciutat_origen;
ALTER TABLE team_competition_participants DROP CONSTRAINT IF EXISTS team_competition_participants_objectiu_check;
ALTER TABLE team_competition_participants ADD CONSTRAINT team_competition_participants_objectiu_check CHECK (objectiu IN ('acabar', 'competir', 'entrenament'));
