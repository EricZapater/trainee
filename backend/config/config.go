package config

import (	
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DBURL     string
	JWTSecret string
	Port      string
	Env       string
}

func Load() *Config {
	// Intentem carregar el fitxer .env (si no existeix, ignorem l'error per producció)
	_ = godotenv.Load()

	dbUrl := getEnv("DATABASE_URL", "")
	if dbUrl == "" {
		dbUrl = getEnv("DB_URL", "postgres://user:password@localhost:5432/atletisme?sslmode=disable")
	}

	return &Config{
		DBURL:     dbUrl,
		JWTSecret: getEnv("JWT_SECRET", "canvia_aquest_secret_en_produccio"),
		Port:      getEnv("PORT", "8080"),
		Env:       getEnv("ENV", "development"),
	}
}

func getEnv(key, fallback string) string {
	val := os.Getenv(key)
	if val != "" {
		return val
	}
	return fallback
}
