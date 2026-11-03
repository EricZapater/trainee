DROP TABLE IF EXISTS fin_recurrents_sortida;
DROP TABLE IF EXISTS fin_despeses;
DROP TABLE IF EXISTS fin_compres;
ALTER TABLE IF EXISTS fin_plans_camp_fites DROP CONSTRAINT IF EXISTS fk_fita_factura_venda;
DROP TABLE IF EXISTS fin_factures_venda;
DROP TABLE IF EXISTS fin_plans_camp_fites;
DROP TABLE IF EXISTS fin_plans_camp;
DROP TABLE IF EXISTS fin_subscripcions;
DROP TABLE IF EXISTS fin_articles;
DROP TABLE IF EXISTS fin_proveidors;
DROP TABLE IF EXISTS fin_clients;
DROP TABLE IF EXISTS fin_unitats_negoci;
DROP TABLE IF EXISTS fin_series;
DROP TABLE IF EXISTS fin_impostos;
DROP TABLE IF EXISTS fin_configuracio_empresa;

ALTER TABLE usuaris DROP COLUMN IF EXISTS es_administracio;
