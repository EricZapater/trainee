CREATE TABLE competicions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atleta_id UUID NOT NULL REFERENCES atletes(id) ON DELETE CASCADE,
    entrenador_id UUID NOT NULL REFERENCES entrenadors(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    data DATE NOT NULL,
    kms REAL,
    desnivell REAL,
    enllac TEXT,
    comentaris TEXT,
    registrat BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE managed_weeks DROP CONSTRAINT IF EXISTS managed_weeks_estat_check;
ALTER TABLE managed_weeks ADD CONSTRAINT managed_weeks_estat_check CHECK (estat IN ('oberta', 'tancada', 'traspassada', 'inactiva'));

ALTER TABLE slot_entries ADD COLUMN competicio_id UUID REFERENCES competicions(id) ON DELETE SET NULL;
