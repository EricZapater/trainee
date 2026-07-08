CREATE TABLE week_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atleta_id UUID NOT NULL REFERENCES atletes(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE week_template_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES week_templates(id) ON DELETE CASCADE,
    dia INTEGER NOT NULL CHECK (dia BETWEEN 0 AND 6),
    ordre INTEGER NOT NULL DEFAULT 0,
    activitat_id UUID NOT NULL REFERENCES activitats(id) ON DELETE CASCADE,
    durada_hores NUMERIC(3,1) NOT NULL CHECK (durada_hores >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
