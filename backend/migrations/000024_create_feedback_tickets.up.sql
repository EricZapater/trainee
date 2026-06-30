CREATE TABLE feedback_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    informador_id UUID NOT NULL REFERENCES usuaris(id) ON DELETE CASCADE,
    tipus VARCHAR(50) NOT NULL DEFAULT 'petició',
    resum VARCHAR(255) NOT NULL,
    descripcio TEXT NOT NULL,
    imatge_path VARCHAR(255),
    estat VARCHAR(50) NOT NULL DEFAULT 'pendent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_tickets_informador ON feedback_tickets(informador_id);
CREATE INDEX idx_feedback_tickets_estat ON feedback_tickets(estat);
CREATE INDEX idx_feedback_tickets_tipus ON feedback_tickets(tipus);
