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

// RequireAdministracio permet l'accés a usuaris amb rol 'admin' o 'entrenador'.
func RequireAdministracio(s store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("rol")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "no tens permisos d'administració financera"})
			c.Abort()
			return
		}

		uRoleStr, _ := userRole.(string)
		if uRoleStr == "admin" || uRoleStr == "entrenador" {
			c.Next()
			return
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "accés restringit a administració"})
		c.Abort()
	}
}
