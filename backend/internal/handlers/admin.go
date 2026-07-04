package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"trainee-backend/internal/auth"
	"trainee-backend/internal/mailer"
	"trainee-backend/internal/store"
)

type AdminHandler struct {
	Store     store.Store
	Mailer    mailer.Mailer
	JWTSecret string
}

func NewAdminHandler(s store.Store, m mailer.Mailer, jwtSecret string) *AdminHandler {
	return &AdminHandler{Store: s, Mailer: m, JWTSecret: jwtSecret}
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

func generateRandomPassword(length int) (string, error) {
	b := make([]byte, length)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b)[:length], nil
}

// ResetPassword generates a new password, saves it, and sends it by email
func (h *AdminHandler) ResetPassword(c *gin.Context) {
	targetID := c.Param("id")
	ctx := c.Request.Context()

	targetUser, err := h.Store.GetUsuariByID(ctx, targetID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "usuari no trobat"})
		return
	}

	newPassword, err := generateRandomPassword(12)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error generant la nova contrasenya"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error xifrant la contrasenya"})
		return
	}

	if err := h.Store.UpdateUsuariPassword(ctx, targetID, string(hashedPassword)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error actualitzant la contrasenya"})
		return
	}

	if err := h.Mailer.SendPasswordResetNotification(targetUser.Email, targetUser.Nom, newPassword, targetUser.Idioma); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "contrasenya restablerta, però ha fallat l'enviament del correu", "email_error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "contrasenya restablerta i correu enviat"})
}
