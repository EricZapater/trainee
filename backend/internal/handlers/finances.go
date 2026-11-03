package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/models"
	"trainee-backend/internal/pdf"
	"trainee-backend/internal/store"
	"trainee-backend/internal/uploader"
)

type FinancesHandler struct {
	Store    store.Store
	Uploader *uploader.Uploader
}

func NewFinancesHandler(s store.Store, u *uploader.Uploader) *FinancesHandler {
	return &FinancesHandler{Store: s, Uploader: u}
}

// ============================================================
// 1. Configuració d'Empresa i Impostos Globals
// ============================================================

func (h *FinancesHandler) GetConfiguracioEmpresa(c *gin.Context) {
	cfg, err := h.Store.GetFinConfiguracioEmpresa(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error obtenint configuració d'empresa: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, cfg)
}

func (h *FinancesHandler) UpdateConfiguracioEmpresa(c *gin.Context) {
	var req models.FinConfiguracioEmpresa
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cfg, err := h.Store.UpdateFinConfiguracioEmpresa(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error actualitzant configuració d'empresa: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, cfg)
}

func (h *FinancesHandler) ListImpostos(c *gin.Context) {
	list, err := h.Store.ListFinImpostos(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *FinancesHandler) CreateImpost(c *gin.Context) {
	var req models.UpsertFinImpostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	it, err := h.Store.CreateFinImpost(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, it)
}

func (h *FinancesHandler) UpdateImpost(c *gin.Context) {
	id := c.Param("id")
	var req models.UpsertFinImpostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	it, err := h.Store.UpdateFinImpost(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, it)
}

func (h *FinancesHandler) DeleteImpost(c *gin.Context) {
	id := c.Param("id")
	if err := h.Store.DeleteFinImpost(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "impost eliminat"})
}

// ============================================================
// 2. Sèries i Unitats de Negoci
// ============================================================

func (h *FinancesHandler) ListSeries(c *gin.Context) {
	list, err := h.Store.ListFinSeries(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *FinancesHandler) CreateSerie(c *gin.Context) {
	var req models.UpsertFinSerieRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sr, err := h.Store.CreateFinSerie(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, sr)
}

func (h *FinancesHandler) UpdateSerie(c *gin.Context) {
	id := c.Param("id")
	var req models.UpsertFinSerieRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sr, err := h.Store.UpdateFinSerie(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, sr)
}

func (h *FinancesHandler) ListUnitatsNegoci(c *gin.Context) {
	list, err := h.Store.ListFinUnitatsNegoci(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *FinancesHandler) CreateUnitatNegoci(c *gin.Context) {
	var req models.UpsertFinUnitatNegociRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	un, err := h.Store.CreateFinUnitatNegoci(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, un)
}

func (h *FinancesHandler) UpdateUnitatNegoci(c *gin.Context) {
	id := c.Param("id")
	var req models.UpsertFinUnitatNegociRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	un, err := h.Store.UpdateFinUnitatNegoci(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, un)
}

// ============================================================
// 3. Clients, Proveïdors i Articles
// ============================================================

func (h *FinancesHandler) ListClients(c *gin.Context) {
	list, err := h.Store.ListFinClients(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *FinancesHandler) CreateClient(c *gin.Context) {
	var req models.UpsertFinClientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cl, err := h.Store.CreateFinClient(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, cl)
}

func (h *FinancesHandler) UpdateClient(c *gin.Context) {
	id := c.Param("id")
	var req models.UpsertFinClientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cl, err := h.Store.UpdateFinClient(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, cl)
}

func (h *FinancesHandler) SyncAtletesToClients(c *gin.Context) {
	count, err := h.Store.SyncAtletesToFinClients(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"imported_count": count})
}

func (h *FinancesHandler) ListProveidors(c *gin.Context) {
	list, err := h.Store.ListFinProveidors(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *FinancesHandler) CreateProveidor(c *gin.Context) {
	var req models.UpsertFinProveidorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	pr, err := h.Store.CreateFinProveidor(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, pr)
}

func (h *FinancesHandler) UpdateProveidor(c *gin.Context) {
	id := c.Param("id")
	var req models.UpsertFinProveidorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	pr, err := h.Store.UpdateFinProveidor(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, pr)
}

func (h *FinancesHandler) ListArticles(c *gin.Context) {
	list, err := h.Store.ListFinArticles(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *FinancesHandler) CreateArticle(c *gin.Context) {
	var req models.UpsertFinArticleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ar, err := h.Store.CreateFinArticle(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, ar)
}

func (h *FinancesHandler) UpdateArticle(c *gin.Context) {
	id := c.Param("id")
	var req models.UpsertFinArticleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ar, err := h.Store.UpdateFinArticle(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, ar)
}

// ============================================================
// 4. Subscripcions i Plans Training Camp
// ============================================================

func (h *FinancesHandler) ListSubscripcions(c *gin.Context) {
	list, err := h.Store.ListFinSubscripcions(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *FinancesHandler) CreateSubscripcio(c *gin.Context) {
	var req models.UpsertFinSubscripcioRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dades de subscripció invàlides: " + err.Error()})
		return
	}
	if req.ProperaDataFacturacio == "" {
		req.ProperaDataFacturacio = req.DataInici
	}
	if req.ArticleID == "" {
		articles, err := h.Store.ListFinArticles(c.Request.Context())
		if err == nil && len(articles) > 0 {
			req.ArticleID = articles[0].ID
			if req.UnitatNegociID == "" {
				req.UnitatNegociID = articles[0].UnitatNegociID
			}
			if req.BaseImposable == 0 {
				req.BaseImposable = articles[0].PreuBase
			}
			if req.IvaPercentatge == 0 {
				req.IvaPercentatge = articles[0].IvaPercentatge
			}
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cal crear com a mínim un Article a Configuració abans de crear una subscripció"})
			return
		}
	}
	if req.UnitatNegociID == "" {
		units, err := h.Store.ListFinUnitatsNegoci(c.Request.Context())
		if err == nil && len(units) > 0 {
			req.UnitatNegociID = units[0].ID
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cal tenir com a mínim una Unitat de Negoci configurada"})
			return
		}
	}

	sb, err := h.Store.CreateFinSubscripcio(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, sb)
}

func (h *FinancesHandler) UpdateSubscripcio(c *gin.Context) {
	id := c.Param("id")
	var req models.UpsertFinSubscripcioRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dades de subscripció invàlides: " + err.Error()})
		return
	}
	sb, err := h.Store.UpdateFinSubscripcio(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, sb)
}

func (h *FinancesHandler) BatchGenerateSubscripcions(c *gin.Context) {
	var req struct {
		CutoffDate string `json:"cutoff_date" binding:"required"` // YYYY-MM-DD
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	count, err := h.Store.GenerateDraftsFromSubscripcions(c.Request.Context(), req.CutoffDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"drafts_created": count})
}

func (h *FinancesHandler) ListPlansCamp(c *gin.Context) {
	list, err := h.Store.ListFinPlansCamp(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *FinancesHandler) CreatePlaCamp(c *gin.Context) {
	var req models.CreateFinPlaCampRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	pc, err := h.Store.CreateFinPlaCamp(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, pc)
}

func (h *FinancesHandler) FacturarCampFita(c *gin.Context) {
	fitaID := c.Param("fita_id")
	fv, err := h.Store.GenerateDraftFromCampFita(c.Request.Context(), fitaID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, fv)
}

// ============================================================
// 5. Factures de Venda, Abonaments i Conciliació
// ============================================================

func (h *FinancesHandler) ListFacturesVenda(c *gin.Context) {
	estatDoc := c.Query("estat_document")
	estatCob := c.Query("estat_cobrament")
	unitatID := c.Query("unitat_negoci_id")
	entrenadorID := c.Query("entrenador_id")

	list, err := h.Store.ListFinFacturesVenda(c.Request.Context(), estatDoc, estatCob, unitatID, entrenadorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *FinancesHandler) GetFacturaVenda(c *gin.Context) {
	id := c.Param("id")
	fv, err := h.Store.GetFinFacturaVendaByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "factura no trobada"})
		return
	}
	c.JSON(http.StatusOK, fv)
}

func (h *FinancesHandler) CreateFacturaVenda(c *gin.Context) {
	var req models.UpsertFinFacturaVendaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	fv, err := h.Store.CreateFinFacturaVenda(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, fv)
}

func (h *FinancesHandler) UpdateFacturaVenda(c *gin.Context) {
	id := c.Param("id")
	var req models.UpsertFinFacturaVendaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	fv, err := h.Store.UpdateFinFacturaVenda(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, fv)
}

func (h *FinancesHandler) DeleteFacturaVenda(c *gin.Context) {
	id := c.Param("id")
	if err := h.Store.DeleteFinFacturaVenda(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "esborrany eliminat"})
}

func (h *FinancesHandler) EmetreFacturaVenda(c *gin.Context) {
	id := c.Param("id")
	var req models.EmetreFacturaRequest
	_ = c.ShouldBindJSON(&req)
	fv, err := h.Store.EmetreFinFacturaVenda(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, fv)
}

func (h *FinancesHandler) ConciliarFacturaVenda(c *gin.Context) {
	id := c.Param("id")
	var req models.ConciliarDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	fv, err := h.Store.ConciliarFinFacturaVenda(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, fv)
}

func (h *FinancesHandler) MarcarImpagadaFacturaVenda(c *gin.Context) {
	id := c.Param("id")
	var req models.MarcarImpagatRequest
	_ = c.ShouldBindJSON(&req)
	fv, err := h.Store.MarcarImpagadaFinFacturaVenda(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, fv)
}

func (h *FinancesHandler) CrearAbonamentFacturaVenda(c *gin.Context) {
	id := c.Param("id")
	var req models.CrearAbonamentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	rect, err := h.Store.CrearAbonamentFacturaVenda(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, rect)
}

// DownloadFacturaPDF retorna el PDF/HTML per a impressió de la factura
func (h *FinancesHandler) DownloadFacturaPDF(c *gin.Context) {
	id := c.Param("id")
	fv, err := h.Store.GetFinFacturaVendaByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "factura no trobada"})
		return
	}

	// Comprovació de seguretat: si és atleta, només pot descarregar la seva
	userRol, _ := c.Get("rol")
	userID := c.GetString("user_id")
	if userRol == "atleta" {
		// Validar si el client pertany a aquest usuari
		clients, _ := h.Store.ListFinClients(c.Request.Context())
		pertany := false
		for _, cl := range clients {
			if cl.ID == fv.ClientID && cl.UsuariID != nil && *cl.UsuariID == userID {
				pertany = true
				break
			}
		}
		if !pertany {
			c.JSON(http.StatusForbidden, gin.H{"error": "no tens accés a aquesta factura"})
			return
		}
	}

	cfg, _ := h.Store.GetFinConfiguracioEmpresa(c.Request.Context())
	if cfg == nil {
		cfg = &models.FinConfiguracioEmpresa{}
	}

	htmlBytes, err := pdf.GenerateInvoiceHTML(fv, cfg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	filename := "Factura_" + id[:8] + ".html"
	if fv.NumeroComplet != nil && *fv.NumeroComplet != "" {
		filename = "Factura_" + *fv.NumeroComplet + ".html"
	}

	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=%s", filename))
	c.Data(http.StatusOK, "text/html; charset=utf-8", htmlBytes)
}

// ============================================================
// 6. Portal de l'Usuari: "Les meves Factures i Dades Fiscals"
// ============================================================

func (h *FinancesHandler) GetMyFacturacio(c *gin.Context) {
	userID := c.GetString("user_id")
	client, err := h.Store.GetFinClientByUsuariID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if client == nil {
		user, err := h.Store.GetUsuariByID(c.Request.Context(), userID)
		nom := ""
		email := ""
		if err == nil && user != nil {
			nom = user.Nom
			if user.Cognoms != "" {
				nom += " " + user.Cognoms
			}
			email = user.Email
		}
		c.JSON(http.StatusOK, models.FinClient{
			NomFiscal:     nom,
			TipusIDFiscal: "NIF",
			NifCif:        "",
			Email:         email,
			Pais:          "Espanya",
			Actiu:         true,
		})
		return
	}
	c.JSON(http.StatusOK, client)
}

func (h *FinancesHandler) UpdateMyFacturacio(c *gin.Context) {
	userID := c.GetString("user_id")
	var req models.UpsertFinClientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	client, err := h.Store.UpsertFinClientByUsuariID(c.Request.Context(), userID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, client)
}

func (h *FinancesHandler) ListFacturesMe(c *gin.Context) {
	userID := c.GetString("user_id")
	list, err := h.Store.ListFinFacturesByUsuari(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

// ============================================================
// 7. Compres, Despeses i Fitxers Adjunts
// ============================================================

func (h *FinancesHandler) ListCompres(c *gin.Context) {
	estatPag := c.Query("estat_pagament")
	unitatID := c.Query("unitat_negoci_id")
	entrenadorID := c.Query("entrenador_id")

	list, err := h.Store.ListFinCompres(c.Request.Context(), estatPag, unitatID, entrenadorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *FinancesHandler) CreateCompra(c *gin.Context) {
	var req models.UpsertFinCompraRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cp, err := h.Store.CreateFinCompra(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, cp)
}

func (h *FinancesHandler) UpdateCompra(c *gin.Context) {
	id := c.Param("id")
	var req models.UpsertFinCompraRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cp, err := h.Store.UpdateFinCompra(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, cp)
}

func (h *FinancesHandler) DeleteCompra(c *gin.Context) {
	id := c.Param("id")
	if err := h.Store.DeleteFinCompra(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "compra eliminada"})
}

func (h *FinancesHandler) ConciliarCompra(c *gin.Context) {
	id := c.Param("id")
	var req models.ConciliarDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Store.ConciliarFinCompra(c.Request.Context(), id, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "compra conciliada"})
}

func (h *FinancesHandler) UploadDocument(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "fitxer requerit"})
		return
	}

	url, err := h.Uploader.UploadFile(c.Request.Context(), file, "finances")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error pujant fitxer: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}

