package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/models"
)

// ListMaterialProductes retorna els productes del catàleg.
// Entrenadors/Admins veuen tots; Atletes només els actius.
func (h *Handler) ListMaterialProductes(c *gin.Context) {
	userRole := c.GetString("user_rol")
	onlyActive := (userRole == "atleta")

	productes, err := h.Store.GetMaterialProductes(c.Request.Context(), onlyActive)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al carregar el catàleg de material"})
		return
	}

	c.JSON(http.StatusOK, productes)
}

// CreateMaterialProducte crea un nou producte al catàleg (Entrenador/Admin).
func (h *Handler) CreateMaterialProducte(c *gin.Context) {
	var req models.CreateMaterialProducteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	producte, err := h.Store.CreateMaterialProducte(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error en crear el producte"})
		return
	}

	c.JSON(http.StatusCreated, producte)
}

// UpdateMaterialProducte actualitza un producte del catàleg (Entrenador/Admin).
func (h *Handler) UpdateMaterialProducte(c *gin.Context) {
	id := c.Param("id")
	var req models.UpdateMaterialProducteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	producte, err := h.Store.UpdateMaterialProducte(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error en actualitzar el producte"})
		return
	}

	c.JSON(http.StatusOK, producte)
}

// DeleteMaterialProducte elimina un producte del catàleg (Entrenador/Admin).
func (h *Handler) DeleteMaterialProducte(c *gin.Context) {
	id := c.Param("id")
	if err := h.Store.DeleteMaterialProducte(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error en eliminar el producte"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Producte eliminat correctament"})
}

// UploadMaterialImage permet pujar imatges per als productes de material.
func (h *Handler) UploadMaterialImage(c *gin.Context) {
	fileHeader, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No s'ha trobat cap fitxer"})
		return
	}

	if fileHeader.Size > 5*1024*1024 { // 5MB
		c.JSON(http.StatusBadRequest, gin.H{"error": "La imatge no pot superar els 5MB"})
		return
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" && ext != ".webp" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format d'imatge no permès"})
		return
	}

	url, err := h.Uploader.UploadFile(c.Request.Context(), fileHeader, "material")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error en pujar la imatge"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}

// GetMaterialSettings retorna l'estat global del commutador de comandes.
func (h *Handler) GetMaterialSettings(c *gin.Context) {
	st, err := h.Store.GetMaterialSettings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error en carregar la configuració"})
		return
	}
	c.JSON(http.StatusOK, st)
}

// UpdateMaterialSettings actualitza l'estat del commutador de comandes (Entrenador/Admin).
func (h *Handler) UpdateMaterialSettings(c *gin.Context) {
	var req models.MaterialComandesSettings
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.Store.UpdateMaterialSettings(c.Request.Context(), req.Enabled); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error en guardar la configuració"})
		return
	}

	c.JSON(http.StatusOK, req)
}

// ListMaterialComandes llista les comandes realitzades.
func (h *Handler) ListMaterialComandes(c *gin.Context) {
	userID := c.GetString("user_id")
	userRole := c.GetString("user_rol")

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	estat := c.Query("estat")
	filterAtletaID := c.Query("atleta_id")

	var targetAtletaID string
	if userRole == "atleta" {
		atleta, err := h.Store.GetAtletaByUsuariID(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Perfil d'atleta no trobat"})
			return
		}
		targetAtletaID = atleta.ID
	} else {
		targetAtletaID = filterAtletaID
	}

	comandes, err := h.Store.GetMaterialComandes(c.Request.Context(), targetAtletaID, startDate, endDate, estat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error en carregar les comandes"})
		return
	}

	c.JSON(http.StatusOK, comandes)
}

// CreateMaterialComandes crea una o més línies de comanda per a un atleta.
func (h *Handler) CreateMaterialComandes(c *gin.Context) {
	userID := c.GetString("user_id")
	atleta, err := h.Store.GetAtletaByUsuariID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Perfil d'atleta no trobat"})
		return
	}

	// Comprovar si les comandes estan obertes
	st, err := h.Store.GetMaterialSettings(c.Request.Context())
	if err != nil || !st.Enabled {
		c.JSON(http.StatusForbidden, gin.H{"error": "El període de comandes està actualment tancat"})
		return
	}

	var req models.CreateMaterialComandesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	comandes, err := h.Store.CreateMaterialComandes(c.Request.Context(), atleta.ID, req.Items)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, comandes)
}

