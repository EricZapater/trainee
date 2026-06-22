package handlers

import (
	"context"
	"fmt"
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"trainee-backend/internal/models"
)

// ATLETA HANDLERS

func (h *Handler) CreateCompeticio(c *gin.Context) {
	atletaID := c.GetString("user_id")

	// Recuperar l'entrenador de l'atleta per vincular-ho
	atletaInfo, err := h.Store.GetAtletaByUsuariID(c.Request.Context(), atletaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no s'ha trobat l'atleta"})
		return
	}

	var req models.CreateCompeticioRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Gestionar la pujada del fitxer GPX
	file, err := c.FormFile("track_gpx")
	if err == nil {
		// Validar extensió .gpx
		ext := filepath.Ext(file.Filename)
		if ext != ".gpx" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "només s'accepten fitxers .gpx"})
			return
		}

		// Crear nom de fitxer únic
		filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
		savePath := filepath.Join("uploads", "gpx", filename)

		// Desar el fitxer
		if err := c.SaveUploadedFile(file, savePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "no s'ha pogut desar el fitxer gpx"})
			return
		}

		reqPath := "/api/uploads/gpx/" + filename
		req.TrackGpxPath = &reqPath
	} else if err != http.ErrMissingFile {
		c.JSON(http.StatusBadRequest, gin.H{"error": "error en el fitxer adjunt"})
		return
	}

	comp, err := h.Store.CreateCompeticio(c.Request.Context(), atletaInfo.ID, atletaInfo.EntrenadorID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creant competició"})
		return
	}

	// Enviar notificació a l'entrenador de manera asíncrona
	go func(entrenadorID, atletaID, competicioNom string) {
		ctx := context.Background()
		entrenadorUsuari, err := h.Store.GetUsuariByEntrenadorID(ctx, entrenadorID)
		if err == nil && entrenadorUsuari != nil {
			atletaUsuari, _ := h.Store.GetUsuariByID(ctx, atletaID)
			atletaNom := "Un atleta"
			if atletaUsuari != nil {
				atletaNom = atletaUsuari.Nom
			}
			_ = h.Mailer.SendNewCompetitionNotification(entrenadorUsuari.Email, entrenadorUsuari.Nom, atletaNom, competicioNom, entrenadorUsuari.Idioma)
		}
	}(atletaInfo.EntrenadorID, atletaInfo.UsuariID, req.Nom)

	c.JSON(http.StatusCreated, comp)
}

func (h *Handler) UpdateCompeticio(c *gin.Context) {
	atletaID := c.GetString("user_id")
	competicioID := c.Param("id")

	atletaInfo, err := h.Store.GetAtletaByUsuariID(c.Request.Context(), atletaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no s'ha trobat l'atleta"})
		return
	}

	comp, err := h.Store.GetCompeticioByID(c.Request.Context(), competicioID)
	if err != nil || comp.AtletaID != atletaInfo.ID {
		c.JSON(http.StatusNotFound, gin.H{"error": "competició no trobada o no tens permís"})
		return
	}

	var req models.UpdateCompeticioRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Handle file upload similarly
	file, err := c.FormFile("track_gpx")
	if err == nil {
		ext := filepath.Ext(file.Filename)
		if ext != ".gpx" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "només s'accepten fitxers .gpx"})
			return
		}
		filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
		savePath := filepath.Join("uploads", "gpx", filename)

		if err := c.SaveUploadedFile(file, savePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "no s'ha pogut desar el fitxer gpx"})
			return
		}

		reqPath := "/api/uploads/gpx/" + filename
		req.TrackGpxPath = &reqPath
	} else if err != http.ErrMissingFile {
		c.JSON(http.StatusBadRequest, gin.H{"error": "error en el fitxer adjunt"})
		return
	}

	updatedComp, err := h.Store.UpdateCompeticio(c.Request.Context(), competicioID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error actualitzant competició"})
		return
	}

	c.JSON(http.StatusOK, updatedComp)
}

