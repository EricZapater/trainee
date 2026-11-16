-- 000045_refactor_finances_recurring_and_cost_centers.up.sql

-- 1. Ampliació d'articles: Quota recurrent vs Pagament únic i periodicitat
ALTER TABLE fin_articles
    ADD COLUMN IF NOT EXISTS es_recurrent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS periodicitat_mesos INT CHECK (periodicitat_mesos IN (1, 3, 6, 12));

-- Relaxar el check de categoria d'articles si existia
ALTER TABLE fin_articles DROP CONSTRAINT IF EXISTS fin_articles_categoria_check;

-- Inicialitzar es_recurrent per a articles de categoria 'entrenament_recurrent' existents
UPDATE fin_articles
SET es_recurrent = TRUE, periodicitat_mesos = 1
WHERE categoria = 'entrenament_recurrent' OR nom ILIKE '%quota%' OR nom ILIKE '%mensual%';

-- 2. Dades de facturació i quota recurrent a la fitxa de l'atleta (usuaris)
ALTER TABLE usuaris
    ADD COLUMN IF NOT EXISTS article_quota_id UUID REFERENCES fin_articles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS forma_pagament TEXT NOT NULL DEFAULT 'sepa_domiciliacio',
    ADD COLUMN IF NOT EXISTS iban TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS pausat_facturacio BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pausat_facturacio_per UUID REFERENCES usuaris(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS pausat_facturacio_data TIMESTAMPTZ;

-- 3. Centre de cost opcional a compres i despeses (permetre NULL)
ALTER TABLE fin_compres
    ALTER COLUMN unitat_negoci_id DROP NOT NULL;

ALTER TABLE fin_despeses
    ALTER COLUMN unitat_negoci_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS es_recurrent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS dia_mes_generacio INT NOT NULL DEFAULT 1;

-- Relaxar el check de categoria de despeses per permetre autònoms, lloguer, software, etc.
ALTER TABLE fin_despeses DROP CONSTRAINT IF EXISTS fin_despeses_categoria_check;

-- 4. Afegir índexs per a consultes eficients de quotes i facturació periòdica
CREATE INDEX IF NOT EXISTS idx_usuaris_article_quota ON usuaris(article_quota_id) WHERE article_quota_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usuaris_pausat_facturacio ON usuaris(pausat_facturacio) WHERE rol = 'atleta';
CREATE INDEX IF NOT EXISTS idx_fin_despeses_recurrent ON fin_despeses(es_recurrent) WHERE es_recurrent = TRUE;
