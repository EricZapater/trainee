package handlers

import (
	"context"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/models"
)

func (h *Handler) ListNutricioPlans(c *gin.Context) {
	userID := c.GetString("user_id")
	userRole := getUserRole(c)

	atletaQuery := c.Query("atleta_id")

	if userRole == "atleta" {
		atleta, err := h.Store.GetAtletaByUsuariID(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "perfil d'atleta no trobat"})
			return
		}
		plans, err := h.Store.ListNutricioPlansByAtleta(c.Request.Context(), atleta.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error carregant plans nutricionals"})
			return
		}
		c.JSON(http.StatusOK, plans)
		return
	}

	// Entrenador / Admin
	entrenador, err := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), userID)
	if err != nil && userRole != "admin" {
		c.JSON(http.StatusNotFound, gin.H{"error": "perfil d'entrenador no trobat"})
		return
	}

	if atletaQuery != "" {
		plans, err := h.Store.ListNutricioPlansByAtleta(c.Request.Context(), atletaQuery)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error carregant plans nutricionals d'atleta"})
			return
		}
		c.JSON(http.StatusOK, plans)
		return
	}

	if entrenador != nil {
		plans, err := h.Store.ListNutricioPlansByEntrenador(c.Request.Context(), entrenador.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error carregant plans nutricionals"})
			return
		}
		c.JSON(http.StatusOK, plans)
		return
	}

	c.JSON(http.StatusOK, []models.NutricioPlanWithDetails{})
}

func (h *Handler) CreateNutricioPlan(c *gin.Context) {
	var req models.CreateNutricioPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	userRole := getUserRole(c)
	if userRole != "entrenador" && userRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "només els entrenadors poden crear plans nutricionals"})
		return
	}

	entrenador, err := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "perfil d'entrenador no trobat"})
		return
	}

	plan, err := h.Store.CreateNutricioPlan(c.Request.Context(), entrenador.ID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creant el pla nutricional"})
		return
	}

	// Notify athlete & coach via email
	go func() {
		ctx := context.Background()
		atletaUsuari, err := h.Store.GetUsuariByAtletaID(ctx, req.AtletaID)
		if err == nil && atletaUsuari != nil {
			dataRev := "Pendent"
			if req.DataRevisio != nil {
				dataRev = *req.DataRevisio
			}
			inst := "-"
			if req.Instruccions != nil {
				inst = *req.Instruccions
			}
			_ = h.Mailer.SendNutricioRevisionNotification(
				atletaUsuari.Email,
				atletaUsuari.Nom,
				req.Titol,
				"1",
				dataRev,
				inst,
				atletaUsuari.Idioma,
			)
		}
	}()

	c.JSON(http.StatusCreated, plan)
}

func (h *Handler) CreateNutricioRevision(c *gin.Context) {
	planID := c.Param("id")

	var req models.CreateNutricioRevisionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userRole := getUserRole(c)
	if userRole != "entrenador" && userRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "només els entrenadors poden crear revisions"})
		return
	}

	rev, err := h.Store.CreateNutricioRevision(c.Request.Context(), planID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creant la revisió del pla"})
		return
	}

	// Notify athlete via email
	go func() {
		ctx := context.Background()
		plan, err := h.Store.GetNutricioPlanDetails(ctx, planID)
		if err == nil && plan != nil {
			atletaUsuari, err := h.Store.GetUsuariByAtletaID(ctx, plan.AtletaID)
			if err == nil && atletaUsuari != nil {
				dataRev := "Pendent"
				if req.DataRevisio != nil {
					dataRev = *req.DataRevisio
				}
				inst := "-"
				if req.Instruccions != nil {
					inst = *req.Instruccions
				}
				_ = h.Mailer.SendNutricioRevisionNotification(
					atletaUsuari.Email,
					atletaUsuari.Nom,
					plan.Titol,
					fmt.Sprintf("%d", rev.Versio),
					dataRev,
					inst,
					atletaUsuari.Idioma,
				)
			}
		}
	}()

	c.JSON(http.StatusCreated, rev)
}

func (h *Handler) AddNutricioFeedback(c *gin.Context) {
	revisionID := c.Param("revisionId")

	var req models.CreateNutricioFeedbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	userRole := getUserRole(c)

	var atletaID string
	if userRole == "atleta" {
		atleta, err := h.Store.GetAtletaByUsuariID(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "perfil d'atleta no trobat"})
			return
		}
		atletaID = atleta.ID
	} else {
		c.JSON(http.StatusForbidden, gin.H{"error": "només l'atleta pot afegir registres de feedback"})
		return
	}

	fb, err := h.Store.AddNutricioFeedback(c.Request.Context(), revisionID, atletaID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Notify coach via email
	go func() {
		ctx := context.Background()
		usr, _ := h.Store.GetUsuariByID(ctx, userID)
		atletaNom := "Un atleta"
		if usr != nil {
			atletaNom = usr.Nom
		}

		coaches, err := h.Store.ListAllUsuaris(ctx)
		if err == nil {
			sens := "-"
			if req.Sensacions != nil {
				sens = *req.Sensacions
			}
			for _, coach := range coaches {
				if coach.Rol == "entrenador" && coach.Actiu {
					_ = h.Mailer.SendNutricioFeedbackNotification(
						coach.Email,
						coach.Nom,
						atletaNom,
						"Pla Nutricional",
						req.DataSortida,
						sens,
						coach.Idioma,
					)
				}
			}
		}
	}()

	c.JSON(http.StatusCreated, fb)
}

func (h *Handler) GetNutricioPlanDetails(c *gin.Context) {
	planID := c.Param("id")

	plan, err := h.Store.GetNutricioPlanDetails(c.Request.Context(), planID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "pla nutricional no trobat"})
		return
	}

	c.JSON(http.StatusOK, plan)
}

func (h *Handler) UpdateNutricioPlanEstat(c *gin.Context) {
	planID := c.Param("id")

	var req models.UpdateNutricioPlanEstatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userRole := getUserRole(c)
	if userRole != "entrenador" && userRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "sense permís"})
		return
	}

	err := h.Store.UpdateNutricioPlanEstat(c.Request.Context(), planID, req.Estat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error actualitzant estat del pla"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "estat actualitzat"})
}

func (h *Handler) DeleteNutricioPlan(c *gin.Context) {
	planID := c.Param("id")

	userRole := getUserRole(c)
	if userRole != "entrenador" && userRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "sense permís"})
		return
	}

	err := h.Store.DeleteNutricioPlan(c.Request.Context(), planID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error eliminant pla nutricional"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "pla eliminat"})
}
