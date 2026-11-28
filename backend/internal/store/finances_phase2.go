package store

import (
	"context"
	"fmt"
	"math"
	"sort"

	"trainee-backend/internal/models"
)

// ============================================================
// 1. Cobraments Parcials i Saldos de Factura de Venda
// ============================================================

func (s *PostgresStore) ListFinFacturaCobraments(ctx context.Context, facturaID string) ([]models.FinFacturaCobrament, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, factura_id, TO_CHAR(data_cobrament, 'YYYY-MM-DD'), import::float8,
		       metode_pagament, notes, created_by, created_at
		FROM fin_factures_cobraments
		WHERE factura_id = $1
		ORDER BY data_cobrament ASC, created_at ASC
	`, facturaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.FinFacturaCobrament{}
	for rows.Next() {
		var c models.FinFacturaCobrament
		if err := rows.Scan(&c.ID, &c.FacturaID, &c.DataCobrament, &c.Import, &c.MetodePagament, &c.Notes, &c.CreatedBy, &c.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, rows.Err()
}

func (s *PostgresStore) recalcFacturaCobrament(ctx context.Context, facturaID string) (*models.FinFacturaVenda, error) {
	var estatDoc, currEstatCob string
	var totalFactura float64
	err := s.pool.QueryRow(ctx, `
		SELECT estat_document, estat_cobrament, total_factura::float8
		FROM fin_factures_venda
		WHERE id = $1
	`, facturaID).Scan(&estatDoc, &currEstatCob, &totalFactura)
	if err != nil {
		return nil, err
	}

	var sumCobrat float64
	var lastData *string
	_ = s.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(import), 0)::float8,
		       MAX(TO_CHAR(data_cobrament, 'YYYY-MM-DD'))
		FROM fin_factures_cobraments
		WHERE factura_id = $1
	`, facturaID).Scan(&sumCobrat, &lastData)

	sumCobrat = roundCurrency(sumCobrat)

	if currEstatCob == "compensada" {
		_, err = s.pool.Exec(ctx, `
			UPDATE fin_factures_venda
			SET import_cobrat = $1, import_pendent = 0, updated_at = now()
			WHERE id = $2
		`, sumCobrat, facturaID)
		if err != nil {
			return nil, err
		}
		return s.GetFinFacturaVendaByID(ctx, facturaID)
	}

	if totalFactura <= 0 {
		pendent := totalFactura
		if currEstatCob == "pagada" {
			pendent = 0
		}
		_, err = s.pool.Exec(ctx, `
			UPDATE fin_factures_venda
			SET import_cobrat = CASE WHEN estat_cobrament = 'pagada' THEN total_factura ELSE 0 END,
			    import_pendent = $1, updated_at = now()
			WHERE id = $2
		`, roundCurrency(pendent), facturaID)
		if err != nil {
			return nil, err
		}
		return s.GetFinFacturaVendaByID(ctx, facturaID)
	}

	pendent := roundCurrency(math.Max(0, totalFactura-sumCobrat))
	nextEstat := currEstatCob
	var nextDataConc *string

	if pendent <= 0.009 {
		pendent = 0
		sumCobrat = roundCurrency(totalFactura)
		nextEstat = "pagada"
		nextDataConc = lastData
	} else if sumCobrat > 0 {
		if currEstatCob != "impagada" {
			nextEstat = "parcial"
		}
		nextDataConc = nil
	} else {
		if currEstatCob != "impagada" {
			nextEstat = "pendent"
		}
		nextDataConc = nil
	}

	_, err = s.pool.Exec(ctx, `
		UPDATE fin_factures_venda
		SET import_cobrat = $1,
		    import_pendent = $2,
		    estat_cobrament = $3,
		    data_conciliacio = $4::date,
		    updated_at = now()
		WHERE id = $5
	`, sumCobrat, pendent, nextEstat, nextDataConc, facturaID)
	if err != nil {
		return nil, err
	}

	return s.GetFinFacturaVendaByID(ctx, facturaID)
}

