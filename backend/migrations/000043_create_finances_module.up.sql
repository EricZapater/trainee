-- ============================================================
-- 000043: Mòdul d'Administració, Facturació, Despeses i Caixa
-- Preparat per a Fase 2 Veri*factu
-- ============================================================

-- 1. Rol d'Administració per a entrenadors autoritzats per l'admin
ALTER TABLE usuaris
ADD COLUMN IF NOT EXISTS es_administracio BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Configuració Fiscal de l'Emissor (1 sol CIF/NIF) + Valors Globals per defecte
CREATE TABLE IF NOT EXISTS fin_configuracio_empresa (
    id                    INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    rao_social            TEXT NOT NULL DEFAULT 'TrainEE Sports SL',
    nom_comercial         TEXT NOT NULL DEFAULT 'TrainEE',
    nif_cif               TEXT NOT NULL DEFAULT '',
    adreca                TEXT NOT NULL DEFAULT '',
    cp                    TEXT NOT NULL DEFAULT '',
    poblacio              TEXT NOT NULL DEFAULT '',
    provincia             TEXT NOT NULL DEFAULT '',
    pais                  TEXT NOT NULL DEFAULT 'ES',
    email_administracio   TEXT NOT NULL DEFAULT '',
    telefon               TEXT NOT NULL DEFAULT '',
    iban_principal        TEXT NOT NULL DEFAULT '',
    logo_url              TEXT NOT NULL DEFAULT '',
    peu_legal             TEXT NOT NULL DEFAULT '',
    iva_defecte           NUMERIC(5,2) NOT NULL DEFAULT 21.00,
    irpf_defecte_vendes   NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    irpf_defecte_compres  NUMERIC(5,2) NOT NULL DEFAULT 15.00,
    saldo_inicial         NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    data_tall_saldo       DATE NOT NULL DEFAULT CURRENT_DATE,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO fin_configuracio_empresa (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 3. Catàleg Global Configurable d'IVA i Retencions (IRPF)
CREATE TABLE IF NOT EXISTS fin_impostos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom             TEXT NOT NULL,
    tipus           TEXT NOT NULL CHECK (tipus IN ('iva', 'irpf')),
    percentatge     NUMERIC(5,2) NOT NULL,
    causa_exempcio  TEXT NOT NULL DEFAULT '',
    per_defecte     BOOLEAN NOT NULL DEFAULT FALSE,
    actiu           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO fin_impostos (nom, tipus, percentatge, causa_exempcio, per_defecte)
SELECT * FROM (VALUES
    ('IVA General (21%)', 'iva', 21.00::NUMERIC(5,2), '', TRUE),
    ('IVA Reduït (10%)', 'iva', 10.00::NUMERIC(5,2), '', FALSE),
    ('IVA Superreduït (4%)', 'iva', 4.00::NUMERIC(5,2), '', FALSE),
    ('Exempt d''IVA (0%)', 'iva', 0.00::NUMERIC(5,2), 'E1', FALSE),
    ('Sense retenció IRPF (0%)', 'irpf', 0.00::NUMERIC(5,2), '', TRUE),
    ('IRPF Nou Autònom (7%)', 'irpf', 7.00::NUMERIC(5,2), '', FALSE),
    ('IRPF Professional (15%)', 'irpf', 15.00::NUMERIC(5,2), '', FALSE),
    ('IRPF Lloguers / Capital (19%)', 'irpf', 19.00::NUMERIC(5,2), '', FALSE)
) AS v(nom, tipus, percentatge, causa_exempcio, per_defecte)
WHERE NOT EXISTS (SELECT 1 FROM fin_impostos);

-- 4. Sèries de Facturació Configurables (Ordinàries i Rectificatives)
CREATE TABLE IF NOT EXISTS fin_series (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codi          TEXT NOT NULL UNIQUE,
    descripcio    TEXT NOT NULL DEFAULT '',
    tipus         TEXT NOT NULL CHECK (tipus IN ('ordinaria', 'rectificativa')),
    any_fiscal    INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT,
    prefix        TEXT NOT NULL,
    ultim_numero  INT NOT NULL DEFAULT 0,
    activa        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO fin_series (codi, descripcio, tipus, any_fiscal, prefix, ultim_numero)
VALUES
    ('F2026', 'Sèrie Ordinària General 2026', 'ordinaria', 2026, 'F2026-', 0),
    ('R2026', 'Sèrie Rectificativa / Abonaments 2026', 'rectificativa', 2026, 'R2026-', 0)
ON CONFLICT (codi) DO NOTHING;

-- 5. Unitats de Negoci Analítiques (les 3 inicials + ampliables)
CREATE TABLE IF NOT EXISTS fin_unitats_negoci (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codi             TEXT NOT NULL UNIQUE,
    nom              TEXT NOT NULL,
    descripcio       TEXT NOT NULL DEFAULT '',
    serie_defecte_id UUID REFERENCES fin_series(id) ON DELETE SET NULL,
    activa           BOOLEAN NOT NULL DEFAULT TRUE,
    ordre            INT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO fin_unitats_negoci (codi, nom, descripcio, serie_defecte_id, ordre)
SELECT v.codi, v.nom, v.descripcio, (SELECT id FROM fin_series WHERE codi = 'F2026' LIMIT 1), v.ordre
FROM (VALUES
    ('ENT', 'Entrenaments', 'Planificació i seguiment esportiu recurrent', 1),
    ('CAMP', 'Training Camps', 'Estades, stages i campus esportius', 2),
    ('ALT', 'Altres / Material / Esdeveniments', 'Equipacions, nutrició, clínics i patrocinis', 3)
) AS v(codi, nom, descripcio, ordre)
ON CONFLICT (codi) DO NOTHING;

-- 6. Clients (Vinculables a Usuaris/Atletes o Externs)
CREATE TABLE IF NOT EXISTS fin_clients (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuari_id        UUID REFERENCES usuaris(id) ON DELETE SET NULL,
    nom_fiscal       TEXT NOT NULL,
    tipus_id_fiscal  TEXT NOT NULL DEFAULT 'NIF' CHECK (tipus_id_fiscal IN ('NIF', 'NIE', 'CIF', 'Passaport', 'Altre')),
    nif_cif          TEXT NOT NULL DEFAULT '',
    adreca           TEXT NOT NULL DEFAULT '',
    cp               TEXT NOT NULL DEFAULT '',
    poblacio         TEXT NOT NULL DEFAULT '',
    provincia        TEXT NOT NULL DEFAULT '',
    pais             TEXT NOT NULL DEFAULT 'ES',
    email            TEXT NOT NULL DEFAULT '',
    telefon          TEXT NOT NULL DEFAULT '',
    notes            TEXT NOT NULL DEFAULT '',
    actiu            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fin_clients_usuari_unique
ON fin_clients(usuari_id) WHERE usuari_id IS NOT NULL;

-- 7. Proveïdors
CREATE TABLE IF NOT EXISTS fin_proveidors (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom_fiscal                TEXT NOT NULL,
    nif_cif                   TEXT NOT NULL DEFAULT '',
    adreca                    TEXT NOT NULL DEFAULT '',
    cp                        TEXT NOT NULL DEFAULT '',
    poblacio                  TEXT NOT NULL DEFAULT '',
    provincia                 TEXT NOT NULL DEFAULT '',
    pais                      TEXT NOT NULL DEFAULT 'ES',
    iban                      TEXT NOT NULL DEFAULT '',
    email                     TEXT NOT NULL DEFAULT '',
    telefon                   TEXT NOT NULL DEFAULT '',
    iva_defecte               NUMERIC(5,2) NOT NULL DEFAULT 21.00,
    irpf_defecte              NUMERIC(5,2) NOT NULL DEFAULT 15.00,
    unitat_negoci_defecte_id  UUID REFERENCES fin_unitats_negoci(id) ON DELETE SET NULL,
    entrenador_defecte_id     UUID REFERENCES entrenadors(id) ON DELETE SET NULL,
    notes                     TEXT NOT NULL DEFAULT '',
    actiu                     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Catàleg d'Articles / Serveis (amb IVA i Retenció IRPF propis)
CREATE TABLE IF NOT EXISTS fin_articles (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codi              TEXT NOT NULL DEFAULT '',
    nom               TEXT NOT NULL,
    descripcio        TEXT NOT NULL DEFAULT '',
    categoria         TEXT NOT NULL CHECK (categoria IN ('entrenament_recurrent', 'training_camp', 'puntual')),
    unitat_negoci_id  UUID NOT NULL REFERENCES fin_unitats_negoci(id),
    preu_base         NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    iva_percentatge   NUMERIC(5,2) NOT NULL DEFAULT 21.00,
    irpf_percentatge  NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    causa_exempcio    TEXT NOT NULL DEFAULT '',
    actiu             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Subscripcions d'Entrenament Recurrent (Mensual=1, Trimestral=3, Semestral=6, Anual=12)
CREATE TABLE IF NOT EXISTS fin_subscripcions (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id                 UUID NOT NULL REFERENCES fin_clients(id),
    article_id                UUID NOT NULL REFERENCES fin_articles(id),
    unitat_negoci_id          UUID NOT NULL REFERENCES fin_unitats_negoci(id),
    entrenador_id             UUID REFERENCES entrenadors(id) ON DELETE SET NULL,
    periodicitat_mesos        INT NOT NULL CHECK (periodicitat_mesos IN (1, 3, 6, 12)),
    concepte_personalitzat    TEXT NOT NULL DEFAULT '',
    base_imposable            NUMERIC(12,2) NOT NULL,
    iva_percentatge           NUMERIC(5,2) NOT NULL DEFAULT 21.00,
    irpf_percentatge          NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    dies_venciment            INT NOT NULL DEFAULT 5,
    data_inici                DATE NOT NULL DEFAULT CURRENT_DATE,
    propera_data_facturacio   DATE NOT NULL,
    data_fi                   DATE,
    activa                    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Plans de Training Camps (1 Article dividit en N pagaments independents)
CREATE TABLE IF NOT EXISTS fin_plans_camp (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID NOT NULL REFERENCES fin_clients(id),
    article_id          UUID REFERENCES fin_articles(id) ON DELETE SET NULL,
    unitat_negoci_id    UUID NOT NULL REFERENCES fin_unitats_negoci(id),
    entrenador_id       UUID REFERENCES entrenadors(id) ON DELETE SET NULL,
    titol_camp          TEXT NOT NULL,
    periode_camp_inici  DATE NOT NULL,
    periode_camp_fi     DATE NOT NULL,
    total_base_pactada  NUMERIC(12,2) NOT NULL,
    iva_percentatge     NUMERIC(5,2) NOT NULL DEFAULT 21.00,
    irpf_percentatge    NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    estat               TEXT NOT NULL DEFAULT 'actiu' CHECK (estat IN ('actiu', 'completat', 'cancelat')),
    notes               TEXT NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fin_plans_camp_fites (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pla_camp_id       UUID NOT NULL REFERENCES fin_plans_camp(id) ON DELETE CASCADE,
    ordre             INT NOT NULL,
    concepte_fita     TEXT NOT NULL,
    data_prevista     DATE NOT NULL,
    base_imposable    NUMERIC(12,2) NOT NULL,
    iva_percentatge   NUMERIC(5,2) NOT NULL DEFAULT 21.00,
    irpf_percentatge  NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    factura_id        UUID,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Factures de Venda i Abonaments (Immutables un cop emeses - Veri*factu ready)
CREATE TABLE IF NOT EXISTS fin_factures_venda (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serie_id                UUID REFERENCES fin_series(id),
    numero_seq              INT,
    numero_complet          TEXT UNIQUE,
    tipus_factura           TEXT NOT NULL DEFAULT 'F1' CHECK (tipus_factura IN ('F1', 'R1')),
    estat_document          TEXT NOT NULL DEFAULT 'esborrany' CHECK (estat_document IN ('esborrany', 'emesa')),

    client_id               UUID NOT NULL REFERENCES fin_clients(id),
    subscripcio_id          UUID REFERENCES fin_subscripcions(id) ON DELETE SET NULL,
    fita_camp_id            UUID REFERENCES fin_plans_camp_fites(id) ON DELETE SET NULL,
    factura_origen_id       UUID REFERENCES fin_factures_venda(id),
    motiu_rectificacio      TEXT NOT NULL DEFAULT '',

    emissor_snapshot        JSONB,
    client_snapshot         JSONB,

    unitat_negoci_id        UUID NOT NULL REFERENCES fin_unitats_negoci(id),
    entrenador_id           UUID REFERENCES entrenadors(id) ON DELETE SET NULL,
    article_id              UUID REFERENCES fin_articles(id) ON DELETE SET NULL,
    concepte                TEXT NOT NULL,
    descripcio_detall       TEXT NOT NULL DEFAULT '',

    base_imposable          NUMERIC(12,2) NOT NULL,
    iva_percentatge         NUMERIC(5,2) NOT NULL DEFAULT 21.00,
    causa_exempcio          TEXT NOT NULL DEFAULT '',
    iva_import              NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    irpf_percentatge        NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    irpf_import             NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_factura           NUMERIC(12,2) NOT NULL DEFAULT 0.00,

    data_emissio            DATE NOT NULL,
    data_venciment          DATE NOT NULL,
    periode_inici           DATE NOT NULL,
    periode_fi              DATE NOT NULL,

    estat_cobrament         TEXT NOT NULL DEFAULT 'pendent' CHECK (estat_cobrament IN ('pendent', 'pagada', 'impagada', 'compensada')),
    data_conciliacio        DATE,
    data_impagament         DATE,
    motiu_impagament        TEXT NOT NULL DEFAULT '',
    notes_tresoreria        TEXT NOT NULL DEFAULT '',

    emesa_at                TIMESTAMPTZ,
    verifactu_estat         TEXT NOT NULL DEFAULT 'no_aplicable',
    verifactu_hash          TEXT NOT NULL DEFAULT '',
    verifactu_qr_data       TEXT NOT NULL DEFAULT '',
    verifactu_provider_id   TEXT NOT NULL DEFAULT '',

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE fin_plans_camp_fites
DROP CONSTRAINT IF EXISTS fk_fita_factura_venda;

ALTER TABLE fin_plans_camp_fites
ADD CONSTRAINT fk_fita_factura_venda
FOREIGN KEY (factura_id) REFERENCES fin_factures_venda(id) ON DELETE SET NULL;

-- 12. Factures de Compra (Proveïdors amb IVA suportat i retenció IRPF)
CREATE TABLE IF NOT EXISTS fin_compres (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proveidor_id           UUID NOT NULL REFERENCES fin_proveidors(id),
    num_factura_proveidor  TEXT NOT NULL,
    unitat_negoci_id       UUID NOT NULL REFERENCES fin_unitats_negoci(id),
    entrenador_id          UUID REFERENCES entrenadors(id) ON DELETE SET NULL,
    concepte               TEXT NOT NULL,
    base_imposable         NUMERIC(12,2) NOT NULL,
    iva_percentatge        NUMERIC(5,2) NOT NULL DEFAULT 21.00,
    iva_import             NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    irpf_percentatge       NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    irpf_import            NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_pagar            NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    data_emissio           DATE NOT NULL,
    data_venciment         DATE NOT NULL,
    periode_inici          DATE NOT NULL,
    periode_fi             DATE NOT NULL,
    estat_pagament         TEXT NOT NULL DEFAULT 'pendent' CHECK (estat_pagament IN ('pendent', 'pagada', 'impagada')),
    data_conciliacio       DATE,
    fitxer_adjunt_path     TEXT NOT NULL DEFAULT '',
    notes                  TEXT NOT NULL DEFAULT '',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Entitat Despesa (Nòmines, Seguretat Social, Banc, Impostos, Dietes sense factura d'IVA)
CREATE TABLE IF NOT EXISTS fin_despeses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria           TEXT NOT NULL CHECK (categoria IN ('nomina', 'seguretat_social', 'banc', 'impostos', 'dietes', 'altres')),
    beneficiari_nom     TEXT NOT NULL,
    concepte            TEXT NOT NULL,
    unitat_negoci_id    UUID NOT NULL REFERENCES fin_unitats_negoci(id),
    entrenador_id       UUID REFERENCES entrenadors(id) ON DELETE SET NULL,
    import_total        NUMERIC(12,2) NOT NULL,
    data_devengo        DATE NOT NULL,
    data_venciment      DATE NOT NULL,
    periode_inici       DATE NOT NULL,
    periode_fi          DATE NOT NULL,
    estat_pagament      TEXT NOT NULL DEFAULT 'pendent' CHECK (estat_pagament IN ('pendent', 'pagada')),
    data_conciliacio    DATE,
    fitxer_adjunt_path  TEXT NOT NULL DEFAULT '',
    notes               TEXT NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Plantilles de Compra/Despesa Recurrent (per alimentar Caixa i generació ràpida)
CREATE TABLE IF NOT EXISTS fin_recurrents_sortida (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipus_desti         TEXT NOT NULL CHECK (tipus_desti IN ('compra', 'despesa')),
    proveidor_id        UUID REFERENCES fin_proveidors(id) ON DELETE SET NULL,
    categoria_despesa   TEXT NOT NULL DEFAULT 'altres',
    beneficiari_nom     TEXT NOT NULL DEFAULT '',
    concepte            TEXT NOT NULL,
    unitat_negoci_id    UUID NOT NULL REFERENCES fin_unitats_negoci(id),
    entrenador_id       UUID REFERENCES entrenadors(id) ON DELETE SET NULL,
    periodicitat_mesos  INT NOT NULL CHECK (periodicitat_mesos IN (1, 3, 6, 12)),
    base_o_import       NUMERIC(12,2) NOT NULL,
    iva_percentatge     NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    irpf_percentatge    NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    dies_venciment      INT NOT NULL DEFAULT 0,
    propera_data        DATE NOT NULL,
    data_fi             DATE,
    actiu               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índexos analítics i de tresoreria
CREATE INDEX IF NOT EXISTS idx_fin_factures_venda_emissio ON fin_factures_venda(data_emissio);
CREATE INDEX IF NOT EXISTS idx_fin_factures_venda_venciment ON fin_factures_venda(data_venciment);
CREATE INDEX IF NOT EXISTS idx_fin_factures_venda_periode ON fin_factures_venda(periode_inici, periode_fi);
CREATE INDEX IF NOT EXISTS idx_fin_factures_venda_analitica ON fin_factures_venda(unitat_negoci_id, entrenador_id);
CREATE INDEX IF NOT EXISTS idx_fin_factures_venda_client ON fin_factures_venda(client_id);

CREATE INDEX IF NOT EXISTS idx_fin_compres_emissio ON fin_compres(data_emissio);
CREATE INDEX IF NOT EXISTS idx_fin_compres_venciment ON fin_compres(data_venciment);
CREATE INDEX IF NOT EXISTS idx_fin_compres_periode ON fin_compres(periode_inici, periode_fi);
CREATE INDEX IF NOT EXISTS idx_fin_compres_analitica ON fin_compres(unitat_negoci_id, entrenador_id);

CREATE INDEX IF NOT EXISTS idx_fin_despeses_devengo ON fin_despeses(data_devengo);
CREATE INDEX IF NOT EXISTS idx_fin_despeses_venciment ON fin_despeses(data_venciment);
CREATE INDEX IF NOT EXISTS idx_fin_despeses_periode ON fin_despeses(periode_inici, periode_fi);
CREATE INDEX IF NOT EXISTS idx_fin_despeses_analitica ON fin_despeses(unitat_negoci_id, entrenador_id);
