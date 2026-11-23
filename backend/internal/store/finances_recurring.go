package store

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"trainee-backend/internal/models"
)

// ============================================================
// 1. GESTIÓ ECONÒMICA DE L'ATLETA & PAUSA
// ============================================================

func (s *PostgresStore) resolveUsuariID(ctx context.Context, athleteOrUserID string) (string, error) {
	var realUserID string
	err := s.pool.QueryRow(ctx, `
		SELECT id FROM usuaris WHERE id = $1
		UNION
		SELECT usuari_id FROM atletes WHERE id = $1
		LIMIT 1
	`, athleteOrUserID).Scan(&realUserID)
	if err != nil {
		return "", fmt.Errorf("usuari o atleta no trobat: %w", err)
	}
	return realUserID, nil
}

func (s *PostgresStore) GetAtletaEconomica(ctx context.Context, athleteOrUserID string) (*models.AtletaEconomicaResponse, error) {
	usuariID, err := s.resolveUsuariID(ctx, athleteOrUserID)
	if err != nil {
		return nil, err
	}

	// Assegurar primer que existeix a fin_clients
	_, _ = s.pool.Exec(ctx, `
		INSERT INTO fin_clients (usuari_id, nom_fiscal, email, actiu)
		SELECT u.id, TRIM(u.nom || ' ' || COALESCE(u.cognoms, '')), u.email, u.actiu
		FROM usuaris u
		WHERE u.id = $1
		  AND NOT EXISTS (SELECT 1 FROM fin_clients fc WHERE fc.usuari_id = u.id)
	`, usuariID)

	var res models.AtletaEconomicaResponse
	var unID, unNom, artNom *string
	var preuBase, ivaPct, totalPvp *float64
	var periodicitat *int
	var coachID *string
	var pausatData *time.Time

	err = s.pool.QueryRow(ctx, `
		SELECT u.id, u.nom, COALESCE(u.cognoms, ''), u.email,
		       COALESCE(fc.nom_fiscal, ''), COALESCE(fc.nif_cif, ''), COALESCE(fc.adreca, ''), COALESCE(fc.poblacio, ''), COALESCE(fc.cp, ''),
		       u.article_quota_id, a.nom, a.preu_base::float8, a.iva_percentatge::float8,
		       ROUND((a.preu_base * (1 + a.iva_percentatge / 100.0))::numeric, 2)::float8,
		       a.periodicitat_mesos,
		       a.unitat_negoci_id, un.nom,
		       COALESCE(u.forma_pagament, 'sepa_domiciliacio'), COALESCE(u.iban, ''),
		       u.pausat_facturacio, u.pausat_facturacio_per, u.pausat_facturacio_data
		FROM usuaris u
		LEFT JOIN fin_clients fc ON fc.usuari_id = u.id
		LEFT JOIN fin_articles a ON a.id = u.article_quota_id
		LEFT JOIN fin_unitats_negoci un ON un.id = a.unitat_negoci_id
		WHERE u.id = $1
	`, usuariID).Scan(
		&res.UsuariID, &res.Nom, &res.Cognoms, &res.Email,
		&res.NomFiscal, &res.NifCif, &res.Adreca, &res.Poblacio, &res.Cp,
		&res.ArticleQuotaID, &artNom, &preuBase, &ivaPct, &totalPvp, &periodicitat,
		&unID, &unNom,
		&res.FormaPagament, &res.Iban,
		&res.PausatFacturacio, &coachID, &pausatData,
	)
	if err != nil {
		return nil, err
	}

	res.ArticleQuotaNom = artNom
	res.ArticlePreuBase = preuBase
	res.ArticleIvaPct = ivaPct
	res.ArticleTotalPvp = totalPvp
	res.PeriodicitatMesos = periodicitat
	res.CentreCostID = unID
	res.CentreCostNom = unNom
	res.PausatFacturacioPer = coachID
	res.PausatData = pausatData

	return &res, nil
}

