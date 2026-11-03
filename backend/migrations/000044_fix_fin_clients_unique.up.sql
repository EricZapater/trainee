-- 000044_fix_fin_clients_unique.up.sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fin_clients_usuari_id_unique'
    ) THEN
        ALTER TABLE fin_clients ADD CONSTRAINT fin_clients_usuari_id_unique UNIQUE (usuari_id);
    END IF;
END $$;

-- Seed inicial d'articles si la taula fin_articles està buida
INSERT INTO fin_articles (codi, nom, descripcio, categoria, unitat_negoci_id, preu_base, iva_percentatge, irpf_percentatge, actiu)
SELECT 
    v.codi, v.nom, v.descripcio, v.categoria, un.id, v.preu_base, 21.00, 0.00, true
FROM (VALUES
    ('ENT-MENSUAL', 'Entrenament Mensual', 'Quota mensual de seguiment i planificació', 'entrenament_recurrent', 'ENT', 60.00),
    ('ENT-TRIM', 'Entrenament Trimestral', 'Quota trimestral d''entrenament', 'entrenament_recurrent', 'ENT', 165.00),
    ('CAMP-STANDARD', 'Inscripció Training Camp', 'Estada d''entrenament en grup', 'training_camp', 'CAMP', 350.00),
    ('ASSESSORAMENT', 'Assessorament / Sessió Puntual', 'Pla nutricional o assessorament puntual', 'puntual', 'ALT', 45.00)
) AS v(codi, nom, descripcio, categoria, un_codi, preu_base)
JOIN fin_unitats_negoci un ON un.codi = v.un_codi
WHERE NOT EXISTS (SELECT 1 FROM fin_articles);

