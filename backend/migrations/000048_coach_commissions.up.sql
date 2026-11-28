-- 000048_coach_commissions.up.sql
-- 1. Marcatge de quines Unitats de Negoci i Articles generen comissió
ALTER TABLE fin_unitats_negoci
    ADD COLUMN IF NOT EXISTS comissionable BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE fin_unitats_negoci
SET comissionable = TRUE
WHERE nom ILIKE '%entren%' OR codi ILIKE '%ENT%';

ALTER TABLE fin_articles
    ADD COLUMN IF NOT EXISTS comissionable BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE fin_articles
SET comissionable = TRUE
WHERE es_recurrent = TRUE
   OR categoria = 'entrenament_recurrent'
   OR nom ILIKE '%entren%'
   OR nom ILIKE '%quota%';

-- 2. Regles escalables de Comissió entre Entrenadors (1 Origen -> N Comissionistes amb vigència temporal)
CREATE TABLE IF NOT EXISTS fin_entrenador_comissions (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrenador_origen_id      UUID NOT NULL REFERENCES entrenadors(id) ON DELETE CASCADE,
    tipus_beneficiari         TEXT NOT NULL DEFAULT 'entrenador' CHECK (tipus_beneficiari IN ('entrenador', 'estructura')),
    entrenador_beneficiari_id UUID REFERENCES entrenadors(id) ON DELETE CASCADE,
    percentatge               NUMERIC(5,2) NOT NULL CHECK (percentatge > 0 AND percentatge <= 100),
    base_calcul               TEXT NOT NULL DEFAULT 'ambdues' CHECK (base_calcul IN ('ambdues', 'total', 'base')),
    ambit                     TEXT NOT NULL DEFAULT 'tot_comissionable' CHECK (ambit IN ('tot_comissionable', 'unitat_negoci', 'article')),
    unitat_negoci_id          UUID REFERENCES fin_unitats_negoci(id) ON DELETE CASCADE,
    article_id                UUID REFERENCES fin_articles(id) ON DELETE CASCADE,
    mes_inici                 TEXT NOT NULL DEFAULT '2026-01',
    mes_fi                    TEXT,
    actiu                     BOOLEAN NOT NULL DEFAULT TRUE,
    notes                     TEXT NOT NULL DEFAULT '',
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_no_self_commission CHECK (entrenador_beneficiari_id IS NULL OR entrenador_origen_id <> entrenador_beneficiari_id)
);

CREATE INDEX IF NOT EXISTS idx_fin_ent_comissions_origen ON fin_entrenador_comissions(entrenador_origen_id);
CREATE INDEX IF NOT EXISTS idx_fin_ent_comissions_benef ON fin_entrenador_comissions(entrenador_beneficiari_id);
