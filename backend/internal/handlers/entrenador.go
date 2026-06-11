package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/models"
)

func (h *Handler) GetEntrenadorSubmissions(c *gin.Context) {
	weekStart := c.Query("week")
	if weekStart == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "paràmetre 'week' requerit (format YYYY-MM-DD)"})
		return
	}

	userID := c.GetString("user_id")
	entrenador, err := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "perfil d'entrenador no trobat"})
		return
	}

	resp, err := h.Store.GetSubmissionsByEntrenadorAndWeek(c.Request.Context(), entrenador.ID, weekStart)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error obtenint les respostes dels atletes"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) GetInformeAtleta(ctx *gin.Context) {
	atletaID := ctx.Param("id")
	if atletaID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ID de l'atleta no especificat"})
		return
	}

	start := ctx.Query("start_date")
	end := ctx.Query("end_date")
	if start == "" || end == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "start_date i end_date són obligatoris"})
		return
	}

	// Verify the coach owns the athlete
	usuariID := ctx.GetString("user_id")
	entrenador, err := h.Store.GetEntrenadorByUsuariID(ctx.Request.Context(), usuariID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Error identificant l'entrenador"})
		return
	}

	// Make sure this athlete belongs to this coach
	atletes, err := h.Store.ListAtletesByEntrenadorID(ctx.Request.Context(), entrenador.ID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Error validant permisos"})
		return
	}
	
	valid := false
	for _, a := range atletes {
		if a.ID == atletaID {
			valid = true
			break
		}
	}
	if !valid {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "No tens permís per veure aquest atleta"})
		return
	}

	informe, err := h.Store.GetInformeAtleta(ctx.Request.Context(), atletaID, start, end)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Error generant l'informe"})
		return
	}

	ctx.JSON(http.StatusOK, informe)
}

func (h *Handler) ListAtletes(ctx *gin.Context) {
	usuariID := ctx.GetString("user_id")
	entrenador, err := h.Store.GetEntrenadorByUsuariID(ctx.Request.Context(), usuariID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Error identificant l'entrenador"})
		return
	}

	atletes, err := h.Store.ListAtletesByEntrenadorID(ctx.Request.Context(), entrenador.ID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Error llistant atletes"})
		return
	}

	ctx.JSON(http.StatusOK, atletes)
}

func (h *Handler) ToggleAtletaStatus(ctx *gin.Context) {
	usuariID := ctx.GetString("user_id")
	entrenador, err := h.Store.GetEntrenadorByUsuariID(ctx.Request.Context(), usuariID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Error identificant l'entrenador"})
		return
	}

	atletaID := ctx.Param("id")
	// Verify athlete belongs to this coach
	atletes, err := h.Store.ListAtletesByEntrenadorID(ctx.Request.Context(), entrenador.ID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Error validant permisos"})
		return
	}

	var targetAtleta *models.Atleta
	for _, a := range atletes {
		if a.ID == atletaID {
			targetAtleta = &a
			break
		}
	}
	if targetAtleta == nil {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "No tens permís per modificar aquest atleta"})
		return
	}

	var req models.ToggleUserStatusRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.Store.ToggleUserStatus(ctx.Request.Context(), targetAtleta.UsuariID, req.Actiu, &usuariID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Error canviant l'estat de l'atleta"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *Handler) GetAtletaStatusHistory(ctx *gin.Context) {
	usuariID := ctx.GetString("user_id")
	entrenador, err := h.Store.GetEntrenadorByUsuariID(ctx.Request.Context(), usuariID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Error identificant l'entrenador"})
		return
	}

	atletaID := ctx.Param("id")
	atletes, err := h.Store.ListAtletesByEntrenadorID(ctx.Request.Context(), entrenador.ID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Error validant permisos"})
		return
	}

	var targetAtleta *models.Atleta
	for _, a := range atletes {
		if a.ID == atletaID {
			targetAtleta = &a
			break
		}
	}
	if targetAtleta == nil {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "No tens permís per veure aquest atleta"})
		return
	}

	history, err := h.Store.GetUserStatusHistory(ctx.Request.Context(), targetAtleta.UsuariID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Error obtenint l'historial"})
		return
	}
	if history == nil {
		history = []models.UserStatusHistory{}
	}

	ctx.JSON(http.StatusOK, history)
}
