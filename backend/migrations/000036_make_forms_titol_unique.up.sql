DO $$
DECLARE
    rec RECORD;
    counter INT;
BEGIN
    FOR rec IN SELECT titol FROM forms GROUP BY titol HAVING COUNT(*) > 1 LOOP
        counter := 1;
        FOR rec IN SELECT id, titol FROM forms WHERE titol = rec.titol ORDER BY created_at ASC OFFSET 1 LOOP
            counter := counter + 1;
            UPDATE forms SET titol = titol || ' (' || counter || ')' WHERE id = rec.id;
        END LOOP;
    END FOR;
END $$;

ALTER TABLE forms ADD CONSTRAINT forms_titol_unique UNIQUE (titol);
