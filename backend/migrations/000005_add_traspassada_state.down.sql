-- Retrocedir qualsevol setmana que estigués traspassada per evitar petar
UPDATE managed_weeks SET estat = 'tancada' WHERE estat = 'traspassada';

-- Eliminar constraint anterior
ALTER TABLE managed_weeks DROP CONSTRAINT IF EXISTS managed_weeks_estat_check;

-- Tornar a crear el constraint original
ALTER TABLE managed_weeks ADD CONSTRAINT managed_weeks_estat_check CHECK (estat IN ('oberta', 'tancada'));
