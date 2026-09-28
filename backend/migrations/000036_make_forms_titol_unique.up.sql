WITH dupes AS (
  SELECT id, titol,
         ROW_NUMBER() OVER (PARTITION BY titol ORDER BY created_at ASC) as rn
  FROM forms
)
UPDATE forms
SET titol = forms.titol || ' (' || dupes.rn || ')'
FROM dupes
WHERE forms.id = dupes.id AND dupes.rn > 1;

ALTER TABLE forms ADD CONSTRAINT forms_titol_unique UNIQUE (titol);
