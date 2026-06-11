ALTER TABLE competicions ADD COLUMN estat VARCHAR(20) DEFAULT 'activa' CHECK (estat IN ('activa', 'descartada'));
UPDATE competicions SET estat = 'activa' WHERE estat IS NULL;
ALTER TABLE competicions ALTER COLUMN estat SET NOT NULL;
