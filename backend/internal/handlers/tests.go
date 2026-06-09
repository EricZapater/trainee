package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/models"
)

func (h *Handler) CreateTest(c *gin.Context) {
	entrenadorID := c.GetString("entrenador_id") // Com a entrenador
	if entrenadorID == "" {
		// Depèn de com fem el middleware, si ja guardem l'entrenador_id
		usuariID := c.GetString("user_id")
		entrenadorInfo, err := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), usuariID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "no ets un entrenador o no s'ha trobat l'entrenador"})
			return
		}
		entrenadorID = entrenadorInfo.ID
	}

	var req models.CreateTestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "dades invàlides"})
		return
	}

	test, err := h.Store.CreateTest(c.Request.Context(), entrenadorID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, test)
}

func (h *Handler) ListPendingTestsByEntrenador(c *gin.Context) {
	usuariID := c.GetString("user_id")
	entrenadorInfo, err := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), usuariID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no s'ha trobat l'entrenador"})
		return
	}

	tests, err := h.Store.ListPendingTestsByEntrenador(c.Request.Context(), entrenadorInfo.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if tests == nil {
		tests = []models.Test{}
	}

	c.JSON(http.StatusOK, tests)
}

func (h *Handler) ListRecordatoris(c *gin.Context) {
	usuariID := c.GetString("user_id")
	entrenadorInfo, err := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), usuariID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no s'ha trobat l'entrenador"})
		return
	}

	tests, err := h.Store.ListRecordatorisByEntrenador(c.Request.Context(), entrenadorInfo.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if tests == nil {
		tests = []models.Test{}
	}

	c.JSON(http.StatusOK, tests)
}

func (h *Handler) TraspassarTest(c *gin.Context) {
	testID := c.Param("id")
	usuariID := c.GetString("user_id")
	entrenadorInfo, err := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), usuariID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no s'ha trobat l'entrenador"})
		return
	}

	err = h.Store.TraspassarTest(c.Request.Context(), entrenadorInfo.ID, testID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *Handler) UpdateEstatRecordatori(c *gin.Context) {
	testID := c.Param("id")
	usuariID := c.GetString("user_id")
	entrenadorInfo, err := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), usuariID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no s'ha trobat l'entrenador"})
		return
	}

	var req models.UpdateRecordatoriRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "dades invàlides"})
		return
	}

	err = h.Store.UpdateEstatRecordatori(c.Request.Context(), entrenadorInfo.ID, testID, req.Estat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *Handler) GetTest(c *gin.Context) {
	usuariID := c.GetString("user_id")
	rol := c.GetString("rol")
	id := c.Param("id")

	test, err := h.Store.GetTestByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "test no trobat"})
		return
	}

	if rol == "atleta" {
		atletaInfo, _ := h.Store.GetAtletaByUsuariID(c.Request.Context(), usuariID)
		if atletaInfo == nil || test.AtletaID != atletaInfo.ID {
			c.JSON(http.StatusForbidden, gin.H{"error": "no tens permís"})
			return
		}
	} else if rol == "entrenador" {
		entrenadorInfo, _ := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), usuariID)
		if entrenadorInfo == nil || test.EntrenadorID != entrenadorInfo.ID {
			c.JSON(http.StatusForbidden, gin.H{"error": "no tens permís"})
			return
		}
	}

	c.JSON(http.StatusOK, test)
}
