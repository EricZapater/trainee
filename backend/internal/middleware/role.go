package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RequireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("rol")
		if !exists || userRole.(string) != role {
			c.JSON(http.StatusForbidden, gin.H{"error": "no tens permisos per accedir a aquest recurs"})
			c.Abort()
			return
		}
		c.Next()
	}
}
