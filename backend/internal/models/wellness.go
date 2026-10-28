package models

import "time"

type WellnessData struct {
	Fatiga        int      `json:"fatiga" binding:"required,min=1,max=5"`
	SonQualitat   int      `json:"son_qualitat" binding:"required,min=1,max=5"`
	DolorMuscular int      `json:"dolor_muscular" binding:"required,min=1,max=5"`
	Estres        int      `json:"estres" binding:"required,min=1,max=5"`
	Humor         int      `json:"humor" binding:"required,min=1,max=5"`
	RPESetmanal   int      `json:"rpe_setmanal" binding:"required,min=1,max=10"`
	ZonesDolor    []string `json:"zones_dolor"`
	Notes         string   `json:"notes"`
}

type SubmitWellnessRequest struct {
	WeekStart string `json:"week_start" binding:"required"`
	WellnessData
}

type AthleteWellnessSummary struct {
	AtletaID      string     `json:"atleta_id"`
	Nom           string     `json:"nom"`
	Cognoms       string     `json:"cognoms"`
	AtletaNom     string     `json:"atleta_nom,omitempty"`
	SubmissionID  *string    `json:"submission_id,omitempty"`
	HaRespost     bool       `json:"ha_respost"`
	Fatiga        *int       `json:"fatiga,omitempty"`
	SonQualitat   *int       `json:"son_qualitat,omitempty"`
	DolorMuscular *int       `json:"dolor_muscular,omitempty"`
	Estres        *int       `json:"estres,omitempty"`
	Humor         *int       `json:"humor,omitempty"`
	RPESetmanal   *int       `json:"rpe_setmanal,omitempty"`
	ZonesDolor    []string   `json:"zones_dolor,omitempty"`
	Notes         *string    `json:"notes,omitempty"`
	Score         *int       `json:"score,omitempty"`
	Alerta        string     `json:"alerta"` // "verd", "groc", "vermell", "pendent"
	SubmittedAt   *time.Time `json:"submitted_at,omitempty"`
}

type EntrenadorWellnessOverviewResponse struct {
	WeekStart string                   `json:"week_start"`
	Atletes   []AthleteWellnessSummary `json:"atletes"`
}
