CREATE TABLE athlete_week_absences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atleta_id UUID NOT NULL REFERENCES atletes(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    marked_by UUID NOT NULL REFERENCES entrenadors(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (atleta_id, week_start)
);
CREATE INDEX idx_athlete_week_absences_week ON athlete_week_absences(week_start);
