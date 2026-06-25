ALTER TABLE anuncis
  ADD COLUMN imatge VARCHAR(1024);

-- Migrate first imatge back to single imatge
UPDATE anuncis SET imatge = imatges[1] WHERE array_length(imatges, 1) > 0;

ALTER TABLE anuncis
  DROP COLUMN enllac,
  DROP COLUMN imatges,
  DROP COLUMN estat;
