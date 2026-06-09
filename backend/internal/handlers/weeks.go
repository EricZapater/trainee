package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/models"
)

func (h *Handler) ListEntrenadorWeeks(c *gin.Context) {
	userID := c.GetString("user_id")
	entrenador, err := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "perfil d'entrenador no trobat"})
		return
	}

	weeks, err := h.Store.ListManagedWeeksByEntrenador(c.Request.Context(), entrenador.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error llistant setmanes"})
		return
	}

	c.JSON(http.StatusOK, weeks)
}

func (h *Handler) CreateWeek(c *gin.Context) {
	var req models.CreateWeekRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	entrenador, err := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "perfil d'entrenador no trobat"})
		return
	}

	week, err := h.Store.CreateManagedWeek(c.Request.Context(), entrenador.ID, req.WeekStart, "oberta")
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "la setmana ja existeix o la data no és vàlida"})
		return
	}

	c.JSON(http.StatusCreated, week)
}

func (h *Handler) UpdateWeek(c *gin.Context) {
	weekID := c.Param("id")

	var req models.UpdateWeekRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	week, err := h.Store.UpdateManagedWeekEstat(c.Request.Context(), weekID, req.Estat)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "setmana no trobada"})
		return
	}

	c.JSON(http.StatusOK, week)
}
