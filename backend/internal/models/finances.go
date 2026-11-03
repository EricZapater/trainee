package models

import (
	"encoding/json"
	"time"
)

// ============================================================
// Mòdul Administració i Finances (Veri*factu Ready)
// ============================================================

type FinConfiguracioEmpresa struct {
	ID                 int       `json:"id"`
	RaoSocial          string    `json:"rao_social"`
	NomComercial       string    `json:"nom_comercial"`
	NifCif             string    `json:"nif_cif"`
	Adreca             string    `json:"adreca"`
	CP                 string    `json:"cp"`
	Poblacio           string    `json:"poblacio"`
	Provincia          string    `json:"provincia"`
	Pais               string    `json:"pais"`
	EmailAdministracio string    `json:"email_administracio"`
	Telefon            string    `json:"telefon"`
	IbanPrincipal      string    `json:"iban_principal"`
	LogoURL            string    `json:"logo_url"`
	PeuLegal           string    `json:"peu_legal"`
	IvaDefecte         float64   `json:"iva_defecte"`
	IrpfDefecteVendes  float64   `json:"irpf_defecte_vendes"`
	IrpfDefecteCompres float64   `json:"irpf_defecte_compres"`
	SaldoInicial       float64   `json:"saldo_inicial"`
	DataTallSaldo      string    `json:"data_tall_saldo"` // YYYY-MM-DD
	UpdatedAt          time.Time `json:"updated_at"`
}

type FinImpost struct {
	ID            string    `json:"id"`
	Nom           string    `json:"nom"`
	Tipus         string    `json:"tipus"` // 'iva' | 'irpf'
	Percentatge   float64   `json:"percentatge"`
	CausaExempcio string    `json:"causa_exempcio"`
	PerDefecte    bool      `json:"per_defecte"`
	Actiu         bool      `json:"actiu"`
	CreatedAt     time.Time `json:"created_at"`
}

type UpsertFinImpostRequest struct {
	Nom           string  `json:"nom" binding:"required"`
	Tipus         string  `json:"tipus" binding:"required,oneof=iva irpf"`
	Percentatge   float64 `json:"percentatge"`
	CausaExempcio string  `json:"causa_exempcio"`
	PerDefecte    bool    `json:"per_defecte"`
	Actiu         bool    `json:"actiu"`
}

type FinSerie struct {
	ID          string    `json:"id"`
	Codi        string    `json:"codi"`
	Descripcio  string    `json:"descripcio"`
	Tipus       string    `json:"tipus"` // 'ordinaria' | 'rectificativa'
	AnyFiscal   int       `json:"any_fiscal"`
	Prefix      string    `json:"prefix"`
	UltimNumero int       `json:"ultim_numero"`
	Activa      bool      `json:"activa"`
	CreatedAt   time.Time `json:"created_at"`
}

type UpsertFinSerieRequest struct {
	Codi       string `json:"codi" binding:"required"`
	Descripcio string `json:"descripcio"`
	Tipus      string `json:"tipus" binding:"required,oneof=ordinaria rectificativa"`
	AnyFiscal  int    `json:"any_fiscal" binding:"required"`
	Prefix     string `json:"prefix" binding:"required"`
	Activa     bool   `json:"activa"`
}

type FinUnitatNegoci struct {
	ID             string    `json:"id"`
	Codi           string    `json:"codi"`
	Nom            string    `json:"nom"`
	Descripcio     string    `json:"descripcio"`
	SerieDefecteID *string   `json:"serie_defecte_id"`
	SerieCodi      *string   `json:"serie_codi,omitempty"`
	Activa         bool      `json:"activa"`
	Ordre          int       `json:"ordre"`
	CreatedAt      time.Time `json:"created_at"`
}

type UpsertFinUnitatNegociRequest struct {
	Codi           string  `json:"codi" binding:"required"`
	Nom            string  `json:"nom" binding:"required"`
	Descripcio     string  `json:"descripcio"`
	SerieDefecteID *string `json:"serie_defecte_id"`
	Activa         bool    `json:"activa"`
	Ordre          int     `json:"ordre"`
}

