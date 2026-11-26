-- 000047_finances_phase2.down.sql
DROP TABLE IF EXISTS fin_avisos_cobrament_log;

ALTER TABLE fin_configuracio_empresa
    DROP CONSTRAINT IF EXISTS fin_config_dia_limit_check,
    DROP COLUMN IF EXISTS avisos_impagament_actius,
    DROP COLUMN IF EXISTS dia_limit_pagament;

DROP TABLE IF EXISTS fin_factures_cobraments;

UPDATE fin_factures_venda SET estat_cobrament = 'pendent' WHERE estat_cobrament = 'parcial';

ALTER TABLE fin_factures_venda
    DROP CONSTRAINT IF EXISTS fin_factures_venda_estat_cobrament_check,
    DROP COLUMN IF EXISTS import_pendent,
    DROP COLUMN IF EXISTS import_cobrat;

ALTER TABLE fin_factures_venda
    ADD CONSTRAINT fin_factures_venda_estat_cobrament_check
    CHECK (estat_cobrament IN ('pendent', 'pagada', 'impagada', 'compensada'));

DROP INDEX IF EXISTS idx_fin_compres_article;
ALTER TABLE fin_compres DROP COLUMN IF EXISTS article_id;

ALTER TABLE fin_articles
    DROP CONSTRAINT IF EXISTS fin_articles_tipus_check,
    DROP COLUMN IF EXISTS preu_final,
    DROP COLUMN IF EXISTS tipus;
