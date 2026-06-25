ALTER TABLE anuncis
  ADD COLUMN enllac VARCHAR(1024),
  ADD COLUMN imatges TEXT[] DEFAULT '{}',
  ADD COLUMN estat VARCHAR(50) DEFAULT 'pendent';

-- Migrate existing imatge to imatges array
UPDATE anuncis SET imatges = ARRAY[imatge] WHERE imatge IS NOT NULL AND imatge != '';

-- Migrate existing actiu announcements to aprovat (assuming existing ones were all active)
UPDATE anuncis SET estat = 'aprovat' WHERE actiu = true;
UPDATE anuncis SET estat = 'rebutjat' WHERE actiu = false;

ALTER TABLE anuncis DROP COLUMN imatge;