func (s *PostgresStore) CreateFinFacturaCobrament(ctx context.Context, facturaID string, req models.CreateFinFacturaCobramentRequest, createdBy *string) (*models.FinFacturaVenda, error) {
	fv, err := s.GetFinFacturaVendaByID(ctx, facturaID)
	if err != nil {
		return nil, fmt.Errorf("factura no trobada: %w", err)
	}
	if fv.EstatDocument != "emesa" {
		return nil, fmt.Errorf("només es poden registrar cobraments sobre factures emeses")
	}
	if fv.TotalFactura <= 0 {
		return nil, fmt.Errorf("no es poden afegir cobraments parcials sobre abonaments negatius")
	}

	imp := roundCurrency(req.Import)
	if imp <= 0 {
		return nil, fmt.Errorf("l'import del cobrament ha de ser superior a 0")
	}
	if imp > fv.ImportPendent+0.02 {
		return nil, fmt.Errorf("l'import del cobrament (%.2f €) supera el saldo pendent de la factura (%.2f €)", imp, fv.ImportPendent)
	}
	if imp > fv.ImportPendent {
		imp = fv.ImportPendent
	}

	metode := req.MetodePagament
	if metode == "" {
		metode = "transferencia"
	}

	// Si estava marcada com a impagada i ara rep un pagament, reactivem el cicle de cobrament
	if fv.EstatCobrament == "impagada" {
		_, _ = s.pool.Exec(ctx, `UPDATE fin_factures_venda SET estat_cobrament = 'parcial', data_impagament = NULL WHERE id = $1`, facturaID)
	}

	_, err = s.pool.Exec(ctx, `
		INSERT INTO fin_factures_cobraments (factura_id, data_cobrament, import, metode_pagament, notes, created_by)
		VALUES ($1, $2::date, $3, $4, $5, $6)
	`, facturaID, req.DataCobrament, imp, metode, req.Notes, nullableUUID(createdBy))
	if err != nil {
		return nil, err
	}

	return s.recalcFacturaCobrament(ctx, facturaID)
}

func (s *PostgresStore) DeleteFinFacturaCobrament(ctx context.Context, facturaID, cobramentID string) (*models.FinFacturaVenda, error) {
	tag, err := s.pool.Exec(ctx, `DELETE FROM fin_factures_cobraments WHERE id = $1 AND factura_id = $2`, cobramentID, facturaID)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, fmt.Errorf("registre de cobrament no trobat")
	}
	// Si estava pagada, forcem pas a pendent/parcial al recalcular
	_, _ = s.pool.Exec(ctx, `UPDATE fin_factures_venda SET estat_cobrament = 'pendent' WHERE id = $1 AND estat_cobrament = 'pagada'`, facturaID)
	return s.recalcFacturaCobrament(ctx, facturaID)
}

// ============================================================
// 2. Regles de Comissió entre Entrenadors & Liquidació Mensual
// ============================================================

func normalizeComissioReq(req *models.UpsertFinEntrenadorComissioRequest) error {
	if req.TipusBeneficiari != "estructura" {
		req.TipusBeneficiari = "entrenador"
	}
	if req.TipusBeneficiari == "entrenador" {
		if req.EntrenadorBeneficiariID == nil || *req.EntrenadorBeneficiariID == "" {
			return fmt.Errorf("cal seleccionar l'entrenador beneficiari de la comissió")
		}
		if *req.EntrenadorBeneficiariID == req.EntrenadorOrigenID {
			return fmt.Errorf("un entrenador no pot ser comissionista de si mateix")
		}
	} else {
		req.EntrenadorBeneficiariID = nil
	}

	if req.BaseCalcul != "total" && req.BaseCalcul != "base" {
		req.BaseCalcul = "ambdues"
	}
	if req.Ambit != "unitat_negoci" && req.Ambit != "article" {
		req.Ambit = "tot_comissionable"
	}
	if req.Ambit == "tot_comissionable" {
		req.UnitatNegociID = nil
		req.ArticleID = nil
	} else if req.Ambit == "unitat_negoci" {
		req.ArticleID = nil
		if req.UnitatNegociID == nil || *req.UnitatNegociID == "" {
			return fmt.Errorf("cal seleccionar la Unitat de Negoci per a aquest àmbit")
		}
	} else if req.Ambit == "article" {
		req.UnitatNegociID = nil
		if req.ArticleID == nil || *req.ArticleID == "" {
			return fmt.Errorf("cal seleccionar l'Article per a aquest àmbit")
		}
	}
	if req.MesFi != nil && *req.MesFi == "" {
		req.MesFi = nil
	}
	if req.MesFi != nil && *req.MesFi < req.MesInici {
		return fmt.Errorf("el mes de fi de vigència no pot ser anterior al mes d'inici")
	}
	return nil
}

