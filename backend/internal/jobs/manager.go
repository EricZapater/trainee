package jobs

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/robfig/cron/v3"
	"trainee-backend/internal/mailer"
	"trainee-backend/internal/models"
	"trainee-backend/internal/store"
)

type JobManager struct {
	c          *cron.Cron
	store      store.Store
	mail       mailer.Mailer
	jwtSecret  string

	weekEntryID     cron.EntryID
	reminderEntryID cron.EntryID
}

func NewJobManager(s store.Store, mail mailer.Mailer, jwtSecret string) *JobManager {
	return &JobManager{
		c:         cron.New(),
		store:     s,
		mail:      mail,
		jwtSecret: jwtSecret,
	}
}

func (jm *JobManager) Start() error {
	jm.c.Start()

	if err := jm.ReloadWeekGenerator(); err != nil {
		log.Printf("[JobManager] Error carregant WeekGenerator: %v", err)
	}

	if err := jm.ReloadReminderCron(); err != nil {
		log.Printf("[JobManager] Error carregant ReminderCron: %v", err)
	}

	return nil
}

func (jm *JobManager) Stop() {
	jm.c.Stop()
}

// ReloadWeekGenerator llegeix la configuració i reprograma el cron
func (jm *JobManager) ReloadWeekGenerator() error {
	// 1. Eliminar la tasca existent si n'hi ha
	if jm.weekEntryID != 0 {
		jm.c.Remove(jm.weekEntryID)
		jm.weekEntryID = 0
	}

	// 2. Llegir configuració
	ctx := context.Background()
	val, err := jm.store.GetSystemSetting(ctx, "cron_week_generator")
	if err != nil {
		return fmt.Errorf("error llegint cron_week_generator: %w", err)
	}

	var cfg models.CronConfig
	if val != nil {
		if err := json.Unmarshal(val, &cfg); err != nil {
			return fmt.Errorf("error unmarshaling cron_week_generator: %w", err)
		}
	} else {
		// Default
		cfg = models.CronConfig{Time: "00:00", Days: []int{1}, Enabled: true}
	}

	if !cfg.Enabled {
		log.Println("[JobManager] WeekGenerator està deshabilitat.")
		return nil
	}

	cronExpr := buildCronExpression(cfg)
	log.Printf("[JobManager] Programant WeekGenerator amb expressió: %s", cronExpr)

	id, err := jm.c.AddFunc(cronExpr, func() {
		log.Println("[CRON] Executant generador de setmanes...")
		err := GenerateUpcomingWeeks(jm.store)
		if err != nil {
			log.Printf("[CRON] Error generant setmanes: %v", err)
		} else {
			log.Println("[CRON] Generació de setmanes completada.")
		}
	})

	if err != nil {
		return fmt.Errorf("error afegint cron func per WeekGenerator: %w", err)
	}
	jm.weekEntryID = id

	return nil
}

// ReloadReminderCron llegeix la configuració i reprograma el cron
func (jm *JobManager) ReloadReminderCron() error {
	if jm.reminderEntryID != 0 {
		jm.c.Remove(jm.reminderEntryID)
		jm.reminderEntryID = 0
	}

	ctx := context.Background()
	val, err := jm.store.GetSystemSetting(ctx, "cron_reminder_generator")
	if err != nil {
		return fmt.Errorf("error llegint cron_reminder_generator: %w", err)
	}

	var cfg models.CronConfig
	if val != nil {
		if err := json.Unmarshal(val, &cfg); err != nil {
			return fmt.Errorf("error unmarshaling cron_reminder_generator: %w", err)
		}
	} else {
		// Default
		cfg = models.CronConfig{Time: "06:00", Days: []int{3, 4, 5}, Enabled: true}
	}

	if !cfg.Enabled {
		log.Println("[JobManager] ReminderCron està deshabilitat.")
		return nil
	}

	cronExpr := buildCronExpression(cfg)
	log.Printf("[JobManager] Programant ReminderCron amb expressió: %s", cronExpr)

	id, err := jm.c.AddFunc(cronExpr, func() {
		log.Println("[CRON] Executant enviament de recordatoris de planificació setmanal...")
		jm.store.AddSystemLog(context.Background(), "cron_reminder", "INFO", "Iniciant enviament de recordatoris", nil)
		err := GenerateReminders(jm.store, jm.mail, jm.jwtSecret)
		if err != nil {
			errStr := err.Error()
			jm.store.AddSystemLog(context.Background(), "cron_reminder", "ERROR", "Error enviant recordatoris", &errStr)
			log.Printf("[CRON] Error enviant recordatoris: %v", err)
		} else {
			log.Println("[CRON] Enviament de recordatoris completat.")
		}
	})

	if err != nil {
		return fmt.Errorf("error afegint cron func per ReminderCron: %w", err)
	}
	jm.reminderEntryID = id

	return nil
}

// buildCronExpression transforma models.CronConfig a string tipus "0 6 * * 3,4,5"
func buildCronExpression(cfg models.CronConfig) string {
	parts := strings.Split(cfg.Time, ":")
	hour := "0"
	minute := "0"
	if len(parts) == 2 {
		hour = parts[0]
		// Retallem zeros a l'esquerra si no es 0
		if strings.HasPrefix(hour, "0") && len(hour) > 1 {
			hour = hour[1:]
		}
		minute = parts[1]
		if strings.HasPrefix(minute, "0") && len(minute) > 1 {
			minute = minute[1:]
		}
	}

	daysStr := "*"
	if len(cfg.Days) > 0 {
		var dStr []string
		for _, d := range cfg.Days {
			dStr = append(dStr, fmt.Sprintf("%d", d))
		}
		daysStr = strings.Join(dStr, ",")
	}

	return fmt.Sprintf("%s %s * * %s", minute, hour, daysStr)
}
