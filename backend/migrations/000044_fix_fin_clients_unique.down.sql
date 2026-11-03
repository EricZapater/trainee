-- 000044_fix_fin_clients_unique.down.sql
ALTER TABLE IF EXISTS fin_clients DROP CONSTRAINT IF EXISTS fin_clients_usuari_id_unique;