func (s *PostgresStore) ListFinEntrenadorComissions(ctx context.Context) ([]models.FinEntrenadorComissio, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT ec.id, ec.entrenador_origen_id, eo.nom,
		       ec.tipus_beneficiari, ec.entrenador_beneficiari_id, COALESCE(eb.nom, 'Estructura / Empresa'),
		       ec.percentatge::float8, ec.base_calcul, ec.ambit,
		       ec.unitat_negoci_id, un.nom, ec.article_id, ar.nom,
		       ec.mes_inici, ec.mes_fi, ec.actiu, ec.notes, ec.created_at
		FROM fin_entrenador_comissions ec
		JOIN entrenadors eo ON eo.id = ec.entrenador_origen_id
		LEFT JOIN entrenadors eb ON eb.id = ec.entrenador_beneficiari_id
		LEFT JOIN fin_unitats_negoci un ON un.id = ec.unitat_negoci_id
		LEFT JOIN fin_articles ar ON ar.id = ec.article_id
		ORDER BY eo.nom ASC, ec.actiu DESC, ec.mes_inici DESC, ec.created_at ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.FinEntrenadorComissio{}
	for rows.Next() {
		var it models.FinEntrenadorComissio
		if err := rows.Scan(
			&it.ID, &it.EntrenadorOrigenID, &it.EntrenadorOrigenNom,
			&it.TipusBeneficiari, &it.EntrenadorBeneficiariID, &it.EntrenadorBeneficiariNom,
			&it.Percentatge, &it.BaseCalcul, &it.Ambit,
			&it.UnitatNegociID, &it.UnitatNegociNom, &it.ArticleID, &it.ArticleNom,
			&it.MesInici, &it.MesFi, &it.Actiu, &it.Notes, &it.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, it)
	}
	return list, rows.Err()
}

