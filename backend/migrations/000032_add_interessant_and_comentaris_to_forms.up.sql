ALTER TABLE form_responses ADD COLUMN is_interesting BOOLEAN DEFAULT false;
ALTER TABLE form_responses ADD COLUMN comentari TEXT;

ALTER TABLE form_answers ADD COLUMN is_interesting BOOLEAN DEFAULT false;
ALTER TABLE form_answers ADD COLUMN comentari TEXT;
