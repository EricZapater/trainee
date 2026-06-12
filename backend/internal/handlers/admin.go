package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/auth"
	"trainee-backend/internal/store"
)

type AdminHandler struct {
	Store     store.Store
	JWTSecret string
}

func NewAdminHandler(s store.Store, jwtSecret string) *AdminHandler {
	return &AdminHandler{Store: s, JWTSecret: jwtSecret}
}

// GetUsuaris returns all users in the system for admin view
func (h *AdminHandler) GetUsuaris(c *gin.Context) {
	ctx := c.Request.Context()
	usuaris, err := h.Store.ListAllUsuaris(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no s'han pogut obtenir els usuaris"})
		return
	}

	c.JSON(http.StatusOK, usuaris)
}

// Impersonate generates a token for the requested user ID
func (h *AdminHandler) Impersonate(c *gin.Context) {
	targetID := c.Param("id")

	ctx := c.Request.Context()
	targetUser, err := h.Store.GetUsuariByID(ctx, targetID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "usuari no trobat"})
		return
	}

	// Generate a token just as if they logged in
	token, err := auth.GenerateToken(*targetUser, h.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error generant el token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":     targetUser.ID,
			"nom":    targetUser.Nom,
			"email":  targetUser.Email,
			"rol":    targetUser.Rol,
			"idioma": targetUser.Idioma,
		},
	})
}
