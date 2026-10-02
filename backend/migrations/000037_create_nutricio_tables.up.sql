CREATE TABLE nutricio_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atleta_id UUID NOT NULL REFERENCES atletes(id) ON DELETE CASCADE,
    entrenador_id UUID NOT NULL REFERENCES entrenadors(id) ON DELETE CASCADE,
    titol VARCHAR(255) NOT NULL,
    estat VARCHAR(50) DEFAULT 'actiu',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE nutricio_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES nutricio_plans(id) ON DELETE CASCADE,
    versio INT NOT NULL,
    objectiu_ch_g_h NUMERIC,
    objectiu_sodi_mg_h NUMERIC,
    objectiu_fluid_ml_h NUMERIC,
    productes_propostes TEXT,
    instruccions TEXT,
    data_revisio DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE nutricio_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_id UUID NOT NULL REFERENCES nutricio_revisions(id) ON DELETE CASCADE,
    atleta_id UUID NOT NULL REFERENCES atletes(id) ON DELETE CASCADE,
    data_sortida DATE NOT NULL,
    durada_hores NUMERIC,
    productes_consumits TEXT,
    ch_g_h_real NUMERIC,
    sodi_mg_h_real NUMERIC,
    fluid_ml_h_real NUMERIC,
    sensacions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
