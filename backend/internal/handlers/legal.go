package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type ConsentRequest struct {
	Version string `json:"version" binding:"required"`
}

func (h *Handler) RecordLegalConsent(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "usuari no autenticat"})
		return
	}

	var req ConsentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dades invàlides"})
		return
	}

	ip := c.ClientIP()

	err := h.Store.RecordLegalConsent(c.Request.Context(), userID.(string), req.Version, ip)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al desar el consentiment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Consentiment desat correctament"})
}
