-- ============================================================
-- SEED: Entrenadors
-- Perfils d'entrenador sense compte d'usuari vinculat.
-- Quan un usuari es registri com a entrenador, seleccionarà
-- un d'aquests perfils i s'hi vincularà (UPDATE usuari_id).
-- ============================================================
INSERT INTO entrenadors (nom) VALUES
    ('Jordi'),
    ('Edu');

-- ============================================================
-- SEED: Activitats
-- Catàleg inicial d'activitats esportives amb icones Tabler.
-- ============================================================
INSERT INTO activitats (nom, icona, color, ordre, activa) VALUES
    ('Correr en llano', 'ti-run',            '#1D9E75',  1, true),
    ('Trail running',   'ti-mountain',       '#3B6D11',  2, true),
    ('BTT',             'ti-bike',           '#BA7517',  3, true),
    ('Bici carretera',  'ti-bike',           '#854F0B',  4, true),
    ('Gravel',          'ti-bike',           '#EF9F27',  5, true),
    ('Fuerza',          'ti-barbell',        '#534AB7',  6, true),
    ('Elíptica',        'ti-activity',       '#378ADD',  7, true),
    ('Rodillo',         'ti-steering-wheel', '#888780',  8, true),
    ('Spinning',        'ti-bike',           '#D85A30',  9, true),
    ('Natación',        'ti-ripple',         '#185FA5', 10, true),
    ('Competición',     'ti-trophy',         '#993C1D', 11, true);
