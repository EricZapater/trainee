package store

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"trainee-backend/internal/models"
)

// ============================================================
// Càlculs de Dates i Prorrateig Analític
// ============================================================

func isFullCalendarMonthRange(startISO, endISO string) (int, bool) {
	s, err1 := time.Parse("2006-01-02", startISO)
	e, err2 := time.Parse("2006-01-02", endISO)
	if err1 != nil || err2 != nil || e.Before(s) {
		return 0, false
	}
	if s.Day() != 1 {
		return 0, false
	}
	lastDayOfEndMonth := time.Date(e.Year(), e.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day()
	if e.Day() != lastDayOfEndMonth {
		return 0, false
	}
	months := (e.Year()-s.Year())*12 + int(e.Month()-s.Month()) + 1
	return months, months > 0
}

func ProrationFactor(docInici, docFi, filterInici, filterFi string) float64 {
	if docInici == "" || docFi == "" {
		return 0
	}
	if docFi < docInici {
		docFi = docInici
	}
	if docInici > filterFi || docFi < filterInici {
		return 0
	}
	if docInici >= filterInici && docFi <= filterFi {
		return 1.0
	}

	ovStart := docInici
	if filterInici > ovStart {
		ovStart = filterInici
	}
	ovEnd := docFi
	if filterFi < ovEnd {
		ovEnd = filterFi
	}

	// Si tant el document com el solapament són mesos naturals complets (ex. quota anual/trimestral),
	// repartim per mesos exactes (1/3, 1/6, 1/12) perquè 1.200 € anuals siguin 100,00 €/mes cada mes.
	if totalM, okTot := isFullCalendarMonthRange(docInici, docFi); okTot && totalM > 1 {
		if ovM, okOv := isFullCalendarMonthRange(ovStart, ovEnd); okOv {
			return float64(ovM) / float64(totalM)
		}
	}

	ds, err1 := time.Parse("2006-01-02", docInici)
	de, err2 := time.Parse("2006-01-02", docFi)
	os, err3 := time.Parse("2006-01-02", ovStart)
	oe, err4 := time.Parse("2006-01-02", ovEnd)
	if err1 != nil || err2 != nil || err3 != nil || err4 != nil {
		return 0
	}

	totalDays := int(de.Sub(ds).Hours()/24) + 1
	if totalDays <= 0 {
		totalDays = 1
	}
	ovDays := int(oe.Sub(os).Hours()/24) + 1
	if ovDays <= 0 {
		return 0
	}
	return float64(ovDays) / float64(totalDays)
}

// ============================================================
// 5. Factures de Venda, Emissió Atòmica, Abonaments i Portal Atleta
// ============================================================

const selectFacturaVendaSQL = `
	SELECT fv.id, fv.serie_id, sr.codi, fv.numero_seq, fv.numero_complet,
	       fv.tipus_factura, fv.estat_document,
	       fv.client_id, cl.nom_fiscal, cl.nif_cif,
	       fv.subscripcio_id, fv.fita_camp_id, fv.factura_origen_id, orig.numero_complet, fv.motiu_rectificacio,
	       COALESCE(fv.emissor_snapshot, '{}'::jsonb), COALESCE(fv.client_snapshot, '{}'::jsonb),
	       fv.unitat_negoci_id, un.nom, fv.entrenador_id, en.nom, fv.article_id, ar.nom,
	       fv.concepte, fv.descripcio_detall,
	       fv.base_imposable::float8, fv.iva_percentatge::float8, fv.causa_exempcio, fv.iva_import::float8,
	       fv.irpf_percentatge::float8, fv.irpf_import::float8, fv.total_factura::float8,
	       TO_CHAR(fv.data_emissio, 'YYYY-MM-DD'), TO_CHAR(fv.data_venciment, 'YYYY-MM-DD'),
	       TO_CHAR(fv.periode_inici, 'YYYY-MM-DD'), TO_CHAR(fv.periode_fi, 'YYYY-MM-DD'),
	       fv.estat_cobrament,
	       CASE WHEN fv.data_conciliacio IS NOT NULL THEN TO_CHAR(fv.data_conciliacio, 'YYYY-MM-DD') ELSE NULL END,
	       CASE WHEN fv.data_impagament IS NOT NULL THEN TO_CHAR(fv.data_impagament, 'YYYY-MM-DD') ELSE NULL END,
	       fv.motiu_impagament, fv.notes_tresoreria, fv.emesa_at,
	       fv.verifactu_estat, fv.verifactu_hash, fv.verifactu_qr_data, fv.created_at
	FROM fin_factures_venda fv
	JOIN fin_clients cl ON cl.id = fv.client_id
	JOIN fin_unitats_negoci un ON un.id = fv.unitat_negoci_id
	LEFT JOIN fin_series sr ON sr.id = fv.serie_id
	LEFT JOIN entrenadors en ON en.id = fv.entrenador_id
	LEFT JOIN fin_articles ar ON ar.id = fv.article_id
	LEFT JOIN fin_factures_venda orig ON orig.id = fv.factura_origen_id
`

func scanFacturaVenda(scanner interface {
	Scan(dest ...any) error
}) (models.FinFacturaVenda, error) {
	var f models.FinFacturaVenda
	var emissorBytes, clientBytes []byte
	err := scanner.Scan(
		&f.ID, &f.SerieID, &f.SerieCodi, &f.NumeroSeq, &f.NumeroComplet,
		&f.TipusFactura, &f.EstatDocument,
		&f.ClientID, &f.ClientNom, &f.ClientNif,
		&f.SubscripcioID, &f.FitaCampID, &f.FacturaOrigenID, &f.FacturaOrigenNum, &f.MotiuRectificacio,
		&emissorBytes, &clientBytes,
		&f.UnitatNegociID, &f.UnitatNegociNom, &f.EntrenadorID, &f.EntrenadorNom, &f.ArticleID, &f.ArticleNom,
		&f.Concepte, &f.DescripcioDetall,
		&f.BaseImposable, &f.IvaPercentatge, &f.CausaExempcio, &f.IvaImport,
		&f.IrpfPercentatge, &f.IrpfImport, &f.TotalFactura,
		&f.DataEmissio, &f.DataVenciment, &f.PeriodeInici, &f.PeriodeFi,
		&f.EstatCobrament, &f.DataConciliacio, &f.DataImpagament,
		&f.MotiuImpagament, &f.NotesTresoreria, &f.EmesaAt,
		&f.VerifactuEstat, &f.VerifactuHash, &f.VerifactuQRData, &f.CreatedAt,
	)
	if len(emissorBytes) > 0 {
		f.EmissorSnapshot = json.RawMessage(emissorBytes)
	}
	if len(clientBytes) > 0 {
		f.ClientSnapshot = json.RawMessage(clientBytes)
	}
	return f, err
}

func (s *PostgresStore) GetFinFacturaVendaByID(ctx context.Context, id string) (*models.FinFacturaVenda, error) {
	row := s.pool.QueryRow(ctx, selectFacturaVendaSQL+` WHERE fv.id = $1`, id)
	f, err := scanFacturaVenda(row)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (s *PostgresStore) ListFinFacturesVenda(ctx context.Context, estatDoc, estatCob, unitatID, entrenadorID string) ([]models.FinFacturaVenda, error) {
	query := selectFacturaVendaSQL + ` WHERE 1=1`
	args := []any{}
	idx := 1

	if estatDoc != "" {
		query += fmt.Sprintf(" AND fv.estat_document = $%d", idx)
		args = append(args, estatDoc)
		idx++
	}
	if estatCob != "" {
		query += fmt.Sprintf(" AND fv.estat_cobrament = $%d", idx)
		args = append(args, estatCob)
		idx++
	}
	if unitatID != "" {
		query += fmt.Sprintf(" AND fv.unitat_negoci_id = $%d", idx)
		args = append(args, unitatID)
		idx++
	}
	if entrenadorID == "__none__" {
		query += " AND fv.entrenador_id IS NULL"
	} else if entrenadorID != "" {
		query += fmt.Sprintf(" AND fv.entrenador_id = $%d", idx)
		args = append(args, entrenadorID)
		idx++
	}

	query += ` ORDER BY fv.data_emissio DESC, fv.created_at DESC`

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.FinFacturaVenda{}
	for rows.Next() {
		f, err := scanFacturaVenda(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, f)
	}
	return list, rows.Err()
}

// ListFinFacturesByUsuari retorna només les factures EMESES associades al perfil de l'atleta/usuari.
func (s *PostgresStore) ListFinFacturesByUsuari(ctx context.Context, usuariID string) ([]models.FinFacturaVenda, error) {
	rows, err := s.pool.Query(ctx,
		selectFacturaVendaSQL+` WHERE cl.usuari_id = $1 AND fv.estat_document = 'emesa' ORDER BY fv.data_emissio DESC, fv.numero_seq DESC`,
		usuariID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.FinFacturaVenda{}
	for rows.Next() {
		f, err := scanFacturaVenda(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, f)
	}
	return list, rows.Err()
}

func (s *PostgresStore) CreateFinFacturaVenda(ctx context.Context, req models.UpsertFinFacturaVendaRequest) (*models.FinFacturaVenda, error) {
	base := roundCurrency(req.BaseImposable)
	ivaPct := roundCurrency(req.IvaPercentatge)
	irpfPct := roundCurrency(req.IrpfPercentatge)
	ivaImp := roundCurrency(base * ivaPct / 100.0)
	irpfImp := roundCurrency(base * irpfPct / 100.0)
	total := roundCurrency(base + ivaImp - irpfImp)

	serieID := nullableUUID(req.SerieID)
	if serieID == nil {
		var defSerie *string
		_ = s.pool.QueryRow(ctx, `SELECT serie_defecte_id FROM fin_unitats_negoci WHERE id = $1`, req.UnitatNegociID).Scan(&defSerie)
		serieID = defSerie
	}

	var id string
	err := s.pool.QueryRow(ctx, `
		INSERT INTO fin_factures_venda (
			serie_id, tipus_factura, estat_document, client_id,
			unitat_negoci_id, entrenador_id, article_id, concepte, descripcio_detall,
			base_imposable, iva_percentatge, causa_exempcio, iva_import,
			irpf_percentatge, irpf_import, total_factura,
			data_emissio, data_venciment, periode_inici, periode_fi,
			estat_cobrament, notes_tresoreria
		) VALUES ($1,'F1','esborrany',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::date,$16::date,$17::date,$18::date,'pendent',$19)
		RETURNING id
	`,
		serieID, req.ClientID, req.UnitatNegociID, nullableUUID(req.EntrenadorID), nullableUUID(req.ArticleID),
		req.Concepte, req.DescripcioDetall, base, ivaPct, req.CausaExempcio, ivaImp,
		irpfPct, irpfImp, total, req.DataEmissio, req.DataVenciment, req.PeriodeInici, req.PeriodeFi, req.NotesTresoreria,
	).Scan(&id)
	if err != nil {
		return nil, err
	}

	if req.EmetreDirecte {
		return s.EmetreFinFacturaVenda(ctx, id, models.EmetreFacturaRequest{
			SerieID:       serieID,
			DataEmissio:   req.DataEmissio,
			DataVenciment: req.DataVenciment,
		})
	}
	return s.GetFinFacturaVendaByID(ctx, id)
}

func (s *PostgresStore) UpdateFinFacturaVenda(ctx context.Context, id string, req models.UpsertFinFacturaVendaRequest) (*models.FinFacturaVenda, error) {
	var estat string
	err := s.pool.QueryRow(ctx, `SELECT estat_document FROM fin_factures_venda WHERE id = $1`, id).Scan(&estat)
	if err != nil {
		return nil, err
	}
	if estat != "esborrany" {
		return nil, fmt.Errorf("prohibit modificar una factura ja emesa amb número de registre (utilitza un abonament rectificatiu)")
	}

	base := roundCurrency(req.BaseImposable)
	ivaPct := roundCurrency(req.IvaPercentatge)
	irpfPct := roundCurrency(req.IrpfPercentatge)
	ivaImp := roundCurrency(base * ivaPct / 100.0)
	irpfImp := roundCurrency(base * irpfPct / 100.0)
	total := roundCurrency(base + ivaImp - irpfImp)

	_, err = s.pool.Exec(ctx, `
		UPDATE fin_factures_venda
		SET serie_id = $1, client_id = $2, unitat_negoci_id = $3, entrenador_id = $4, article_id = $5,
		    concepte = $6, descripcio_detall = $7,
		    base_imposable = $8, iva_percentatge = $9, causa_exempcio = $10, iva_import = $11,
		    irpf_percentatge = $12, irpf_import = $13, total_factura = $14,
		    data_emissio = $15::date, data_venciment = $16::date, periode_inici = $17::date, periode_fi = $18::date,
		    notes_tresoreria = $19, updated_at = now()
		WHERE id = $20 AND estat_document = 'esborrany'
	`,
		nullableUUID(req.SerieID), req.ClientID, req.UnitatNegociID, nullableUUID(req.EntrenadorID), nullableUUID(req.ArticleID),
		req.Concepte, req.DescripcioDetall, base, ivaPct, req.CausaExempcio, ivaImp,
		irpfPct, irpfImp, total, req.DataEmissio, req.DataVenciment, req.PeriodeInici, req.PeriodeFi,
		req.NotesTresoreria, id,
	)
	if err != nil {
		return nil, err
	}

	if req.EmetreDirecte {
		return s.EmetreFinFacturaVenda(ctx, id, models.EmetreFacturaRequest{
			SerieID:       req.SerieID,
			DataEmissio:   req.DataEmissio,
			DataVenciment: req.DataVenciment,
		})
	}
	return s.GetFinFacturaVendaByID(ctx, id)
}

func (s *PostgresStore) DeleteFinFacturaVenda(ctx context.Context, id string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var estat string
	var fitaID *string
	err = tx.QueryRow(ctx, `SELECT estat_document, fita_camp_id FROM fin_factures_venda WHERE id = $1 FOR UPDATE`, id).Scan(&estat, &fitaID)
	if err != nil {
		return err
	}
	if estat != "esborrany" {
		return fmt.Errorf("prohibit eliminar una factura amb número de registre assignat")
	}

	if fitaID != nil {
		_, _ = tx.Exec(ctx, `UPDATE fin_plans_camp_fites SET factura_id = NULL WHERE id = $1`, *fitaID)
		_, _ = tx.Exec(ctx, `
			UPDATE fin_plans_camp SET estat = 'actiu', updated_at = now()
			WHERE id = (SELECT pla_camp_id FROM fin_plans_camp_fites WHERE id = $1)
		`, *fitaID)
	}

	_, err = tx.Exec(ctx, `DELETE FROM fin_factures_venda WHERE id = $1 AND estat_document = 'esborrany'`, id)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// EmetreFinFacturaVenda assigna correlativament el número de sèrie, congela l'snapshot fiscal d'emissor i client i bloqueja el document.
func (s *PostgresStore) EmetreFinFacturaVenda(ctx context.Context, id string, req models.EmetreFacturaRequest) (*models.FinFacturaVenda, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var (
		estat, tipusFactura, clientID, unitatID, currEmissio, currVenciment string
		currSerieID                                                         *string
	)
	err = tx.QueryRow(ctx, `
		SELECT estat_document, tipus_factura, serie_id, client_id, unitat_negoci_id,
		       TO_CHAR(data_emissio, 'YYYY-MM-DD'), TO_CHAR(data_venciment, 'YYYY-MM-DD')
		FROM fin_factures_venda
		WHERE id = $1
		FOR UPDATE
	`, id).Scan(&estat, &tipusFactura, &currSerieID, &clientID, &unitatID, &currEmissio, &currVenciment)
	if err != nil {
		return nil, err
	}
	if estat != "esborrany" {
		return nil, fmt.Errorf("aquesta factura ja ha estat emesa")
	}

	dataEmissio := currEmissio
	if req.DataEmissio != "" {
		dataEmissio = req.DataEmissio
	}
	dataVenciment := currVenciment
	if req.DataVenciment != "" {
		dataVenciment = req.DataVenciment
	}

	serieID := nullableUUID(req.SerieID)
	if serieID == nil {
		serieID = currSerieID
	}
	expectedSerieType := "ordinaria"
	if tipusFactura == "R1" {
		expectedSerieType = "rectificativa"
	}

	if serieID == nil {
		var foundSerie string
		errS := tx.QueryRow(ctx, `
			SELECT id FROM fin_series WHERE tipus = $1 AND activa = TRUE ORDER BY any_fiscal DESC, created_at ASC LIMIT 1
		`, expectedSerieType).Scan(&foundSerie)
		if errS != nil {
			return nil, fmt.Errorf("no s'ha trobat cap sèrie activa de tipus %s", expectedSerieType)
		}
		serieID = &foundSerie
	}

	var prefix, serieTipus string
	var ultimNum int
	err = tx.QueryRow(ctx, `
		SELECT prefix, tipus, ultim_numero FROM fin_series WHERE id = $1 FOR UPDATE
	`, *serieID).Scan(&prefix, &serieTipus, &ultimNum)
	if err != nil {
		return nil, fmt.Errorf("sèrie no trobada: %w", err)
	}
	if serieTipus != expectedSerieType {
		return nil, fmt.Errorf("el tipus de sèrie (%s) no correspon al tipus de factura (%s)", serieTipus, expectedSerieType)
	}

	nextNum := ultimNum + 1
	numComplet := fmt.Sprintf("%s%04d", prefix, nextNum)

	_, err = tx.Exec(ctx, `UPDATE fin_series SET ultim_numero = $1 WHERE id = $2`, nextNum, *serieID)
	if err != nil {
		return nil, err
	}

	// Snapshot Emissor
	var emissorSnap map[string]any
	var raoSocial, nomCom, nifEmp, adrEmp, cpEmp, pobEmp, provEmp, paisEmp, emailEmp, telEmp, ibanEmp, logoEmp, peuEmp string
	_ = tx.QueryRow(ctx, `
		SELECT rao_social, nom_comercial, nif_cif, adreca, cp, poblacio, provincia, pais,
		       email_administracio, telefon, iban_principal, logo_url, peu_legal
		FROM fin_configuracio_empresa WHERE id = 1
	`).Scan(&raoSocial, &nomCom, &nifEmp, &adrEmp, &cpEmp, &pobEmp, &provEmp, &paisEmp, &emailEmp, &telEmp, &ibanEmp, &logoEmp, &peuEmp)
	emissorSnap = map[string]any{
		"rao_social":     raoSocial,
		"nom_comercial":  nomCom,
		"nif_cif":        nifEmp,
		"adreca":         adrEmp,
		"cp":             cpEmp,
		"poblacio":       pobEmp,
		"provincia":      provEmp,
		"pais":           paisEmp,
		"email":          emailEmp,
		"telefon":        telEmp,
		"iban_principal": ibanEmp,
		"logo_url":       logoEmp,
		"peu_legal":      peuEmp,
	}
	emissorJSON, _ := json.Marshal(emissorSnap)

	// Snapshot Client
	var nomCli, tipusIDCli, nifCli, adrCli, cpCli, pobCli, provCli, paisCli, emailCli string
	_ = tx.QueryRow(ctx, `
		SELECT nom_fiscal, tipus_id_fiscal, nif_cif, adreca, cp, poblacio, provincia, pais, email
		FROM fin_clients WHERE id = $1
	`, clientID).Scan(&nomCli, &tipusIDCli, &nifCli, &adrCli, &cpCli, &pobCli, &provCli, &paisCli, &emailCli)
	clientSnap := map[string]any{
		"nom_fiscal":      nomCli,
		"tipus_id_fiscal": tipusIDCli,
		"nif_cif":         nifCli,
		"adreca":          adrCli,
		"cp":              cpCli,
		"poblacio":        pobCli,
		"provincia":       provCli,
		"pais":            paisCli,
		"email":           emailCli,
	}
	clientJSON, _ := json.Marshal(clientSnap)

	_, err = tx.Exec(ctx, `
		UPDATE fin_factures_venda
		SET serie_id = $1, numero_seq = $2, numero_complet = $3,
		    estat_document = 'emesa', data_emissio = $4::date, data_venciment = $5::date,
		    emissor_snapshot = $6::jsonb, client_snapshot = $7::jsonb,
		    emesa_at = now(), verifactu_estat = 'pendent_fase2', updated_at = now()
		WHERE id = $8
	`, *serieID, nextNum, numComplet, dataEmissio, dataVenciment, string(emissorJSON), string(clientJSON), id)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.GetFinFacturaVendaByID(ctx, id)
}

func (s *PostgresStore) ConciliarFinFacturaVenda(ctx context.Context, id string, req models.ConciliarDocumentRequest) (*models.FinFacturaVenda, error) {
	tag, err := s.pool.Exec(ctx, `
		UPDATE fin_factures_venda
		SET estat_cobrament = 'pagada', data_conciliacio = $1::date,
		    notes_tresoreria = CASE WHEN $2 <> '' THEN $2 ELSE notes_tresoreria END,
		    updated_at = now()
		WHERE id = $3 AND estat_document = 'emesa'
	`, req.DataConciliacio, req.Notes, id)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, fmt.Errorf("només es poden conciliar factures emeses")
	}
	return s.GetFinFacturaVendaByID(ctx, id)
}

func (s *PostgresStore) MarcarImpagadaFinFacturaVenda(ctx context.Context, id string, req models.MarcarImpagatRequest) (*models.FinFacturaVenda, error) {
	dataImp := req.DataImpagament
	if dataImp == "" {
		dataImp = time.Now().Format("2006-01-02")
	}
	tag, err := s.pool.Exec(ctx, `
		UPDATE fin_factures_venda
		SET estat_cobrament = 'impagada', data_impagament = $1::date, motiu_impagament = $2,
		    data_conciliacio = NULL, updated_at = now()
		WHERE id = $3 AND estat_document = 'emesa'
	`, dataImp, req.MotiuImpagament, id)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, fmt.Errorf("només es poden marcar impagades factures emeses")
	}
	return s.GetFinFacturaVendaByID(ctx, id)
}

func (s *PostgresStore) CrearAbonamentFacturaVenda(ctx context.Context, origenID string, req models.CrearAbonamentRequest) (*models.FinFacturaVenda, error) {
	orig, err := s.GetFinFacturaVendaByID(ctx, origenID)
	if err != nil {
		return nil, fmt.Errorf("factura origen no trobada: %w", err)
	}
	if orig.EstatDocument != "emesa" {
		return nil, fmt.Errorf("només es pot fer un abonament d'una factura ja emesa (els esborranys es poden editar o esborrar)")
	}
	if orig.TipusFactura == "R1" {
		return nil, fmt.Errorf("no es pot generar un abonament sobre una factura que ja és rectificativa")
	}

	esTotal := true
	baseAbs := orig.BaseImposable
	if baseAbs < 0 {
		baseAbs = -baseAbs
	}
	if req.BaseAbonarPositiva != nil && *req.BaseAbonarPositiva > 0 && *req.BaseAbonarPositiva < baseAbs {
		baseAbs = roundCurrency(*req.BaseAbonarPositiva)
		esTotal = false
	}

	negBase := -baseAbs
	negIva := roundCurrency(negBase * orig.IvaPercentatge / 100.0)
	negIrpf := roundCurrency(negBase * orig.IrpfPercentatge / 100.0)
	negTotal := roundCurrency(negBase + negIva - negIrpf)

	dataEmissio := req.DataEmissio
	if dataEmissio == "" {
		dataEmissio = time.Now().Format("2006-01-02")
	}

	serieRectID := nullableUUID(req.SerieRectificativaID)
	if serieRectID == nil {
		var sr string
		if errS := s.pool.QueryRow(ctx, `SELECT id FROM fin_series WHERE tipus = 'rectificativa' AND activa = TRUE ORDER BY any_fiscal DESC LIMIT 1`).Scan(&sr); errS == nil {
			serieRectID = &sr
		}
	}

	origNum := origenID[:8]
	if orig.NumeroComplet != nil {
		origNum = *orig.NumeroComplet
	}
	concepte := fmt.Sprintf("ABONAMENT Factura %s — %s", origNum, orig.Concepte)

	var rectID string
	err = s.pool.QueryRow(ctx, `
		INSERT INTO fin_factures_venda (
			serie_id, tipus_factura, estat_document, client_id, factura_origen_id, motiu_rectificacio,
			unitat_negoci_id, entrenador_id, article_id, concepte, descripcio_detall,
			base_imposable, iva_percentatge, causa_exempcio, iva_import,
			irpf_percentatge, irpf_import, total_factura,
			data_emissio, data_venciment, periode_inici, periode_fi, estat_cobrament
		) VALUES ($1,'R1','esborrany',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::date,$17::date,$18::date,$19::date,'pendent')
		RETURNING id
	`,
		serieRectID, orig.ClientID, orig.ID, req.MotiuRectificacio,
		orig.UnitatNegociID, orig.EntrenadorID, orig.ArticleID, concepte, req.MotiuRectificacio,
		negBase, orig.IvaPercentatge, orig.CausaExempcio, negIva,
		orig.IrpfPercentatge, negIrpf, negTotal,
		dataEmissio, orig.PeriodeInici, orig.PeriodeFi,
	).Scan(&rectID)
	if err != nil {
		return nil, err
	}

	if req.EmetreDirecte {
		emitted, err := s.EmetreFinFacturaVenda(ctx, rectID, models.EmetreFacturaRequest{
			SerieID:       serieRectID,
			DataEmissio:   dataEmissio,
			DataVenciment: dataEmissio,
		})
		if err != nil {
			return nil, err
		}
		// Si és abonament total d'una factura que encara no s'havia cobrat, compensem ambdues perquè no quedin pendents a caixa
		if esTotal && (orig.EstatCobrament == "pendent" || orig.EstatCobrament == "impagada") {
			_, _ = s.pool.Exec(ctx, `UPDATE fin_factures_venda SET estat_cobrament = 'compensada', updated_at = now() WHERE id IN ($1, $2)`, orig.ID, rectID)
			return s.GetFinFacturaVendaByID(ctx, rectID)
		}
		return emitted, nil
	}
	return s.GetFinFacturaVendaByID(ctx, rectID)
}

// ============================================================
// 6. Factures de Compra, Entitat Despesa i Plantilles Recurrents
// ============================================================

func (s *PostgresStore) ListFinCompres(ctx context.Context, estatPag, unitatID, entrenadorID string) ([]models.FinCompra, error) {
	query := `
		SELECT c.id, c.proveidor_id, p.nom_fiscal, p.nif_cif, c.num_factura_proveidor,
		       c.unitat_negoci_id, un.nom, c.entrenador_id, en.nom, c.concepte,
		       c.base_imposable::float8, c.iva_percentatge::float8, c.iva_import::float8,
		       c.irpf_percentatge::float8, c.irpf_import::float8, c.total_pagar::float8,
		       TO_CHAR(c.data_emissio, 'YYYY-MM-DD'), TO_CHAR(c.data_venciment, 'YYYY-MM-DD'),
		       TO_CHAR(c.periode_inici, 'YYYY-MM-DD'), TO_CHAR(c.periode_fi, 'YYYY-MM-DD'),
		       c.estat_pagament,
		       CASE WHEN c.data_conciliacio IS NOT NULL THEN TO_CHAR(c.data_conciliacio, 'YYYY-MM-DD') ELSE NULL END,
		       c.fitxer_adjunt_path, c.notes, c.created_at
		FROM fin_compres c
		JOIN fin_proveidors p ON p.id = c.proveidor_id
		JOIN fin_unitats_negoci un ON un.id = c.unitat_negoci_id
		LEFT JOIN entrenadors en ON en.id = c.entrenador_id
		WHERE 1=1
	`
	args := []any{}
	idx := 1
	if estatPag != "" {
		query += fmt.Sprintf(" AND c.estat_pagament = $%d", idx)
		args = append(args, estatPag)
		idx++
	}
	if unitatID != "" {
		query += fmt.Sprintf(" AND c.unitat_negoci_id = $%d", idx)
		args = append(args, unitatID)
		idx++
	}
	if entrenadorID == "__none__" {
		query += " AND c.entrenador_id IS NULL"
	} else if entrenadorID != "" {
		query += fmt.Sprintf(" AND c.entrenador_id = $%d", idx)
		args = append(args, entrenadorID)
		idx++
	}
	query += ` ORDER BY c.data_emissio DESC, c.created_at DESC`

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.FinCompra{}
	for rows.Next() {
		var c models.FinCompra
		if err := rows.Scan(
			&c.ID, &c.ProveidorID, &c.ProveidorNom, &c.ProveidorNif, &c.NumFacturaProveidor,
			&c.UnitatNegociID, &c.UnitatNegociNom, &c.EntrenadorID, &c.EntrenadorNom, &c.Concepte,
			&c.BaseImposable, &c.IvaPercentatge, &c.IvaImport,
			&c.IrpfPercentatge, &c.IrpfImport, &c.TotalPagar,
			&c.DataEmissio, &c.DataVenciment, &c.PeriodeInici, &c.PeriodeFi,
			&c.EstatPagament, &c.DataConciliacio, &c.FitxerAdjuntPath, &c.Notes, &c.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, rows.Err()
}

func (s *PostgresStore) CreateFinCompra(ctx context.Context, req models.UpsertFinCompraRequest) (*models.FinCompra, error) {
	base := roundCurrency(req.BaseImposable)
	ivaPct := roundCurrency(req.IvaPercentatge)
	irpfPct := roundCurrency(req.IrpfPercentatge)
	ivaImp := roundCurrency(base * ivaPct / 100.0)
	irpfImp := roundCurrency(base * irpfPct / 100.0)
	total := roundCurrency(base + ivaImp - irpfImp)

	estat := req.EstatPagament
	if estat == "" {
		estat = "pendent"
	}
	dataConc := nullableUUID(req.DataConciliacio)
	if estat != "pagada" {
		dataConc = nil
	}

	var id string
	err := s.pool.QueryRow(ctx, `
		INSERT INTO fin_compres (
			proveidor_id, num_factura_proveidor, unitat_negoci_id, entrenador_id, concepte,
			base_imposable, iva_percentatge, iva_import, irpf_percentatge, irpf_import, total_pagar,
			data_emissio, data_venciment, periode_inici, periode_fi,
			estat_pagament, data_conciliacio, fitxer_adjunt_path, notes
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::date,$13::date,$14::date,$15::date,$16,$17::date,$18,$19)
		RETURNING id
	`,
		req.ProveidorID, req.NumFacturaProveidor, req.UnitatNegociID, nullableUUID(req.EntrenadorID), req.Concepte,
		base, ivaPct, ivaImp, irpfPct, irpfImp, total,
		req.DataEmissio, req.DataVenciment, req.PeriodeInici, req.PeriodeFi,
		estat, dataConc, req.FitxerAdjuntPath, req.Notes,
	).Scan(&id)
	if err != nil {
		return nil, err
	}

	list, err := s.ListFinCompres(ctx, "", "", "")
	if err != nil {
		return nil, err
	}
	for _, it := range list {
		if it.ID == id {
			return &it, nil
		}
	}
	return nil, fmt.Errorf("compra creada però no recuperada")
}

func (s *PostgresStore) UpdateFinCompra(ctx context.Context, id string, req models.UpsertFinCompraRequest) (*models.FinCompra, error) {
	base := roundCurrency(req.BaseImposable)
	ivaPct := roundCurrency(req.IvaPercentatge)
	irpfPct := roundCurrency(req.IrpfPercentatge)
	ivaImp := roundCurrency(base * ivaPct / 100.0)
	irpfImp := roundCurrency(base * irpfPct / 100.0)
	total := roundCurrency(base + ivaImp - irpfImp)

	estat := req.EstatPagament
	if estat == "" {
		estat = "pendent"
	}
	dataConc := nullableUUID(req.DataConciliacio)
	if estat != "pagada" {
		dataConc = nil
	}

	_, err := s.pool.Exec(ctx, `
		UPDATE fin_compres
		SET proveidor_id = $1, num_factura_proveidor = $2, unitat_negoci_id = $3, entrenador_id = $4, concepte = $5,
		    base_imposable = $6, iva_percentatge = $7, iva_import = $8, irpf_percentatge = $9, irpf_import = $10, total_pagar = $11,
		    data_emissio = $12::date, data_venciment = $13::date, periode_inici = $14::date, periode_fi = $15::date,
		    estat_pagament = $16, data_conciliacio = $17::date,
		    fitxer_adjunt_path = CASE WHEN $18 <> '' THEN $18 ELSE fitxer_adjunt_path END,
		    notes = $19, updated_at = now()
		WHERE id = $20
	`,
		req.ProveidorID, req.NumFacturaProveidor, req.UnitatNegociID, nullableUUID(req.EntrenadorID), req.Concepte,
		base, ivaPct, ivaImp, irpfPct, irpfImp, total,
		req.DataEmissio, req.DataVenciment, req.PeriodeInici, req.PeriodeFi,
		estat, dataConc, req.FitxerAdjuntPath, req.Notes, id,
	)
	if err != nil {
		return nil, err
	}
	list, _ := s.ListFinCompres(ctx, "", "", "")
	for _, it := range list {
		if it.ID == id {
			return &it, nil
		}
	}
	return nil, nil
}

func (s *PostgresStore) DeleteFinCompra(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM fin_compres WHERE id = $1`, id)
	return err
}

func (s *PostgresStore) ConciliarFinCompra(ctx context.Context, id string, req models.ConciliarDocumentRequest) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE fin_compres
		SET estat_pagament = 'pagada', data_conciliacio = $1::date,
		    notes = CASE WHEN $2 <> '' THEN $2 ELSE notes END, updated_at = now()
		WHERE id = $3
	`, req.DataConciliacio, req.Notes, id)
	return err
}

func (s *PostgresStore) ListFinDespeses(ctx context.Context, estatPag, unitatID, entrenadorID string) ([]models.FinDespesa, error) {
	query := `
		SELECT d.id, d.categoria, d.beneficiari_nom, d.concepte,
		       d.unitat_negoci_id, un.nom, d.entrenador_id, en.nom,
		       d.import_total::float8,
		       TO_CHAR(d.data_devengo, 'YYYY-MM-DD'), TO_CHAR(d.data_venciment, 'YYYY-MM-DD'),
		       TO_CHAR(d.periode_inici, 'YYYY-MM-DD'), TO_CHAR(d.periode_fi, 'YYYY-MM-DD'),
		       d.estat_pagament,
		       CASE WHEN d.data_conciliacio IS NOT NULL THEN TO_CHAR(d.data_conciliacio, 'YYYY-MM-DD') ELSE NULL END,
		       d.fitxer_adjunt_path, d.notes, d.created_at
		FROM fin_despeses d
		JOIN fin_unitats_negoci un ON un.id = d.unitat_negoci_id
		LEFT JOIN entrenadors en ON en.id = d.entrenador_id
		WHERE 1=1
	`
	args := []any{}
	idx := 1
	if estatPag != "" {
		query += fmt.Sprintf(" AND d.estat_pagament = $%d", idx)
		args = append(args, estatPag)
		idx++
	}
	if unitatID != "" {
		query += fmt.Sprintf(" AND d.unitat_negoci_id = $%d", idx)
		args = append(args, unitatID)
		idx++
	}
	if entrenadorID == "__none__" {
		query += " AND d.entrenador_id IS NULL"
	} else if entrenadorID != "" {
		query += fmt.Sprintf(" AND d.entrenador_id = $%d", idx)
		args = append(args, entrenadorID)
		idx++
	}
	query += ` ORDER BY d.data_devengo DESC, d.created_at DESC`

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.FinDespesa{}
	for rows.Next() {
		var d models.FinDespesa
		if err := rows.Scan(
			&d.ID, &d.Categoria, &d.BeneficiariNom, &d.Concepte,
			&d.UnitatNegociID, &d.UnitatNegociNom, &d.EntrenadorID, &d.EntrenadorNom,
			&d.ImportTotal, &d.DataDevengo, &d.DataVenciment, &d.PeriodeInici, &d.PeriodeFi,
			&d.EstatPagament, &d.DataConciliacio, &d.FitxerAdjuntPath, &d.Notes, &d.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, d)
	}
	return list, rows.Err()
}

func (s *PostgresStore) CreateFinDespesa(ctx context.Context, req models.UpsertFinDespesaRequest) (*models.FinDespesa, error) {
	estat := req.EstatPagament
	if estat == "" {
		estat = "pendent"
	}
	dataConc := nullableUUID(req.DataConciliacio)
	if estat != "pagada" {
		dataConc = nil
	}

	var id string
	err := s.pool.QueryRow(ctx, `
		INSERT INTO fin_despeses (
			categoria, beneficiari_nom, concepte, unitat_negoci_id, entrenador_id,
			import_total, data_devengo, data_venciment, periode_inici, periode_fi,
			estat_pagament, data_conciliacio, fitxer_adjunt_path, notes
		) VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8::date,$9::date,$10::date,$11,$12::date,$13,$14)
		RETURNING id
	`,
		req.Categoria, req.BeneficiariNom, req.Concepte, req.UnitatNegociID, nullableUUID(req.EntrenadorID),
		roundCurrency(req.ImportTotal), req.DataDevengo, req.DataVenciment, req.PeriodeInici, req.PeriodeFi,
		estat, dataConc, req.FitxerAdjuntPath, req.Notes,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	list, _ := s.ListFinDespeses(ctx, "", "", "")
	for _, it := range list {
		if it.ID == id {
			return &it, nil
		}
	}
	return nil, nil
}

func (s *PostgresStore) UpdateFinDespesa(ctx context.Context, id string, req models.UpsertFinDespesaRequest) (*models.FinDespesa, error) {
	estat := req.EstatPagament
	if estat == "" {
		estat = "pendent"
	}
	dataConc := nullableUUID(req.DataConciliacio)
	if estat != "pagada" {
		dataConc = nil
	}

	_, err := s.pool.Exec(ctx, `
		UPDATE fin_despeses
		SET categoria = $1, beneficiari_nom = $2, concepte = $3, unitat_negoci_id = $4, entrenador_id = $5,
		    import_total = $6, data_devengo = $7::date, data_venciment = $8::date, periode_inici = $9::date, periode_fi = $10::date,
		    estat_pagament = $11, data_conciliacio = $12::date,
		    fitxer_adjunt_path = CASE WHEN $13 <> '' THEN $13 ELSE fitxer_adjunt_path END,
		    notes = $14, updated_at = now()
		WHERE id = $15
	`,
		req.Categoria, req.BeneficiariNom, req.Concepte, req.UnitatNegociID, nullableUUID(req.EntrenadorID),
		roundCurrency(req.ImportTotal), req.DataDevengo, req.DataVenciment, req.PeriodeInici, req.PeriodeFi,
		estat, dataConc, req.FitxerAdjuntPath, req.Notes, id,
	)
	if err != nil {
		return nil, err
	}
	list, _ := s.ListFinDespeses(ctx, "", "", "")
	for _, it := range list {
		if it.ID == id {
			return &it, nil
		}
	}
	return nil, nil
}

func (s *PostgresStore) DeleteFinDespesa(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM fin_despeses WHERE id = $1`, id)
	return err
}

func (s *PostgresStore) ConciliarFinDespesa(ctx context.Context, id string, req models.ConciliarDocumentRequest) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE fin_despeses
		SET estat_pagament = 'pagada', data_conciliacio = $1::date,
		    notes = CASE WHEN $2 <> '' THEN $2 ELSE notes END, updated_at = now()
		WHERE id = $3
	`, req.DataConciliacio, req.Notes, id)
	return err
}

func (s *PostgresStore) ListFinRecurrentsSortida(ctx context.Context) ([]models.FinRecurrentSortida, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT r.id, r.tipus_desti, r.proveidor_id, p.nom_fiscal, r.categoria_despesa, r.beneficiari_nom,
		       r.concepte, r.unitat_negoci_id, un.nom, r.entrenador_id, en.nom,
		       r.periodicitat_mesos, r.base_o_import::float8, r.iva_percentatge::float8, r.irpf_percentatge::float8,
		       r.dies_venciment, TO_CHAR(r.propera_data, 'YYYY-MM-DD'),
		       CASE WHEN r.data_fi IS NOT NULL THEN TO_CHAR(r.data_fi, 'YYYY-MM-DD') ELSE NULL END,
		       r.actiu, r.created_at
		FROM fin_recurrents_sortida r
		JOIN fin_unitats_negoci un ON un.id = r.unitat_negoci_id
		LEFT JOIN fin_proveidors p ON p.id = r.proveidor_id
		LEFT JOIN entrenadors en ON en.id = r.entrenador_id
		ORDER BY r.actiu DESC, r.propera_data ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.FinRecurrentSortida{}
	for rows.Next() {
		var r models.FinRecurrentSortida
		if err := rows.Scan(
			&r.ID, &r.TipusDesti, &r.ProveidorID, &r.ProveidorNom, &r.CategoriaDespesa, &r.BeneficiariNom,
			&r.Concepte, &r.UnitatNegociID, &r.UnitatNegociNom, &r.EntrenadorID, &r.EntrenadorNom,
			&r.PeriodicitatMesos, &r.BaseOImport, &r.IvaPercentatge, &r.IrpfPercentatge,
			&r.DiesVenciment, &r.ProperaData, &r.DataFi, &r.Actiu, &r.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, rows.Err()
}

func (s *PostgresStore) CreateFinRecurrentSortida(ctx context.Context, req models.UpsertFinRecurrentSortidaRequest) (*models.FinRecurrentSortida, error) {
	cat := req.CategoriaDespesa
	if cat == "" {
		cat = "altres"
	}
	var id string
	err := s.pool.QueryRow(ctx, `
		INSERT INTO fin_recurrents_sortida (
			tipus_desti, proveidor_id, categoria_despesa, beneficiari_nom, concepte,
			unitat_negoci_id, entrenador_id, periodicitat_mesos, base_o_import,
			iva_percentatge, irpf_percentatge, dies_venciment, propera_data, data_fi, actiu
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::date,$14::date,$15)
		RETURNING id
	`,
		req.TipusDesti, nullableUUID(req.ProveidorID), cat, req.BeneficiariNom, req.Concepte,
		req.UnitatNegociID, nullableUUID(req.EntrenadorID), req.PeriodicitatMesos, roundCurrency(req.BaseOImport),
		roundCurrency(req.IvaPercentatge), roundCurrency(req.IrpfPercentatge), req.DiesVenciment,
		req.ProperaData, nullableUUID(req.DataFi), req.Actiu,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	list, _ := s.ListFinRecurrentsSortida(ctx)
	for _, it := range list {
		if it.ID == id {
			return &it, nil
		}
	}
	return nil, nil
}

func (s *PostgresStore) DeleteFinRecurrentSortida(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM fin_recurrents_sortida WHERE id = $1`, id)
	return err
}

// ============================================================
// 7. Informe de Totalitzacions (Vendes - Compres - Despeses)
//    Amb Toggle: Mode "emissio" (Fiscal) vs "prorratejat" (Negoci)
// ============================================================

func (s *PostgresStore) GetFinInformeResultats(ctx context.Context, dataInici, dataFi, mode string) (*models.FinInformeResultatsResponse, error) {
	if mode != "prorratejat" {
		mode = "emissio"
	}

	unitats, err := s.ListFinUnitatsNegoci(ctx)
	if err != nil {
		return nil, err
	}
	entrenadors, err := s.ListEntrenadors(ctx)
	if err != nil {
		return nil, err
	}

	unitatMap := map[string]string{}
	byUnitat := map[string]*models.FinAnalyticalRow{}
	for _, u := range unitats {
		unitatMap[u.ID] = u.Nom
		byUnitat[u.ID] = &models.FinAnalyticalRow{GroupID: u.ID, GroupNom: u.Nom}
	}

	coachMap := map[string]string{"__none__": "Sense Entrenador / Estructura"}
	byCoach := map[string]*models.FinAnalyticalRow{
		"__none__": {GroupID: "__none__", GroupNom: "Sense Entrenador / Estructura"},
	}
	for _, e := range entrenadors {
		coachMap[e.ID] = e.Nom
		byCoach[e.ID] = &models.FinAnalyticalRow{GroupID: e.ID, GroupNom: e.Nom}
	}

	crossMap := map[string]*models.FinAnalyticalRow{}
	getCross := func(uID, cID string) *models.FinAnalyticalRow {
		if cID == "" {
			cID = "__none__"
		}
		key := uID + "|" + cID
		if row, ok := crossMap[key]; ok {
			return row
		}
		uNom := unitatMap[uID]
		if uNom == "" {
			uNom = "Altres"
		}
		cNom := coachMap[cID]
		if cNom == "" {
			cNom = "Entrenador"
		}
		row := &models.FinAnalyticalRow{
			GroupID:     uID,
			GroupNom:    uNom,
			SubGroupID:  cID,
			SubGroupNom: cNom,
		}
		crossMap[key] = row
		return row
	}
	ensureUnit := func(uID string) *models.FinAnalyticalRow {
		if r, ok := byUnitat[uID]; ok {
			return r
		}
		r := &models.FinAnalyticalRow{GroupID: uID, GroupNom: "Unitat"}
		byUnitat[uID] = r
		return r
	}
	ensureCoach := func(cID *string) (*models.FinAnalyticalRow, string) {
		key := "__none__"
		if cID != nil && *cID != "" {
			key = *cID
		}
		if r, ok := byCoach[key]; ok {
			return r, key
		}
		r := &models.FinAnalyticalRow{GroupID: key, GroupNom: "Entrenador"}
		byCoach[key] = r
		return r, key
	}

	resp := &models.FinInformeResultatsResponse{
		DataInici: dataInici,
		DataFi:    dataFi,
		Mode:      mode,
	}

	// 1. Vendes Emeses (inclou ordinàries F1 i rectificatives R1 negatives; exclou esborranys)
	factures, err := s.ListFinFacturesVenda(ctx, "emesa", "", "", "")
	if err != nil {
		return nil, err
	}
	for _, f := range factures {
		var factor float64
		if mode == "emissio" {
			if f.DataEmissio >= dataInici && f.DataEmissio <= dataFi {
				factor = 1.0
			}
		} else {
			factor = ProrationFactor(f.PeriodeInici, f.PeriodeFi, dataInici, dataFi)
		}
		if f.DataEmissio >= dataInici && f.DataEmissio <= dataFi {
			resp.IvaRepercutit += f.IvaImport
			resp.IrpfSuportatVend += f.IrpfImport
		}
		if factor == 0 {
			continue
		}
		amt := f.BaseImposable * factor
		resp.TotalVendes += amt
		uRow := ensureUnit(f.UnitatNegociID)
		uRow.VendesBase += amt
		cRow, cKey := ensureCoach(f.EntrenadorID)
		cRow.VendesBase += amt
		getCross(f.UnitatNegociID, cKey).VendesBase += amt
	}

	// 2. Compres (Base Imposable)
	compres, err := s.ListFinCompres(ctx, "", "", "")
	if err != nil {
		return nil, err
	}
	for _, c := range compres {
		var factor float64
		if mode == "emissio" {
			if c.DataEmissio >= dataInici && c.DataEmissio <= dataFi {
				factor = 1.0
			}
		} else {
			factor = ProrationFactor(c.PeriodeInici, c.PeriodeFi, dataInici, dataFi)
		}
		if c.DataEmissio >= dataInici && c.DataEmissio <= dataFi {
			resp.IvaSuportat += c.IvaImport
			resp.IrpfRetingutComp += c.IrpfImport
		}
		if factor == 0 {
			continue
		}
		amt := c.BaseImposable * factor
		resp.TotalCompres += amt
		uRow := ensureUnit(c.UnitatNegociID)
		uRow.CompresBase += amt
		cRow, cKey := ensureCoach(c.EntrenadorID)
		cRow.CompresBase += amt
		getCross(c.UnitatNegociID, cKey).CompresBase += amt
	}

	// 3. Despeses no facturables (Import Total)
	despeses, err := s.ListFinDespeses(ctx, "", "", "")
	if err != nil {
		return nil, err
	}
	for _, d := range despeses {
		var factor float64
		if mode == "emissio" {
			if d.DataDevengo >= dataInici && d.DataDevengo <= dataFi {
				factor = 1.0
			}
		} else {
			factor = ProrationFactor(d.PeriodeInici, d.PeriodeFi, dataInici, dataFi)
		}
		if factor == 0 {
			continue
		}
		amt := d.ImportTotal * factor
		resp.TotalDespeses += amt
		uRow := ensureUnit(d.UnitatNegociID)
		uRow.DespesesImport += amt
		cRow, cKey := ensureCoach(d.EntrenadorID)
		cRow.DespesesImport += amt
		getCross(d.UnitatNegociID, cKey).DespesesImport += amt
	}

	finalizeRow := func(r *models.FinAnalyticalRow) {
		r.VendesBase = roundCurrency(r.VendesBase)
		r.CompresBase = roundCurrency(r.CompresBase)
		r.DespesesImport = roundCurrency(r.DespesesImport)
		r.ResultatNet = roundCurrency(r.VendesBase - r.CompresBase - r.DespesesImport)
		if r.VendesBase > 0 {
			r.MargePct = roundCurrency((r.ResultatNet / r.VendesBase) * 100.0)
		}
	}

	resp.TotalVendes = roundCurrency(resp.TotalVendes)
	resp.TotalCompres = roundCurrency(resp.TotalCompres)
	resp.TotalDespeses = roundCurrency(resp.TotalDespeses)
	resp.ResultatGlobal = roundCurrency(resp.TotalVendes - resp.TotalCompres - resp.TotalDespeses)
	if resp.TotalVendes > 0 {
		resp.MargeGlobalPct = roundCurrency((resp.ResultatGlobal / resp.TotalVendes) * 100.0)
	}
	resp.IvaRepercutit = roundCurrency(resp.IvaRepercutit)
	resp.IvaSuportat = roundCurrency(resp.IvaSuportat)
	resp.IrpfRetingutComp = roundCurrency(resp.IrpfRetingutComp)
	resp.IrpfSuportatVend = roundCurrency(resp.IrpfSuportatVend)

	resp.PerUnitatNegoci = []models.FinAnalyticalRow{}
	for _, u := range unitats {
		if r, ok := byUnitat[u.ID]; ok {
			finalizeRow(r)
			resp.PerUnitatNegoci = append(resp.PerUnitatNegoci, *r)
		}
	}

	resp.PerEntrenador = []models.FinAnalyticalRow{}
	for _, e := range entrenadors {
		if r, ok := byCoach[e.ID]; ok {
			finalizeRow(r)
			resp.PerEntrenador = append(resp.PerEntrenador, *r)
		}
	}
	if noneRow, ok := byCoach["__none__"]; ok {
		finalizeRow(noneRow)
		resp.PerEntrenador = append(resp.PerEntrenador, *noneRow)
	}

	resp.MatriuCreuada = []models.FinAnalyticalRow{}
	for _, r := range crossMap {
		finalizeRow(r)
		if r.VendesBase != 0 || r.CompresBase != 0 || r.DespesesImport != 0 {
			resp.MatriuCreuada = append(resp.MatriuCreuada, *r)
		}
	}
	sort.Slice(resp.MatriuCreuada, func(i, j int) bool {
		if resp.MatriuCreuada[i].GroupNom == resp.MatriuCreuada[j].GroupNom {
			return resp.MatriuCreuada[i].SubGroupNom < resp.MatriuCreuada[j].SubGroupNom
		}
		return resp.MatriuCreuada[i].GroupNom < resp.MatriuCreuada[j].GroupNom
	})

	return resp, nil
}

// ============================================================
// 8. Motor de Previsió de Caixa (Cashflow Forecast 4 Capes + IVA/IRPF)
// ============================================================

func quarterKeyFromDate(dateISO string) string {
	if len(dateISO) < 7 {
		return ""
	}
	year := dateISO[:4]
	month := dateISO[5:7]
	switch month {
	case "01", "02", "03":
		return year + "-Q1"
	case "04", "05", "06":
		return year + "-Q2"
	case "07", "08", "09":
		return year + "-Q3"
	default:
		return year + "-Q4"
	}
}

func quarterSettlementDate(qKey string) string {
	if len(qKey) != 7 {
		return ""
	}
	var y int
	var q int
	_, _ = fmt.Sscanf(qKey, "%d-Q%d", &y, &q)
	switch q {
	case 1:
		return fmt.Sprintf("%04d-04-20", y)
	case 2:
		return fmt.Sprintf("%04d-07-20", y)
	case 3:
		return fmt.Sprintf("%04d-10-20", y)
	case 4:
		return fmt.Sprintf("%04d-01-20", y+1)
	}
	return ""
}

func (s *PostgresStore) GetFinCashflowForecast(ctx context.Context, horitzoDies int, inclouEndarrerits bool) (*models.FinCashflowForecastResponse, error) {
	if horitzoDies <= 0 {
		horitzoDies = 90
	}
	if horitzoDies > 730 {
		horitzoDies = 730
	}

	cfg, err := s.GetFinConfiguracioEmpresa(ctx)
	if err != nil {
		return nil, err
	}

	todayT := time.Now().UTC()
	today := todayT.Format("2006-01-02")
	horizonEnd := todayT.AddDate(0, 0, horitzoDies).Format("2006-01-02")

	resp := &models.FinCashflowForecastResponse{
		DataTallSaldo:     cfg.DataTallSaldo,
		SaldoInicialTall:  cfg.SaldoInicial,
		HoritzoDies:       horitzoDies,
		InclouEndarrerits: inclouEndarrerits,
	}

	type qTaxAcc struct {
		ivaRep   float64
		ivaSup   float64
		irpfComp float64
	}
	qTaxes := map[string]*qTaxAcc{}
	getQ := func(dateISO string) *qTaxAcc {
		qk := quarterKeyFromDate(dateISO)
		if q, ok := qTaxes[qk]; ok {
			return q
		}
		q := &qTaxAcc{}
		qTaxes[qk] = q
		return q
	}

	items := []models.FinCashflowItem{}

	// 1. Factures de venda emeses
	factures, err := s.ListFinFacturesVenda(ctx, "emesa", "", "", "")
	if err != nil {
		return nil, err
	}
	for _, f := range factures {
		q := getQ(f.DataEmissio)
		q.ivaRep += f.IvaImport

		if f.EstatCobrament == "pagada" && f.DataConciliacio != nil && *f.DataConciliacio >= cfg.DataTallSaldo {
			resp.CobramentsConciliats += f.TotalFactura
			continue
		}
		if f.EstatCobrament == "impagada" {
			resp.TotalImpagatsExclosos += f.TotalFactura
			continue
		}
		if f.EstatCobrament == "pendent" {
			isOverdue := f.DataVenciment < today
			if isOverdue {
				resp.EndarreritsCobrar += f.TotalFactura
				if !inclouEndarrerits {
					continue
				}
			}
			effDate := f.DataVenciment
			if isOverdue {
				effDate = today
			}
			if effDate <= horizonEnd {
				tipus := "entrada"
				amt := f.TotalFactura
				if amt < 0 {
					tipus = "sortida"
					amt = -amt
				}
				numStr := f.Concepte
				if f.NumeroComplet != nil {
					numStr = *f.NumeroComplet + " · " + f.Concepte
				}
				items = append(items, models.FinCashflowItem{
					Data:         effDate,
					Tipus:        tipus,
					Origen:       "factura_venda",
					Concepte:     numStr,
					Tercer:       f.ClientNom,
					UnitatNegoci: f.UnitatNegociNom,
					ImportLiquid: roundCurrency(amt),
					Endarrerit:   isOverdue,
					ReferenciaID: f.ID,
				})
			}
		}
	}

	// 2. Factures de compra
	compres, err := s.ListFinCompres(ctx, "", "", "")
	if err != nil {
		return nil, err
	}
	for _, c := range compres {
		q := getQ(c.DataEmissio)
		q.ivaSup += c.IvaImport
		q.irpfComp += c.IrpfImport

		if c.EstatPagament == "pagada" && c.DataConciliacio != nil && *c.DataConciliacio >= cfg.DataTallSaldo {
			resp.PagamentsConciliats += c.TotalPagar
			continue
		}
		if c.EstatPagament == "pendent" {
			isOverdue := c.DataVenciment < today
			if isOverdue {
				resp.EndarreritsPagar += c.TotalPagar
				if !inclouEndarrerits {
					continue
				}
			}
			effDate := c.DataVenciment
			if isOverdue {
				effDate = today
			}
			if effDate <= horizonEnd {
				items = append(items, models.FinCashflowItem{
					Data:         effDate,
					Tipus:        "sortida",
					Origen:       "compra",
					Concepte:     c.NumFacturaProveidor + " · " + c.Concepte,
					Tercer:       c.ProveidorNom,
					UnitatNegoci: c.UnitatNegociNom,
					ImportLiquid: roundCurrency(c.TotalPagar),
					Endarrerit:   isOverdue,
					ReferenciaID: c.ID,
				})
			}
		}
	}

	// 3. Despeses no facturables
	despeses, err := s.ListFinDespeses(ctx, "", "", "")
	if err != nil {
		return nil, err
	}
	for _, d := range despeses {
		if d.EstatPagament == "pagada" && d.DataConciliacio != nil && *d.DataConciliacio >= cfg.DataTallSaldo {
			resp.PagamentsConciliats += d.ImportTotal
			continue
		}
		if d.EstatPagament == "pendent" {
			isOverdue := d.DataVenciment < today
			if isOverdue {
				resp.EndarreritsPagar += d.ImportTotal
				if !inclouEndarrerits {
					continue
				}
			}
			effDate := d.DataVenciment
			if isOverdue {
				effDate = today
			}
			if effDate <= horizonEnd {
				items = append(items, models.FinCashflowItem{
					Data:         effDate,
					Tipus:        "sortida",
					Origen:       "despesa",
					Concepte:     fmt.Sprintf("[%s] %s", d.Categoria, d.Concepte),
					Tercer:       d.BeneficiariNom,
					UnitatNegoci: d.UnitatNegociNom,
					ImportLiquid: roundCurrency(d.ImportTotal),
					Endarrerit:   isOverdue,
					ReferenciaID: d.ID,
				})
			}
		}
	}

	// 4. Fites de Training Camps pendents de facturar
	camps, err := s.ListFinPlansCamp(ctx)
	if err != nil {
		return nil, err
	}
	for _, pc := range camps {
		if pc.Estat != "actiu" {
			continue
		}
		for _, ft := range pc.Fites {
			if ft.FacturaID != nil {
				continue
			}
			effDate := ft.DataPrevista
			if effDate < today {
				if !inclouEndarrerits {
					continue
				}
				effDate = today
			}
			if effDate <= horizonEnd {
				iva := roundCurrency(ft.BaseImposable * ft.IvaPercentatge / 100.0)
				irpf := roundCurrency(ft.BaseImposable * ft.IrpfPercentatge / 100.0)
				liq := roundCurrency(ft.BaseImposable + iva - irpf)
				q := getQ(effDate)
				q.ivaRep += iva
				items = append(items, models.FinCashflowItem{
					Data:         effDate,
					Tipus:        "entrada",
					Origen:       "fita_camp",
					Concepte:     fmt.Sprintf("Camp %s — %s", pc.TitolCamp, ft.ConcepteFita),
					Tercer:       pc.ClientNom,
					UnitatNegoci: pc.UnitatNegociNom,
					ImportLiquid: liq,
					Endarrerit:   ft.DataPrevista < today,
					ReferenciaID: ft.ID,
				})
			}
		}
	}

	// 5. Projecció de Subscripcions Actives
	subs, err := s.ListFinSubscripcions(ctx)
	if err != nil {
		return nil, err
	}
	for _, sb := range subs {
		if !sb.Activa {
			continue
		}
		d := sb.ProperaDataFacturacio
		guard := 0
		for d <= horizonEnd && guard < 36 {
			guard++
			if sb.DataFi != nil && *sb.DataFi != "" && d > *sb.DataFi {
				break
			}
			dueDate := d
			if dt, errT := time.Parse("2006-01-02", d); errT == nil {
				dueDate = dt.AddDate(0, 0, sb.DiesVenciment).Format("2006-01-02")
			}
			if dueDate < today {
				dueDate = today
			}
			if dueDate <= horizonEnd {
				iva := roundCurrency(sb.BaseImposable * sb.IvaPercentatge / 100.0)
				irpf := roundCurrency(sb.BaseImposable * sb.IrpfPercentatge / 100.0)
				liq := roundCurrency(sb.BaseImposable + iva - irpf)
				q := getQ(d)
				q.ivaRep += iva

				conc := sb.ConceptePersonalitzat
				if conc == "" {
					conc = sb.ArticleNom
				}
				items = append(items, models.FinCashflowItem{
					Data:         dueDate,
					Tipus:        "entrada",
					Origen:       "subscripcio_proj",
					Concepte:     fmt.Sprintf("Renovació %dm: %s", sb.PeriodicitatMesos, conc),
					Tercer:       sb.ClientNom,
					UnitatNegoci: sb.UnitatNegociNom,
					ImportLiquid: liq,
					ReferenciaID: sb.ID,
				})
			}
			d = addMonthsDate(d, sb.PeriodicitatMesos)
		}
	}

	// 6. Projecció de Sortides Recurrents (Compres / Despeses fixes)
	recs, err := s.ListFinRecurrentsSortida(ctx)
	if err != nil {
		return nil, err
	}
	for _, rc := range recs {
		if !rc.Actiu {
			continue
		}
		d := rc.ProperaData
		guard := 0
		for d <= horizonEnd && guard < 36 {
			guard++
			if rc.DataFi != nil && *rc.DataFi != "" && d > *rc.DataFi {
				break
			}
			dueDate := d
			if dt, errT := time.Parse("2006-01-02", d); errT == nil {
				dueDate = dt.AddDate(0, 0, rc.DiesVenciment).Format("2006-01-02")
			}
			if dueDate < today {
				dueDate = today
			}
			if dueDate <= horizonEnd {
				liq := rc.BaseOImport
				if rc.TipusDesti == "compra" {
					iva := roundCurrency(rc.BaseOImport * rc.IvaPercentatge / 100.0)
					irpf := roundCurrency(rc.BaseOImport * rc.IrpfPercentatge / 100.0)
					liq = roundCurrency(rc.BaseOImport + iva - irpf)
					q := getQ(d)
					q.ivaSup += iva
					q.irpfComp += irpf
				}
				tercer := rc.BeneficiariNom
				if rc.ProveidorNom != nil && *rc.ProveidorNom != "" {
					tercer = *rc.ProveidorNom
				}
				items = append(items, models.FinCashflowItem{
					Data:         dueDate,
					Tipus:        "sortida",
					Origen:       "recurrent_proj",
					Concepte:     fmt.Sprintf("Recurrent %dm: %s", rc.PeriodicitatMesos, rc.Concepte),
					Tercer:       tercer,
					UnitatNegoci: rc.UnitatNegociNom,
					ImportLiquid: roundCurrency(liq),
					ReferenciaID: rc.ID,
				})
			}
			d = addMonthsDate(d, rc.PeriodicitatMesos)
		}
	}

	// 7. Estimació automàtica de Liquidacions Trimestrals AEAT (Mod. 303 IVA + Mod. 111/115 IRPF)
	qKeys := make([]string, 0, len(qTaxes))
	for k := range qTaxes {
		qKeys = append(qKeys, k)
	}
	sort.Strings(qKeys)

	ivaCreditCarry := 0.0
	for _, qk := range qKeys {
		acc := qTaxes[qk]
		netIVA := acc.ivaRep - acc.ivaSup - ivaCreditCarry
		ivaPayable := 0.0
		if netIVA > 0 {
			ivaPayable = roundCurrency(netIVA)
			ivaCreditCarry = 0
		} else {
			ivaCreditCarry = -netIVA
		}
		irpfPayable := roundCurrency(acc.irpfComp)
		settleDate := quarterSettlementDate(qk)
		if settleDate >= today && settleDate <= horizonEnd {
			if ivaPayable > 0 {
				items = append(items, models.FinCashflowItem{
					Data:         settleDate,
					Tipus:        "sortida",
					Origen:       "liquidacio_iva_irpf",
					Concepte:     fmt.Sprintf("Estimació AEAT Mod. 303 IVA (%s)", qk),
					Tercer:       "Agència Tributària (AEAT)",
					UnitatNegoci: "Fiscalitat Global",
					ImportLiquid: ivaPayable,
				})
			}
			if irpfPayable > 0 {
				items = append(items, models.FinCashflowItem{
					Data:         settleDate,
					Tipus:        "sortida",
					Origen:       "liquidacio_iva_irpf",
					Concepte:     fmt.Sprintf("Estimació AEAT Mod. 111/115 Retencions IRPF (%s)", qk),
					Tercer:       "Agència Tributària (AEAT)",
					UnitatNegoci: "Fiscalitat Global",
					ImportLiquid: irpfPayable,
				})
			}
		}
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].Data == items[j].Data {
			return items[i].Tipus < items[j].Tipus // entrades primer el mateix dia
		}
		return items[i].Data < items[j].Data
	})

	resp.CobramentsConciliats = roundCurrency(resp.CobramentsConciliats)
	resp.PagamentsConciliats = roundCurrency(resp.PagamentsConciliats)
	resp.EndarreritsCobrar = roundCurrency(resp.EndarreritsCobrar)
	resp.EndarreritsPagar = roundCurrency(resp.EndarreritsPagar)
	resp.TotalImpagatsExclosos = roundCurrency(resp.TotalImpagatsExclosos)
	resp.SaldoActualConciliat = roundCurrency(cfg.SaldoInicial + resp.CobramentsConciliats - resp.PagamentsConciliats)

	running := resp.SaldoActualConciliat
	minBal := running
	minDate := today

	monthMap := map[string]*models.FinCashflowMonthBucket{}
	monthOrder := []string{}
	curMonthT := time.Date(todayT.Year(), todayT.Month(), 1, 0, 0, 0, 0, time.UTC)
	endT, _ := time.Parse("2006-01-02", horizonEnd)
	for !curMonthT.After(endT) {
		mk := curMonthT.Format("2006-01")
		monthMap[mk] = &models.FinCashflowMonthBucket{Mes: mk}
		monthOrder = append(monthOrder, mk)
		curMonthT = curMonthT.AddDate(0, 1, 0)
	}

	for _, it := range items {
		if it.Tipus == "entrada" {
			running = roundCurrency(running + it.ImportLiquid)
		} else {
			running = roundCurrency(running - it.ImportLiquid)
		}
		if running < minBal {
			minBal = running
			minDate = it.Data
		}
		if len(it.Data) >= 7 {
			mk := it.Data[:7]
			if b, ok := monthMap[mk]; ok {
				if it.Tipus == "entrada" {
					b.Entrades = roundCurrency(b.Entrades + it.ImportLiquid)
				} else {
					b.Sortides = roundCurrency(b.Sortides + it.ImportLiquid)
				}
			}
		}
	}

	mBal := resp.SaldoActualConciliat
	resp.EvolucioMensual = []models.FinCashflowMonthBucket{}
	for _, mk := range monthOrder {
		b := monthMap[mk]
		b.SaldoInicial = mBal
		b.FluxNet = roundCurrency(b.Entrades - b.Sortides)
		b.SaldoFinal = roundCurrency(b.SaldoInicial + b.FluxNet)
		mBal = b.SaldoFinal
		resp.EvolucioMensual = append(resp.EvolucioMensual, *b)
	}

	resp.SaldoFinalProjectat = running
	resp.SaldoMinimProjectat = minBal
	resp.DataSaldoMinim = minDate
	resp.MovimentsProjectats = items

	return resp, nil
}
