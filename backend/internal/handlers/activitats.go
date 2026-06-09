package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/models"
)

func (h *Handler) ListAllActivitats(c *gin.Context) {
	activitats, err := h.Store.ListActivitats(c.Request.Context(), false)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error llistant activitats"})
		return
	}
	c.JSON(http.StatusOK, activitats)
}

func (h *Handler) CreateActivitat(c *gin.Context) {
	var req models.CreateActivitatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	activitat, err := h.Store.CreateActivitat(c.Request.Context(), req.Nom, req.Icona, req.Color)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creant l'activitat"})
		return
	}

	c.JSON(http.StatusCreated, activitat)
}

func (h *Handler) UpdateActivitat(c *gin.Context) {
	activitatID := c.Param("id")

	var req models.UpdateActivitatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	activitat, err := h.Store.UpdateActivitat(c.Request.Context(), activitatID, req)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "activitat no trobada"})
		return
	}

	c.JSON(http.StatusOK, activitat)
}

func (h *Handler) ReorderActivitats(c *gin.Context) {
	var items []models.ReorderItem
	if err := c.ShouldBindJSON(&items); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.Store.ReorderActivitats(c.Request.Context(), items); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error reordenant activitats"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "activitats reordenades correctament"})
}

func (h *Handler) DeleteActivitat(c *gin.Context) {
	activitatID := c.Param("id")

	if err := h.Store.SoftDeleteActivitat(c.Request.Context(), activitatID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "activitat no trobada"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "activitat desactivada"})
}
