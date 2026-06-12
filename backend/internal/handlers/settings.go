package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/jobs"
	"trainee-backend/internal/models"
	"trainee-backend/internal/store"
)

type SettingsHandler struct {
	Store      store.Store
	JobManager *jobs.JobManager
}

func NewSettingsHandler(s store.Store, jm *jobs.JobManager) *SettingsHandler {
	return &SettingsHandler{Store: s, JobManager: jm}
}

// GetCronSettings returns the current cron configurations
func (h *SettingsHandler) GetCronSettings(c *gin.Context) {
	ctx := c.Request.Context()

	var settings models.SystemSettings

	// Week Generator
	val, err := h.Store.GetSystemSetting(ctx, "cron_week_generator")
	if err == nil && val != nil {
		json.Unmarshal(val, &settings.WeekGenerator)
	} else {
		settings.WeekGenerator = models.CronConfig{Time: "00:00", Days: []int{1}, Enabled: true}
	}

	// Reminder Generator
	val, err = h.Store.GetSystemSetting(ctx, "cron_reminder_generator")
	if err == nil && val != nil {
		json.Unmarshal(val, &settings.ReminderCron)
	} else {
		settings.ReminderCron = models.CronConfig{Time: "06:00", Days: []int{3, 4, 5}, Enabled: true}
	}

	c.JSON(http.StatusOK, settings)
}

// UpdateCronSettings updates configurations and reloads jobs
func (h *SettingsHandler) UpdateCronSettings(c *gin.Context) {
	var req models.SystemSettings
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "dada invàlida"})
		return
	}

	ctx := c.Request.Context()

	// Guardar WeekGenerator
	weekBytes, _ := json.Marshal(req.WeekGenerator)
	if err := h.Store.UpdateSystemSetting(ctx, "cron_week_generator", weekBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error desant configuració de setmanes"})
		return
	}

	// Guardar ReminderGenerator
	remBytes, _ := json.Marshal(req.ReminderCron)
	if err := h.Store.UpdateSystemSetting(ctx, "cron_reminder_generator", remBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error desant configuració de recordatoris"})
		return
	}

	// Recarregar crons
	if err := h.JobManager.ReloadWeekGenerator(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "configuració desada però error recarregant el cron de setmanes"})
		return
	}
	if err := h.JobManager.ReloadReminderCron(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "configuració desada però error recarregant el cron de recordatoris"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Configuració de tasques actualitzada correctament"})
}
