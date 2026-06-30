package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"trainee-backend/internal/auth"
	"trainee-backend/internal/mailer"
	"trainee-backend/internal/models"
	"trainee-backend/internal/store"
)

type Handler struct {
	Store     store.Store
	Mailer    mailer.Mailer
	JWTSecret string
}

func NewHandler(s store.Store, m mailer.Mailer, jwtSecret string) *Handler {
	return &Handler{Store: s, Mailer: m, JWTSecret: jwtSecret}
}

func (h *Handler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Rol == "atleta" && req.EntrenadorID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "entrenador_id és obligatori per a atletes"})
		return
	}
	if req.Rol == "entrenador" && req.EntrenadorID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "entrenador_id és obligatori per reclamar un perfil d'entrenador"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error processant la contrasenya"})
		return
	}

	user, err := h.Store.CreateUsuari(c.Request.Context(), req.Nom, req.Email, string(hash), req.Rol, req.Idioma)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "l'email ja està registrat"})
		return
	}

	if req.Rol == "atleta" {
		_, err = h.Store.CreateAtleta(c.Request.Context(), user.ID, req.EntrenadorID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "error creant el perfil d'atleta: " + err.Error()})
			return
		}

		// Enviar notificació a l'entrenador de manera asíncrona
		go func(entrenadorID, atletaNom string) {
			entrenadorUsuari, err := h.Store.GetUsuariByEntrenadorID(context.Background(), entrenadorID)
			if err == nil && entrenadorUsuari != nil {
				_ = h.Mailer.SendNewAthleteNotification(entrenadorUsuari.Email, entrenadorUsuari.Nom, atletaNom, entrenadorUsuari.Idioma)
			}
		}(req.EntrenadorID, user.Nom)
	} else {
		err = h.Store.ClaimEntrenador(c.Request.Context(), req.EntrenadorID, user.ID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "error reclamant el perfil d'entrenador: " + err.Error()})
			return
		}
	}

	token, err := auth.GenerateToken(*user, h.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error generant el token"})
		return
	}

	c.JSON(http.StatusCreated, models.AuthResponse{Token: token, Usuari: *user})
}

func (h *Handler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.Store.GetUsuariByEmail(c.Request.Context(), req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "credencials incorrectes"})
		return
	}

	if !user.Actiu {
		c.JSON(http.StatusForbidden, gin.H{"error": "el teu compte ha estat desactivat"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "credencials incorrectes"})
		return
	}

	token, err := auth.GenerateToken(*user, h.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error generant el token"})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{Token: token, Usuari: *user})
}

func (h *Handler) MagicLogin(c *gin.Context) {
	var req struct {
		Token string `json:"token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "token requerit"})
		return
	}

	claims, err := auth.ValidateToken(req.Token, h.JWTSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "enllaç caducat o invàlid"})
		return
	}

	if claims.Rol != "magic_link" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token invàlid per a l'inici de sessió directe"})
		return
	}

	user, err := h.Store.GetUsuariByID(c.Request.Context(), claims.Subject)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "usuari no trobat"})
		return
	}

	if !user.Actiu {
		c.JSON(http.StatusForbidden, gin.H{"error": "el teu compte ha estat desactivat"})
		return
	}

	// Generate standard full-access token
	standardToken, err := auth.GenerateToken(*user, h.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error generant el token definitiu"})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{Token: standardToken, Usuari: *user})
}


func (h *Handler) ChangePassword(c *gin.Context) {
	userID := c.GetString("user_id")

	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.Store.GetUsuariByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no s'ha trobat l'usuari"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "la contrasenya actual és incorrecta"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error processant la nova contrasenya"})
		return
	}

	if err := h.Store.UpdateUsuariPassword(c.Request.Context(), userID, string(hash)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no s'ha pogut canviar la contrasenya"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "contrasenya actualitzada correctament"})
}

func (h *Handler) UpdateIdioma(c *gin.Context) {
	userID := c.GetString("user_id")

	var req models.UpdateIdiomaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.Store.UpdateUsuariIdioma(c.Request.Context(), userID, req.Idioma); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no s'ha pogut actualitzar l'idioma"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "idioma actualitzat correctament"})
}

func (h *Handler) UpdateProfile(c *gin.Context) {
	userID := c.GetString("user_id")

	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify if email is already taken by another user
	if existingUser, err := h.Store.GetUsuariByEmail(c.Request.Context(), req.Email); err == nil && existingUser.ID != userID {
		c.JSON(http.StatusConflict, gin.H{"error": "l'email ja està en ús"})
		return
	}

	if err := h.Store.UpdateUsuariProfile(c.Request.Context(), userID, req.Nom, req.Email); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no s'ha pogut actualitzar el perfil"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "perfil actualitzat correctament"})
}
