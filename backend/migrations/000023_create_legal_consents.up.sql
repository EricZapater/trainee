CREATE TABLE IF NOT EXISTS legal_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES usuaris(id) ON DELETE CASCADE,
    policy_version VARCHAR(50) NOT NULL,
    ip_address VARCHAR(50) NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_user_policy_version ON legal_consents (user_id, policy_version);