func (h *Handler) ListAtletaCompeticions(c *gin.Context) {
	usuariID := c.GetString("user_id")
	
	atletaInfo, err := h.Store.GetAtletaByUsuariID(c.Request.Context(), usuariID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no s'ha trobat l'atleta"})
		return
	}

	comps, err := h.Store.ListCompeticionsByAtleta(c.Request.Context(), atletaInfo.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error llistant competicions"})
		return
	}
	
	if comps == nil {
		comps = []models.Competicio{}
	}
	c.JSON(http.StatusOK, comps)
}

// ENTRENADOR HANDLERS

func (h *Handler) ListEntrenadorCompeticions(c *gin.Context) {
	usuariID := c.GetString("user_id")
	
	entrenadorInfo, err := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), usuariID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no s'ha trobat l'entrenador"})
		return
	}

	comps, err := h.Store.ListPendingCompeticionsByEntrenador(c.Request.Context(), entrenadorInfo.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error llistant competicions"})
		return
	}
	
	if comps == nil {
		comps = []models.Competicio{}
	}
	c.JSON(http.StatusOK, comps)
}

func (h *Handler) TraspassarCompeticio(c *gin.Context) {
	usuariID := c.GetString("user_id")
	competicioID := c.Param("id")
	
	entrenadorInfo, err := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), usuariID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no s'ha trobat l'entrenador"})
		return
	}

	err = h.Store.TraspassarCompeticio(c.Request.Context(), entrenadorInfo.ID, competicioID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *Handler) UpdateCompeticioTipus(c *gin.Context) {
	usuariID := c.GetString("user_id")
	competicioID := c.Param("id")

	entrenadorInfo, err := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), usuariID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no s'ha trobat l'entrenador"})
		return
	}

	comp, err := h.Store.GetCompeticioByID(c.Request.Context(), competicioID)
	if err != nil || comp.EntrenadorID != entrenadorInfo.ID {
		c.JSON(http.StatusNotFound, gin.H{"error": "competició no trobada o no tens permís"})
		return
	}

	var req models.UpdateCompeticioTipusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.Store.UpdateCompeticioTipus(c.Request.Context(), competicioID, req.Tipus)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error actualitzant el tipus de competició"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *Handler) GetAtletaCompeticionsTimeline(c *gin.Context) {
	usuariID := c.GetString("user_id")
	atletaID := c.Param("id")

	entrenadorInfo, err := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), usuariID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no s'ha trobat l'entrenador"})
		return
	}

	comps, err := h.Store.ListAllCompeticionsByAtletaAndEntrenador(c.Request.Context(), atletaID, entrenadorInfo.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error llistant competicions"})
		return
	}
	
	if comps == nil {
		comps = []models.Competicio{}
	}
	c.JSON(http.StatusOK, comps)
}

// SHARED HANDLER
func (h *Handler) GetCompeticio(c *gin.Context) {
	usuariID := c.GetString("user_id")
	rol := c.GetString("rol")
	id := c.Param("id")

	comp, err := h.Store.GetCompeticioByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "competició no trobada"})
		return
	}

	if rol == "admin" {
		// Admin veu tot, no cal comprovar propietat
	} else if rol == "atleta" {
		atletaInfo, _ := h.Store.GetAtletaByUsuariID(c.Request.Context(), usuariID)
		if atletaInfo == nil || comp.AtletaID != atletaInfo.ID {
			c.JSON(http.StatusForbidden, gin.H{"error": "no tens permís per veure aquesta competició"})
			return
		}
	} else if rol == "entrenador" {
		entrenadorInfo, _ := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), usuariID)
		if entrenadorInfo == nil || comp.EntrenadorID != entrenadorInfo.ID {
			c.JSON(http.StatusForbidden, gin.H{"error": "no tens permís per veure aquesta competició"})
			return
		}
	}

	c.JSON(http.StatusOK, comp)
}