type FinClient struct {
	ID            string    `json:"id"`
	UsuariID      *string   `json:"usuari_id"`
	UsuariNom     *string   `json:"usuari_nom,omitempty"`
	NomFiscal     string    `json:"nom_fiscal"`
	TipusIDFiscal string    `json:"tipus_id_fiscal"` // NIF, NIE, CIF, Passaport, Altre
	NifCif        string    `json:"nif_cif"`
	Adreca        string    `json:"adreca"`
	CP            string    `json:"cp"`
	Poblacio      string    `json:"poblacio"`
	Provincia     string    `json:"provincia"`
	Pais          string    `json:"pais"`
	Email         string    `json:"email"`
	Telefon       string    `json:"telefon"`
	Notes         string    `json:"notes"`
	Actiu         bool      `json:"actiu"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type UpsertFinClientRequest struct {
	UsuariID      *string `json:"usuari_id"`
	NomFiscal     string  `json:"nom_fiscal" binding:"required"`
	TipusIDFiscal string  `json:"tipus_id_fiscal"`
	NifCif        string  `json:"nif_cif"`
	Adreca        string  `json:"adreca"`
	CP            string  `json:"cp"`
	Poblacio      string  `json:"poblacio"`
	Provincia     string  `json:"provincia"`
	Pais          string  `json:"pais"`
	Email         string  `json:"email"`
	Telefon       string  `json:"telefon"`
	Notes         string  `json:"notes"`
	Actiu         bool    `json:"actiu"`
}

type FinProveidor struct {
	ID                    string    `json:"id"`
	NomFiscal             string    `json:"nom_fiscal"`
	NifCif                string    `json:"nif_cif"`
	Adreca                string    `json:"adreca"`
	CP                    string    `json:"cp"`
	Poblacio              string    `json:"poblacio"`
	Provincia             string    `json:"provincia"`
	Pais                  string    `json:"pais"`
	Iban                  string    `json:"iban"`
	Email                 string    `json:"email"`
	Telefon               string    `json:"telefon"`
	IvaDefecte            float64   `json:"iva_defecte"`
	IrpfDefecte           float64   `json:"irpf_defecte"`
	UnitatNegociDefecteID *string   `json:"unitat_negoci_defecte_id"`
	EntrenadorDefecteID   *string   `json:"entrenador_defecte_id"`
	UnitatNegociNom       *string   `json:"unitat_negoci_nom,omitempty"`
	EntrenadorNom         *string   `json:"entrenador_nom,omitempty"`
	Notes                 string    `json:"notes"`
	Actiu                 bool      `json:"actiu"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

type UpsertFinProveidorRequest struct {
	NomFiscal             string  `json:"nom_fiscal" binding:"required"`
	NifCif                string  `json:"nif_cif"`
	Adreca                string  `json:"adreca"`
	CP                    string  `json:"cp"`
	Poblacio              string  `json:"poblacio"`
	Provincia             string  `json:"provincia"`
	Pais                  string  `json:"pais"`
	Iban                  string  `json:"iban"`
	Email                 string  `json:"email"`
	Telefon               string  `json:"telefon"`
	IvaDefecte            float64 `json:"iva_defecte"`
	IrpfDefecte           float64 `json:"irpf_defecte"`
	UnitatNegociDefecteID *string `json:"unitat_negoci_defecte_id"`
	EntrenadorDefecteID   *string `json:"entrenador_defecte_id"`
	Notes                 string  `json:"notes"`
	Actiu                 bool    `json:"actiu"`
}

type FinArticle struct {
	ID              string    `json:"id"`
	Codi            string    `json:"codi"`
	Nom             string    `json:"nom"`
	Descripcio      string    `json:"descripcio"`
	Categoria       string    `json:"categoria"` // entrenament_recurrent, training_camp, puntual
	UnitatNegociID  string    `json:"unitat_negoci_id"`
	UnitatNegociNom string    `json:"unitat_negoci_nom,omitempty"`
	PreuBase        float64   `json:"preu_base"`
	IvaPercentatge  float64   `json:"iva_percentatge"`
	IrpfPercentatge float64   `json:"irpf_percentatge"`
	CausaExempcio   string    `json:"causa_exempcio"`
	Actiu           bool      `json:"actiu"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type UpsertFinArticleRequest struct {
	Codi            string  `json:"codi"`
	Nom             string  `json:"nom" binding:"required"`
	Descripcio      string  `json:"descripcio"`
	Categoria       string  `json:"categoria" binding:"required,oneof=entrenament_recurrent training_camp puntual"`
	UnitatNegociID  string  `json:"unitat_negoci_id" binding:"required"`
	PreuBase        float64 `json:"preu_base"`
	IvaPercentatge  float64 `json:"iva_percentatge"`
	IrpfPercentatge float64 `json:"irpf_percentatge"`
	CausaExempcio   string  `json:"causa_exempcio"`
	Actiu           bool    `json:"actiu"`
}

type FinSubscripcio struct {
	ID                    string    `json:"id"`
	ClientID              string    `json:"client_id"`
	ClientNom             string    `json:"client_nom,omitempty"`
	ArticleID             string    `json:"article_id"`
	ArticleNom            string    `json:"article_nom,omitempty"`
	UnitatNegociID        string    `json:"unitat_negoci_id"`
	UnitatNegociNom       string    `json:"unitat_negoci_nom,omitempty"`
	EntrenadorID          *string   `json:"entrenador_id"`
	EntrenadorNom         *string   `json:"entrenador_nom,omitempty"`
	PeriodicitatMesos     int       `json:"periodicitat_mesos"` // 1, 3, 6, 12
	ConceptePersonalitzat string    `json:"concepte_personalitzat"`
	BaseImposable         float64   `json:"base_imposable"`
	IvaPercentatge        float64   `json:"iva_percentatge"`
	IrpfPercentatge       float64   `json:"irpf_percentatge"`
	DiesVenciment         int       `json:"dies_venciment"`
	DataInici             string    `json:"data_inici"`
	ProperaDataFacturacio string    `json:"propera_data_facturacio"`
	DataFi                *string   `json:"data_fi"`
	Activa                bool      `json:"activa"`
	CreatedAt             time.Time `json:"created_at"`
}

type UpsertFinSubscripcioRequest struct {
	ClientID              string  `json:"client_id" binding:"required"`
	ArticleID             string  `json:"article_id"`
	UnitatNegociID        string  `json:"unitat_negoci_id"`
	EntrenadorID          *string `json:"entrenador_id"`
	PeriodicitatMesos     int     `json:"periodicitat_mesos" binding:"required,oneof=1 3 6 12"`
	ConceptePersonalitzat string  `json:"concepte_personalitzat"`
	BaseImposable         float64 `json:"base_imposable"`
	IvaPercentatge        float64 `json:"iva_percentatge"`
	IrpfPercentatge       float64 `json:"irpf_percentatge"`
	DiesVenciment         int     `json:"dies_venciment"`
	DataInici             string  `json:"data_inici" binding:"required"`
	ProperaDataFacturacio string  `json:"propera_data_facturacio" binding:"required"`
	DataFi                *string `json:"data_fi"`
	Activa                bool    `json:"activa"`
}

type FinPlaCampFita struct {
	ID              string  `json:"id"`
	PlaCampID       string  `json:"pla_camp_id"`
	Ordre           int     `json:"ordre"`
	ConcepteFita    string  `json:"concepte_fita"`
	DataPrevista    string  `json:"data_prevista"`
	BaseImposable   float64 `json:"base_imposable"`
	IvaPercentatge  float64 `json:"iva_percentatge"`
	IrpfPercentatge float64 `json:"irpf_percentatge"`
	FacturaID       *string `json:"factura_id"`
	FacturaNumero   *string `json:"factura_numero,omitempty"`
	FacturaEstat    *string `json:"factura_estat,omitempty"`
}

type FinPlaCamp struct {
	ID               string           `json:"id"`
	ClientID         string           `json:"client_id"`
	ClientNom        string           `json:"client_nom,omitempty"`
	ArticleID        *string          `json:"article_id"`
	ArticleNom       *string          `json:"article_nom,omitempty"`
	UnitatNegociID   string           `json:"unitat_negoci_id"`
	UnitatNegociNom  string           `json:"unitat_negoci_nom,omitempty"`
	EntrenadorID     *string          `json:"entrenador_id"`
	EntrenadorNom    *string          `json:"entrenador_nom,omitempty"`
	TitolCamp        string           `json:"titol_camp"`
	PeriodeCampInici string           `json:"periode_camp_inici"`
	PeriodeCampFi    string           `json:"periode_camp_fi"`
	TotalBasePactada float64          `json:"total_base_pactada"`
	IvaPercentatge   float64          `json:"iva_percentatge"`
	IrpfPercentatge  float64          `json:"irpf_percentatge"`
	Estat            string           `json:"estat"` // actiu, completat, cancelat
	Notes            string           `json:"notes"`
	Fites            []FinPlaCampFita `json:"fites"`
	CreatedAt        time.Time        `json:"created_at"`
}

type CreateFinPlaCampFitaInput struct {
	Ordre           int     `json:"ordre"`
	ConcepteFita    string  `json:"concepte_fita" binding:"required"`
	DataPrevista    string  `json:"data_prevista" binding:"required"`
	BaseImposable   float64 `json:"base_imposable"`
	IvaPercentatge  float64 `json:"iva_percentatge"`
	IrpfPercentatge float64 `json:"irpf_percentatge"`
}

type CreateFinPlaCampRequest struct {
	ClientID         string                      `json:"client_id" binding:"required"`
	ArticleID        *string                     `json:"article_id"`
	UnitatNegociID   string                      `json:"unitat_negoci_id" binding:"required"`
	EntrenadorID     *string                     `json:"entrenador_id"`
	TitolCamp        string                      `json:"titol_camp" binding:"required"`
	PeriodeCampInici string                      `json:"periode_camp_inici" binding:"required"`
	PeriodeCampFi    string                      `json:"periode_camp_fi" binding:"required"`
	TotalBasePactada float64                     `json:"total_base_pactada"`
	IvaPercentatge   float64                     `json:"iva_percentatge"`
	IrpfPercentatge  float64                     `json:"irpf_percentatge"`
	Notes            string                      `json:"notes"`
	Fites            []CreateFinPlaCampFitaInput `json:"fites" binding:"required,min=1"`
}

type FinFacturaVenda struct {
	ID                 string          `json:"id"`
	SerieID            *string         `json:"serie_id"`
	SerieCodi          *string         `json:"serie_codi,omitempty"`
	NumeroSeq          *int            `json:"numero_seq"`
	NumeroComplet      *string         `json:"numero_complet"`
	TipusFactura       string          `json:"tipus_factura"`  // F1 | R1
	EstatDocument      string          `json:"estat_document"` // esborrany | emesa
	ClientID           string          `json:"client_id"`
	ClientNom          string          `json:"client_nom,omitempty"`
	ClientNif          string          `json:"client_nif,omitempty"`
	SubscripcioID      *string         `json:"subscripcio_id"`
	FitaCampID         *string         `json:"fita_camp_id"`
	FacturaOrigenID    *string         `json:"factura_origen_id"`
	FacturaOrigenNum   *string         `json:"factura_origen_num,omitempty"`
	MotiuRectificacio  string          `json:"motiu_rectificacio"`
	EmissorSnapshot    json.RawMessage `json:"emissor_snapshot,omitempty"`
	ClientSnapshot     json.RawMessage `json:"client_snapshot,omitempty"`
	UnitatNegociID     string          `json:"unitat_negoci_id"`
	UnitatNegociNom    string          `json:"unitat_negoci_nom,omitempty"`
	EntrenadorID       *string         `json:"entrenador_id"`
	EntrenadorNom      *string         `json:"entrenador_nom,omitempty"`
	ArticleID          *string         `json:"article_id"`
	ArticleNom         *string         `json:"article_nom,omitempty"`
	Concepte           string          `json:"concepte"`
	DescripcioDetall   string          `json:"descripcio_detall"`
	BaseImposable      float64         `json:"base_imposable"`
	IvaPercentatge     float64         `json:"iva_percentatge"`
	CausaExempcio      string          `json:"causa_exempcio"`
	IvaImport          float64         `json:"iva_import"`
	IrpfPercentatge    float64         `json:"irpf_percentatge"`
	IrpfImport         float64         `json:"irpf_import"`
	TotalFactura       float64         `json:"total_factura"`
	DataEmissio        string          `json:"data_emissio"`
	DataVenciment      string          `json:"data_venciment"`
	PeriodeInici       string          `json:"periode_inici"`
	PeriodeFi          string          `json:"periode_fi"`
	EstatCobrament     string          `json:"estat_cobrament"` // pendent, pagada, impagada, compensada
	DataConciliacio    *string         `json:"data_conciliacio"`
	DataImpagament     *string         `json:"data_impagament"`
	MotiuImpagament    string          `json:"motiu_impagament"`
	NotesTresoreria    string          `json:"notes_tresoreria"`
	EmesaAt            *time.Time      `json:"emesa_at"`
	VerifactuEstat     string          `json:"verifactu_estat"`
	VerifactuHash      string          `json:"verifactu_hash"`
	VerifactuQRData    string          `json:"verifactu_qr_data"`
	CreatedAt          time.Time       `json:"created_at"`
}

type UpsertFinFacturaVendaRequest struct {
	SerieID          *string `json:"serie_id"`
	ClientID         string  `json:"client_id" binding:"required"`
	UnitatNegociID   string  `json:"unitat_negoci_id" binding:"required"`
	EntrenadorID     *string `json:"entrenador_id"`
	ArticleID        *string `json:"article_id"`
	Concepte         string  `json:"concepte" binding:"required"`
	DescripcioDetall string  `json:"descripcio_detall"`
	BaseImposable    float64 `json:"base_imposable"`
	IvaPercentatge   float64 `json:"iva_percentatge"`
	CausaExempcio    string  `json:"causa_exempcio"`
	IrpfPercentatge  float64 `json:"irpf_percentatge"`
	DataEmissio      string  `json:"data_emissio" binding:"required"`
	DataVenciment    string  `json:"data_venciment" binding:"required"`
	PeriodeInici     string  `json:"periode_inici" binding:"required"`
	PeriodeFi        string  `json:"periode_fi" binding:"required"`
	NotesTresoreria  string  `json:"notes_tresoreria"`
	EmetreDirecte    bool    `json:"emetre_directe"`
}

type EmetreFacturaRequest struct {
	SerieID       *string `json:"serie_id"`
	DataEmissio   string  `json:"data_emissio"`
	DataVenciment string  `json:"data_venciment"`
}

type ConciliarDocumentRequest struct {
	DataConciliacio string `json:"data_conciliacio" binding:"required"` // YYYY-MM-DD
	Notes           string `json:"notes"`
}

type MarcarImpagatRequest struct {
	DataImpagament  string `json:"data_impagament"`
	MotiuImpagament string `json:"motiu_impagament"`
}

type CrearAbonamentRequest struct {
	SerieRectificativaID *string  `json:"serie_rectificativa_id"`
	MotiuRectificacio    string   `json:"motiu_rectificacio" binding:"required"`
	BaseAbonarPositiva   *float64 `json:"base_abonar_positiva"` // nil o <=0 => abonament total
	DataEmissio          string   `json:"data_emissio"`
	EmetreDirecte        bool     `json:"emetre_directe"`
}

type FinCompra struct {
	ID                  string    `json:"id"`
	ProveidorID         string    `json:"proveidor_id"`
	ProveidorNom        string    `json:"proveidor_nom,omitempty"`
	ProveidorNif        string    `json:"proveidor_nif,omitempty"`
	NumFacturaProveidor string    `json:"num_factura_proveidor"`
	UnitatNegociID      string    `json:"unitat_negoci_id"`
	UnitatNegociNom     string    `json:"unitat_negoci_nom,omitempty"`
	EntrenadorID        *string   `json:"entrenador_id"`
	EntrenadorNom       *string   `json:"entrenador_nom,omitempty"`
	Concepte            string    `json:"concepte"`
	BaseImposable       float64   `json:"base_imposable"`
	IvaPercentatge      float64   `json:"iva_percentatge"`
	IvaImport           float64   `json:"iva_import"`
	IrpfPercentatge     float64   `json:"irpf_percentatge"`
	IrpfImport          float64   `json:"irpf_import"`
	TotalPagar          float64   `json:"total_pagar"`
	DataEmissio         string    `json:"data_emissio"`
	DataVenciment       string    `json:"data_venciment"`
	PeriodeInici        string    `json:"periode_inici"`
	PeriodeFi           string    `json:"periode_fi"`
	EstatPagament       string    `json:"estat_pagament"` // pendent, pagada, impagada
	DataConciliacio     *string   `json:"data_conciliacio"`
	FitxerAdjuntPath    string    `json:"fitxer_adjunt_path"`
	Notes               string    `json:"notes"`
	CreatedAt           time.Time `json:"created_at"`
}

type UpsertFinCompraRequest struct {
	ProveidorID         string  `json:"proveidor_id" binding:"required"`
	NumFacturaProveidor string  `json:"num_factura_proveidor" binding:"required"`
	UnitatNegociID      string  `json:"unitat_negoci_id" binding:"required"`
	EntrenadorID        *string `json:"entrenador_id"`
	Concepte            string  `json:"concepte" binding:"required"`
	BaseImposable       float64 `json:"base_imposable"`
	IvaPercentatge      float64 `json:"iva_percentatge"`
	IrpfPercentatge     float64 `json:"irpf_percentatge"`
	DataEmissio         string  `json:"data_emissio" binding:"required"`
	DataVenciment       string  `json:"data_venciment" binding:"required"`
	PeriodeInici        string  `json:"periode_inici" binding:"required"`
	PeriodeFi           string  `json:"periode_fi" binding:"required"`
	EstatPagament       string  `json:"estat_pagament"`
	DataConciliacio     *string `json:"data_conciliacio"`
	FitxerAdjuntPath    string  `json:"fitxer_adjunt_path"`
	Notes               string  `json:"notes"`
}

type FinDespesa struct {
	ID               string    `json:"id"`
	Categoria        string    `json:"categoria"` // nomina, seguretat_social, banc, impostos, dietes, altres
	BeneficiariNom   string    `json:"beneficiari_nom"`
	Concepte         string    `json:"concepte"`
	UnitatNegociID   string    `json:"unitat_negoci_id"`
	UnitatNegociNom  string    `json:"unitat_negoci_nom,omitempty"`
	EntrenadorID     *string   `json:"entrenador_id"`
	EntrenadorNom    *string   `json:"entrenador_nom,omitempty"`
	ImportTotal      float64   `json:"import_total"`
	DataDevengo      string    `json:"data_devengo"`
	DataVenciment    string    `json:"data_venciment"`
	PeriodeInici     string    `json:"periode_inici"`
	PeriodeFi        string    `json:"periode_fi"`
	EstatPagament    string    `json:"estat_pagament"` // pendent, pagada
	DataConciliacio  *string   `json:"data_conciliacio"`
	FitxerAdjuntPath string    `json:"fitxer_adjunt_path"`
	Notes            string    `json:"notes"`
	CreatedAt        time.Time `json:"created_at"`
}

type UpsertFinDespesaRequest struct {
	Categoria        string  `json:"categoria" binding:"required,oneof=nomina seguretat_social banc impostos dietes altres"`
	BeneficiariNom   string  `json:"beneficiari_nom" binding:"required"`
	Concepte         string  `json:"concepte" binding:"required"`
	UnitatNegociID   string  `json:"unitat_negoci_id" binding:"required"`
	EntrenadorID     *string `json:"entrenador_id"`
	ImportTotal      float64 `json:"import_total"`
	DataDevengo      string  `json:"data_devengo" binding:"required"`
	DataVenciment    string  `json:"data_venciment" binding:"required"`
	PeriodeInici     string  `json:"periode_inici" binding:"required"`
	PeriodeFi        string  `json:"periode_fi" binding:"required"`
	EstatPagament    string  `json:"estat_pagament"`
	DataConciliacio  *string `json:"data_conciliacio"`
	FitxerAdjuntPath string  `json:"fitxer_adjunt_path"`
	Notes            string  `json:"notes"`
}

type FinRecurrentSortida struct {
	ID                string    `json:"id"`
	TipusDesti        string    `json:"tipus_desti"` // compra | despesa
	ProveidorID       *string   `json:"proveidor_id"`
	ProveidorNom      *string   `json:"proveidor_nom,omitempty"`
	CategoriaDespesa  string    `json:"categoria_despesa"`
	BeneficiariNom    string    `json:"beneficiari_nom"`
	Concepte          string    `json:"concepte"`
	UnitatNegociID    string    `json:"unitat_negoci_id"`
	UnitatNegociNom   string    `json:"unitat_negoci_nom,omitempty"`
	EntrenadorID      *string   `json:"entrenador_id"`
	EntrenadorNom     *string   `json:"entrenador_nom,omitempty"`
	PeriodicitatMesos int       `json:"periodicitat_mesos"`
	BaseOImport       float64   `json:"base_o_import"`
	IvaPercentatge    float64   `json:"iva_percentatge"`
	IrpfPercentatge   float64   `json:"irpf_percentatge"`
	DiesVenciment     int       `json:"dies_venciment"`
	ProperaData       string    `json:"propera_data"`
	DataFi            *string   `json:"data_fi"`
	Actiu             bool      `json:"actiu"`
	CreatedAt         time.Time `json:"created_at"`
}

type UpsertFinRecurrentSortidaRequest struct {
	TipusDesti        string  `json:"tipus_desti" binding:"required,oneof=compra despesa"`
	ProveidorID       *string `json:"proveidor_id"`
	CategoriaDespesa  string  `json:"categoria_despesa"`
	BeneficiariNom    string  `json:"beneficiari_nom"`
	Concepte          string  `json:"concepte" binding:"required"`
	UnitatNegociID    string  `json:"unitat_negoci_id" binding:"required"`
	EntrenadorID      *string `json:"entrenador_id"`
	PeriodicitatMesos int     `json:"periodicitat_mesos" binding:"required,oneof=1 3 6 12"`
	BaseOImport       float64 `json:"base_o_import"`
	IvaPercentatge    float64 `json:"iva_percentatge"`
	IrpfPercentatge   float64 `json:"irpf_percentatge"`
	DiesVenciment     int     `json:"dies_venciment"`
	ProperaData       string  `json:"propera_data" binding:"required"`
	DataFi            *string `json:"data_fi"`
	Actiu             bool    `json:"actiu"`
}

// ============================================================
// Informes Analítics (Vendes - Compres - Despeses) i Caixa
// ============================================================

type FinAnalyticalRow struct {
	GroupID        string  `json:"group_id"`
	GroupNom       string  `json:"group_nom"`
	SubGroupID     string  `json:"sub_group_id,omitempty"`
	SubGroupNom    string  `json:"sub_group_nom,omitempty"`
	VendesBase     float64 `json:"vendes_base"`
	CompresBase    float64 `json:"compres_base"`
	DespesesImport float64 `json:"despeses_import"`
	ResultatNet    float64 `json:"resultat_net"`
	MargePct       float64 `json:"marge_pct"`
}

type FinInformeResultatsResponse struct {
	DataInici        string             `json:"data_inici"`
	DataFi           string             `json:"data_fi"`
	Mode             string             `json:"mode"` // "emissio" | "prorratejat"
	TotalVendes      float64            `json:"total_vendes"`
	TotalCompres     float64            `json:"total_compres"`
	TotalDespeses    float64            `json:"total_despeses"`
	ResultatGlobal   float64            `json:"resultat_global"`
	MargeGlobalPct   float64            `json:"marge_global_pct"`
	IvaRepercutit    float64            `json:"iva_repercutit"`
	IvaSuportat      float64            `json:"iva_suportat"`
	IrpfRetingutComp float64            `json:"irpf_retingut_compres"`
	IrpfSuportatVend float64            `json:"irpf_suportat_vendes"`
	PerUnitatNegoci  []FinAnalyticalRow `json:"per_unitat_negoci"`
	PerEntrenador    []FinAnalyticalRow `json:"per_entrenador"`
	MatriuCreuada    []FinAnalyticalRow `json:"matriu_creuada"`
}

type FinCashflowItem struct {
	Data         string  `json:"data"`
	Tipus        string  `json:"tipus"`  // "entrada" | "sortida"
	Origen       string  `json:"origen"` // "factura_venda", "fita_camp", "subscripcio_proj", "compra", "despesa", "recurrent_proj", "liquidacio_iva_irpf"
	Concepte     string  `json:"concepte"`
	Tercer       string  `json:"tercer"`
	UnitatNegoci string  `json:"unitat_negoci"`
	ImportLiquid float64 `json:"import_liquid"`
	Endarrerit   bool    `json:"endarrerit"`
	ReferenciaID string  `json:"referencia_id,omitempty"`
}

type FinCashflowMonthBucket struct {
	Mes           string  `json:"mes"` // YYYY-MM
	SaldoInicial  float64 `json:"saldo_inicial"`
	Entrades      float64 `json:"entrades"`
	Sortides      float64 `json:"sortides"`
	FluxNet       float64 `json:"flux_net"`
	SaldoFinal    float64 `json:"saldo_final"`
}

type FinCashflowForecastResponse struct {
	DataTallSaldo          string                   `json:"data_tall_saldo"`
	SaldoInicialTall       float64                  `json:"saldo_inicial_tall"`
	CobramentsConciliats   float64                  `json:"cobraments_conciliats"`
	PagamentsConciliats    float64                  `json:"pagaments_conciliats"`
	SaldoActualConciliat   float64                  `json:"saldo_actual_conciliat"`
	HoritzoDies            int                      `json:"horitzo_dies"`
	InclouEndarrerits      bool                     `json:"inclou_endarrerits"`
	EndarreritsCobrar      float64                  `json:"endarrerits_cobrar"`
	EndarreritsPagar       float64                  `json:"endarrerits_pagar"`
	TotalImpagatsExclosos  float64                  `json:"total_impagats_exclosos"`
	SaldoFinalProjectat    float64                  `json:"saldo_final_projectat"`
	SaldoMinimProjectat    float64                  `json:"saldo_minim_projectat"`
	DataSaldoMinim         string                   `json:"data_saldo_minim"`
	EvolucioMensual        []FinCashflowMonthBucket `json:"evolucio_mensual"`
	MovimentsProjectats    []FinCashflowItem        `json:"moviments_projectats"`
}
