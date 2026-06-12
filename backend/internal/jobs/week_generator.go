package jobs

import (
	"context"
	"log"
	"time"

	"github.com/robfig/cron/v3"
	"trainee-backend/internal/store"
)

// StartWeekGenerator initializes and starts the cron job for generating weeks
func StartWeekGenerator(s store.Store) (*cron.Cron, error) {
	c := cron.New()

	// Cada diumenge a les 03:00 AM
	_, err := c.AddFunc("0 3 * * 0", func() {
		log.Println("[CRON] Executant generador de setmanes...")
		err := GenerateUpcomingWeeks(s)
		if err != nil {
			log.Printf("[CRON] Error generant setmanes: %v", err)
		} else {
			log.Println("[CRON] Generació de setmanes completada correctament.")
		}
	})

	if err != nil {
		return nil, err
	}

	c.Start()
	log.Println("Cron scheduler iniciat per a la generació automàtica de setmanes.")
	return c, nil
}

// GenerateUpcomingWeeks calculates the Monday 8 days from now and creates the week
func GenerateUpcomingWeeks(s store.Store) error {
	ctx := context.Background()

	now := time.Now()
	
	// Calculem els dies fins al proper dilluns
	daysUntilMonday := (int(time.Monday) - int(now.Weekday()) + 7) % 7
	if daysUntilMonday == 0 {
		daysUntilMonday = 7 
	}
	
	// Sumem els dies per arribar al dilluns de la setmana següent
	// Si som diumenge (daysUntilMonday=1), sumem 1 + 7 = 8 dies.
	targetDate := now.AddDate(0, 0, daysUntilMonday+7)
	weekStart := targetDate.Format("2006-01-02")

	log.Printf("[CRON] Target week_start calculat: %s", weekStart)

	// Obtenim tots els entrenadors per crear-los la setmana
	entrenadors, err := s.ListEntrenadors(ctx)
	if err != nil {
		return err
	}

	for _, e := range entrenadors {
		err := s.EnsureManagedWeekExists(ctx, e.ID, weekStart, "oberta")
		if err != nil {
			log.Printf("[CRON] Error assegurant setmana per a l'entrenador %s: %v", e.ID, err)
			continue
		}
	}

	return nil
}
