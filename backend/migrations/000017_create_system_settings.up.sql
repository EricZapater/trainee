CREATE TABLE system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (key, value) VALUES
('cron_week_generator', '{"time": "00:00", "days": [1], "enabled": true}'),
('cron_reminder_generator', '{"time": "06:00", "days": [3, 4, 5], "enabled": true}');
