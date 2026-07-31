ALTER TABLE form_responses 
ADD COLUMN atleta_id UUID REFERENCES atletes(id) ON DELETE SET NULL,
ADD COLUMN entrenador_id UUID REFERENCES entrenadors(id) ON DELETE SET NULL;

CREATE INDEX idx_form_responses_atleta ON form_responses(atleta_id);
CREATE INDEX idx_form_responses_entrenador ON form_responses(entrenador_id);
