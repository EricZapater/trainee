-- Eliminar constraint anterior
ALTER TABLE managed_weeks DROP CONSTRAINT IF EXISTS managed_weeks_estat_check;

-- Crear constraint nou
ALTER TABLE managed_weeks ADD CONSTRAINT managed_weeks_estat_check CHECK (estat IN ('oberta', 'tancada', 'traspassada'));