func (s *PostgresStore) CreateFinEntrenadorComissio(ctx context.Context, req models.UpsertFinEntrenadorComissioRequest) (*models.FinEntrenadorComissio, error) {
	if err := normalizeComissioReq(&req); err != nil {
		return nil, err
	}
	var id string
	err := s.pool.QueryRow(ctx, `
		INSERT INTO fin_entrenador_comissions (
			entrenador_origen_id, tipus_beneficiari, entrenador_beneficiari_id,
			percentatge, base_calcul, ambit, unitat_negoci_id, article_id,
			mes_inici, mes_fi, actiu, notes
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		RETURNING id
	`,
		req.EntrenadorOrigenID, req.TipusBeneficiari, nullableUUID(req.EntrenadorBeneficiariID),
		roundCurrency(req.Percentatge), req.BaseCalcul, req.Ambit,
		nullableUUID(req.UnitatNegociID), nullableUUID(req.ArticleID),
		req.MesInici, req.MesFi, req.Actiu, req.Notes,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	list, err := s.ListFinEntrenadorComissions(ctx)
	if err != nil {
		return nil, err
	}
	for _, it := range list {
		if it.ID == id {
			return &it, nil
		}
	}
	return nil, nil
}

func (s *PostgresStore) UpdateFinEntrenadorComissio(ctx context.Context, id string, req models.UpsertFinEntrenadorComissioRequest) (*models.FinEntrenadorComissio, error) {
	if err := normalizeComissioReq(&req); err != nil {
		return nil, err
	}
	_, err := s.pool.Exec(ctx, `
		UPDATE fin_entrenador_comissions
		SET entrenador_origen_id = $1, tipus_beneficiari = $2, entrenador_beneficiari_id = $3,
		    percentatge = $4, base_calcul = $5, ambit = $6, unitat_negoci_id = $7, article_id = $8,
		    mes_inici = $9, mes_fi = $10, actiu = $11, notes = $12, updated_at = now()
		WHERE id = $13
	`,
		req.EntrenadorOrigenID, req.TipusBeneficiari, nullableUUID(req.EntrenadorBeneficiariID),
		roundCurrency(req.Percentatge), req.BaseCalcul, req.Ambit,
		nullableUUID(req.UnitatNegociID), nullableUUID(req.ArticleID),
		req.MesInici, req.MesFi, req.Actiu, req.Notes, id,
	)
	if err != nil {
		return nil, err
	}
	list, _ := s.ListFinEntrenadorComissions(ctx)
	for _, it := range list {
		if it.ID == id {
			return &it, nil
		}
	}
	return nil, nil
}

func (s *PostgresStore) DeleteFinEntrenadorComissio(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM fin_entrenador_comissions WHERE id = $1`, id)
	return err
}

func (s *PostgresStore) GetFinLiquidacioEntrenadors(ctx context.Context, mes, modeCalcul string) (*models.FinLiquidacioEntrenadorsResponse, error) {
	if modeCalcul != "base" {
		modeCalcul = "total"
	}

	entrenadors, err := s.ListEntrenadors(ctx)
	if err != nil {
		return nil, err
	}

	allRules, err := s.ListFinEntrenadorComissions(ctx)
	if err != nil {
		return nil, err
	}
	activeRules := []models.FinEntrenadorComissio{}
	for _, r := range allRules {
		if !r.Actiu || r.MesInici > mes {
			continue
		}
		if r.MesFi != nil && *r.MesFi != "" && *r.MesFi < mes {
			continue
		}
		activeRules = append(activeRules, r)
	}

	type coachAcc struct {
		row      *models.FinLiquidacioEntrenadorRow
		artMap   map[string]*models.FinLiquidacioArticleGroup
		artOrder []string
	}

	byCoach := map[string]*coachAcc{}
	orderedIDs := []string{}
	for _, e := range entrenadors {
		byCoach[e.ID] = &coachAcc{
			row: &models.FinLiquidacioEntrenadorRow{
				EntrenadorID:     e.ID,
				EntrenadorNom:    e.Nom,
				PerArticle:       []models.FinLiquidacioArticleGroup{},
				DetallComissions: []models.FinLiquidacioComissioDetall{},
			},
			artMap:   map[string]*models.FinLiquidacioArticleGroup{},
			artOrder: []string{},
		}
		orderedIDs = append(orderedIDs, e.ID)
	}
	byCoach["__none__"] = &coachAcc{
		row: &models.FinLiquidacioEntrenadorRow{
			EntrenadorID:     "__none__",
			EntrenadorNom:    "Sense Entrenador / Estructura",
			PerArticle:       []models.FinLiquidacioArticleGroup{},
			DetallComissions: []models.FinLiquidacioComissioDetall{},
		},
		artMap:   map[string]*models.FinLiquidacioArticleGroup{},
		artOrder: []string{},
	}

	getAcc := func(cID *string, cNom *string) *coachAcc {
		key := "__none__"
		if cID != nil && *cID != "" {
			key = *cID
		}
		if acc, ok := byCoach[key]; ok {
			return acc
		}
		nom := "Entrenador"
		if cNom != nil && *cNom != "" {
			nom = *cNom
		}
		acc := &coachAcc{
			row: &models.FinLiquidacioEntrenadorRow{
				EntrenadorID:     key,
				EntrenadorNom:    nom,
				PerArticle:       []models.FinLiquidacioArticleGroup{},
				DetallComissions: []models.FinLiquidacioComissioDetall{},
			},
			artMap:   map[string]*models.FinLiquidacioArticleGroup{},
			artOrder: []string{},
		}
		byCoach[key] = acc
		orderedIDs = append(orderedIDs, key)
		return acc
	}

	getArt := func(acc *coachAcc, key, nom, tipus string, comissionable bool) *models.FinLiquidacioArticleGroup {
		if g, ok := acc.artMap[key]; ok {
			return g
		}
		g := &models.FinLiquidacioArticleGroup{
			Key:           key,
			ArticleNom:    nom,
			Tipus:         tipus,
			Comissionable: comissionable,
		}
		acc.artMap[key] = g
		acc.artOrder = append(acc.artOrder, key)
		return g
	}

	// Accumulator per regla de comissió (sobre import cobrat i previsió sobre venut!)
	type ruleVolumeAcc struct {
		venutTotal  float64
		venutBase   float64
		cobratTotal float64
		cobratBase  float64
	}
	ruleVolumes := map[string]*ruleVolumeAcc{}
	for _, r := range activeRules {
		ruleVolumes[r.ID] = &ruleVolumeAcc{}
	}

	// 1. Vendes emeses del mes seleccionat (amb fallback d'entrenador des de fin_clients -> atletes -> entrenadors)
	rowsV, err := s.pool.Query(ctx, `
		SELECT fv.unitat_negoci_id::text, COALESCE(un.comissionable, FALSE),
		       fv.article_id::text, COALESCE(NULLIF(ar.nom, ''), 'Altres vendes sense article'),
		       CASE
		           WHEN fv.article_id IS NOT NULL THEN (COALESCE(ar.comissionable, FALSE) OR COALESCE(un.comissionable, FALSE))
		           ELSE COALESCE(un.comissionable, FALSE)
		       END,
		       fv.estat_cobrament,
		       fv.base_imposable::float8, fv.total_factura::float8, fv.import_cobrat::float8, fv.import_pendent::float8,
		       en.id::text, en.nom
		FROM fin_factures_venda fv
		JOIN fin_unitats_negoci un ON un.id = fv.unitat_negoci_id
		LEFT JOIN fin_articles ar ON ar.id = fv.article_id
		LEFT JOIN fin_clients fc ON fc.id = fv.client_id
		LEFT JOIN atletes atl ON atl.usuari_id = fc.usuari_id
		LEFT JOIN entrenadors en ON (
			en.id = COALESCE(fv.entrenador_id, atl.entrenador_id)
			OR en.usuari_id = COALESCE(fv.entrenador_id, atl.entrenador_id)
		)
		WHERE fv.estat_document = 'emesa'
		  AND TO_CHAR(fv.data_emissio, 'YYYY-MM') = $1
		ORDER BY ar.nom ASC NULLS LAST
	`, mes)
	if err != nil {
		return nil, err
	}
	defer rowsV.Close()

	for rowsV.Next() {
		var unID, artNom, estatCob string
		var unComiss, isComiss bool
		var artID, cID, cNom *string
		var baseF, totalF, cobratTotal, pendentTotal float64
		if err := rowsV.Scan(&unID, &unComiss, &artID, &artNom, &isComiss, &estatCob, &baseF, &totalF, &cobratTotal, &pendentTotal, &cID, &cNom); err != nil {
			return nil, err
		}

		// Garantir consistència d'imports cobrats i pendents en mode Total i en mode Base Imposable
		ratioCobrat := 0.0
		if estatCob == "pagada" {
			cobratTotal = totalF
			pendentTotal = 0
			ratioCobrat = 1.0
		} else if estatCob == "compensada" || totalF == 0 {
			cobratTotal = 0
			pendentTotal = 0
			ratioCobrat = 0.0
		} else if totalF > 0 {
			ratioCobrat = math.Max(0, math.Min(1, cobratTotal/totalF))
		}
		cobratBase := roundCurrency(baseF * ratioCobrat)
		pendentBase := 0.0
		if estatCob != "pagada" && estatCob != "compensada" {
			pendentBase = roundCurrency(baseF - cobratBase)
		}

		venutVal := totalF
		cobratVal := cobratTotal
		pendentVal := pendentTotal
		if modeCalcul == "base" {
			venutVal = baseF
			cobratVal = cobratBase
			pendentVal = pendentBase
		}

		artKey := "__venda_sense_art__"
		if artID != nil && *artID != "" {
			artKey = *artID
		}

		acc := getAcc(cID, cNom)
		acc.row.NumFacturesVenda++
		acc.row.Venut += venutVal
		acc.row.Cobrat += cobratVal

		g := getArt(acc, "venda:"+artKey, artNom, "venda", isComiss)
		g.NumMoviments++
		g.Venut += venutVal
		g.Cobrat += cobratVal

		if estatCob == "impagada" {
			acc.row.Impagat += pendentVal
			g.Impagat += pendentVal
		} else if estatCob != "compensada" && estatCob != "pagada" {
			acc.row.Pendent += pendentVal
			g.Pendent += pendentVal
		}

		// Acumular tant el volum venut comissionable (previst) com el cobrat real per a cada regla activa
		if cID != nil && *cID != "" {
			for _, rule := range activeRules {
				if rule.EntrenadorOrigenID != *cID {
					continue
				}
				matches := false
				switch rule.Ambit {
				case "tot_comissionable":
					matches = isComiss
				case "unitat_negoci":
					matches = rule.UnitatNegociID != nil && *rule.UnitatNegociID == unID
				case "article":
					matches = rule.ArticleID != nil && artID != nil && *rule.ArticleID == *artID
				}
				if matches {
					rv := ruleVolumes[rule.ID]
					rv.venutTotal += totalF
					rv.venutBase += baseF
					rv.cobratTotal += cobratTotal
					rv.cobratBase += cobratBase
				}
			}
		}
	}

	// 2. Factures de Compra del mes, agrupades per article
	rowsC, err := s.pool.Query(ctx, `
		SELECT COALESCE(c.article_id::text, '__compra_general__'),
		       COALESCE(NULLIF(ar.nom, ''), 'Factures de Compra (General)'),
		       c.base_imposable::float8, c.total_pagar::float8, c.entrenador_id, en.nom
		FROM fin_compres c
		LEFT JOIN fin_articles ar ON ar.id = c.article_id
		LEFT JOIN entrenadors en ON en.id = c.entrenador_id
		WHERE TO_CHAR(c.data_emissio, 'YYYY-MM') = $1
		ORDER BY ar.nom ASC NULLS LAST
	`, mes)
	if err != nil {
		return nil, err
	}
	defer rowsC.Close()

	for rowsC.Next() {
		var artKey, artNom string
		var baseC, totalP float64
		var cID, cNom *string
		if err := rowsC.Scan(&artKey, &artNom, &baseC, &totalP, &cID, &cNom); err != nil {
			return nil, err
		}
		compraVal := totalP
		if modeCalcul == "base" {
			compraVal = baseC
		}
		acc := getAcc(cID, cNom)
		acc.row.NumCompresDespeses++
		acc.row.CompresFactures += compraVal

		g := getArt(acc, "compra:"+artKey, artNom, "compra", false)
		g.NumMoviments++
		g.Comprat += compraVal
	}

	// 3. Despeses Operatives del mes (no porten IVA deduïble -> mateix import), agrupades per categoria
	rowsD, err := s.pool.Query(ctx, `
		SELECT d.categoria, d.import_total::float8, d.entrenador_id, en.nom
		FROM fin_despeses d
		LEFT JOIN entrenadors en ON en.id = d.entrenador_id
		WHERE TO_CHAR(d.data_devengo, 'YYYY-MM') = $1
		ORDER BY d.categoria ASC
	`, mes)
	if err != nil {
		return nil, err
	}
	defer rowsD.Close()

	catLabels := map[string]string{
		"nomina":           "Despesa: Nòmina",
		"seguretat_social": "Despesa: Seguretat Social / Autònom",
		"banc":             "Despesa: Comissió Bancària",
		"impostos":         "Despesa: Impostos / Taxes",
		"dietes":           "Despesa: Dietes / Desplaçaments",
		"altres":           "Despesa: Altres despeses",
	}

	for rowsD.Next() {
		var cat string
		var impTotal float64
		var cID, cNom *string
		if err := rowsD.Scan(&cat, &impTotal, &cID, &cNom); err != nil {
			return nil, err
		}
		acc := getAcc(cID, cNom)
		acc.row.NumCompresDespeses++
		acc.row.DespesesOperatives += impTotal

		label := catLabels[cat]
		if label == "" {
			label = "Despesa: " + cat
		}
		g := getArt(acc, "despesa:"+cat, label, "despesa", false)
		g.NumMoviments++
		g.Comprat += impTotal
	}

	// 4. Aplicar el repartiment de Comissions entre Entrenadors sobre l'import COBRAT (mostrant també el previst sobre venut)
	totalComissionsMogudes := 0.0
	totalComissionsPrevistes := 0.0
	for _, rule := range activeRules {
		rv := ruleVolumes[rule.ID]
		if rv == nil {
			rv = &ruleVolumeAcc{}
		}
		volVenutTotal := roundCurrency(rv.venutTotal)
		volVenutBase := roundCurrency(rv.venutBase)
		volTotal := roundCurrency(rv.cobratTotal)
		volBase := roundCurrency(rv.cobratBase)

		impTotal := roundCurrency(volTotal * rule.Percentatge / 100.0)
		impBase := roundCurrency(volBase * rule.Percentatge / 100.0)
		prevTotal := roundCurrency(volVenutTotal * rule.Percentatge / 100.0)
		prevBase := roundCurrency(volVenutBase * rule.Percentatge / 100.0)

		impAplicat := impTotal
		impPrevist := prevTotal
		switch rule.BaseCalcul {
		case "base":
			impAplicat = impBase
			impPrevist = prevBase
		case "total":
			impAplicat = impTotal
			impPrevist = prevTotal
		default: // "ambdues" -> segueix el modeCalcul actiu de la liquidació
			if modeCalcul == "base" {
				impAplicat = impBase
				impPrevist = prevBase
			} else {
				impAplicat = impTotal
				impPrevist = prevTotal
			}
		}

		ambitDesc := "Tot el comissionable"
		if rule.Ambit == "unitat_negoci" && rule.UnitatNegociNom != nil {
			ambitDesc = "UNE: " + *rule.UnitatNegociNom
		} else if rule.Ambit == "article" && rule.ArticleNom != nil {
			ambitDesc = "Article: " + *rule.ArticleNom
		}

		origID := rule.EntrenadorOrigenID
		origNom := rule.EntrenadorOrigenNom
		origAcc := getAcc(&origID, &origNom)

		var benefAcc *coachAcc
		benefNom := rule.EntrenadorBeneficiariNom
		if rule.TipusBeneficiari == "entrenador" && rule.EntrenadorBeneficiariID != nil && *rule.EntrenadorBeneficiariID != "" {
			benefAcc = getAcc(rule.EntrenadorBeneficiariID, &benefNom)
		} else {
			benefNom = "Estructura / Empresa"
			benefAcc = getAcc(nil, nil)
		}

		origAcc.row.ComissioCedida += impAplicat
		origAcc.row.ComissioCedidaPrevista += impPrevist
		origAcc.row.DetallComissions = append(origAcc.row.DetallComissions, models.FinLiquidacioComissioDetall{
			ReglaID:            rule.ID,
			Direccio:           "cedida",
			ContrapartNom:      benefNom,
			AmbitDescripcio:    ambitDesc,
			BaseCalculRegla:    rule.BaseCalcul,
			Percentatge:        rule.Percentatge,
			VolumVenutTotal:    volVenutTotal,
			VolumVenutBase:     volVenutBase,
			VolumCobratTotal:   volTotal,
			VolumCobratBase:    volBase,
			ImportSobreTotal:   impTotal,
			ImportSobreBase:    impBase,
			ImportPrevistVenut: impPrevist,
			ImportAplicat:      impAplicat,
		})

		benefAcc.row.ComissioRebuda += impAplicat
		benefAcc.row.ComissioRebudaPrevista += impPrevist
		benefAcc.row.DetallComissions = append(benefAcc.row.DetallComissions, models.FinLiquidacioComissioDetall{
			ReglaID:            rule.ID,
			Direccio:           "rebuda",
			ContrapartNom:      origNom,
			AmbitDescripcio:    ambitDesc,
			BaseCalculRegla:    rule.BaseCalcul,
			Percentatge:        rule.Percentatge,
			VolumVenutTotal:    volVenutTotal,
			VolumVenutBase:     volVenutBase,
			VolumCobratTotal:   volTotal,
			VolumCobratBase:    volBase,
			ImportSobreTotal:   impTotal,
			ImportSobreBase:    impBase,
			ImportPrevistVenut: impPrevist,
			ImportAplicat:      impAplicat,
		})

		totalComissionsMogudes += impAplicat
		totalComissionsPrevistes += impPrevist
	}

	resp := &models.FinLiquidacioEntrenadorsResponse{
		Mes:              mes,
		ModeCalcul:       modeCalcul,
		NumReglesActives: len(activeRules),
		Files:            []models.FinLiquidacioEntrenadorRow{},
	}

	sort.SliceStable(orderedIDs, func(i, j int) bool {
		return byCoach[orderedIDs[i]].row.EntrenadorNom < byCoach[orderedIDs[j]].row.EntrenadorNom
	})

	allKeys := append(orderedIDs, "__none__")
	for _, key := range allKeys {
		acc := byCoach[key]
		r := acc.row
		if key == "__none__" && r.NumFacturesVenda == 0 && r.NumCompresDespeses == 0 && len(r.DetallComissions) == 0 {
			continue
		}
		for _, aKey := range acc.artOrder {
			g := acc.artMap[aKey]
			g.Venut = roundCurrency(g.Venut)
			g.Cobrat = roundCurrency(g.Cobrat)
			g.Pendent = roundCurrency(g.Pendent)
			g.Impagat = roundCurrency(g.Impagat)
			g.Comprat = roundCurrency(g.Comprat)
			g.NetSobreVenut = roundCurrency(g.Venut - g.Comprat)
			g.NetSobreCobrat = roundCurrency(g.Cobrat - g.Comprat)
			r.PerArticle = append(r.PerArticle, *g)
		}

		r.Venut = roundCurrency(r.Venut)
		r.Cobrat = roundCurrency(r.Cobrat)
		r.Pendent = roundCurrency(r.Pendent)
		r.Impagat = roundCurrency(r.Impagat)
		r.NoCobratTotal = roundCurrency(r.Pendent + r.Impagat)
		r.CompresFactures = roundCurrency(r.CompresFactures)
		r.DespesesOperatives = roundCurrency(r.DespesesOperatives)
		r.Comprat = roundCurrency(r.CompresFactures + r.DespesesOperatives)
		r.NetSobreVenut = roundCurrency(r.Venut - r.Comprat)
		r.NetSobreCobrat = roundCurrency(r.Cobrat - r.Comprat)
		r.ComissioCedida = roundCurrency(r.ComissioCedida)
		r.ComissioRebuda = roundCurrency(r.ComissioRebuda)
		r.ComissioCedidaPrevista = roundCurrency(r.ComissioCedidaPrevista)
		r.ComissioRebudaPrevista = roundCurrency(r.ComissioRebudaPrevista)
		r.LiquidacioFinal = roundCurrency(r.NetSobreCobrat - r.ComissioCedida + r.ComissioRebuda)

		resp.TotalVenut += r.Venut
		resp.TotalCobrat += r.Cobrat
		resp.TotalPendent += r.Pendent
		resp.TotalImpagat += r.Impagat
		resp.TotalComprat += r.Comprat
		resp.LiquidacioFinalGlobal += r.LiquidacioFinal

		resp.Files = append(resp.Files, *r)
	}

	resp.TotalVenut = roundCurrency(resp.TotalVenut)
	resp.TotalCobrat = roundCurrency(resp.TotalCobrat)
	resp.TotalPendent = roundCurrency(resp.TotalPendent)
	resp.TotalImpagat = roundCurrency(resp.TotalImpagat)
	resp.TotalNoCobrat = roundCurrency(resp.TotalPendent + resp.TotalImpagat)
	resp.TotalComprat = roundCurrency(resp.TotalComprat)
	resp.TotalComissions = roundCurrency(totalComissionsMogudes)
	resp.TotalComissionsPrevistes = roundCurrency(totalComissionsPrevistes)
	resp.LiquidacioSobreVenut = roundCurrency(resp.TotalVenut - resp.TotalComprat)
	resp.LiquidacioSobreCobrat = roundCurrency(resp.TotalCobrat - resp.TotalComprat)
	resp.LiquidacioFinalGlobal = roundCurrency(resp.LiquidacioFinalGlobal)

	return resp, nil
}

// ============================================================
// 3. Avisos Automàtics de Cobrament (Dia Límit & Dia Límit + 1)
// ============================================================

func (s *PostgresStore) GetPendingCoachBillingNotices(ctx context.Context, cutoffDate, anyMes string) ([]models.CoachBillingNoticeGroup, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT en.id, en.nom, u_coach.email, COALESCE(u_coach.idioma, 'CAT'),
		       fv.id, COALESCE(fv.numero_complet, 'FACTURA'), cl.nom_fiscal, fv.concepte,
		       TO_CHAR(fv.data_venciment, 'YYYY-MM-DD'), fv.total_factura::float8, fv.import_pendent::float8
		FROM fin_factures_venda fv
		JOIN fin_clients cl ON cl.id = fv.client_id
		JOIN entrenadors en ON en.id = fv.entrenador_id
		JOIN usuaris u_coach ON u_coach.id = en.usuari_id
		WHERE fv.estat_document = 'emesa'
		  AND fv.total_factura > 0
		  AND fv.import_pendent > 0
		  AND fv.estat_cobrament IN ('pendent', 'parcial')
		  AND fv.data_venciment <= $1::date
		  AND u_coach.email <> ''
		  AND NOT EXISTS (
			  SELECT 1 FROM fin_avisos_cobrament_log l
			  WHERE l.tipus = 'entrenador_dia_limit'
			    AND l.any_mes = $2
			    AND l.destinatari_email = u_coach.email
		  )
		ORDER BY en.nom ASC, cl.nom_fiscal ASC
	`, cutoffDate, anyMes)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	groupMap := map[string]*models.CoachBillingNoticeGroup{}
	order := []string{}
	for rows.Next() {
		var cID, cNom, cEmail, idioma string
		var inv models.CoachUnconciliatedInvoice
		if err := rows.Scan(
			&cID, &cNom, &cEmail, &idioma,
			&inv.FacturaID, &inv.NumeroFactura, &inv.AtletaNom, &inv.Concepte,
			&inv.DataVenciment, &inv.TotalFactura, &inv.ImportPendent,
		); err != nil {
			return nil, err
		}
		g, exists := groupMap[cID]
		if !exists {
			g = &models.CoachBillingNoticeGroup{
				EntrenadorID:    cID,
				EntrenadorNom:   cNom,
				EntrenadorEmail: cEmail,
				Idioma:          idioma,
				Items:           []models.CoachUnconciliatedInvoice{},
			}
			groupMap[cID] = g
			order = append(order, cID)
		}
		g.Items = append(g.Items, inv)
	}

	res := []models.CoachBillingNoticeGroup{}
	for _, k := range order {
		res = append(res, *groupMap[k])
	}
	return res, rows.Err()
}