func (s *PostgresStore) UpdateAtletaEconomica(ctx context.Context, athleteOrUserID string, req models.AtletaEconomicaRequest) (*models.AtletaEconomicaResponse, error) {
	usuariID, err := s.resolveUsuariID(ctx, athleteOrUserID)
	if err != nil {
		return nil, err
	}

	forma := req.FormaPagament
	if forma == "" {
		forma = "sepa_domiciliacio"
	}

	var artID *uuid.UUID
	if req.ArticleQuotaID != nil && *req.ArticleQuotaID != "" {
		parsed, err := uuid.Parse(*req.ArticleQuotaID)
		if err == nil {
			artID = &parsed
		}
	}

	_, err = s.pool.Exec(ctx, `
		UPDATE usuaris
		SET article_quota_id = $1,
		    forma_pagament = $2,
		    iban = $3,
		    pausat_facturacio = $4
		WHERE id = $5
	`, artID, forma, strings.TrimSpace(req.Iban), req.PausatFacturacio, usuariID)
	if err != nil {
		return nil, err
	}

	// Assegurar primer que existeix a fin_clients
	_, _ = s.pool.Exec(ctx, `
		INSERT INTO fin_clients (usuari_id, nom_fiscal, email, actiu)
		SELECT id, TRIM(nom || ' ' || COALESCE(cognoms, '')), email, TRUE
		FROM usuaris
		WHERE id = $1
		  AND NOT EXISTS (SELECT 1 FROM fin_clients fc WHERE fc.usuari_id = $1)
	`, usuariID)

	// Sincronitzar camps fiscals i IBAN a fin_clients si s'han especificat
	setClauses := []string{"updated_at = now()"}
	args := []interface{}{usuariID}
	argIdx := 2

	if strings.TrimSpace(req.Iban) != "" {
		setClauses = append(setClauses, fmt.Sprintf("iban = $%d", argIdx))
		args = append(args, strings.TrimSpace(req.Iban))
		argIdx++
	}
	if req.NomFiscal != nil && strings.TrimSpace(*req.NomFiscal) != "" {
		setClauses = append(setClauses, fmt.Sprintf("nom_fiscal = $%d", argIdx))
		args = append(args, strings.TrimSpace(*req.NomFiscal))
		argIdx++
	}
	if req.NifCif != nil {
		setClauses = append(setClauses, fmt.Sprintf("nif_cif = $%d", argIdx))
		args = append(args, strings.TrimSpace(*req.NifCif))
		argIdx++
	}
	if req.Adreca != nil {
		setClauses = append(setClauses, fmt.Sprintf("adreca = $%d", argIdx))
		args = append(args, strings.TrimSpace(*req.Adreca))
		argIdx++
	}
	if req.Poblacio != nil {
		setClauses = append(setClauses, fmt.Sprintf("poblacio = $%d", argIdx))
		args = append(args, strings.TrimSpace(*req.Poblacio))
		argIdx++
	}
	if req.Cp != nil {
		setClauses = append(setClauses, fmt.Sprintf("cp = $%d", argIdx))
		args = append(args, strings.TrimSpace(*req.Cp))
		argIdx++
	}

	if len(setClauses) > 1 {
		query := fmt.Sprintf("UPDATE fin_clients SET %s WHERE usuari_id = $1", strings.Join(setClauses, ", "))
		_, _ = s.pool.Exec(ctx, query, args...)
	}

	return s.GetAtletaEconomica(ctx, usuariID)
}

func (s *PostgresStore) UpdateAtletaPausaFacturacio(ctx context.Context, athleteOrUserID string, pausat bool, coachID string) error {
	usuariID, err := s.resolveUsuariID(ctx, athleteOrUserID)
	if err != nil {
		return err
	}

	var coachUUID *string
	if coachID != "" {
		coachUUID = &coachID
	}

	_, err = s.pool.Exec(ctx, `
		UPDATE usuaris
		SET pausat_facturacio = $1,
		    pausat_facturacio_per = $2,
		    pausat_facturacio_data = now()
		WHERE id = $3
	`, pausat, nullableUUID(coachUUID), usuariID)
	return err
}

// ============================================================
// 2. GRAELLA DE FACTURACIÓ PERIÒDICA DEL MES
// ============================================================

