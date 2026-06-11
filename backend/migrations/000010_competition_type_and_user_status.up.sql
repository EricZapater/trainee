ALTER TABLE competicions ADD COLUMN tipus VARCHAR(1) NOT NULL DEFAULT 'A' CHECK (tipus IN ('A', 'B', 'C'));

ALTER TABLE usuaris ADD COLUMN actiu BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE user_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuari_id UUID NOT NULL REFERENCES usuaris(id) ON DELETE CASCADE,
    accio TEXT NOT NULL CHECK (accio IN ('activate', 'deactivate')),
    changed_by UUID REFERENCES usuaris(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_status_history_usuari ON user_status_history(usuari_id);
