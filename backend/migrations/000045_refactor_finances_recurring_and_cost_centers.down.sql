-- 000045_refactor_finances_recurring_and_cost_centers.down.sql

DROP INDEX IF EXISTS idx_fin_despeses_recurrent;
DROP INDEX IF EXISTS idx_usuaris_pausat_facturacio;
DROP INDEX IF EXISTS idx_usuaris_article_quota;

ALTER TABLE fin_despeses
    DROP COLUMN IF EXISTS dia_mes_generacio,
    DROP COLUMN IF EXISTS es_recurrent;

ALTER TABLE usuaris
    DROP COLUMN IF EXISTS pausat_facturacio_data,
    DROP COLUMN IF EXISTS pausat_facturacio_per,
    DROP COLUMN IF EXISTS pausat_facturacio,
    DROP COLUMN IF EXISTS iban,
    DROP COLUMN IF EXISTS forma_pagament,
    DROP COLUMN IF EXISTS article_quota_id;

ALTER TABLE fin_articles
    DROP COLUMN IF EXISTS periodicitat_mesos,
    DROP COLUMN IF EXISTS es_recurrent;
