package jobs

import (
	"context"
	"log"
	"time"

	"github.com/robfig/cron/v3"
	"trainee-backend/internal/mailer"
	"trainee-backend/internal/store"
)

// StartReminderCron initializes and starts the cron job for sending weekly reminders.
func StartReminderCron(s store.Store, m mailer.Mailer) (*cron.Cron, error) {
	c := cron.New()

	// Cada dimecres, dijous i divendres a les 06:00 AM
	_, err := c.AddFunc("0 6 * * 3,4,5", func() {
		log.Println("[CRON] Executant enviament de recordatoris de planificació setmanal...")
		err := GenerateReminders(s, m)
		if err != nil {
			log.Printf("[CRON] Error enviant recordatoris: %v", err)
		} else {
			log.Println("[CRON] Enviament de recordatoris completat.")
		}
	})

	if err != nil {
		return nil, err
	}

	c.Start()
	log.Println("Cron scheduler iniciat per a l'enviament de recordatoris setmanals.")
	return c, nil
}

// GenerateReminders checks for active athletes who haven't completed their next week's submission
// and sends them a reminder email.
func GenerateReminders(s store.Store, m mailer.Mailer) error {
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
			err = m.SendReminder(a.Email, a.Nom)
			if err != nil {
				log.Printf("[CRON-REMINDER] Error enviant recordatori a %s: %v", a.Email, err)
			} else {
				count++
			}
		}
	}

	log.Printf("[CRON-REMINDER] S'han enviat %d recordatoris amb èxit.", count)
	return nil
}
