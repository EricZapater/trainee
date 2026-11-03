package store

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5"
	"trainee-backend/internal/models"
)

func roundCurrency(v float64) float64 {
	return math.Round(v*100) / 100
}

func nullableUUID(s *string) *string {
	if s == nil || *s == "" {
		return nil
	}
	return s
}

func addMonthsDate(dateISO string, months int) string {
	t, err := time.Parse("2006-01-02", dateISO)
	if err != nil {
		return dateISO
	}
	year, month, day := t.Date()
	targetMonth := int(month) + months
	targetYear := year + (targetMonth-1)/12
	targetMonth = (targetMonth-1)%12 + 1
	if targetMonth <= 0 {
		targetMonth += 12
		targetYear--
	}
	// Clamp day to last day of target month
	lastDay := time.Date(targetYear, time.Month(targetMonth)+1, 0, 0, 0, 0, 0, time.UTC).Day()
	if day > lastDay {
		day = lastDay
	}
	return time.Date(targetYear, time.Month(targetMonth), day, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
}

func periodEndFromStartAndMonths(startISO string, months int) string {
	nextStart := addMonthsDate(startISO, months)
	t, err := time.Parse("2006-01-02", nextStart)
	if err != nil {
		return startISO
	}
	return t.AddDate(0, 0, -1).Format("2006-01-02")
}

// ============================================================
// 1. Configuració d'Empresa i Impostos Globals
// ============================================================

func (s *PostgresStore) GetFinConfiguracioEmpresa(ctx context.Context) (*models.FinConfiguracioEmpresa, error) {
	var c models.FinConfiguracioEmpresa
	err := s.pool.QueryRow(ctx, `
		SELECT id, rao_social, nom_comercial, nif_cif, adreca, cp, poblacio, provincia, pais,
		       email_administracio, telefon, iban_principal, logo_url, peu_legal,
		       iva_defecte::float8, irpf_defecte_vendes::float8, irpf_defecte_compres::float8,
		       saldo_inicial::float8, TO_CHAR(data_tall_saldo, 'YYYY-MM-DD'), updated_at
		FROM fin_configuracio_empresa
		WHERE id = 1
	`).Scan(
		&c.ID, &c.RaoSocial, &c.NomComercial, &c.NifCif, &c.Adreca, &c.CP, &c.Poblacio, &c.Provincia, &c.Pais,
		&c.EmailAdministracio, &c.Telefon, &c.IbanPrincipal, &c.LogoURL, &c.PeuLegal,
		&c.IvaDefecte, &c.IrpfDefecteVendes, &c.IrpfDefecteCompres,
		&c.SaldoInicial, &c.DataTallSaldo, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *PostgresStore) UpdateFinConfiguracioEmpresa(ctx context.Context, req models.FinConfiguracioEmpresa) (*models.FinConfiguracioEmpresa, error) {
	if req.Pais == "" {
		req.Pais = "ES"
	}
	if req.DataTallSaldo == "" {
		req.DataTallSaldo = time.Now().Format("2006-01-02")
	}
	_, err := s.pool.Exec(ctx, `
		UPDATE fin_configuracio_empresa
		SET rao_social = $1, nom_comercial = $2, nif_cif = $3, adreca = $4, cp = $5,
		    poblacio = $6, provincia = $7, pais = $8, email_administracio = $9, telefon = $10,
		    iban_principal = $11, logo_url = $12, peu_legal = $13,
		    iva_defecte = $14, irpf_defecte_vendes = $15, irpf_defecte_compres = $16,
		    saldo_inicial = $17, data_tall_saldo = $18::date, updated_at = now()
		WHERE id = 1
	`,
		req.RaoSocial, req.NomComercial, req.NifCif, req.Adreca, req.CP,
		req.Poblacio, req.Provincia, req.Pais, req.EmailAdministracio, req.Telefon,
		req.IbanPrincipal, req.LogoURL, req.PeuLegal,
		roundCurrency(req.IvaDefecte), roundCurrency(req.IrpfDefecteVendes), roundCurrency(req.IrpfDefecteCompres),
		roundCurrency(req.SaldoInicial), req.DataTallSaldo,
	)
	if err != nil {
		return nil, err
	}
	return s.GetFinConfiguracioEmpresa(ctx)
}

func (s *PostgresStore) ListFinImpostos(ctx context.Context) ([]models.FinImpost, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, nom, tipus, percentatge::float8, causa_exempcio, per_defecte, actiu, created_at
		FROM fin_impostos
		ORDER BY tipus ASC, percentatge DESC, nom ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.FinImpost{}
	for rows.Next() {
		var it models.FinImpost
		if err := rows.Scan(&it.ID, &it.Nom, &it.Tipus, &it.Percentatge, &it.CausaExempcio, &it.PerDefecte, &it.Actiu, &it.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, it)
	}
	return list, rows.Err()
}

func (s *PostgresStore) CreateFinImpost(ctx context.Context, req models.UpsertFinImpostRequest) (*models.FinImpost, error) {
	var it models.FinImpost
	if req.PerDefecte {
		_, _ = s.pool.Exec(ctx, `UPDATE fin_impostos SET per_defecte = FALSE WHERE tipus = $1`, req.Tipus)
	}
	err := s.pool.QueryRow(ctx, `
		INSERT INTO fin_impostos (nom, tipus, percentatge, causa_exempcio, per_defecte, actiu)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, nom, tipus, percentatge::float8, causa_exempcio, per_defecte, actiu, created_at
	`, req.Nom, req.Tipus, roundCurrency(req.Percentatge), req.CausaExempcio, req.PerDefecte, req.Actiu).Scan(
		&it.ID, &it.Nom, &it.Tipus, &it.Percentatge, &it.CausaExempcio, &it.PerDefecte, &it.Actiu, &it.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &it, nil
}

func (s *PostgresStore) UpdateFinImpost(ctx context.Context, id string, req models.UpsertFinImpostRequest) (*models.FinImpost, error) {
	var it models.FinImpost
	if req.PerDefecte {
		_, _ = s.pool.Exec(ctx, `UPDATE fin_impostos SET per_defecte = FALSE WHERE tipus = $1 AND id <> $2`, req.Tipus, id)
	}
	err := s.pool.QueryRow(ctx, `
		UPDATE fin_impostos
		SET nom = $1, tipus = $2, percentatge = $3, causa_exempcio = $4, per_defecte = $5, actiu = $6
		WHERE id = $7
		RETURNING id, nom, tipus, percentatge::float8, causa_exempcio, per_defecte, actiu, created_at
	`, req.Nom, req.Tipus, roundCurrency(req.Percentatge), req.CausaExempcio, req.PerDefecte, req.Actiu, id).Scan(
		&it.ID, &it.Nom, &it.Tipus, &it.Percentatge, &it.CausaExempcio, &it.PerDefecte, &it.Actiu, &it.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &it, nil
}

func (s *PostgresStore) DeleteFinImpost(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM fin_impostos WHERE id = $1`, id)
	return err
}

// ============================================================
// 2. Sèries i Unitats de Negoci
// ============================================================

func (s *PostgresStore) ListFinSeries(ctx context.Context) ([]models.FinSerie, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, codi, descripcio, tipus, any_fiscal, prefix, ultim_numero, activa, created_at
		FROM fin_series
		ORDER BY any_fiscal DESC, tipus ASC, codi ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.FinSerie{}
	for rows.Next() {
		var sr models.FinSerie
		if err := rows.Scan(&sr.ID, &sr.Codi, &sr.Descripcio, &sr.Tipus, &sr.AnyFiscal, &sr.Prefix, &sr.UltimNumero, &sr.Activa, &sr.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, sr)
	}
	return list, rows.Err()
}

func (s *PostgresStore) CreateFinSerie(ctx context.Context, req models.UpsertFinSerieRequest) (*models.FinSerie, error) {
	var sr models.FinSerie
	err := s.pool.QueryRow(ctx, `
		INSERT INTO fin_series (codi, descripcio, tipus, any_fiscal, prefix, activa)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, codi, descripcio, tipus, any_fiscal, prefix, ultim_numero, activa, created_at
	`, req.Codi, req.Descripcio, req.Tipus, req.AnyFiscal, req.Prefix, req.Activa).Scan(
		&sr.ID, &sr.Codi, &sr.Descripcio, &sr.Tipus, &sr.AnyFiscal, &sr.Prefix, &sr.UltimNumero, &sr.Activa, &sr.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &sr, nil
}

func (s *PostgresStore) UpdateFinSerie(ctx context.Context, id string, req models.UpsertFinSerieRequest) (*models.FinSerie, error) {
	var sr models.FinSerie
	err := s.pool.QueryRow(ctx, `
		UPDATE fin_series
		SET codi = $1, descripcio = $2, tipus = $3, any_fiscal = $4, prefix = $5, activa = $6
		WHERE id = $7
		RETURNING id, codi, descripcio, tipus, any_fiscal, prefix, ultim_numero, activa, created_at
	`, req.Codi, req.Descripcio, req.Tipus, req.AnyFiscal, req.Prefix, req.Activa, id).Scan(
		&sr.ID, &sr.Codi, &sr.Descripcio, &sr.Tipus, &sr.AnyFiscal, &sr.Prefix, &sr.UltimNumero, &sr.Activa, &sr.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &sr, nil
}

func (s *PostgresStore) ListFinUnitatsNegoci(ctx context.Context) ([]models.FinUnitatNegoci, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT u.id, u.codi, u.nom, u.descripcio, u.serie_defecte_id, sr.codi, u.activa, u.ordre, u.created_at
		FROM fin_unitats_negoci u
		LEFT JOIN fin_series sr ON sr.id = u.serie_defecte_id
		ORDER BY u.ordre ASC, u.nom ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.FinUnitatNegoci{}
	for rows.Next() {
		var un models.FinUnitatNegoci
		if err := rows.Scan(&un.ID, &un.Codi, &un.Nom, &un.Descripcio, &un.SerieDefecteID, &un.SerieCodi, &un.Activa, &un.Ordre, &un.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, un)
	}
	return list, rows.Err()
}

func (s *PostgresStore) CreateFinUnitatNegoci(ctx context.Context, req models.UpsertFinUnitatNegociRequest) (*models.FinUnitatNegoci, error) {
	var un models.FinUnitatNegoci
	err := s.pool.QueryRow(ctx, `
		INSERT INTO fin_unitats_negoci (codi, nom, descripcio, serie_defecte_id, activa, ordre)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, codi, nom, descripcio, serie_defecte_id, activa, ordre, created_at
	`, req.Codi, req.Nom, req.Descripcio, nullableUUID(req.SerieDefecteID), req.Activa, req.Ordre).Scan(
		&un.ID, &un.Codi, &un.Nom, &un.Descripcio, &un.SerieDefecteID, &un.Activa, &un.Ordre, &un.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &un, nil
}

func (s *PostgresStore) UpdateFinUnitatNegoci(ctx context.Context, id string, req models.UpsertFinUnitatNegociRequest) (*models.FinUnitatNegoci, error) {
	var un models.FinUnitatNegoci
	err := s.pool.QueryRow(ctx, `
		UPDATE fin_unitats_negoci
		SET codi = $1, nom = $2, descripcio = $3, serie_defecte_id = $4, activa = $5, ordre = $6
		WHERE id = $7
		RETURNING id, codi, nom, descripcio, serie_defecte_id, activa, ordre, created_at
	`, req.Codi, req.Nom, req.Descripcio, nullableUUID(req.SerieDefecteID), req.Activa, req.Ordre, id).Scan(
		&un.ID, &un.Codi, &un.Nom, &un.Descripcio, &un.SerieDefecteID, &un.Activa, &un.Ordre, &un.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &un, nil
}

// ============================================================
// 3. Clients, Proveïdors i Catàleg d'Articles
// ============================================================

func (s *PostgresStore) ListFinClients(ctx context.Context) ([]models.FinClient, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT c.id, c.usuari_id,
		       CASE WHEN u.id IS NOT NULL THEN TRIM(u.nom || ' ' || COALESCE(u.cognoms, '')) ELSE NULL END AS usuari_nom,
		       c.nom_fiscal, c.tipus_id_fiscal, c.nif_cif, c.adreca, c.cp, c.poblacio, c.provincia, c.pais,
		       c.email, c.telefon, c.notes, c.actiu, c.created_at, c.updated_at
		FROM fin_clients c
		LEFT JOIN usuaris u ON u.id = c.usuari_id
		ORDER BY c.nom_fiscal ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.FinClient{}
	for rows.Next() {
		var cl models.FinClient
		if err := rows.Scan(
			&cl.ID, &cl.UsuariID, &cl.UsuariNom, &cl.NomFiscal, &cl.TipusIDFiscal, &cl.NifCif,
			&cl.Adreca, &cl.CP, &cl.Poblacio, &cl.Provincia, &cl.Pais,
			&cl.Email, &cl.Telefon, &cl.Notes, &cl.Actiu, &cl.CreatedAt, &cl.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, cl)
	}
	return list, rows.Err()
}

func (s *PostgresStore) GetFinClientByUsuariID(ctx context.Context, usuariID string) (*models.FinClient, error) {
	var cl models.FinClient
	err := s.pool.QueryRow(ctx, `
		SELECT c.id, c.usuari_id,
		       CASE WHEN u.id IS NOT NULL THEN TRIM(u.nom || ' ' || COALESCE(u.cognoms, '')) ELSE NULL END AS usuari_nom,
		       c.nom_fiscal, c.tipus_id_fiscal, c.nif_cif, c.adreca, c.cp, c.poblacio, c.provincia, c.pais,
		       c.email, c.telefon, c.notes, c.actiu, c.created_at, c.updated_at
		FROM fin_clients c
		LEFT JOIN usuaris u ON u.id = c.usuari_id
		WHERE c.usuari_id = $1
		LIMIT 1
	`, usuariID).Scan(
		&cl.ID, &cl.UsuariID, &cl.UsuariNom, &cl.NomFiscal, &cl.TipusIDFiscal, &cl.NifCif,
		&cl.Adreca, &cl.CP, &cl.Poblacio, &cl.Provincia, &cl.Pais,
		&cl.Email, &cl.Telefon, &cl.Notes, &cl.Actiu, &cl.CreatedAt, &cl.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &cl, nil
}

func (s *PostgresStore) UpsertFinClientByUsuariID(ctx context.Context, usuariID string, req models.UpsertFinClientRequest) (*models.FinClient, error) {
	if req.TipusIDFiscal == "" {
		req.TipusIDFiscal = "NIF"
	}
	if req.Pais == "" {
		req.Pais = "ES"
	}
	req.UsuariID = &usuariID

	var existingID string
	err := s.pool.QueryRow(ctx, `SELECT id FROM fin_clients WHERE usuari_id = $1 LIMIT 1`, usuariID).Scan(&existingID)
	if err == nil && existingID != "" {
		return s.UpdateFinClient(ctx, existingID, req)
	}
	return s.CreateFinClient(ctx, req)
}

func (s *PostgresStore) CreateFinClient(ctx context.Context, req models.UpsertFinClientRequest) (*models.FinClient, error) {
	if req.TipusIDFiscal == "" {
		req.TipusIDFiscal = "NIF"
	}
	if req.Pais == "" {
		req.Pais = "ES"
	}
	var cl models.FinClient
	err := s.pool.QueryRow(ctx, `
		INSERT INTO fin_clients (usuari_id, nom_fiscal, tipus_id_fiscal, nif_cif, adreca, cp, poblacio, provincia, pais, email, telefon, notes, actiu)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, usuari_id, nom_fiscal, tipus_id_fiscal, nif_cif, adreca, cp, poblacio, provincia, pais, email, telefon, notes, actiu, created_at, updated_at
	`,
		nullableUUID(req.UsuariID), req.NomFiscal, req.TipusIDFiscal, req.NifCif, req.Adreca, req.CP, req.Poblacio, req.Provincia, req.Pais,
		req.Email, req.Telefon, req.Notes, req.Actiu,
	).Scan(
		&cl.ID, &cl.UsuariID, &cl.NomFiscal, &cl.TipusIDFiscal, &cl.NifCif, &cl.Adreca, &cl.CP, &cl.Poblacio, &cl.Provincia, &cl.Pais,
		&cl.Email, &cl.Telefon, &cl.Notes, &cl.Actiu, &cl.CreatedAt, &cl.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &cl, nil
}

func (s *PostgresStore) UpdateFinClient(ctx context.Context, id string, req models.UpsertFinClientRequest) (*models.FinClient, error) {
	if req.TipusIDFiscal == "" {
		req.TipusIDFiscal = "NIF"
	}
	if req.Pais == "" {
		req.Pais = "ES"
	}
	var cl models.FinClient
	err := s.pool.QueryRow(ctx, `
		UPDATE fin_clients
		SET usuari_id = $1, nom_fiscal = $2, tipus_id_fiscal = $3, nif_cif = $4, adreca = $5,
		    cp = $6, poblacio = $7, provincia = $8, pais = $9, email = $10, telefon = $11, notes = $12, actiu = $13, updated_at = now()
		WHERE id = $14
		RETURNING id, usuari_id, nom_fiscal, tipus_id_fiscal, nif_cif, adreca, cp, poblacio, provincia, pais, email, telefon, notes, actiu, created_at, updated_at
	`,
		nullableUUID(req.UsuariID), req.NomFiscal, req.TipusIDFiscal, req.NifCif, req.Adreca, req.CP, req.Poblacio, req.Provincia, req.Pais,
		req.Email, req.Telefon, req.Notes, req.Actiu, id,
	).Scan(
		&cl.ID, &cl.UsuariID, &cl.NomFiscal, &cl.TipusIDFiscal, &cl.NifCif, &cl.Adreca, &cl.CP, &cl.Poblacio, &cl.Provincia, &cl.Pais,
		&cl.Email, &cl.Telefon, &cl.Notes, &cl.Actiu, &cl.CreatedAt, &cl.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &cl, nil
}

// SyncAtletesToFinClients importa com a clients tots els atletes actius que encara no tinguin fitxa a fin_clients.
func (s *PostgresStore) SyncAtletesToFinClients(ctx context.Context) (int64, error) {
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO fin_clients (usuari_id, nom_fiscal, email, actiu)
		SELECT u.id, TRIM(u.nom || ' ' || COALESCE(u.cognoms, '')), u.email, u.actiu
		FROM usuaris u
		WHERE u.rol = 'atleta' AND u.actiu = TRUE
		  AND NOT EXISTS (SELECT 1 FROM fin_clients fc WHERE fc.usuari_id = u.id)
	`)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

func (s *PostgresStore) ListFinProveidors(ctx context.Context) ([]models.FinProveidor, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT p.id, p.nom_fiscal, p.nif_cif, p.adreca, p.cp, p.poblacio, p.provincia, p.pais,
		       p.iban, p.email, p.telefon, p.iva_defecte::float8, p.irpf_defecte::float8,
		       p.unitat_negoci_defecte_id, p.entrenador_defecte_id,
		       un.nom, e.nom, p.notes, p.actiu, p.created_at, p.updated_at
		FROM fin_proveidors p
		LEFT JOIN fin_unitats_negoci un ON un.id = p.unitat_negoci_defecte_id
		LEFT JOIN entrenadors e ON e.id = p.entrenador_defecte_id
		ORDER BY p.nom_fiscal ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.FinProveidor{}
	for rows.Next() {
		var pr models.FinProveidor
		if err := rows.Scan(
			&pr.ID, &pr.NomFiscal, &pr.NifCif, &pr.Adreca, &pr.CP, &pr.Poblacio, &pr.Provincia, &pr.Pais,
			&pr.Iban, &pr.Email, &pr.Telefon, &pr.IvaDefecte, &pr.IrpfDefecte,
			&pr.UnitatNegociDefecteID, &pr.EntrenadorDefecteID,
			&pr.UnitatNegociNom, &pr.EntrenadorNom, &pr.Notes, &pr.Actiu, &pr.CreatedAt, &pr.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, pr)
	}
	return list, rows.Err()
}

func (s *PostgresStore) CreateFinProveidor(ctx context.Context, req models.UpsertFinProveidorRequest) (*models.FinProveidor, error) {
	if req.Pais == "" {
		req.Pais = "ES"
	}
	var pr models.FinProveidor
	err := s.pool.QueryRow(ctx, `
		INSERT INTO fin_proveidors (
			nom_fiscal, nif_cif, adreca, cp, poblacio, provincia, pais, iban, email, telefon,
			iva_defecte, irpf_defecte, unitat_negoci_defecte_id, entrenador_defecte_id, notes, actiu
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
		RETURNING id, nom_fiscal, nif_cif, adreca, cp, poblacio, provincia, pais, iban, email, telefon,
		          iva_defecte::float8, irpf_defecte::float8, unitat_negoci_defecte_id, entrenador_defecte_id, notes, actiu, created_at, updated_at
	`,
		req.NomFiscal, req.NifCif, req.Adreca, req.CP, req.Poblacio, req.Provincia, req.Pais, req.Iban, req.Email, req.Telefon,
		roundCurrency(req.IvaDefecte), roundCurrency(req.IrpfDefecte), nullableUUID(req.UnitatNegociDefecteID), nullableUUID(req.EntrenadorDefecteID), req.Notes, req.Actiu,
	).Scan(
		&pr.ID, &pr.NomFiscal, &pr.NifCif, &pr.Adreca, &pr.CP, &pr.Poblacio, &pr.Provincia, &pr.Pais, &pr.Iban, &pr.Email, &pr.Telefon,
		&pr.IvaDefecte, &pr.IrpfDefecte, &pr.UnitatNegociDefecteID, &pr.EntrenadorDefecteID, &pr.Notes, &pr.Actiu, &pr.CreatedAt, &pr.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &pr, nil
}

func (s *PostgresStore) UpdateFinProveidor(ctx context.Context, id string, req models.UpsertFinProveidorRequest) (*models.FinProveidor, error) {
	if req.Pais == "" {
		req.Pais = "ES"
	}
	var pr models.FinProveidor
	err := s.pool.QueryRow(ctx, `
		UPDATE fin_proveidors
		SET nom_fiscal = $1, nif_cif = $2, adreca = $3, cp = $4, poblacio = $5, provincia = $6, pais = $7,
		    iban = $8, email = $9, telefon = $10, iva_defecte = $11, irpf_defecte = $12,
		    unitat_negoci_defecte_id = $13, entrenador_defecte_id = $14, notes = $15, actiu = $16, updated_at = now()
		WHERE id = $17
		RETURNING id, nom_fiscal, nif_cif, adreca, cp, poblacio, provincia, pais, iban, email, telefon,
		          iva_defecte::float8, irpf_defecte::float8, unitat_negoci_defecte_id, entrenador_defecte_id, notes, actiu, created_at, updated_at
	`,
		req.NomFiscal, req.NifCif, req.Adreca, req.CP, req.Poblacio, req.Provincia, req.Pais, req.Iban, req.Email, req.Telefon,
		roundCurrency(req.IvaDefecte), roundCurrency(req.IrpfDefecte), nullableUUID(req.UnitatNegociDefecteID), nullableUUID(req.EntrenadorDefecteID), req.Notes, req.Actiu, id,
	).Scan(
		&pr.ID, &pr.NomFiscal, &pr.NifCif, &pr.Adreca, &pr.CP, &pr.Poblacio, &pr.Provincia, &pr.Pais, &pr.Iban, &pr.Email, &pr.Telefon,
		&pr.IvaDefecte, &pr.IrpfDefecte, &pr.UnitatNegociDefecteID, &pr.EntrenadorDefecteID, &pr.Notes, &pr.Actiu, &pr.CreatedAt, &pr.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &pr, nil
}

func (s *PostgresStore) ListFinArticles(ctx context.Context) ([]models.FinArticle, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT a.id, a.codi, a.nom, a.descripcio, a.categoria, a.unitat_negoci_id, un.nom,
		       a.preu_base::float8, a.iva_percentatge::float8, a.irpf_percentatge::float8,
		       a.causa_exempcio, a.actiu, a.created_at, a.updated_at
		FROM fin_articles a
		JOIN fin_unitats_negoci un ON un.id = a.unitat_negoci_id
		ORDER BY a.categoria ASC, a.nom ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.FinArticle{}
	for rows.Next() {
		var ar models.FinArticle
		if err := rows.Scan(
			&ar.ID, &ar.Codi, &ar.Nom, &ar.Descripcio, &ar.Categoria, &ar.UnitatNegociID, &ar.UnitatNegociNom,
			&ar.PreuBase, &ar.IvaPercentatge, &ar.IrpfPercentatge, &ar.CausaExempcio, &ar.Actiu, &ar.CreatedAt, &ar.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, ar)
	}
	return list, rows.Err()
}

func (s *PostgresStore) CreateFinArticle(ctx context.Context, req models.UpsertFinArticleRequest) (*models.FinArticle, error) {
	var ar models.FinArticle
	err := s.pool.QueryRow(ctx, `
		INSERT INTO fin_articles (codi, nom, descripcio, categoria, unitat_negoci_id, preu_base, iva_percentatge, irpf_percentatge, causa_exempcio, actiu)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, codi, nom, descripcio, categoria, unitat_negoci_id, preu_base::float8, iva_percentatge::float8, irpf_percentatge::float8, causa_exempcio, actiu, created_at, updated_at
	`,
		req.Codi, req.Nom, req.Descripcio, req.Categoria, req.UnitatNegociID,
		roundCurrency(req.PreuBase), roundCurrency(req.IvaPercentatge), roundCurrency(req.IrpfPercentatge), req.CausaExempcio, req.Actiu,
	).Scan(
		&ar.ID, &ar.Codi, &ar.Nom, &ar.Descripcio, &ar.Categoria, &ar.UnitatNegociID,
		&ar.PreuBase, &ar.IvaPercentatge, &ar.IrpfPercentatge, &ar.CausaExempcio, &ar.Actiu, &ar.CreatedAt, &ar.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &ar, nil
}

func (s *PostgresStore) UpdateFinArticle(ctx context.Context, id string, req models.UpsertFinArticleRequest) (*models.FinArticle, error) {
	var ar models.FinArticle
	err := s.pool.QueryRow(ctx, `
		UPDATE fin_articles
		SET codi = $1, nom = $2, descripcio = $3, categoria = $4, unitat_negoci_id = $5,
		    preu_base = $6, iva_percentatge = $7, irpf_percentatge = $8, causa_exempcio = $9, actiu = $10, updated_at = now()
		WHERE id = $11
		RETURNING id, codi, nom, descripcio, categoria, unitat_negoci_id, preu_base::float8, iva_percentatge::float8, irpf_percentatge::float8, causa_exempcio, actiu, created_at, updated_at
	`,
		req.Codi, req.Nom, req.Descripcio, req.Categoria, req.UnitatNegociID,
		roundCurrency(req.PreuBase), roundCurrency(req.IvaPercentatge), roundCurrency(req.IrpfPercentatge), req.CausaExempcio, req.Actiu, id,
	).Scan(
		&ar.ID, &ar.Codi, &ar.Nom, &ar.Descripcio, &ar.Categoria, &ar.UnitatNegociID,
		&ar.PreuBase, &ar.IvaPercentatge, &ar.IrpfPercentatge, &ar.CausaExempcio, &ar.Actiu, &ar.CreatedAt, &ar.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &ar, nil
}

// ============================================================
// 4. Subscripcions Recurrents i Plans de Training Camp
// ============================================================

func (s *PostgresStore) ListFinSubscripcions(ctx context.Context) ([]models.FinSubscripcio, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT sb.id, sb.client_id, c.nom_fiscal, sb.article_id, a.nom, sb.unitat_negoci_id, un.nom,
		       sb.entrenador_id, e.nom, sb.periodicitat_mesos, sb.concepte_personalitzat,
		       sb.base_imposable::float8, sb.iva_percentatge::float8, sb.irpf_percentatge::float8,
		       sb.dies_venciment, TO_CHAR(sb.data_inici, 'YYYY-MM-DD'), TO_CHAR(sb.propera_data_facturacio, 'YYYY-MM-DD'),
		       CASE WHEN sb.data_fi IS NOT NULL THEN TO_CHAR(sb.data_fi, 'YYYY-MM-DD') ELSE NULL END,
		       sb.activa, sb.created_at
		FROM fin_subscripcions sb
		JOIN fin_clients c ON c.id = sb.client_id
		JOIN fin_articles a ON a.id = sb.article_id
		JOIN fin_unitats_negoci un ON un.id = sb.unitat_negoci_id
		LEFT JOIN entrenadors e ON e.id = sb.entrenador_id
		ORDER BY sb.activa DESC, sb.propera_data_facturacio ASC, c.nom_fiscal ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.FinSubscripcio{}
	for rows.Next() {
		var sb models.FinSubscripcio
		if err := rows.Scan(
			&sb.ID, &sb.ClientID, &sb.ClientNom, &sb.ArticleID, &sb.ArticleNom, &sb.UnitatNegociID, &sb.UnitatNegociNom,
			&sb.EntrenadorID, &sb.EntrenadorNom, &sb.PeriodicitatMesos, &sb.ConceptePersonalitzat,
			&sb.BaseImposable, &sb.IvaPercentatge, &sb.IrpfPercentatge,
			&sb.DiesVenciment, &sb.DataInici, &sb.ProperaDataFacturacio, &sb.DataFi, &sb.Activa, &sb.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, sb)
	}
	return list, rows.Err()
}

func (s *PostgresStore) CreateFinSubscripcio(ctx context.Context, req models.UpsertFinSubscripcioRequest) (*models.FinSubscripcio, error) {
	var sb models.FinSubscripcio
	err := s.pool.QueryRow(ctx, `
		INSERT INTO fin_subscripcions (
			client_id, article_id, unitat_negoci_id, entrenador_id, periodicitat_mesos,
			concepte_personalitzat, base_imposable, iva_percentatge, irpf_percentatge,
			dies_venciment, data_inici, propera_data_facturacio, data_fi, activa
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date,$12::date,$13::date,$14)
		RETURNING id, client_id, article_id, unitat_negoci_id, entrenador_id, periodicitat_mesos,
		          concepte_personalitzat, base_imposable::float8, iva_percentatge::float8, irpf_percentatge::float8,
		          dies_venciment, TO_CHAR(data_inici, 'YYYY-MM-DD'), TO_CHAR(propera_data_facturacio, 'YYYY-MM-DD'),
		          CASE WHEN data_fi IS NOT NULL THEN TO_CHAR(data_fi, 'YYYY-MM-DD') ELSE NULL END, activa, created_at
	`,
		req.ClientID, req.ArticleID, req.UnitatNegociID, nullableUUID(req.EntrenadorID), req.PeriodicitatMesos,
		req.ConceptePersonalitzat, roundCurrency(req.BaseImposable), roundCurrency(req.IvaPercentatge), roundCurrency(req.IrpfPercentatge),
		req.DiesVenciment, req.DataInici, req.ProperaDataFacturacio, nullableUUID(req.DataFi), req.Activa,
	).Scan(
		&sb.ID, &sb.ClientID, &sb.ArticleID, &sb.UnitatNegociID, &sb.EntrenadorID, &sb.PeriodicitatMesos,
		&sb.ConceptePersonalitzat, &sb.BaseImposable, &sb.IvaPercentatge, &sb.IrpfPercentatge,
		&sb.DiesVenciment, &sb.DataInici, &sb.ProperaDataFacturacio, &sb.DataFi, &sb.Activa, &sb.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &sb, nil
}

func (s *PostgresStore) UpdateFinSubscripcio(ctx context.Context, id string, req models.UpsertFinSubscripcioRequest) (*models.FinSubscripcio, error) {
	var sb models.FinSubscripcio
	err := s.pool.QueryRow(ctx, `
		UPDATE fin_subscripcions
		SET client_id = $1, article_id = $2, unitat_negoci_id = $3, entrenador_id = $4, periodicitat_mesos = $5,
		    concepte_personalitzat = $6, base_imposable = $7, iva_percentatge = $8, irpf_percentatge = $9,
		    dies_venciment = $10, data_inici = $11::date, propera_data_facturacio = $12::date, data_fi = $13::date,
		    activa = $14, updated_at = now()
		WHERE id = $15
		RETURNING id, client_id, article_id, unitat_negoci_id, entrenador_id, periodicitat_mesos,
		          concepte_personalitzat, base_imposable::float8, iva_percentatge::float8, irpf_percentatge::float8,
		          dies_venciment, TO_CHAR(data_inici, 'YYYY-MM-DD'), TO_CHAR(propera_data_facturacio, 'YYYY-MM-DD'),
		          CASE WHEN data_fi IS NOT NULL THEN TO_CHAR(data_fi, 'YYYY-MM-DD') ELSE NULL END, activa, created_at
	`,
		req.ClientID, req.ArticleID, req.UnitatNegociID, nullableUUID(req.EntrenadorID), req.PeriodicitatMesos,
		req.ConceptePersonalitzat, roundCurrency(req.BaseImposable), roundCurrency(req.IvaPercentatge), roundCurrency(req.IrpfPercentatge),
		req.DiesVenciment, req.DataInici, req.ProperaDataFacturacio, nullableUUID(req.DataFi), req.Activa, id,
	).Scan(
		&sb.ID, &sb.ClientID, &sb.ArticleID, &sb.UnitatNegociID, &sb.EntrenadorID, &sb.PeriodicitatMesos,
		&sb.ConceptePersonalitzat, &sb.BaseImposable, &sb.IvaPercentatge, &sb.IrpfPercentatge,
		&sb.DiesVenciment, &sb.DataInici, &sb.ProperaDataFacturacio, &sb.DataFi, &sb.Activa, &sb.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &sb, nil
}

// GenerateDraftsFromSubscripcions genera factures esborrany per a totes les subscripcions actives amb propera_data_facturacio <= cutoffDate.
func (s *PostgresStore) GenerateDraftsFromSubscripcions(ctx context.Context, cutoffDate string) (int, error) {
	subs, err := s.ListFinSubscripcions(ctx)
	if err != nil {
		return 0, err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	count := 0
	for _, sb := range subs {
		if !sb.Activa || sb.ProperaDataFacturacio > cutoffDate {
			continue
		}
		if sb.DataFi != nil && *sb.DataFi != "" && sb.ProperaDataFacturacio > *sb.DataFi {
			continue
		}

		periodeInici := sb.ProperaDataFacturacio
		periodeFi := periodEndFromStartAndMonths(periodeInici, sb.PeriodicitatMesos)
		nextDate := addMonthsDate(periodeInici, sb.PeriodicitatMesos)

		dueT, errT := time.Parse("2006-01-02", periodeInici)
		dataVenciment := periodeInici
		if errT == nil {
			dataVenciment = dueT.AddDate(0, 0, sb.DiesVenciment).Format("2006-01-02")
		}

		concepte := sb.ConceptePersonalitzat
		if concepte == "" {
			concepte = fmt.Sprintf("%s (%s a %s)", sb.ArticleNom, periodeInici, periodeFi)
		}

		ivaImp := roundCurrency(sb.BaseImposable * sb.IvaPercentatge / 100.0)
		irpfImp := roundCurrency(sb.BaseImposable * sb.IrpfPercentatge / 100.0)
		total := roundCurrency(sb.BaseImposable + ivaImp - irpfImp)

		var serieID *string
		_ = tx.QueryRow(ctx, `SELECT serie_defecte_id FROM fin_unitats_negoci WHERE id = $1`, sb.UnitatNegociID).Scan(&serieID)

		_, err = tx.Exec(ctx, `
			INSERT INTO fin_factures_venda (
				serie_id, tipus_factura, estat_document, client_id, subscripcio_id,
				unitat_negoci_id, entrenador_id, article_id, concepte,
				base_imposable, iva_percentatge, iva_import, irpf_percentatge, irpf_import, total_factura,
				data_emissio, data_venciment, periode_inici, periode_fi, estat_cobrament
			) VALUES ($1,'F1','esborrany',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::date,$15::date,$16::date,$17::date,'pendent')
		`,
			serieID, sb.ClientID, sb.ID, sb.UnitatNegociID, sb.EntrenadorID, sb.ArticleID, concepte,
			roundCurrency(sb.BaseImposable), roundCurrency(sb.IvaPercentatge), ivaImp,
			roundCurrency(sb.IrpfPercentatge), irpfImp, total,
			periodeInici, dataVenciment, periodeInici, periodeFi,
		)
		if err != nil {
			return 0, err
		}

		_, err = tx.Exec(ctx, `
			UPDATE fin_subscripcions SET propera_data_facturacio = $1::date, updated_at = now() WHERE id = $2
		`, nextDate, sb.ID)
		if err != nil {
			return 0, err
		}
		count++
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return count, nil
}

func (s *PostgresStore) ListFinPlansCamp(ctx context.Context) ([]models.FinPlaCamp, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT pc.id, pc.client_id, c.nom_fiscal, pc.article_id, a.nom, pc.unitat_negoci_id, un.nom,
		       pc.entrenador_id, e.nom, pc.titol_camp,
		       TO_CHAR(pc.periode_camp_inici, 'YYYY-MM-DD'), TO_CHAR(pc.periode_camp_fi, 'YYYY-MM-DD'),
		       pc.total_base_pactada::float8, pc.iva_percentatge::float8, pc.irpf_percentatge::float8,
		       pc.estat, pc.notes, pc.created_at
		FROM fin_plans_camp pc
		JOIN fin_clients c ON c.id = pc.client_id
		LEFT JOIN fin_articles a ON a.id = pc.article_id
		JOIN fin_unitats_negoci un ON un.id = pc.unitat_negoci_id
		LEFT JOIN entrenadors e ON e.id = pc.entrenador_id
		ORDER BY pc.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.FinPlaCamp{}
	idxByID := map[string]int{}
	for rows.Next() {
		var pc models.FinPlaCamp
		pc.Fites = []models.FinPlaCampFita{}
		if err := rows.Scan(
			&pc.ID, &pc.ClientID, &pc.ClientNom, &pc.ArticleID, &pc.ArticleNom, &pc.UnitatNegociID, &pc.UnitatNegociNom,
			&pc.EntrenadorID, &pc.EntrenadorNom, &pc.TitolCamp,
			&pc.PeriodeCampInici, &pc.PeriodeCampFi, &pc.TotalBasePactada, &pc.IvaPercentatge, &pc.IrpfPercentatge,
			&pc.Estat, &pc.Notes, &pc.CreatedAt,
		); err != nil {
			return nil, err
		}
		idxByID[pc.ID] = len(list)
		list = append(list, pc)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(list) == 0 {
		return list, nil
	}

	fRows, err := s.pool.Query(ctx, `
		SELECT f.id, f.pla_camp_id, f.ordre, f.concepte_fita, TO_CHAR(f.data_prevista, 'YYYY-MM-DD'),
		       f.base_imposable::float8, f.iva_percentatge::float8, f.irpf_percentatge::float8,
		       f.factura_id, fv.numero_complet, fv.estat_document
		FROM fin_plans_camp_fites f
		LEFT JOIN fin_factures_venda fv ON fv.id = f.factura_id
		ORDER BY f.ordre ASC, f.data_prevista ASC
	`)
	if err != nil {
		return nil, err
	}
	defer fRows.Close()

	for fRows.Next() {
		var ft models.FinPlaCampFita
		if err := fRows.Scan(
			&ft.ID, &ft.PlaCampID, &ft.Ordre, &ft.ConcepteFita, &ft.DataPrevista,
			&ft.BaseImposable, &ft.IvaPercentatge, &ft.IrpfPercentatge,
			&ft.FacturaID, &ft.FacturaNumero, &ft.FacturaEstat,
		); err != nil {
			return nil, err
		}
		if idx, ok := idxByID[ft.PlaCampID]; ok {
			list[idx].Fites = append(list[idx].Fites, ft)
		}
	}
	return list, fRows.Err()
}

func (s *PostgresStore) CreateFinPlaCamp(ctx context.Context, req models.CreateFinPlaCampRequest) (*models.FinPlaCamp, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var plaID string
	err = tx.QueryRow(ctx, `
		INSERT INTO fin_plans_camp (
			client_id, article_id, unitat_negoci_id, entrenador_id, titol_camp,
			periode_camp_inici, periode_camp_fi, total_base_pactada, iva_percentatge, irpf_percentatge, estat, notes
		) VALUES ($1,$2,$3,$4,$5,$6::date,$7::date,$8,$9,$10,'actiu',$11)
		RETURNING id
	`,
		req.ClientID, nullableUUID(req.ArticleID), req.UnitatNegociID, nullableUUID(req.EntrenadorID), req.TitolCamp,
		req.PeriodeCampInici, req.PeriodeCampFi, roundCurrency(req.TotalBasePactada),
		roundCurrency(req.IvaPercentatge), roundCurrency(req.IrpfPercentatge), req.Notes,
	).Scan(&plaID)
	if err != nil {
		return nil, err
	}

	for i, f := range req.Fites {
		ordre := f.Ordre
		if ordre <= 0 {
			ordre = i + 1
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO fin_plans_camp_fites (pla_camp_id, ordre, concepte_fita, data_prevista, base_imposable, iva_percentatge, irpf_percentatge)
			VALUES ($1, $2, $3, $4::date, $5, $6, $7)
		`, plaID, ordre, f.ConcepteFita, f.DataPrevista, roundCurrency(f.BaseImposable), roundCurrency(f.IvaPercentatge), roundCurrency(f.IrpfPercentatge))
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	plans, err := s.ListFinPlansCamp(ctx)
	if err != nil {
		return nil, err
	}
	for _, p := range plans {
		if p.ID == plaID {
			return &p, nil
		}
	}
	return nil, fmt.Errorf("pla de camp creat però no recuperat")
}

// GenerateDraftFromCampFita crea 1 factura independent per a una fita concreta del Training Camp.
func (s *PostgresStore) GenerateDraftFromCampFita(ctx context.Context, fitaID string) (*models.FinFacturaVenda, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var (
		plaID, clientID, unitatID, titolCamp, pInici, pFi string
		articleID, entrenadorID, existingFacturaID        *string
		concepteFita, dataPrevista                        string
		base, ivaPct, irpfPct                             float64
	)
	err = tx.QueryRow(ctx, `
		SELECT pc.id, pc.client_id, pc.article_id, pc.unitat_negoci_id, pc.entrenador_id, pc.titol_camp,
		       TO_CHAR(pc.periode_camp_inici, 'YYYY-MM-DD'), TO_CHAR(pc.periode_camp_fi, 'YYYY-MM-DD'),
		       f.concepte_fita, TO_CHAR(f.data_prevista, 'YYYY-MM-DD'),
		       f.base_imposable::float8, f.iva_percentatge::float8, f.irpf_percentatge::float8, f.factura_id
		FROM fin_plans_camp_fites f
		JOIN fin_plans_camp pc ON pc.id = f.pla_camp_id
		WHERE f.id = $1
		FOR UPDATE OF f
	`, fitaID).Scan(
		&plaID, &clientID, &articleID, &unitatID, &entrenadorID, &titolCamp,
		&pInici, &pFi, &concepteFita, &dataPrevista, &base, &ivaPct, &irpfPct, &existingFacturaID,
	)
	if err != nil {
		return nil, fmt.Errorf("fita de camp no trobada: %w", err)
	}
	if existingFacturaID != nil {
		return nil, fmt.Errorf("aquesta fita ja té una factura generada")
	}

	var serieID *string
	_ = tx.QueryRow(ctx, `SELECT serie_defecte_id FROM fin_unitats_negoci WHERE id = $1`, unitatID).Scan(&serieID)

	ivaImp := roundCurrency(base * ivaPct / 100.0)
	irpfImp := roundCurrency(base * irpfPct / 100.0)
	total := roundCurrency(base + ivaImp - irpfImp)
	concepte := fmt.Sprintf("%s — %s", titolCamp, concepteFita)
	today := time.Now().Format("2006-01-02")
	venciment := dataPrevista
	if venciment < today {
		venciment = today
	}

	var facturaID string
	err = tx.QueryRow(ctx, `
		INSERT INTO fin_factures_venda (
			serie_id, tipus_factura, estat_document, client_id, fita_camp_id,
			unitat_negoci_id, entrenador_id, article_id, concepte,
			base_imposable, iva_percentatge, iva_import, irpf_percentatge, irpf_import, total_factura,
			data_emissio, data_venciment, periode_inici, periode_fi, estat_cobrament
		) VALUES ($1,'F1','esborrany',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::date,$15::date,$16::date,$17::date,'pendent')
		RETURNING id
	`,
		serieID, clientID, fitaID, unitatID, entrenadorID, articleID, concepte,
		base, ivaPct, ivaImp, irpfPct, irpfImp, total,
		today, venciment, pInici, pFi,
	).Scan(&facturaID)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `UPDATE fin_plans_camp_fites SET factura_id = $1 WHERE id = $2`, facturaID, fitaID)
	if err != nil {
		return nil, err
	}

	// Si totes les fites ja tenen factura, marcar el pla com completat
	var pendents int
	_ = tx.QueryRow(ctx, `SELECT COUNT(*) FROM fin_plans_camp_fites WHERE pla_camp_id = $1 AND factura_id IS NULL`, plaID).Scan(&pendents)
	if pendents == 0 {
		_, _ = tx.Exec(ctx, `UPDATE fin_plans_camp SET estat = 'completat', updated_at = now() WHERE id = $1`, plaID)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return s.GetFinFacturaVendaByID(ctx, facturaID)
}
