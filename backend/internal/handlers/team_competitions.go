package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/models"
)

func (h *Handler) ListTeamCompetitions(c *gin.Context) {
	usuariID := c.GetString("user_id")
	competitions, err := h.Store.ListTeamCompetitions(c.Request.Context(), usuariID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error carregant curses d'equip: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, competitions)
}

func (h *Handler) CreateTeamCompetition(c *gin.Context) {
	usuariID := c.GetString("user_id")

	var req models.CreateTeamCompetitionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	comp, err := h.Store.CreateTeamCompetition(c.Request.Context(), usuariID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creant cursa d'equip: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, comp)
}

func (h *Handler) JoinTeamCompetition(c *gin.Context) {
	usuariID := c.GetString("user_id")
	compID := c.Param("id")

	var req models.JoinTeamCompetitionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.Store.JoinTeamCompetition(c.Request.Context(), compID, usuariID, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error registrant inscripció: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) LeaveTeamCompetition(c *gin.Context) {
	usuariID := c.GetString("user_id")
	compID := c.Param("id")

	if err := h.Store.LeaveTeamCompetition(c.Request.Context(), compID, usuariID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error cancel·lant inscripció: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) UploadTeamCompetitionGPX(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "fitxer requerit"})
		return
	}

	ext := filepath.Ext(file.Filename)
	if ext != ".gpx" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "només s'accepten fitxers .gpx"})
		return
	}

	url, err := h.Uploader.UploadFile(c.Request.Context(), file, "gpx")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("error pujant fitxer gpx: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}
