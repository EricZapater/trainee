CREATE TABLE IF NOT EXISTS team_competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    data_inici DATE NOT NULL,
    data_fi DATE,
    localitzacio TEXT,
    modalitat TEXT,
    distancia_km NUMERIC(6,2),
    desnivell_positiu INT,
    web_oficial TEXT,
    fitxer_gpx TEXT,
    creat_per UUID REFERENCES usuaris(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_competition_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_competition_id UUID NOT NULL REFERENCES team_competitions(id) ON DELETE CASCADE,
    usuari_id UUID NOT NULL REFERENCES usuaris(id) ON DELETE CASCADE,
    estat TEXT NOT NULL DEFAULT 'inscrit' CHECK (estat IN ('inscrit', 'interessat', 'baixa')),
    objectiu TEXT DEFAULT 'acabar' CHECK (objectiu IN ('acabar', 'competir', 'entrenament')),
    disposa_cotxe BOOLEAN NOT NULL DEFAULT false,
    places_lliures INT NOT NULL DEFAULT 0,
    privacitat TEXT NOT NULL DEFAULT 'equip' CHECK (privacitat IN ('equip', 'privat')),
    comentari TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_team_competition_participant UNIQUE (team_competition_id, usuari_id)
);

CREATE INDEX IF NOT EXISTS idx_team_competitions_data ON team_competitions(data_inici);
CREATE INDEX IF NOT EXISTS idx_team_comp_participants_comp ON team_competition_participants(team_competition_id);
CREATE INDEX IF NOT EXISTS idx_team_comp_participants_user ON team_competition_participants(usuari_id);
