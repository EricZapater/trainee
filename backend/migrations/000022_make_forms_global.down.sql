-- We cannot easily restore the exact entrenador_id for existing forms in a down migration
-- We'll add it as nullable, or just add it and assume some default if needed.
-- Since the down migration is rarely run in production in this way, we'll just add it back as nullable.
ALTER TABLE forms ADD COLUMN entrenador_id UUID REFERENCES entrenadors(id) ON DELETE CASCADE;
