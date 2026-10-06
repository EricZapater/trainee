package handlers

import (
	"context"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/models"
)

func getUserRole(c *gin.Context) string {
	r := c.GetString("user_rol")
	if r == "" {
		r = c.GetString("rol")
	}
	return r
}

func (h *Handler) ListAnuncis(c *gin.Context) {
	userID := c.GetString("user_id")
	userRole := getUserRole(c)

	anuncis, err := h.Store.ListAnuncis(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list anuncis"})
		return
	}

	var filtered []models.Anunci
	for _, a := range anuncis {
		if !a.Actiu {
			continue // Completely exclude inactive announcements from the board
		}
		if userRole == "admin" || userRole == "entrenador" {
			filtered = append(filtered, a)
		} else {
			// Atleta only sees approved ones OR their own pending/rejected ones
			if a.Estat == "aprovat" || a.AutorID == userID {
				filtered = append(filtered, a)
			}
		}
	}

	if filtered == nil {
		filtered = []models.Anunci{}
	}
	c.JSON(http.StatusOK, filtered)
}

func (h *Handler) CreateAnunci(c *gin.Context) {
	var req models.CreateAnunciRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	estat := "pendent"

	anunci, err := h.Store.CreateAnunci(c.Request.Context(), userID, req, estat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create anunci"})
		return
	}

	// Audit log
	detallsLog := fmt.Sprintf(`{"anunci_id":"%s","autor_id":"%s"}`, anunci.ID, userID)
	_ = h.Store.AddSystemLog(c.Request.Context(), "anunci_created", "INFO", fmt.Sprintf("Creat nou anunci '%s' per l'usuari %s", anunci.Titol, userID), &detallsLog)

	// Send email notification to all active coaches and admins in background
	go func() {
		ctx := context.Background()
		users, err := h.Store.ListAllUsuaris(ctx)
		if err != nil {
			return
		}

		usr, _ := h.Store.GetUsuariByID(ctx, userID)
		autorNom := "Un usuari"
		if usr != nil {
			autorNom = usr.Nom
			if usr.Cognoms != "" {
				autorNom += " " + usr.Cognoms
			}
		}

		// Notify coaches and admins about the new pending announcement
		for _, u := range users {
			if (u.Rol == "entrenador" || u.Rol == "admin") && u.Actiu {
				_ = h.Mailer.SendNewAnunciNotification(
					u.Email,
					u.Nom,
					autorNom,
					req.Titol,
					req.Descripcio,
					u.Idioma,
				)
			}
		}
	}()

	c.JSON(http.StatusCreated, anunci)
}

func (h *Handler) UpdateAnunciStatus(c *gin.Context) {
	id := c.Param("id")
	
	var req models.UpdateAnunciStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	userRole := getUserRole(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Verify author or admin
	anunci, err := h.Store.GetAnunciByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Anunci not found"})
		return
	}

	// Any Admin or Entrenador can deactivate. Or the author.
	if userRole != "admin" && userRole != "entrenador" && anunci.AutorID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to modify this anunci"})
		return
	}

	err = h.Store.UpdateAnunciStatus(c.Request.Context(), id, req.Actiu)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update anunci status"})
		return
	}

	// Audit log
	detallsLog := fmt.Sprintf(`{"anunci_id":"%s","usuari_id":"%s","actiu":%t}`, id, userID, req.Actiu)
	_ = h.Store.AddSystemLog(c.Request.Context(), "anunci_status_updated", "INFO", fmt.Sprintf("Usuari %s ha canviat actiu=%t a l'anunci '%s'", userID, req.Actiu, anunci.Titol), &detallsLog)

	c.JSON(http.StatusOK, gin.H{"message": "Status updated successfully"})
}

func (h *Handler) UpdateAnunciEstat(c *gin.Context) {
	id := c.Param("id")

	var req models.UpdateAnunciEstatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	userRole := getUserRole(c)
	if userRole != "admin" && userRole != "entrenador" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to approve or reject anuncis"})
		return
	}

	anunci, _ := h.Store.GetAnunciByID(c.Request.Context(), id)
	titolAnunci := id
	if anunci != nil {
		titolAnunci = anunci.Titol
	}

	usr, _ := h.Store.GetUsuariByID(c.Request.Context(), userID)
	userNom := userID
	if usr != nil {
		userNom = usr.Nom
		if usr.Cognoms != "" {
			userNom += " " + usr.Cognoms
		}
	}

	err := h.Store.UpdateAnunciEstat(c.Request.Context(), id, req.Estat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update anunci estat"})
		return
	}

	// Audit log
	detallsLog := fmt.Sprintf(`{"anunci_id":"%s","validat_per_id":"%s","validat_per_nom":"%s","estat":"%s"}`, id, userID, userNom, req.Estat)
	_ = h.Store.AddSystemLog(
		c.Request.Context(),
		"anunci_estat_updated",
		"INFO",
		fmt.Sprintf("L'usuari %s ha canviat l'estat de l'anunci '%s' a '%s'", userNom, titolAnunci, req.Estat),
		&detallsLog,
	)

	// If approved, send notification email to all active users
	if req.Estat == "aprovat" {
		go func() {
			ctx := context.Background()
			anunci, err := h.Store.GetAnunciByID(ctx, id)
			if err != nil || anunci == nil {
				return
			}

			users, err := h.Store.ListAllUsuaris(ctx)
			if err != nil {
				return
			}

			autorNom := anunci.AutorNom
			if autorNom == "" {
				autorNom = "Un usuari"
			}

			for _, u := range users {
				if u.Actiu && u.NotificacionsTauler {
					_ = h.Mailer.SendNewAnunciNotification(
						u.Email,
						u.Nom,
						autorNom,
						anunci.Titol,
						anunci.Descripcio,
						u.Idioma,
					)
				}
			}
		}()
	}

	c.JSON(http.StatusOK, gin.H{"message": "Estat updated successfully"})
}

func (h *Handler) GetAnunciTags(c *gin.Context) {
	tags, err := h.Store.GetUniqueAnunciTags(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get tags"})
		return
	}
	c.JSON(http.StatusOK, tags)
}

func (h *Handler) UploadAnunciImage(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No files uploaded"})
		return
	}

	files := form.File["images"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No images provided"})
		return
	}

	var urls []string
	for _, file := range files {
		// Enforce Max Size of 1MB (1048576 bytes)
		if file.Size > 1048576 {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("File %s exceeds the 1MB limit", file.Filename)})
			return
		}

		url, err := h.Uploader.UploadFile(c.Request.Context(), file, "anuncis")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to upload file %s: %v", file.Filename, err)})
			return
		}

		urls = append(urls, url)
	}

	c.JSON(http.StatusOK, gin.H{"urls": urls})
}
