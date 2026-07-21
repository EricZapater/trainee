ALTER TABLE form_answers DROP COLUMN IF EXISTS comentari;
ALTER TABLE form_answers DROP COLUMN IF EXISTS is_interesting;

ALTER TABLE form_responses DROP COLUMN IF EXISTS comentari;
ALTER TABLE form_responses DROP COLUMN IF EXISTS is_interesting;
