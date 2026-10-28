ALTER TABLE weekly_submissions
DROP COLUMN IF EXISTS wellness_fatiga,
DROP COLUMN IF EXISTS wellness_son_qualitat,
DROP COLUMN IF EXISTS wellness_dolor_muscular,
DROP COLUMN IF EXISTS wellness_estres,
DROP COLUMN IF EXISTS wellness_humor,
DROP COLUMN IF EXISTS wellness_rpe_setmanal,
DROP COLUMN IF EXISTS wellness_zones_dolor,
DROP COLUMN IF EXISTS wellness_notes,
DROP COLUMN IF EXISTS wellness_submitted_at,
DROP COLUMN IF EXISTS wellness_score;
