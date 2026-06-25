CREATE TABLE anuncis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    autor_id UUID NOT NULL REFERENCES usuaris(id) ON DELETE CASCADE,
    titol VARCHAR(255) NOT NULL,
    descripcio TEXT NOT NULL,
    imatge VARCHAR(1024),
    tags TEXT[],
    actiu BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
