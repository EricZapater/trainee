package config

import (	
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DBURL       string
	JWTSecret   string
	Port        string
	Env         string
	DisableMail bool
	SMTPHost    string
	SMTPPort    string
	SMTPUser    string
	SMTPPass    string
	BrevoAPIKey string
	FrontendURL string
}

func Load() *Config {
	// Intentem carregar el fitxer .env (si no existeix, ignorem l'error per producció)
	_ = godotenv.Load()

	dbUrl := getEnv("DATABASE_URL", "")
	if dbUrl == "" {
		dbUrl = getEnv("DB_URL", "postgres://user:password@localhost:5432/atletisme?sslmode=disable")
	}

	envMode := getEnv("ENV", "development")
	disableMail := getEnv("DISABLE_MAIL", "false") == "true" || 
		envMode == "pre" || 
		envMode == "staging" || 
		getEnv("MAILING_ENABLED", "true") == "false"

	smtpHost := getEnv("SMTP_HOST", "")
	smtpPort := getEnv("SMTP_PORT", "587")
	smtpUser := getEnv("SMTP_USER", "")
	smtpPass := getEnv("SMTP_PASS", "")
	brevoKey := getEnv("BREVO_API_KEY", "")

	if disableMail {
		smtpHost = ""
		smtpUser = ""
		brevoKey = ""
	}

	return &Config{
		DBURL:       dbUrl,
		JWTSecret:   getEnv("JWT_SECRET", "canvia_aquest_secret_en_produccio"),
		Port:        getEnv("PORT", "8080"),
		Env:         envMode,
		DisableMail: disableMail,
		SMTPHost:    smtpHost,
		SMTPPort:    smtpPort,
		SMTPUser:    smtpUser,
		SMTPPass:    smtpPass,
		BrevoAPIKey: brevoKey,
		FrontendURL: getEnv("FRONTEND_URL", "https://trainee.entrenadortrail.es"),
	}
}

func getEnv(key, fallback string) string {
	val := os.Getenv(key)
	if val != "" {
		return val
	}
	return fallback
}
