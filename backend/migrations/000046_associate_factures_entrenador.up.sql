-- 000046_associate_factures_entrenador.up.sql
-- Vincular factures de venda existents al seu entrenador corresponent mitjançant l'atleta/client

UPDATE fin_factures_venda fv
SET entrenador_id = a.entrenador_id
FROM fin_clients fc
JOIN atletes a ON a.usuari_id = fc.usuari_id
WHERE fv.client_id = fc.id
  AND fv.entrenador_id IS NULL
  AND a.entrenador_id IS NOT NULL;