func (s *PostgresStore) GetGraellaMes(ctx context.Context, mes string) (*models.GraellaMesResponse, error) {
	if mes == "" {
		mes = time.Now().Format("2006-01")
	}

	// Assegurar que tots els atletes tenen registre a fin_clients
	_, _ = s.SyncAtletesToFinClients(ctx)

	items := []models.GraellaMesItem{}
	var totalPvp, totalBase, totalIva float64

	// 1. Quotes d'Atletes Actius amb article recurrent
	rowsA, errA := s.pool.Query(ctx, `
		SELECT u.id, fc.id, fc.nom_fiscal, COALESCE(fc.nif_cif, ''),
		       a.id, a.nom, a.unitat_negoci_id, un.nom,
		       a.preu_base::float8, a.iva_percentatge::float8,
		       u.forma_pagament, COALESCE(u.iban, ''),
		       u.pausat_facturacio,
		       atl.entrenador_id, ent.nom,
		       ja_emesa.id, ja_emesa.numero_complet
		FROM usuaris u
		JOIN fin_clients fc ON fc.usuari_id = u.id
		JOIN fin_articles a ON a.id = u.article_quota_id
		LEFT JOIN fin_unitats_negoci un ON un.id = a.unitat_negoci_id
		LEFT JOIN atletes atl ON atl.usuari_id = u.id
		LEFT JOIN entrenadors ent ON ent.id = atl.entrenador_id
		LEFT JOIN LATERAL (
			SELECT fv.id, fv.numero_complet
			FROM fin_factures_venda fv
			WHERE fv.client_id = fc.id
			  AND fv.estat_document = 'emesa'
			  AND (
				  TO_CHAR(fv.periode_inici, 'YYYY-MM') = $1
				  OR TO_CHAR(fv.data_emissio, 'YYYY-MM') = $1
			  )
			ORDER BY fv.created_at DESC
			LIMIT 1
		) ja_emesa ON TRUE
		WHERE u.rol = 'atleta' AND u.actiu = TRUE
		ORDER BY u.nom ASC, u.cognoms ASC
	`, mes)
	if errA == nil {
		defer rowsA.Close()
		for rowsA.Next() {
			var uID, cID, cNom, cNif, aID, aNom, forma, iban string
			var unID, unNom, coachID, coachNom, jaID, jaNum *string
			var base, ivaPct float64
			var pausat bool

			if err := rowsA.Scan(&uID, &cID, &cNom, &cNif, &aID, &aNom, &unID, &unNom, &base, &ivaPct, &forma, &iban, &pausat, &coachID, &coachNom, &jaID, &jaNum); err == nil {
				ivaImp := roundCurrency(base * ivaPct / 100.0)
				pvp := roundCurrency(base + ivaImp)
				concepte := fmt.Sprintf("%s - %s", aNom, formatMonthCatalan(mes))
				jaEmesa := jaID != nil && *jaID != ""

				item := models.GraellaMesItem{
					ID:             uID,
					TipusOrigen:    "quota_recurrent",
					UsuariID:       &uID,
					ClientID:       cID,
					ClientNom:      cNom,
					ClientNif:      cNif,
					Concepte:       concepte,
					FormaPagament:  forma,
					Iban:           iban,
					CentreCostID:   unID,
					CentreCostNom:  unNom,
					EntrenadorID:   coachID,
					EntrenadorNom:  coachNom,
					ArticleID:      &aID,
					BaseImposable:  base,
					IvaPercentatge: ivaPct,
					IvaImport:      ivaImp,
					TotalPvp:       pvp,
					Pausat:         pausat,
					DataVenciment:  fmt.Sprintf("%s-05", mes),
					JaEmesa:        jaEmesa,
					FacturaID:      jaID,
					FacturaNumero:  jaNum,
				}
				items = append(items, item)

				if !pausat && !jaEmesa {
					totalPvp += pvp
					totalBase += base
					totalIva += ivaImp
				}
			}
		}
	}

	// 2. Fites de Vendes a Terminis (Opció B / Plans Camp) pendents d'emetre aquest mes
	rowsF, errF := s.pool.Query(ctx, `
		SELECT f.id, pc.client_id, c.nom_fiscal, COALESCE(c.nif_cif, ''),
		       f.concepte_fita, pc.unitat_negoci_id, un.nom, pc.article_id,
		       f.base_imposable::float8, f.iva_percentatge::float8,
		       TO_CHAR(f.data_prevista, 'YYYY-MM-DD'),
		       atl.entrenador_id, ent.nom
		FROM fin_plans_camp_fites f
		JOIN fin_plans_camp pc ON pc.id = f.pla_camp_id
		JOIN fin_clients c ON c.id = pc.client_id
		LEFT JOIN fin_unitats_negoci un ON un.id = pc.unitat_negoci_id
		LEFT JOIN atletes atl ON atl.usuari_id = c.usuari_id
		LEFT JOIN entrenadors ent ON ent.id = atl.entrenador_id
		WHERE f.factura_id IS NULL
		  AND TO_CHAR(f.data_prevista, 'YYYY-MM') = $1
		ORDER BY f.data_prevista ASC
	`, mes)
	if errF == nil {
		defer rowsF.Close()
		for rowsF.Next() {
			var fID, cID, cNom, cNif, fConcepte, dataPrev string
			var unID, unNom, aID, coachID, coachNom *string
			var base, ivaPct float64

			if err := rowsF.Scan(&fID, &cID, &cNom, &cNif, &fConcepte, &unID, &unNom, &aID, &base, &ivaPct, &dataPrev, &coachID, &coachNom); err == nil {
				ivaImp := roundCurrency(base * ivaPct / 100.0)
				pvp := roundCurrency(base + ivaImp)

				item := models.GraellaMesItem{
					ID:             fID,
					TipusOrigen:    "venciment_pactat",
					FitaID:         &fID,
					ClientID:       cID,
					ClientNom:      cNom,
					ClientNif:      cNif,
					Concepte:       fConcepte,
					FormaPagament:  "sepa_domiciliacio",
					CentreCostID:   unID,
					CentreCostNom:  unNom,
					EntrenadorID:   coachID,
					EntrenadorNom:  coachNom,
					ArticleID:      aID,
					BaseImposable:  base,
					IvaPercentatge: ivaPct,
					IvaImport:      ivaImp,
					TotalPvp:       pvp,
					Pausat:         false,
					DataVenciment:  dataPrev,
					JaEmesa:        false,
				}
				items = append(items, item)
				totalPvp += pvp
				totalBase += base
				totalIva += ivaImp
			}
		}
	}

	var pendents, emeses int
	for _, it := range items {
		if it.JaEmesa {
			emeses++
		} else if !it.Pausat {
			pendents++
		}
	}

	return &models.GraellaMesResponse{
		Mes:       mes,
		Items:     items,
		TotalPvp:  roundCurrency(totalPvp),
		TotalBase: roundCurrency(totalBase),
		TotalIva:  roundCurrency(totalIva),
		Count:     len(items),
		Pendents:  pendents,
		Emeses:    emeses,
	}, nil
}

