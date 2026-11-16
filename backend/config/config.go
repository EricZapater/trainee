package config

import (
	"fmt"
	"log"
	"net/url"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DBURL       string
	DBHost      string
	DBPort      string
	DBUser      string
	DBPass      string
	DBName      string
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

func buildDatabaseURL() string {
	host := getEnv("DB_HOST", "")
	if host != "" {
		port := getEnv("DB_PORT", "5432")
		user := getEnv("DB_USER", "postgres")
		pass := getEnv("DB_PASS", "")
		if pass == "" {
			pass = getEnv("DB_PASSWORD", "")
		}
		name := getEnv("DB_NAME", "trainee")
		ssl := getEnv("DB_SSLMODE", "disable")

		var userInfo *url.Userinfo
		if pass != "" {
			userInfo = url.UserPassword(user, pass)
		} else {
			userInfo = url.User(user)
		}

		u := &url.URL{
			Scheme:   "postgres",
			User:     userInfo,
			Host:     fmt.Sprintf("%s:%s", host, port),
			Path:     name,
			RawQuery: fmt.Sprintf("sslmode=%s", ssl),
		}
		log.Printf("🔌 Connectant a PostgreSQL a %s:%s (bd: %s, usuari: %s)...", host, port, name, user)
		return u.String()
	}

	dbUrl := getEnv("DATABASE_URL", "")
	if dbUrl != "" {
		log.Println("🔌 Connectant a PostgreSQL mitjançant DATABASE_URL...")
		return dbUrl
	}

	rawUrl := getEnv("DB_URL", "")
	if rawUrl != "" {
		log.Println("🔌 Connectant a PostgreSQL mitjançant DB_URL...")
		return rawUrl
	}

	log.Println("🔌 Cap configuració trobada; utilitzant connexió per defecte localhost:5432...")
	return "postgres://user:password@localhost:5432/atletisme?sslmode=disable"
}

func Load() *Config {
	// Intentem carregar el fitxer .env (si no existeix, ignorem l'error per producció)
	_ = godotenv.Load()

	dbHost := getEnv("DB_HOST", "")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPass := getEnv("DB_PASS", "")
	if dbPass == "" {
		dbPass = getEnv("DB_PASSWORD", "")
	}
	dbName := getEnv("DB_NAME", "trainee")
	dbUrl := buildDatabaseURL()

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
		DBHost:      dbHost,
		DBPort:      dbPort,
		DBUser:      dbUser,
		DBPass:      dbPass,
		DBName:      dbName,
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
