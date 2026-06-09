package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/auth"
)

func JWTAuth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token d'autenticació requerit"})
			c.Abort()
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "format de token invàlid, usa Bearer <token>"})
			c.Abort()
			return
		}

		claims, err := auth.ValidateToken(parts[1], secret)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token invàlid o expirat"})
			c.Abort()
			return
		}

		sub, _ := claims.GetSubject()
		c.Set("user_id", sub)
		c.Set("rol", claims.Rol)
		c.Set("nom", claims.Nom)
		c.Next()
	}
}
