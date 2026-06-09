CREATE TABLE tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrenador_id UUID NOT NULL REFERENCES entrenadors(id) ON DELETE CASCADE,
    atleta_id UUID NOT NULL REFERENCES atletes(id) ON DELETE CASCADE,
    titol TEXT NOT NULL,
    data_test DATE NOT NULL,
    comentaris TEXT,
    data_recordatori DATE,
    estat_recordatori VARCHAR(20) DEFAULT 'cap',
    registrat BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tests ADD CONSTRAINT tests_estat_recordatori_check CHECK (estat_recordatori IN ('cap', 'pendent', 'resolt', 'cancelat'));

ALTER TABLE slot_entries ADD COLUMN test_id UUID REFERENCES tests(id) ON DELETE SET NULL;
