package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/store"
)

func RequireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("rol")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "no tens permisos per accedir a aquest recurs"})
			c.Abort()
			return
		}

		uRoleStr := userRole.(string)
		if uRoleStr == "admin" {
			c.Next()
			return
		}

		if uRoleStr != role {
			c.JSON(http.StatusForbidden, gin.H{"error": "no tens permisos per accedir a aquest recurs"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// RequireAdministracio permet l'accés exclusivament a usuaris amb rol 'admin'
// o bé a entrenadors actius amb el flag 'es_administracio = true'.
func RequireAdministracio(s store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("rol")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "no tens permisos d'administració financera"})
			c.Abort()
			return
		}

		uRoleStr, _ := userRole.(string)
		if uRoleStr == "admin" {
			c.Next()
			return
		}

		if uRoleStr != "entrenador" {
			c.JSON(http.StatusForbidden, gin.H{"error": "accés restringit a administració"})
			c.Abort()
			return
		}

		userID := c.GetString("user_id")
		if userID == "" {
			c.JSON(http.StatusForbidden, gin.H{"error": "usuari no identificat"})
			c.Abort()
			return
		}

		u, err := s.GetUsuariByID(c.Request.Context(), userID)
		if err != nil || !u.Actiu || !u.EsAdministracio {
			c.JSON(http.StatusForbidden, gin.H{"error": "no tens permisos d'administració activats"})
			c.Abort()
			return
		}

		c.Next()
	}
}
