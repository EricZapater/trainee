CREATE TABLE material_productes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom             TEXT NOT NULL,
    descripcio      TEXT NOT NULL DEFAULT '',
    talles          TEXT[] NOT NULL DEFAULT '{}',
    requereix_talla BOOLEAN NOT NULL DEFAULT true,
    imatges         TEXT[] NOT NULL DEFAULT '{}',
    preu            NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    actiu           BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE material_comandes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atleta_id       UUID NOT NULL REFERENCES atletes(id) ON DELETE CASCADE,
    producte_id     UUID NOT NULL REFERENCES material_productes(id) ON DELETE CASCADE,
    talla           TEXT NOT NULL DEFAULT '',
    quantitat       INTEGER NOT NULL DEFAULT 1,
    preu_unitari    NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    preu_total      NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    estat           TEXT NOT NULL DEFAULT 'pendent' CHECK (estat IN ('pendent', 'bloquejada', 'pagada', 'servida')),
    notes           TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_material_comandes_atleta_id ON material_comandes(atleta_id);
CREATE INDEX idx_material_comandes_producte_id ON material_comandes(producte_id);
CREATE INDEX idx_material_comandes_created_at ON material_comandes(created_at);

INSERT INTO system_settings (key, value)
VALUES ('material_comandes_enabled', '{"enabled": false}')
ON CONFLICT (key) DO NOTHING;
