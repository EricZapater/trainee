package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"trainee-backend/internal/auth"
	"trainee-backend/internal/models"
	"trainee-backend/internal/store"
)

type Handler struct {
	Store     store.Store
	JWTSecret string
}

func NewHandler(s store.Store, jwtSecret string) *Handler {
	return &Handler{Store: s, JWTSecret: jwtSecret}
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

	user, err := h.Store.CreateUsuari(c.Request.Context(), req.Nom, req.Email, string(hash), req.Rol)
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
