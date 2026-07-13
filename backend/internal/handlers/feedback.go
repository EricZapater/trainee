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

	var imatgesUrls []string
	var firstImatgeURL *string

	// Handle multiple images from "imatges" field
	form, err := c.MultipartForm()
	if err == nil {
		files := form.File["imatges"]
		for _, fileHeader := range files {
			if fileHeader.Size > 1048576 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Les imatges no poden superar 1MB cadascuna"})
				return
			}
			ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
			if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" && ext != ".webp" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Format d'imatge no permès"})
				return
			}
			url, err := h.Uploader.UploadFile(c.Request.Context(), fileHeader, "feedback")
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al pujar l'arxiu"})
				return
			}
			imatgesUrls = append(imatgesUrls, url)
		}
	}

	// Handle single image from "imatge" field for backward compatibility
	file, header, err := c.Request.FormFile("imatge")
	if err == nil {
		defer file.Close()
		if header.Size > 1048576 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "La imatge no pot superar 1MB"})
			return
		}
		ext := strings.ToLower(filepath.Ext(header.Filename))
		if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" && ext != ".webp" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format d'imatge no permès"})
			return
		}
		url, err := h.Uploader.UploadFile(c.Request.Context(), header, "feedback")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al pujar l'arxiu"})
			return
		}
		imatgesUrls = append(imatgesUrls, url)
	}

	if len(imatgesUrls) > 0 {
		firstImatgeURL = &imatgesUrls[0]
	}

	req := models.CreateFeedbackRequest{
		Tipus:      tipus,
		Resum:      resum,
		Descripcio: descripcio,
	}

	ticket, err := h.Store.CreateFeedbackTicket(c.Request.Context(), informadorID, req, firstImatgeURL, imatgesUrls)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear la petició"})
		return
	}

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

		for _, coach := range coaches {
			if coach.Rol == "entrenador" && coach.Actiu {
				_ = h.Mailer.SendNewFeedbackNotification(
					coach.Email,
					coach.Nom,
					informadorNom,
					ticket.Tipus,
					ticket.Resum,
					ticket.Descripcio,
					ticket.Imatges,
					coach.Idioma,
				)
			}
		}
	}()

	c.JSON(http.StatusOK, ticket)
}

func (h *Handler) UpdateFeedbackTicket(c *gin.Context) {
	id := c.Param("id")

	estat := c.PostForm("estat")
	respostaVal := c.PostForm("resposta")

	if estat == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "L'estat és obligatori"})
		return
	}

	var resposta *string
	if respostaVal != "" {
		resposta = &respostaVal
	}

	// Fetch existing ticket to compare and validate
	ticket, err := h.Store.GetFeedbackTicketByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket no trobat"})
		return
	}

	var respostaImatges []string

	// Upload response images from form files
	form, err := c.MultipartForm()
	hasNewFiles := false
	if err == nil {
		files := form.File["imatges"]
		if len(files) > 0 {
			hasNewFiles = true
		}
		for _, fileHeader := range files {
			if fileHeader.Size > 1048576 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Les imatges no poden superar 1MB cadascuna"})
				return
			}
			ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
			if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" && ext != ".webp" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Format d'imatge no permès"})
				return
			}
			url, err := h.Uploader.UploadFile(c.Request.Context(), fileHeader, "feedback")
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al pujar l'arxiu"})
				return
			}
			respostaImatges = append(respostaImatges, url)
		}
	}

	// If no new files were uploaded, keep the old ones
	if !hasNewFiles {
		respostaImatges = ticket.RespostaImatges
	}

	// Update DB
	if err := h.Store.UpdateFeedbackTicket(c.Request.Context(), id, estat, resposta, respostaImatges); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualitzar el ticket"})
		return
	}

	stateChanged := ticket.Estat != estat
	responseChanged := resposta != nil && (ticket.Resposta == nil || *ticket.Resposta != *resposta)
	imagesChanged := hasNewFiles && len(respostaImatges) > 0

	if stateChanged || responseChanged || imagesChanged {
		user, err := h.Store.GetUsuariByID(c.Request.Context(), ticket.InformadorID)
		if err == nil && user != nil {
			respText := ""
			if resposta != nil {
				respText = *resposta
			}
			go func() {
				_ = h.Mailer.SendFeedbackReplyNotification(user.Email, user.Nom, ticket.Resum, respText, estat, user.Idioma, respostaImatges)
			}()
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ticket actualitzat correctament"})
}
