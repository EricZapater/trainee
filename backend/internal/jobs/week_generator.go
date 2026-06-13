package jobs

import (
	"context"
	"fmt"
	"log"
	"time"

	"trainee-backend/internal/store"
)



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

	count := 0
	for _, e := range entrenadors {
		err := s.EnsureManagedWeekExists(ctx, e.ID, weekStart, "oberta")
		if err != nil {
			log.Printf("[CRON] Error assegurant setmana per a l'entrenador %s: %v", e.ID, err)
			continue
		}
		count++
	}

	resum := fmt.Sprintf("S'han generat les setmanes obertes per a %d entrenadors (data: %s).", count, weekStart)
	log.Printf("[CRON] %s", resum)
	s.AddSystemLog(ctx, "cron_week_generator", "INFO", resum, nil)

	return nil
}
