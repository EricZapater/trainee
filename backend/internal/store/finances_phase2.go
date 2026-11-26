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
// 2. Liquidació Mensual per Entrenador (Total Factura IVA inclòs)
// ============================================================

func (s *PostgresStore) GetFinLiquidacioEntrenadors(ctx context.Context, mes string) (*models.FinLiquidacioEntrenadorsResponse, error) {
	entrenadors, err := s.ListEntrenadors(ctx)
	if err != nil {
		return nil, err
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
				EntrenadorID:  e.ID,
				EntrenadorNom: e.Nom,
				PerArticle:    []models.FinLiquidacioArticleGroup{},
			},
			artMap:   map[string]*models.FinLiquidacioArticleGroup{},
			artOrder: []string{},
		}
		orderedIDs = append(orderedIDs, e.ID)
	}
	byCoach["__none__"] = &coachAcc{
		row: &models.FinLiquidacioEntrenadorRow{
			EntrenadorID:  "__none__",
			EntrenadorNom: "Sense Entrenador / Estructura",
			PerArticle:    []models.FinLiquidacioArticleGroup{},
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
				EntrenadorID:  key,
				EntrenadorNom: nom,
				PerArticle:    []models.FinLiquidacioArticleGroup{},
			},
			artMap:   map[string]*models.FinLiquidacioArticleGroup{},
			artOrder: []string{},
		}
		byCoach[key] = acc
		orderedIDs = append(orderedIDs, key)
		return acc
	}

	getArt := func(acc *coachAcc, key, nom, tipus string) *models.FinLiquidacioArticleGroup {
		if g, ok := acc.artMap[key]; ok {
			return g
		}
		g := &models.FinLiquidacioArticleGroup{
			Key:        key,
			ArticleNom: nom,
			Tipus:      tipus,
		}
		acc.artMap[key] = g
		acc.artOrder = append(acc.artOrder, key)
		return g
	}

	// 1. Vendes emeses del mes seleccionat (sempre sobre Total Factura IVA inclòs), agrupades per article
	rowsV, err := s.pool.Query(ctx, `
		SELECT COALESCE(fv.article_id::text, '__venda_sense_art__'),
		       COALESCE(NULLIF(ar.nom, ''), ' Altres vendes sense article'),
		       fv.estat_cobrament,
		       fv.total_factura::float8, fv.import_cobrat::float8, fv.import_pendent::float8,
		       fv.entrenador_id, en.nom
		FROM fin_factures_venda fv
		LEFT JOIN fin_articles ar ON ar.id = fv.article_id
		LEFT JOIN entrenadors en ON en.id = fv.entrenador_id
		WHERE fv.estat_document = 'emesa'
		  AND TO_CHAR(fv.data_emissio, 'YYYY-MM') = $1
		ORDER BY ar.nom ASC NULLS LAST
	`, mes)
	if err != nil {
		return nil, err
	}
	defer rowsV.Close()

	for rowsV.Next() {
		var artKey, artNom, estatCob string
		var totalF, cobratF, pendentF float64
		var cID, cNom *string
		if err := rowsV.Scan(&artKey, &artNom, &estatCob, &totalF, &cobratF, &pendentF, &cID, &cNom); err != nil {
			return nil, err
		}
		acc := getAcc(cID, cNom)
		acc.row.NumFacturesVenda++
		acc.row.Venut += totalF
		acc.row.Cobrat += cobratF

		g := getArt(acc, "venda:"+artKey, artNom, "venda")
		g.NumMoviments++
		g.Venut += totalF
		g.Cobrat += cobratF

		if estatCob == "impagada" {
			acc.row.Impagat += pendentF
			g.Impagat += pendentF
		} else if estatCob != "compensada" && estatCob != "pagada" {
			acc.row.Pendent += pendentF
			g.Pendent += pendentF
		}
	}

	// 2. Factures de Compra del mes (Total a pagar IVA inclòs), agrupades per article
	rowsC, err := s.pool.Query(ctx, `
		SELECT COALESCE(c.article_id::text, '__compra_general__'),
		       COALESCE(NULLIF(ar.nom, ''), 'Factures de Compra (General)'),
		       c.total_pagar::float8, c.entrenador_id, en.nom
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
		var totalP float64
		var cID, cNom *string
		if err := rowsC.Scan(&artKey, &artNom, &totalP, &cID, &cNom); err != nil {
			return nil, err
		}
		acc := getAcc(cID, cNom)
		acc.row.NumCompresDespeses++
		acc.row.CompresFactures += totalP

		g := getArt(acc, "compra:"+artKey, artNom, "compra")
		g.NumMoviments++
		g.Comprat += totalP
	}

	// 3. Despeses Operatives del mes (Import Total), agrupades per categoria
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
		g := getArt(acc, "despesa:"+cat, label, "despesa")
		g.NumMoviments++
		g.Comprat += impTotal
	}

	resp := &models.FinLiquidacioEntrenadorsResponse{
		Mes:   mes,
		Files: []models.FinLiquidacioEntrenadorRow{},
	}

	sort.SliceStable(orderedIDs, func(i, j int) bool {
		return byCoach[orderedIDs[i]].row.EntrenadorNom < byCoach[orderedIDs[j]].row.EntrenadorNom
	})

	allKeys := append(orderedIDs, "__none__")
	for _, key := range allKeys {
		acc := byCoach[key]
		r := acc.row
		if key == "__none__" && r.NumFacturesVenda == 0 && r.NumCompresDespeses == 0 {
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

		resp.TotalVenut += r.Venut
		resp.TotalCobrat += r.Cobrat
		resp.TotalPendent += r.Pendent
		resp.TotalImpagat += r.Impagat
		resp.TotalComprat += r.Comprat

		resp.Files = append(resp.Files, *r)
	}

	resp.TotalVenut = roundCurrency(resp.TotalVenut)
	resp.TotalCobrat = roundCurrency(resp.TotalCobrat)
	resp.TotalPendent = roundCurrency(resp.TotalPendent)
	resp.TotalImpagat = roundCurrency(resp.TotalImpagat)
	resp.TotalNoCobrat = roundCurrency(resp.TotalPendent + resp.TotalImpagat)
	resp.TotalComprat = roundCurrency(resp.TotalComprat)
	resp.LiquidacioSobreVenut = roundCurrency(resp.TotalVenut - resp.TotalComprat)
	resp.LiquidacioSobreCobrat = roundCurrency(resp.TotalCobrat - resp.TotalComprat)

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
