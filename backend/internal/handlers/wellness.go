package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/models"
)

func (h *Handler) SubmitWellness(c *gin.Context) {
	usuariID := c.GetString("user_id")
	atleta, err := h.Store.GetAtletaByUsuariID(c.Request.Context(), usuariID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "només els atletes poden omplir el formulari de wellness"})
		return
	}

	var req models.SubmitWellnessRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.Store.SubmitWellness(c.Request.Context(), atleta.ID, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error guardant wellness: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) GetMyWellness(c *gin.Context) {
	usuariID := c.GetString("user_id")
	atleta, err := h.Store.GetAtletaByUsuariID(c.Request.Context(), usuariID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "usuari no és atleta"})
		return
	}

	weekStart := c.Query("week_start")
	if weekStart == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "week_start requerit"})
		return
	}

	wellness, err := h.Store.GetWellnessByAtletaAndWeek(c.Request.Context(), atleta.ID, weekStart)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, wellness)
}

func (h *Handler) GetEntrenadorWellnessOverview(c *gin.Context) {
	usuariID := c.GetString("user_id")
	entrenador, err := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), usuariID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "usuari no és entrenador"})
		return
	}

	weekStart := c.Query("week_start")
	if weekStart == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "week_start requerit"})
		return
	}

	overview, err := h.Store.GetEntrenadorWellnessOverview(c.Request.Context(), entrenador.ID, weekStart)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, overview)
}
