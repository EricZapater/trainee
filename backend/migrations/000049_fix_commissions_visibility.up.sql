-- 000049_fix_commissions_visibility.up.sql
-- 1. Garantir que tots els articles de venda/ambdós dins d'Unitats de Negoci comissionables tinguin comissionable = TRUE
UPDATE fin_articles a
SET comissionable = TRUE
FROM fin_unitats_negoci u
WHERE a.unitat_negoci_id = u.id
  AND u.comissionable = TRUE
  AND a.tipus IN ('venda', 'ambdos');

-- 2. Backfill d'entrenador_id en factures de venda on estigui NULL a partir de l'atleta vinculat al client
UPDATE fin_factures_venda fv
SET entrenador_id = sub.coach_id
FROM (
    SELECT fc.id AS client_id, en.id AS coach_id
    FROM fin_clients fc
    JOIN atletes atl ON atl.usuari_id = fc.usuari_id
    JOIN entrenadors en ON (en.id = atl.entrenador_id OR en.usuari_id = atl.entrenador_id)
) sub
WHERE fv.client_id = sub.client_id
  AND fv.entrenador_id IS NULL;
