CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrenador_id UUID NOT NULL REFERENCES entrenadors(id) ON DELETE CASCADE,
    titol VARCHAR(255) NOT NULL,
    descripcio TEXT,
    actiu BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE form_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    pregunta TEXT NOT NULL,
    tipus VARCHAR(50) NOT NULL,
    opcions TEXT,
    obligatori BOOLEAN DEFAULT true,
    ordre INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    nom_candidat VARCHAR(255) NOT NULL,
    email_candidat VARCHAR(255) NOT NULL,
    telefon_candidat VARCHAR(50),
    estat VARCHAR(50) DEFAULT 'pendent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE form_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES form_responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES form_questions(id) ON DELETE CASCADE,
    valor TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
