-- 000047_finances_phase2.up.sql
-- 1. Articles: Tipus (venda, compra, ambdos) i Preu Final (PVP IVA inclòs) com a referència principal
ALTER TABLE fin_articles
    ADD COLUMN IF NOT EXISTS tipus TEXT NOT NULL DEFAULT 'venda',
    ADD COLUMN IF NOT EXISTS preu_final NUMERIC(12,2) NOT NULL DEFAULT 0.00;

ALTER TABLE fin_articles DROP CONSTRAINT IF EXISTS fin_articles_tipus_check;
ALTER TABLE fin_articles ADD CONSTRAINT fin_articles_tipus_check CHECK (tipus IN ('venda', 'compra', 'ambdos'));

UPDATE fin_articles
SET preu_final = ROUND((preu_base * (1.0 + iva_percentatge / 100.0))::numeric, 2)
WHERE preu_final = 0 AND preu_base <> 0;

-- 2. Compres: vincle opcional amb catàleg d'articles
ALTER TABLE fin_compres
    ADD COLUMN IF NOT EXISTS article_id UUID REFERENCES fin_articles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fin_compres_article ON fin_compres(article_id);

-- Assegurar article vinculat a factures de venda històriques si hi ha articles creats
UPDATE fin_factures_venda fv
SET article_id = (
    SELECT a.id FROM fin_articles a
    WHERE a.tipus IN ('venda', 'ambdos')
    ORDER BY a.actiu DESC, a.created_at ASC
    LIMIT 1
)
WHERE fv.article_id IS NULL
  AND EXISTS (SELECT 1 FROM fin_articles);

-- 3. Cobraments parcials i saldos a Factures de Venda
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'fin_factures_venda'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%estat_cobrament%'
    ) LOOP
        EXECUTE 'ALTER TABLE fin_factures_venda DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE fin_factures_venda
    ADD CONSTRAINT fin_factures_venda_estat_cobrament_check
    CHECK (estat_cobrament IN ('pendent', 'parcial', 'pagada', 'impagada', 'compensada'));

ALTER TABLE fin_factures_venda
    ADD COLUMN IF NOT EXISTS import_cobrat NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS import_pendent NUMERIC(12,2) NOT NULL DEFAULT 0.00;

CREATE TABLE IF NOT EXISTS fin_factures_cobraments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factura_id       UUID NOT NULL REFERENCES fin_factures_venda(id) ON DELETE CASCADE,
    data_cobrament   DATE NOT NULL DEFAULT CURRENT_DATE,
    import           NUMERIC(12,2) NOT NULL CHECK (import > 0),
    metode_pagament  TEXT NOT NULL DEFAULT 'transferencia',
    notes            TEXT NOT NULL DEFAULT '',
    created_by       UUID REFERENCES usuaris(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_factures_cobraments_factura ON fin_factures_cobraments(factura_id);

-- Backfill de cobraments per a factures ja pagades anteriorment
INSERT INTO fin_factures_cobraments (factura_id, data_cobrament, import, metode_pagament, notes)
SELECT fv.id, COALESCE(fv.data_conciliacio, fv.data_emissio), fv.total_factura, 'conciliacio', 'Cobrament conciliat migrat'
FROM fin_factures_venda fv
WHERE fv.estat_cobrament = 'pagada'
  AND fv.total_factura > 0
  AND NOT EXISTS (SELECT 1 FROM fin_factures_cobraments c WHERE c.factura_id = fv.id);

UPDATE fin_factures_venda fv
SET import_cobrat = CASE
        WHEN fv.estat_cobrament = 'pagada' THEN fv.total_factura
        ELSE COALESCE((SELECT SUM(c.import) FROM fin_factures_cobraments c WHERE c.factura_id = fv.id), 0)
    END,
    import_pendent = CASE
        WHEN fv.estat_cobrament IN ('pagada', 'compensada') THEN 0
        WHEN fv.total_factura <= 0 THEN fv.total_factura
        ELSE GREATEST(0, fv.total_factura - COALESCE((SELECT SUM(c.import) FROM fin_factures_cobraments c WHERE c.factura_id = fv.id), 0))
    END;

-- 4. Configuració d'Empresa: Dia Límit de Pago i Activació d'Avisos Automàtics
ALTER TABLE fin_configuracio_empresa
    ADD COLUMN IF NOT EXISTS dia_limit_pagament INT NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS avisos_impagament_actius BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE fin_configuracio_empresa DROP CONSTRAINT IF EXISTS fin_config_dia_limit_check;
ALTER TABLE fin_configuracio_empresa
    ADD CONSTRAINT fin_config_dia_limit_check CHECK (dia_limit_pagament BETWEEN 1 AND 27);

-- 5. Taula d'Auditoria i Control Anti-Duplicats d'Avisos de Cobrament
CREATE TABLE IF NOT EXISTS fin_avisos_cobrament_log (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipus             TEXT NOT NULL CHECK (tipus IN ('entrenador_dia_limit', 'atleta_dia_limit_mes_1')),
    any_mes           TEXT NOT NULL,
    destinatari_id    UUID,
    destinatari_email TEXT NOT NULL,
    factura_id        UUID REFERENCES fin_factures_venda(id) ON DELETE CASCADE,
    sent_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_avisos_log_lookup ON fin_avisos_cobrament_log(tipus, any_mes, destinatari_email);
CREATE INDEX IF NOT EXISTS idx_fin_avisos_log_factura ON fin_avisos_cobrament_log(tipus, any_mes, factura_id);