func (s *PostgresStore) GetPendingAthletePoliteNotices(ctx context.Context, cutoffDate, anyMes string) ([]models.AthletePoliteNoticeItem, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT fv.id, COALESCE(fv.numero_complet, 'FACTURA'), cl.usuari_id,
		       COALESCE(NULLIF(TRIM(u_atl.nom), ''), cl.nom_fiscal),
		       COALESCE(NULLIF(TRIM(u_atl.email), ''), cl.email),
		       COALESCE(u_atl.idioma, 'CAT'),
		       fv.concepte, TO_CHAR(fv.data_venciment, 'YYYY-MM-DD'),
		       fv.total_factura::float8, fv.import_pendent::float8
		FROM fin_factures_venda fv
		JOIN fin_clients cl ON cl.id = fv.client_id
		LEFT JOIN usuaris u_atl ON u_atl.id = cl.usuari_id
		WHERE fv.estat_document = 'emesa'
		  AND fv.total_factura > 0
		  AND fv.import_pendent > 0
		  AND fv.estat_cobrament IN ('pendent', 'parcial')
		  AND fv.data_venciment <= $1::date
		  AND COALESCE(NULLIF(TRIM(u_atl.email), ''), cl.email) <> ''
		  AND NOT EXISTS (
			  SELECT 1 FROM fin_avisos_cobrament_log l
			  WHERE l.tipus = 'atleta_dia_limit_mes_1'
			    AND l.any_mes = $2
			    AND l.factura_id = fv.id
		  )
		ORDER BY cl.nom_fiscal ASC
	`, cutoffDate, anyMes)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.AthletePoliteNoticeItem{}
	for rows.Next() {
		var it models.AthletePoliteNoticeItem
		if err := rows.Scan(
			&it.FacturaID, &it.NumeroFactura, &it.UsuariID,
			&it.AtletaNom, &it.AtletaEmail, &it.Idioma,
			&it.Concepte, &it.DataVenciment, &it.TotalFactura, &it.ImportPendent,
		); err != nil {
			return nil, err
		}
		list = append(list, it)
	}
	return list, rows.Err()
}

func (s *PostgresStore) LogBillingNoticeSent(ctx context.Context, tipus, anyMes string, destinatariID *string, destinatariEmail string, facturaID *string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO fin_avisos_cobrament_log (tipus, any_mes, destinatari_id, destinatari_email, factura_id)
		VALUES ($1, $2, $3, $4, $5)
	`, tipus, anyMes, nullableUUID(destinatariID), destinatariEmail, nullableUUID(facturaID))
	return err
}
