ALTER TABLE weekly_submissions
ADD COLUMN IF NOT EXISTS wellness_fatiga INT CHECK (wellness_fatiga BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS wellness_son_qualitat INT CHECK (wellness_son_qualitat BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS wellness_dolor_muscular INT CHECK (wellness_dolor_muscular BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS wellness_estres INT CHECK (wellness_estres BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS wellness_humor INT CHECK (wellness_humor BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS wellness_rpe_setmanal INT CHECK (wellness_rpe_setmanal BETWEEN 1 AND 10),
ADD COLUMN IF NOT EXISTS wellness_zones_dolor JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS wellness_notes TEXT,
ADD COLUMN IF NOT EXISTS wellness_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS wellness_score INT;
