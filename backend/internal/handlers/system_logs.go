package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/store"
)

type SystemLogsHandler struct {
	Store store.Store
}

func NewSystemLogsHandler(s store.Store) *SystemLogsHandler {
	return &SystemLogsHandler{Store: s}
}

func (h *SystemLogsHandler) GetSystemLogs(c *gin.Context) {
	// Comprovar si l'usuari és entrenador
	userRole := c.GetString("user_rol")
	if userRole != "entrenador" {
		c.JSON(http.StatusForbidden, gin.H{"error": "accés denegat: només entrenadors"})
		return
	}

	limitStr := c.DefaultQuery("limit", "100")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 100
	}
	offset, err := strconv.Atoi(offsetStr)
	if err != nil {
		offset = 0
	}

	logs, err := h.Store.GetSystemLogs(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error obtenint els logs del sistema"})
		return
	}

	c.JSON(http.StatusOK, logs)
}