func (s *PostgresStore) EmetreGraella(ctx context.Context, req models.EmetreGraellaRequest) (*models.EmetreGraellaResponse, error) {
	if len(req.Items) == 0 {
		return nil, fmt.Errorf("cap element seleccionat per a facturar")
	}

	dataEmissio := fmt.Sprintf("%s-01", req.Mes)
	periodeInici := dataEmissio
	periodeFi := lastDayOfMonth(req.Mes)
	dataVenciment := fmt.Sprintf("%s-05", req.Mes)

	facturesCreades := 0
	totalFacturat := 0.0
	facturaIDs := []string{}

	for _, it := range req.Items {
		if it.TipusOrigen == "venciment_pactat" && it.FitaID != nil && *it.FitaID != "" {
			// Generar esborrany des de fita i emetre
			fv, err := s.GenerateDraftFromCampFita(ctx, *it.FitaID)
			if err == nil && fv != nil {
				emesa, errE := s.EmetreFinFacturaVenda(ctx, fv.ID, models.EmetreFacturaRequest{
					SerieID:       req.SerieID,
					DataEmissio:   dataEmissio,
					DataVenciment: dataVenciment,
				})
				if errE == nil && emesa != nil {
					facturesCreades++
					totalFacturat += emesa.TotalFactura
					facturaIDs = append(facturaIDs, emesa.ID)
				}
			}
			continue
		}

		// Quota recurrent
		// Comprovar si ja s'havia emès la factura per a aquest client aquest mes
		var alreadyEmitted bool
		_ = s.pool.QueryRow(ctx, `
			SELECT EXISTS(
				SELECT 1 FROM fin_factures_venda
				WHERE client_id = $1
				  AND estat_document = 'emesa'
				  AND (TO_CHAR(periode_inici, 'YYYY-MM') = $2 OR TO_CHAR(data_emissio, 'YYYY-MM') = $2)
			)
		`, it.ClientID, req.Mes).Scan(&alreadyEmitted)
		if alreadyEmitted {
			continue
		}

		// Obtenir unitat de negoci del centre de cost o per defecte
		var unitatID string
		if it.CentreCostID != nil && *it.CentreCostID != "" {
			unitatID = *it.CentreCostID
		} else {
			_ = s.pool.QueryRow(ctx, `SELECT id FROM fin_unitats_negoci ORDER BY created_at ASC LIMIT 1`).Scan(&unitatID)
		}

		upsertReq := models.UpsertFinFacturaVendaRequest{
			SerieID:         req.SerieID,
			ClientID:        it.ClientID,
			UnitatNegociID:  unitatID,
			EntrenadorID:    it.EntrenadorID,
			ArticleID:       it.ArticleID,
			Concepte:        it.Concepte,
			BaseImposable:   it.BaseImposable,
			IvaPercentatge:  it.IvaPercentatge,
			DataEmissio:     dataEmissio,
			DataVenciment:   dataVenciment,
			PeriodeInici:    periodeInici,
			PeriodeFi:       periodeFi,
			EmetreDirecte:   true,
			NotesTresoreria: fmt.Sprintf("Generada automàticament des de la Graella de Facturació del mes %s", req.Mes),
		}

		fv, err := s.CreateFinFacturaVenda(ctx, upsertReq)
		if err == nil && fv != nil {
			facturesCreades++
			totalFacturat += fv.TotalFactura
			facturaIDs = append(facturaIDs, fv.ID)
		}
	}

	return &models.EmetreGraellaResponse{
		FacturesCreades: facturesCreades,
		TotalFacturat:   roundCurrency(totalFacturat),
		FacturaIDs:      facturaIDs,
	}, nil
}

