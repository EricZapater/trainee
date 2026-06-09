CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- TAULA: usuaris
-- Base d'autenticació. El camp 'rol' indica si l'usuari és
-- atleta o entrenador per accés ràpid (JWT, middleware).
-- ============================================================
CREATE TABLE usuaris (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom           TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol           TEXT NOT NULL CHECK (rol IN ('atleta', 'entrenador')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TAULA: entrenadors
-- Perfils d'entrenador. Es poden crear via seed (sense usuari)
-- i després vincular-se quan un usuari es registra com entrenador.
-- usuari_id és nullable per permetre seeds sense compte d'usuari.
-- ============================================================
CREATE TABLE entrenadors (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuari_id  UUID UNIQUE REFERENCES usuaris(id),
    nom        TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TAULA: atletes
-- Cada atleta pertany a un entrenador.
-- Es crea automàticament al registrar-se un usuari amb rol 'atleta'.
-- ============================================================
CREATE TABLE atletes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuari_id     UUID UNIQUE NOT NULL REFERENCES usuaris(id),
    entrenador_id UUID NOT NULL REFERENCES entrenadors(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TAULA: activitats
-- Catàleg d'activitats esportives, gestionades per l'entrenador.
-- 'activa = false' actua com a soft-delete.
-- ============================================================
CREATE TABLE activitats (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom        TEXT NOT NULL,
    icona      TEXT NOT NULL,
    color      TEXT NOT NULL,
    ordre      INTEGER NOT NULL,
    activa     BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TAULA: managed_weeks
-- Setmanes que l'entrenador obre perquè els atletes responguin.
-- week_start sempre és un dilluns.
-- ============================================================
CREATE TABLE managed_weeks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrenador_id UUID NOT NULL REFERENCES entrenadors(id),
    week_start    DATE NOT NULL,
    estat         TEXT NOT NULL CHECK (estat IN ('oberta', 'tancada')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (entrenador_id, week_start)
);

-- ============================================================
-- TAULA: weekly_submissions
-- Resposta d'un atleta per a una setmana concreta.
-- Una sola submission per atleta i setmana (UNIQUE constraint).
-- ============================================================
CREATE TABLE weekly_submissions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atleta_id     UUID NOT NULL REFERENCES atletes(id),
    week_start    DATE NOT NULL,
    notes_setmana TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (atleta_id, week_start)
);

-- ============================================================
-- TAULA: slot_entries
-- Cada slot representa una activitat en un moment concret d'un dia.
-- Màxim 1 activitat per combinació (submission, dia, moment).
-- ============================================================
CREATE TABLE slot_entries (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES weekly_submissions(id) ON DELETE CASCADE,
    dia           INTEGER NOT NULL CHECK (dia BETWEEN 0 AND 6),
    moment        TEXT NOT NULL CHECK (moment IN ('mati', 'migdia', 'tarda', 'nit')),
    activitat_id  UUID NOT NULL REFERENCES activitats(id),
    durada_hores  NUMERIC(3,1) NOT NULL CHECK (durada_hores IN (0.5, 1.0, 1.5, 2.0, 2.5, 3.0)),
    notes         TEXT,
    UNIQUE (submission_id, dia, moment)
);

-- Índexos per a consultes freqüents
CREATE INDEX idx_atletes_entrenador ON atletes(entrenador_id);
CREATE INDEX idx_managed_weeks_entrenador ON managed_weeks(entrenador_id);
CREATE INDEX idx_weekly_submissions_atleta ON weekly_submissions(atleta_id);
CREATE INDEX idx_weekly_submissions_week ON weekly_submissions(week_start);
CREATE INDEX idx_slot_entries_submission ON slot_entries(submission_id);
CREATE INDEX idx_activitats_ordre ON activitats(ordre) WHERE activa = true;
