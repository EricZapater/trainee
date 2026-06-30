package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/store"
)

func RequireConsent(s store.Store, requiredVersion string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "usuari no autenticat"})
			return
		}

		hasConsent, err := s.HasLegalConsent(c.Request.Context(), userID.(string), requiredVersion)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "error verificant consentiment RGPD"})
			return
		}

		if !hasConsent {
			c.AbortWithStatusJSON(http.StatusPreconditionRequired, gin.H{"error": "CONSENT_REQUIRED"})
			return
		}

		c.Next()
	}
}
