ALTER TABLE feedback_tickets ADD COLUMN imatges TEXT[] DEFAULT '{}';
ALTER TABLE feedback_tickets ADD COLUMN resposta_imatges TEXT[] DEFAULT '{}';

-- Migrate existing single image paths into the new array column
UPDATE feedback_tickets SET imatges = ARRAY[imatge_path] WHERE imatge_path IS NOT NULL AND imatge_path <> '';
