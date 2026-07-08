package handlers

import (
	"net/http"
	"trainee-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ListWeekTemplates(c *gin.Context) {
	usuariID := c.GetString("user_id")
	atleta, err := h.Store.GetAtletaByUsuariID(c.Request.Context(), usuariID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "perfil d'atleta no trobat"})
		return
	}

	templates, err := h.Store.ListWeekTemplatesByAtleta(c.Request.Context(), atleta.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error llistant plantilles: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, templates)
}

func (h *Handler) CreateWeekTemplate(c *gin.Context) {
	usuariID := c.GetString("user_id")
	atleta, err := h.Store.GetAtletaByUsuariID(c.Request.Context(), usuariID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "perfil d'atleta no trobat"})
		return
	}

	var req models.CreateTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	template, err := h.Store.CreateWeekTemplate(c.Request.Context(), atleta.ID, req.Nom, req.Slots)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creant la plantilla: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, template)
}

func (h *Handler) DeleteWeekTemplate(c *gin.Context) {
	usuariID := c.GetString("user_id")
	atleta, err := h.Store.GetAtletaByUsuariID(c.Request.Context(), usuariID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "perfil d'atleta no trobat"})
		return
	}

	templateID := c.Param("id")
	if templateID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id és obligatori"})
		return
	}

	err = h.Store.DeleteWeekTemplate(c.Request.Context(), templateID, atleta.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error eliminant la plantilla: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "plantilla eliminada correctament"})
}
