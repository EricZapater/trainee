-- 1. Modificar l'enllaç per a que sigui NOT NULL (només per registres nous o actualitzem els existents amb un text buit)
UPDATE competicions SET enllac = '' WHERE enllac IS NULL;
ALTER TABLE competicions ALTER COLUMN enllac SET NOT NULL;

-- 2. Afegir columna per desar la ruta del fitxer GPX
ALTER TABLE competicions ADD COLUMN track_gpx_path TEXT;
