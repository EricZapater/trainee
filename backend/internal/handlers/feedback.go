package handlers

import (
	"context"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/models"
)

func (h *Handler) GetFeedbackTickets(c *gin.Context) {
	// The store method fetches all, we can filter in memory or extend the query later.
	tickets, err := h.Store.ListFeedbackTickets(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al carregar les peticions"})
		return
	}

	c.JSON(http.StatusOK, tickets)
}

func (h *Handler) CreateFeedbackTicket(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autoritzat"})
		return
	}
	informadorID := userID.(string)

	tipus := c.PostForm("tipus")
	resum := c.PostForm("resum")
	descripcio := c.PostForm("descripcio")

	if tipus == "" || resum == "" || descripcio == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tipus, resum i descripció són obligatoris"})
		return
	}

	var imatgePath *string

	file, header, err := c.Request.FormFile("imatge")
	if err == nil {
		defer file.Close()

		// Max 1MB
		if header.Size > 1024*1024 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "La imatge no pot superar 1MB"})
			return
		}

		// Ensure it's an image
		ext := strings.ToLower(filepath.Ext(header.Filename))
		if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" && ext != ".webp" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format d'arxiu no permès"})
			return
		}

		url, err := h.Uploader.UploadFile(c.Request.Context(), header, "feedback")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al pujar l'arxiu"})
			return
		}
		imatgePath = &url
	}

	req := models.CreateFeedbackRequest{
		Tipus:      tipus,
		Resum:      resum,
		Descripcio: descripcio,
	}

	ticket, err := h.Store.CreateFeedbackTicket(c.Request.Context(), informadorID, req, imatgePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear la petició"})
		return
	}

	// Attach author name (which isn't returned directly by CreateFeedbackTicket, but we have userID)
	usr, _ := h.Store.GetUsuariByID(c.Request.Context(), informadorID)
	if usr != nil {
		ticket.InformadorNom = usr.Nom
	}

	// Send email notification to all active coaches in background
	go func() {
		ctx := context.Background()
		coaches, err := h.Store.ListAllUsuaris(ctx)
		if err != nil {
			return
		}

		informadorNom := "Usuari"
		if usr != nil {
			informadorNom = usr.Nom
			if usr.Cognoms != "" {
				informadorNom += " " + usr.Cognoms
			}
		}

		imatgeURL := ""
		if ticket.ImatgePath != nil {
			imatgeURL = *ticket.ImatgePath
		}

		for _, coach := range coaches {
			if coach.Rol == "entrenador" && coach.Actiu {
				_ = h.Mailer.SendNewFeedbackNotification(
					coach.Email,
					coach.Nom,
					informadorNom,
					ticket.Tipus,
					ticket.Resum,
					ticket.Descripcio,
					imatgeURL,
					coach.Idioma,
				)
			}
		}
	}()

	c.JSON(http.StatusOK, ticket)
}

func (h *Handler) UpdateFeedbackTicket(c *gin.Context) {
	id := c.Param("id")

	var req models.UpdateFeedbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dades invàlides"})
		return
	}

	// Fetch existing ticket to compare
	ticket, err := h.Store.GetFeedbackTicketByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket no trobat"})
		return
	}

	// Update DB
	if err := h.Store.UpdateFeedbackTicket(c.Request.Context(), id, req.Estat, req.Resposta); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualitzar el ticket"})
		return
	}

	// Send email if there's a response and it hasn't been sent before? 
	// Or maybe just send it every time the admin saves if there's a response or state change.
	// We'll send it if Resposta is not nil (even if empty, maybe they want to clear it, but let's assume they only type it to reply)
	// Actually, if the state changes or there's a reply, let's send it.
	stateChanged := ticket.Estat != req.Estat
	responseChanged := req.Resposta != nil && (ticket.Resposta == nil || *ticket.Resposta != *req.Resposta)

	if stateChanged || responseChanged {
		user, err := h.Store.GetUsuariByID(c.Request.Context(), ticket.InformadorID)
		if err == nil && user != nil {
			resposta := ""
			if req.Resposta != nil {
				resposta = *req.Resposta
			}
			go func() {
				_ = h.Mailer.SendFeedbackReplyNotification(user.Email, user.Nom, ticket.Resum, resposta, req.Estat, user.Idioma)
			}()
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ticket actualitzat correctament"})
}
