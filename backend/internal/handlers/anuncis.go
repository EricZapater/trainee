package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/models"
)

func (h *Handler) ListAnuncis(c *gin.Context) {
	userID := c.GetString("user_id")
	userRole := c.GetString("user_rol")

	anuncis, err := h.Store.ListAnuncis(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list anuncis"})
		return
	}

	var filtered []models.Anunci
	for _, a := range anuncis {
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
	userRole := c.GetString("user_rol")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	estat := "pendent"
	if userRole == "admin" || userRole == "entrenador" {
		estat = "aprovat"
	}

	anunci, err := h.Store.CreateAnunci(c.Request.Context(), userID, req, estat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create anunci"})
		return
	}

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
	userRole := c.GetString("user_rol")
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

	c.JSON(http.StatusOK, gin.H{"message": "Status updated successfully"})
}

func (h *Handler) UpdateAnunciEstat(c *gin.Context) {
	id := c.Param("id")

	var req models.UpdateAnunciEstatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userRole := c.GetString("user_rol")
	if userRole != "admin" && userRole != "entrenador" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to approve or reject anuncis"})
		return
	}

	err := h.Store.UpdateAnunciEstat(c.Request.Context(), id, req.Estat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update anunci estat"})
		return
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
