package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) GetMe(c *gin.Context) {
	userID := c.GetString("user_id")
	user, err := h.Store.GetUsuariByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "usuari no trobat"})
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *Handler) ListEntrenadors(c *gin.Context) {
	entrenadors, err := h.Store.ListEntrenadors(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error llistant entrenadors"})
		return
	}
	c.JSON(http.StatusOK, entrenadors)
}

func (h *Handler) ListActivitats(c *gin.Context) {
	activitats, err := h.Store.ListActivitats(c.Request.Context(), true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error llistant activitats"})
		return
	}
	c.JSON(http.StatusOK, activitats)
}

func (h *Handler) ListOpenWeeks(c *gin.Context) {
	userID := c.GetString("user_id")
	rol := c.GetString("rol")

	var entrenadorID string

	if rol == "atleta" || rol == "admin" {
		atleta, err := h.Store.GetAtletaByUsuariID(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "perfil d'atleta no trobat"})
			return
		}
		entrenadorID = atleta.EntrenadorID
	} else if rol == "entrenador" {
		entrenador, err := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "perfil d'entrenador no trobat"})
			return
		}
		entrenadorID = entrenador.ID
	} else {
		c.JSON(http.StatusForbidden, gin.H{"error": "rol no reconegut"})
		return
	}

	weeks, err := h.Store.ListOpenWeeksByEntrenador(c.Request.Context(), entrenadorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error llistant setmanes"})
		return
	}
	c.JSON(http.StatusOK, weeks)
}

func (h *Handler) GetInformeMe(ctx *gin.Context) {
	usuariID := ctx.GetString("user_id")

	atleta, err := h.Store.GetAtletaByUsuariID(ctx.Request.Context(), usuariID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Error identificant l'atleta"})
		return
	}

	start := ctx.Query("start_date")
	end := ctx.Query("end_date")
	if start == "" || end == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "start_date i end_date són obligatoris"})
		return
	}

	informe, err := h.Store.GetInformeAtleta(ctx.Request.Context(), atleta.ID, start, end)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Error generant l'informe"})
		return
	}

	ctx.JSON(http.StatusOK, informe)
}