// UpdateMaterialComanda actualitza una comanda existent.
func (h *Handler) UpdateMaterialComanda(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")
	userRole := c.GetString("user_rol")

	existing, err := h.Store.GetMaterialComandaByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Comanda no trobada"})
		return
	}

	var req models.UpdateMaterialComandaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if userRole == "atleta" {
		atleta, err := h.Store.GetAtletaByUsuariID(c.Request.Context(), userID)
		if err != nil || atleta.ID != existing.AtletaID {
			c.JSON(http.StatusForbidden, gin.H{"error": "No tens permís per editar aquesta comanda"})
			return
		}

		st, err := h.Store.GetMaterialSettings(c.Request.Context())
		if err != nil || !st.Enabled {
			c.JSON(http.StatusForbidden, gin.H{"error": "El període de comandes està tancat"})
			return
		}

		if existing.Estat != "pendent" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Només es poden editar comandes en estat pendent"})
			return
		}

		// Atletes no poden canviar l'estat
		req.Estat = nil
	}

	updated, err := h.Store.UpdateMaterialComanda(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error en actualitzar la comanda"})
		return
	}

	c.JSON(http.StatusOK, updated)
}

// DeleteMaterialComanda elimina una comanda.
func (h *Handler) DeleteMaterialComanda(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")
	userRole := c.GetString("user_rol")

	existing, err := h.Store.GetMaterialComandaByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Comanda no trobada"})
		return
	}

	if userRole == "atleta" {
		atleta, err := h.Store.GetAtletaByUsuariID(c.Request.Context(), userID)
		if err != nil || atleta.ID != existing.AtletaID {
			c.JSON(http.StatusForbidden, gin.H{"error": "No tens permís per eliminar aquesta comanda"})
			return
		}

		st, err := h.Store.GetMaterialSettings(c.Request.Context())
		if err != nil || !st.Enabled {
			c.JSON(http.StatusForbidden, gin.H{"error": "El període de comandes està tancat"})
			return
		}

		if existing.Estat != "pendent" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Només es poden eliminar comandes en estat pendent"})
			return
		}
	}

	if err := h.Store.DeleteMaterialComanda(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error en eliminar la comanda"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Comanda eliminada correctament"})
}

// BulkUpdateComandesState permet actualitzar l'estat de moltes comandes alhora (Entrenador/Admin).
func (h *Handler) BulkUpdateComandesState(c *gin.Context) {
	var req models.BulkUpdateComandesStateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.Store.BulkUpdateMaterialComandesState(c.Request.Context(), req.ComandaIDs, req.NouEstat); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error en actualitzar les comandes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Estats de comanda actualitzats correctament"})
}

// ExportMaterialComandesCSV genera un fitxer CSV de comandes línia per línia (Entrenador/Admin).
func (h *Handler) ExportMaterialComandesCSV(c *gin.Context) {
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	estat := c.Query("estat")
	atletaID := c.Query("atleta_id")

	comandes, err := h.Store.GetMaterialComandes(c.Request.Context(), atletaID, startDate, endDate, estat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al recuperar dades de comandes"})
		return
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", `attachment; filename="comandes_material.csv"`)

	// Escriure BOM per UTF-8 per a compatibilitat amb Excel
	c.Writer.Write([]byte{0xEF, 0xBB, 0xBF})

	writer := csv.NewWriter(c.Writer)
	writer.Comma = ';' // Punt i coma per a Excel en configuracions europees

	// Capçalera CSV
	header := []string{
		"ID Comanda",
		"Data i Hora",
		"Nom Atleta",
		"Cognoms Atleta",
		"Email Atleta",
		"Producte / Model",
		"Talla",
		"Quantitat",
		"Preu Unitari (€)",
		"Preu Total (€)",
		"Estat",
		"Notes",
	}
	_ = writer.Write(header)

	for _, c := range comandes {
		tallaDisplay := c.Talla
		if strings.TrimSpace(tallaDisplay) == "" {
			tallaDisplay = "N/A"
		}

		row := []string{
			c.ID,
			c.CreatedAt.Format("2006-01-02 15:04:05"),
			c.AtletaNom,
			c.AtletaCognoms,
			c.AtletaEmail,
			c.ProducteNom,
			tallaDisplay,
			fmt.Sprintf("%d", c.Quantitat),
			fmt.Sprintf("%.2f", c.PreuUnitari),
			fmt.Sprintf("%.2f", c.PreuTotal),
			c.Estat,
			c.Notes,
		}
		_ = writer.Write(row)
	}

	writer.Flush()
}
