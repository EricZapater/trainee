CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accio VARCHAR(100) NOT NULL,
    nivell VARCHAR(20) NOT NULL DEFAULT 'INFO',
    missatge TEXT NOT NULL,
    detalls JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
