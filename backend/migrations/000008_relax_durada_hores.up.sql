ALTER TABLE slot_entries DROP CONSTRAINT IF EXISTS slot_entries_durada_hores_check;
ALTER TABLE slot_entries ADD CONSTRAINT slot_entries_durada_hores_check CHECK (durada_hores >= 0);
