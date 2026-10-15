package handlers

import (
	"context"
	"fmt"
	"log"
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
			log.Printf("[NUTRICIO] Atleta profile not found for user %s: %v", userID, err)
			c.JSON(http.StatusNotFound, gin.H{"error": "perfil d'atleta no trobat"})
			return
		}
		plans, err := h.Store.ListNutricioPlansByAtleta(c.Request.Context(), atleta.ID)
		if err != nil {
			log.Printf("[NUTRICIO] Error listing plans for atleta %s: %v", atleta.ID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error carregant plans nutricionals"})
			return
		}
		c.JSON(http.StatusOK, plans)
		return
	}

	// Entrenador / Admin
	entrenador, err := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), userID)
	if err != nil && userRole != "admin" {
		log.Printf("[NUTRICIO] Entrenador profile not found for user %s: %v", userID, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "perfil d'entrenador no trobat"})
		return
	}

	if atletaQuery != "" {
		plans, err := h.Store.ListNutricioPlansByAtleta(c.Request.Context(), atletaQuery)
		if err != nil {
			log.Printf("[NUTRICIO] Error listing plans for atletaQuery %s: %v", atletaQuery, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error carregant plans nutricionals d'atleta"})
			return
		}
		c.JSON(http.StatusOK, plans)
		return
	}

	if entrenador != nil {
		plans, err := h.Store.ListNutricioPlansByEntrenador(c.Request.Context(), entrenador.ID)
		if err != nil {
			log.Printf("[NUTRICIO] Error listing plans for entrenador %s: %v", entrenador.ID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error carregant plans nutricionals"})
			return
		}
		c.JSON(http.StatusOK, plans)
		return
	}

	if userRole == "admin" {
		plans, err := h.Store.ListAllNutricioPlans(c.Request.Context())
		if err != nil {
			log.Printf("[NUTRICIO] Error listing all plans for admin: %v", err)
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
		atletaUsuari, err1 := h.Store.GetUsuariByAtletaID(ctx, req.AtletaID)
		if err1 != nil {
			log.Printf("[NUTRICIO MAIL] Could not fetch athlete user for ID %s: %v", req.AtletaID, err1)
		}
		entrenadorUsuari, err2 := h.Store.GetUsuariByEntrenadorID(ctx, entrenador.ID)
		if err2 != nil {
			log.Printf("[NUTRICIO MAIL] Could not fetch trainer user for ID %s: %v", entrenador.ID, err2)
		}

		dataRev := "Pendent"
		if req.DataRevisio != nil && *req.DataRevisio != "" {
			dataRev = *req.DataRevisio
		}
		inst := "-"
		if req.Instruccions != nil && *req.Instruccions != "" {
			inst = *req.Instruccions
		}

		if atletaUsuari != nil {
			errMail := h.Mailer.SendNutricioRevisionNotification(
				atletaUsuari.Email,
				atletaUsuari.Nom,
				req.Titol,
				"1",
				dataRev,
				inst,
				atletaUsuari.Idioma,
			)
			if errMail != nil {
				log.Printf("[NUTRICIO MAIL ERROR] Athlete notification to %s failed: %v", atletaUsuari.Email, errMail)
			} else {
				log.Printf("[NUTRICIO MAIL SUCCESS] Athlete notification sent to %s", atletaUsuari.Email)
			}
		}

		if entrenadorUsuari != nil && (atletaUsuari == nil || entrenadorUsuari.Email != atletaUsuari.Email) {
			errMail := h.Mailer.SendNutricioRevisionNotification(
				entrenadorUsuari.Email,
				entrenadorUsuari.Nom,
				req.Titol,
				"1",
				dataRev,
				inst,
				entrenadorUsuari.Idioma,
			)
			if errMail != nil {
				log.Printf("[NUTRICIO MAIL ERROR] Trainer notification to %s failed: %v", entrenadorUsuari.Email, errMail)
			} else {
				log.Printf("[NUTRICIO MAIL SUCCESS] Trainer notification sent to %s", entrenadorUsuari.Email)
			}
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

	// Notify athlete & coach via email
	go func() {
		ctx := context.Background()
		planDetails, err := h.Store.GetNutricioPlanDetails(ctx, planID)
		if err == nil && planDetails != nil {
			atletaUsuari, err1 := h.Store.GetUsuariByAtletaID(ctx, planDetails.AtletaID)
			if err1 != nil {
				log.Printf("[NUTRICIO MAIL] Could not fetch athlete user for ID %s: %v", planDetails.AtletaID, err1)
			}
			entrenadorUsuari, err2 := h.Store.GetUsuariByEntrenadorID(ctx, planDetails.EntrenadorID)
			if err2 != nil {
				log.Printf("[NUTRICIO MAIL] Could not fetch trainer user for ID %s: %v", planDetails.EntrenadorID, err2)
			}

			dataRev := "Pendent"
			if req.DataRevisio != nil && *req.DataRevisio != "" {
				dataRev = *req.DataRevisio
			}
			inst := "-"
			if req.Instruccions != nil && *req.Instruccions != "" {
				inst = *req.Instruccions
			}

			if atletaUsuari != nil {
				errMail := h.Mailer.SendNutricioRevisionNotification(
					atletaUsuari.Email,
					atletaUsuari.Nom,
					planDetails.Titol,
					fmt.Sprintf("%d", rev.Versio),
					dataRev,
					inst,
					atletaUsuari.Idioma,
				)
				if errMail != nil {
					log.Printf("[NUTRICIO MAIL ERROR] Athlete revision notification to %s failed: %v", atletaUsuari.Email, errMail)
				}
			}

			if entrenadorUsuari != nil && (atletaUsuari == nil || entrenadorUsuari.Email != atletaUsuari.Email) {
				errMail := h.Mailer.SendNutricioRevisionNotification(
					entrenadorUsuari.Email,
					entrenadorUsuari.Nom,
					planDetails.Titol,
					fmt.Sprintf("%d", rev.Versio),
					dataRev,
					inst,
					entrenadorUsuari.Idioma,
				)
				if errMail != nil {
					log.Printf("[NUTRICIO MAIL ERROR] Trainer revision notification to %s failed: %v", entrenadorUsuari.Email, errMail)
				}
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
	var atletaEntrenadorID string
	atleta, err := h.Store.GetAtletaByUsuariID(c.Request.Context(), userID)
	if err == nil && atleta != nil {
		atletaID = atleta.ID
		atletaEntrenadorID = atleta.EntrenadorID
	} else if userRole == "admin" || userRole == "entrenador" {
		atletaID = userID
	} else {
		c.JSON(http.StatusForbidden, gin.H{"error": "només l'atleta, entrenador o administrador pot afegir registres de feedback"})
		return
	}

	fb, err := h.Store.AddNutricioFeedback(c.Request.Context(), revisionID, atletaID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Notify only the athlete's coach via email when an athlete submits feedback
	if userRole == "atleta" || atleta != nil {
		go func(coachID, authorID string, feedbackReq models.CreateNutricioFeedbackRequest) {
			ctx := context.Background()

			planDetails, err := h.Store.GetNutricioPlanByRevisionID(ctx, revisionID)
			planTitol := "Pla Nutricional"
			targetCoachID := coachID
			if planDetails != nil {
				if planDetails.Titol != "" {
					planTitol = planDetails.Titol
				}
				if targetCoachID == "" {
					targetCoachID = planDetails.EntrenadorID
				}
			}

			if targetCoachID == "" {
				log.Printf("[NUTRICIO MAIL] No s'ha pogut determinar l'entrenador per al registre de feedback de l'usuari %s", authorID)
				return
			}

			coach, err := h.Store.GetUsuariByEntrenadorID(ctx, targetCoachID)
			if err != nil || coach == nil {
				log.Printf("[NUTRICIO MAIL] No s'ha trobat l'usuari entrenador per ID %s: %v", targetCoachID, err)
				return
			}

			if !coach.Actiu {
				log.Printf("[NUTRICIO MAIL] L'entrenador %s està inactiu, no s'envia correu", coach.Email)
				return
			}

			if coach.ID == authorID {
				return
			}

			usr, _ := h.Store.GetUsuariByID(ctx, authorID)
			atletaNom := "Un atleta"
			if usr != nil {
				atletaNom = usr.Nom
				if usr.Cognoms != "" {
					atletaNom += " " + usr.Cognoms
				}
			} else if planDetails != nil && planDetails.AtletaNom != "" {
				atletaNom = planDetails.AtletaNom
				if planDetails.AtletaCognoms != "" {
					atletaNom += " " + planDetails.AtletaCognoms
				}
			}

			sens := "-"
			if feedbackReq.Sensacions != nil && *feedbackReq.Sensacions != "" {
				sens = *feedbackReq.Sensacions
			}

			errMail := h.Mailer.SendNutricioFeedbackNotification(
				coach.Email,
				coach.Nom,
				atletaNom,
				planTitol,
				feedbackReq.DataSortida,
				sens,
				coach.Idioma,
			)
			if errMail != nil {
				log.Printf("[NUTRICIO MAIL ERROR] Error enviant notificació feedback nutrició a %s: %v", coach.Email, errMail)
			} else {
				log.Printf("[NUTRICIO MAIL SUCCESS] Notificació feedback nutrició enviada a l'entrenador %s (pla: %s)", coach.Email, planTitol)
			}
		}(atletaEntrenadorID, userID, req)
	}

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
