package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/models"
)

func (h *Handler) CreateSubmission(c *gin.Context) {
	var req models.SubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	atleta, err := h.Store.GetAtletaByUsuariID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "perfil d'atleta no trobat"})
		return
	}

	week, err := h.Store.GetManagedWeekByEntrenadorAndDate(c.Request.Context(), atleta.EntrenadorID, req.WeekStart)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "la setmana no existeix o no està disponible"})
		return
	}
	if week.Estat != "oberta" {
		c.JSON(http.StatusForbidden, gin.H{"error": "la setmana està tancada, no pots enviar respostes"})
		return
	}

	validDurades := map[float64]bool{0.5: true, 1.0: true, 1.5: true, 2.0: true, 2.5: true, 3.0: true}
	for _, slot := range req.Slots {
		if !validDurades[slot.DuradaHores] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "durada_hores ha de ser 0.5, 1.0, 1.5, 2.0, 2.5 o 3.0"})
			return
		}
	}

	resp, err := h.Store.UpsertSubmission(c.Request.Context(), atleta.ID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error desant la resposta: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) GetMySubmission(c *gin.Context) {
	weekStart := c.Query("week")
	if weekStart == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "paràmetre 'week' requerit (format YYYY-MM-DD)"})
		return
	}

	userID := c.GetString("user_id")
	atleta, err := h.Store.GetAtletaByUsuariID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "perfil d'atleta no trobat"})
		return
	}

	resp, err := h.Store.GetSubmissionByAtletaAndWeek(c.Request.Context(), atleta.ID, weekStart)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error obtenint la resposta"})
		return
	}

	c.JSON(http.StatusOK, resp)
}