// ============================================================
// 3. GENERACIÓ DE DESPESES RECURRENTS DEL DIA 1
// ============================================================

func (s *PostgresStore) GenerarDespesesRecurrentsMes(ctx context.Context, anyMes string) (int, error) {
	if anyMes == "" {
		anyMes = time.Now().Format("2006-01")
	}

	// Obtenir despeses marcades com a recurrents
	rows, err := s.pool.Query(ctx, `
		SELECT categoria, beneficiari_nom, concepte, unitat_negoci_id, entrenador_id,
		       import_total::float8, dia_mes_generacio
		FROM fin_despeses
		WHERE es_recurrent = TRUE
	`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	type RecDespesa struct {
		Categoria   string
		Beneficiari string
		Concepte    string
		UnitatID    *string
		Entrenador  *string
		Import      float64
		DiaGen      int
	}

	plantilles := []RecDespesa{}
	for rows.Next() {
		var rd RecDespesa
		if err := rows.Scan(&rd.Categoria, &rd.Beneficiari, &rd.Concepte, &rd.UnitatID, &rd.Entrenador, &rd.Import, &rd.DiaGen); err == nil {
			plantilles = append(plantilles, rd)
		}
	}

	creades := 0
	dataDevengo := fmt.Sprintf("%s-01", anyMes)
	periodeFi := lastDayOfMonth(anyMes)

	for _, p := range plantilles {
		concepteMes := fmt.Sprintf("%s (%s)", p.Concepte, formatMonthCatalan(anyMes))
		// Comprovar si ja s'havia generat aquest mes
		var exists bool
		_ = s.pool.QueryRow(ctx, `
			SELECT EXISTS(
				SELECT 1 FROM fin_despeses
				WHERE beneficiari_nom = $1 AND TO_CHAR(data_devengo, 'YYYY-MM') = $2
			)
		`, p.Beneficiari, anyMes).Scan(&exists)

		if !exists {
			diaVenc := p.DiaGen
			if diaVenc <= 0 || diaVenc > 28 {
				diaVenc = 1
			}
			dataVenc := fmt.Sprintf("%s-%02d", anyMes, diaVenc)

			_, errI := s.CreateFinDespesa(ctx, models.UpsertFinDespesaRequest{
				Categoria:        p.Categoria,
				BeneficiariNom:   p.Beneficiari,
				Concepte:         concepteMes,
				UnitatNegociID:   p.UnitatID,
				EntrenadorID:     p.Entrenador,
				ImportTotal:      p.Import,
				EsRecurrent:      false, // La instància creada no és plantilla
				DiaMesGeneracio:  p.DiaGen,
				DataDevengo:      dataDevengo,
				DataVenciment:    dataVenc,
				PeriodeInici:     dataDevengo,
				PeriodeFi:        periodeFi,
				EstatPagament:    "pendent",
			})
			if errI == nil {
				creades++
			}
		}
	}

	return creades, nil
}

// ============================================================
// 4. CASHFLOW DINÀMIC (-X MESOS FINS A +Y MESOS)
// ============================================================

func (s *PostgresStore) GetDynamicCashflowForecast(ctx context.Context, pastMonths, futureMonths int) (*models.DynamicCashflowForecast, error) {
	if pastMonths < 0 {
		pastMonths = 0
	}
	if futureMonths < 0 {
		futureMonths = 0
	}
	if pastMonths+futureMonths > 12 {
		return nil, fmt.Errorf("la finestra de tresoreria (passat + futur) no pot superar els 12 mesos")
	}

	now := time.Now()
	currentMonthKey := now.Format("2006-01")

	// Obtenir saldo actual aproximat
	var saldoInicialTall float64
	_ = s.pool.QueryRow(ctx, `SELECT COALESCE(saldo_inicial_banc, 0)::float8 FROM fin_configuracio_empresa WHERE id = 1`).Scan(&saldoInicialTall)

	var cobramentsConciliats, pagamentsConciliats float64
	_ = s.pool.QueryRow(ctx, `SELECT COALESCE(SUM(total_factura), 0)::float8 FROM fin_factures_venda WHERE estat_cobrament = 'cobrada'`).Scan(&cobramentsConciliats)
	_ = s.pool.QueryRow(ctx, `
		SELECT COALESCE((
			(SELECT COALESCE(SUM(total_pagar), 0)::float8 FROM fin_compres WHERE estat_pagament = 'pagada') +
			(SELECT COALESCE(SUM(import_total), 0)::float8 FROM fin_despeses WHERE estat_pagament = 'pagada')
		), 0)
	`).Scan(&pagamentsConciliats)

	saldoActual := roundCurrency(saldoInicialTall + cobramentsConciliats - pagamentsConciliats)

	columns := []models.CashflowMonthColumn{}

	// Construir llista de mesos
	for i := pastMonths; i >= 1; i-- {
		t := now.AddDate(0, -i, 0)
		columns = append(columns, models.CashflowMonthColumn{
			MonthKey: t.Format("2006-01"),
			Label:    formatMonthShort(t),
			Tipus:    "past",
		})
	}
	columns = append(columns, models.CashflowMonthColumn{
		MonthKey: currentMonthKey,
		Label:    formatMonthShort(now) + " (Actual)",
		Tipus:    "current",
	})
	for i := 1; i <= futureMonths; i++ {
		t := now.AddDate(0, i, 0)
		columns = append(columns, models.CashflowMonthColumn{
			MonthKey: t.Format("2006-01"),
			Label:    formatMonthShort(t),
			Tipus:    "future",
		})
	}

	// Calcular les xifres de cada mes
	runningBalance := saldoActual
	// Calculem la suma mensual aproximada de quotes
	var totalQuotesRecurrents float64
	_ = s.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(a.preu_base * (1 + a.iva_percentatge / 100.0)), 0)::float8
		FROM usuaris u
		JOIN fin_articles a ON a.id = u.article_quota_id
		WHERE u.rol = 'atleta' AND u.actiu = TRUE AND u.pausat_facturacio = FALSE
	`).Scan(&totalQuotesRecurrents)

	var totalDespesesRecurrents float64
	_ = s.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(import_total), 0)::float8 FROM fin_despeses WHERE es_recurrent = TRUE
	`).Scan(&totalDespesesRecurrents)

	for idx := range columns {
		col := &columns[idx]
		mKey := col.MonthKey

		col.SaldoInicial = runningBalance

		if col.Tipus == "past" {
			// Dades reals conciliades
			_ = s.pool.QueryRow(ctx, `
				SELECT COALESCE(SUM(total_factura), 0)::float8
				FROM fin_factures_venda
				WHERE estat_cobrament = 'cobrada' AND TO_CHAR(data_emissio, 'YYYY-MM') = $1
			`, mKey).Scan(&col.QuotesAtletes)

			_ = s.pool.QueryRow(ctx, `
				SELECT COALESCE(SUM(total_pagar), 0)::float8
				FROM fin_compres
				WHERE estat_pagament = 'pagada' AND TO_CHAR(data_emissio, 'YYYY-MM') = $1
			`, mKey).Scan(&col.Compres)

			_ = s.pool.QueryRow(ctx, `
				SELECT COALESCE(SUM(import_total), 0)::float8
				FROM fin_despeses
				WHERE estat_pagament = 'pagada' AND TO_CHAR(data_devengo, 'YYYY-MM') = $1
			`, mKey).Scan(&col.Despeses)
		} else {
			// Mes actual o futur
			col.QuotesAtletes = roundCurrency(totalQuotesRecurrents)

			// Fites de campus / vendes a terminis
			_ = s.pool.QueryRow(ctx, `
				SELECT COALESCE(SUM(f.base_imposable * (1 + f.iva_percentatge / 100.0)), 0)::float8
				FROM fin_plans_camp_fites f
				WHERE TO_CHAR(f.data_prevista, 'YYYY-MM') = $1
			`, mKey).Scan(&col.VendesFites)

			// Compres pendents amb venciment aquest mes
			_ = s.pool.QueryRow(ctx, `
				SELECT COALESCE(SUM(total_pagar), 0)::float8
				FROM fin_compres
				WHERE estat_pagament = 'pendent' AND TO_CHAR(data_venciment, 'YYYY-MM') = $1
			`, mKey).Scan(&col.Compres)

			col.Despeses = roundCurrency(totalDespesesRecurrents)
		}

		col.Net = roundCurrency((col.QuotesAtletes + col.VendesFites) - (col.Compres + col.Despeses))
		col.SaldoFinal = roundCurrency(col.SaldoInicial + col.Net)
		runningBalance = col.SaldoFinal
	}

	return &models.DynamicCashflowForecast{
		PastMonths:   pastMonths,
		FutureMonths: futureMonths,
		SaldoActual:  saldoActual,
		Columns:      columns,
	}, nil
}

// Helpers
func formatMonthCatalan(ym string) string {
	parts := strings.Split(ym, "-")
	if len(parts) != 2 {
		return ym
	}
	mesos := map[string]string{
		"01": "Gener", "02": "Febrer", "03": "Març", "04": "Abril",
		"05": "Maig", "06": "Juny", "07": "Juliol", "08": "Agost",
		"09": "Setembre", "10": "Octubre", "11": "Novembre", "12": "Desembre",
	}
	return fmt.Sprintf("%s %s", mesos[parts[1]], parts[0])
}

func formatMonthShort(t time.Time) string {
	mesosShort := []string{"Gen", "Feb", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Des"}
	return fmt.Sprintf("%s %02d", mesosShort[t.Month()-1], t.Year()%100)
}

func lastDayOfMonth(ym string) string {
	t, err := time.Parse("2006-01", ym)
	if err != nil {
		return ym + "-28"
	}
	nextMonth := t.AddDate(0, 1, 0)
	lastDay := nextMonth.AddDate(0, 0, -1)
	return lastDay.Format("2006-01-02")
}
