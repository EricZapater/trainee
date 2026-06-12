package jobs

import (
	"context"
	"fmt"
	"log"
	"time"
	"trainee-backend/internal/auth"
	"trainee-backend/internal/mailer"
	"trainee-backend/internal/store"
)
// GenerateReminders checks for active athletes who haven't completed their next week's submission
// and sends them a reminder email.
func GenerateReminders(s store.Store, m mailer.Mailer, jwtSecret string) error {
	ctx := context.Background()
	now := time.Now()

	// Calculem el dilluns de la setmana que ve
	daysUntilMonday := (int(time.Monday) - int(now.Weekday()) + 7) % 7
	if daysUntilMonday == 0 {
		// Si avui és dilluns, el proper és d'aquí 7 dies
		daysUntilMonday = 7
	}
	targetDate := now.AddDate(0, 0, daysUntilMonday)
	// Si ho executem dimecres, dijous o divendres, el dilluns proper està en aquesta mateixa setmana.
	// Ojo: Si avui és dimecres (Weekday=3), daysUntilMonday serà (1 - 3 + 7) % 7 = 5.
	// Dimecres + 5 dies = Dilluns de la setmana següent.
	// Correcte, només sumem daysUntilMonday per trobar el proper dilluns.
	
	weekStart := targetDate.Format("2006-01-02")
	log.Printf("[CRON-REMINDER] Revisant atletes per la setmana del %s", weekStart)

	atletes, err := s.ListAllActiveAtletes(ctx)
	if err != nil {
		return err
	}

	count := 0
	for _, a := range atletes {
		// Ignorar atletes sense email
		if a.Email == "" {
			continue
		}

		submission, err := s.GetSubmissionByAtletaAndWeek(ctx, a.ID, weekStart)
		if err != nil {
			log.Printf("[CRON-REMINDER] Error obtenint submission per atleta %s: %v", a.ID, err)
			continue
		}

		// Si l'estat no és "completada", s'envia el recordatori.
		if submission.Estat != "completada" {
			// Generar el magic token
			magicToken, tErr := auth.GenerateMagicLinkToken(a.ID, jwtSecret)
			if tErr != nil {
				log.Printf("[CRON-REMINDER] Error generant token per a %s: %v", a.Email, tErr)
				continue
			}

			err = m.SendReminder(a.Email, a.Nom, magicToken, weekStart)
			if err != nil {
				log.Printf("[CRON-REMINDER] Error enviant recordatori a %s: %v", a.Email, err)
			} else {
				count++
			}
		}
	}

	resum := fmt.Sprintf("S'han enviat %d recordatoris amb èxit per la setmana %s.", count, weekStart)
	log.Printf("[CRON-REMINDER] %s", resum)
	s.AddSystemLog(ctx, "cron_reminder_summary", "INFO", resum, nil)
	return nil
}
