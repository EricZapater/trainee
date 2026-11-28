-- 000048_coach_commissions.down.sql
DROP TABLE IF EXISTS fin_entrenador_comissions;

ALTER TABLE fin_articles DROP COLUMN IF EXISTS comissionable;
ALTER TABLE fin_unitats_negoci DROP COLUMN IF EXISTS comissionable;