func (h *FinancesHandler) ListDespeses(c *gin.Context) {
	estatPag := c.Query("estat_pagament")
	unitatID := c.Query("unitat_negoci_id")
	entrenadorID := c.Query("entrenador_id")

	list, err := h.Store.ListFinDespeses(c.Request.Context(), estatPag, unitatID, entrenadorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *FinancesHandler) CreateDespesa(c *gin.Context) {
	var req models.UpsertFinDespesaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	dp, err := h.Store.CreateFinDespesa(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, dp)
}

func (h *FinancesHandler) UpdateDespesa(c *gin.Context) {
	id := c.Param("id")
	var req models.UpsertFinDespesaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	dp, err := h.Store.UpdateFinDespesa(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, dp)
}

func (h *FinancesHandler) DeleteDespesa(c *gin.Context) {
	id := c.Param("id")
	if err := h.Store.DeleteFinDespesa(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "despesa eliminada"})
}

func (h *FinancesHandler) ConciliarDespesa(c *gin.Context) {
	id := c.Param("id")
	var req models.ConciliarDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Store.ConciliarFinDespesa(c.Request.Context(), id, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "despesa conciliada"})
}

func (h *FinancesHandler) ListRecurrentsSortida(c *gin.Context) {
	list, err := h.Store.ListFinRecurrentsSortida(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *FinancesHandler) CreateRecurrentSortida(c *gin.Context) {
	var req models.UpsertFinRecurrentSortidaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	rc, err := h.Store.CreateFinRecurrentSortida(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, rc)
}

func (h *FinancesHandler) DeleteRecurrentSortida(c *gin.Context) {
	id := c.Param("id")
	if err := h.Store.DeleteFinRecurrentSortida(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "recurrent eliminat"})
}

