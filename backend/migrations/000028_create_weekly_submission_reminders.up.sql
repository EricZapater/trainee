CREATE TABLE weekly_submission_reminders (
    atleta_id UUID NOT NULL REFERENCES atletes(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    reminders_auto INTEGER NOT NULL DEFAULT 0,
    reminders_manual INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (atleta_id, week_start)
);
