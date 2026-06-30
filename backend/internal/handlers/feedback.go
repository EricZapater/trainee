package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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

		newFilename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
		savePath := filepath.Join("uploads", "feedback", newFilename)

		if err := os.MkdirAll(filepath.Join("uploads", "feedback"), 0755); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creant directori"})
			return
		}

		out, err := os.Create(savePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error desant l'arxiu"})
			return
		}
		defer out.Close()

		if _, err := io.Copy(out, file); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error copiant l'arxiu"})
			return
		}

		dbPath := "/api/" + savePath
		imatgePath = &dbPath
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

	c.JSON(http.StatusOK, ticket)
}