// ============================================================
// 8. Informes de Resultats i Previsió de Caixa
// ============================================================

func (h *FinancesHandler) GetInformeResultats(c *gin.Context) {
	dataInici := c.Query("data_inici")
	dataFi := c.Query("data_fi")
	mode := c.Query("mode")

	if dataInici == "" {
		dataInici = time.Date(time.Now().Year(), 1, 1, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	}
	if dataFi == "" {
		dataFi = time.Now().Format("2006-01-02")
	}

	report, err := h.Store.GetFinInformeResultats(c.Request.Context(), dataInici, dataFi, mode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, report)
}

func (h *FinancesHandler) ExportInformeCSV(c *gin.Context) {
	dataInici := c.Query("data_inici")
	dataFi := c.Query("data_fi")
	mode := c.Query("mode")

	if dataInici == "" {
		dataInici = time.Date(time.Now().Year(), 1, 1, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	}
	if dataFi == "" {
		dataFi = time.Now().Format("2006-01-02")
	}

	report, err := h.Store.GetFinInformeResultats(c.Request.Context(), dataInici, dataFi, mode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=informe_resultats_%s_%s_%s.csv", mode, dataInici, dataFi))

	writer := csv.NewWriter(c.Writer)
	_ = writer.Write([]string{"Unitat de Negoci", "Entrenador / Estructura", "Vendes Base (€)", "Compres Base (€)", "Despeses Import (€)", "Resultat Net (€)", "Marge (%)"})

	for _, row := range report.MatriuCreuada {
		_ = writer.Write([]string{
			row.GroupNom,
			row.SubGroupNom,
			fmt.Sprintf("%.2f", row.VendesBase),
			fmt.Sprintf("%.2f", row.CompresBase),
			fmt.Sprintf("%.2f", row.DespesesImport),
			fmt.Sprintf("%.2f", row.ResultatNet),
			fmt.Sprintf("%.1f%%", row.MargePct),
		})
	}

	_ = writer.Write([]string{
		"TOTAL GLOBAL",
		"-",
		fmt.Sprintf("%.2f", report.TotalVendes),
		fmt.Sprintf("%.2f", report.TotalCompres),
		fmt.Sprintf("%.2f", report.TotalDespeses),
		fmt.Sprintf("%.2f", report.ResultatGlobal),
		fmt.Sprintf("%.1f%%", report.MargeGlobalPct),
	})

	writer.Flush()
}

func (h *FinancesHandler) GetCashflowForecast(c *gin.Context) {
	horitzo := 90
	if hStr := c.Query("horitzo_dies"); hStr != "" {
		if val, err := strconv.Atoi(hStr); err == nil && val > 0 {
			horitzo = val
		}
	}
	inclouEndarrerits := c.Query("inclou_endarrerits") == "true"

	fc, err := h.Store.GetFinCashflowForecast(c.Request.Context(), horitzo, inclouEndarrerits)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, fc)
}
