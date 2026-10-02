package models

import "time"

type NutricioPlan struct {
	ID           string    `json:"id"`
	AtletaID     string    `json:"atleta_id"`
	EntrenadorID string    `json:"entrenador_id"`
	Titol        string    `json:"titol"`
	Estat        string    `json:"estat"` // actiu, completat, arxivat
	CreatedAt    time.Time `json:"created_at"`

	AtletaNom     string `json:"atleta_nom,omitempty"`
	AtletaCognoms string `json:"atleta_cognoms,omitempty"`
	EntrenadorNom string `json:"entrenador_nom,omitempty"`
}

type NutricioRevision struct {
	ID                 string     `json:"id"`
	PlanID             string     `json:"plan_id"`
	Versio             int        `json:"versio"`
	ObjectiuChGH       *float64   `json:"objectiu_ch_g_h"`
	ObjectiuSodiMgH    *float64   `json:"objectiu_sodi_mg_h"`
	ObjectiuFluidMlH   *float64   `json:"objectiu_fluid_ml_h"`
	ProductesPropostes *string    `json:"productes_propostes"`
	Instruccions       *string    `json:"instruccions"`
	DataRevisio        *string    `json:"data_revisio"` // YYYY-MM-DD
	CreatedAt          time.Time  `json:"created_at"`
	Feedbacks          []NutricioFeedback `json:"feedbacks,omitempty"`
}

type NutricioFeedback struct {
	ID                string    `json:"id"`
	RevisionID        string    `json:"revision_id"`
	AtletaID          string    `json:"atleta_id"`
	DataSortida       string    `json:"data_sortida"` // YYYY-MM-DD
	DuradaHores       *float64  `json:"durada_hores"`
	ProductesConsumits *string   `json:"productes_consumits"`
	ChGHReal          *float64  `json:"ch_g_h_real"`
	SodiMgHReal       *float64  `json:"sodi_mg_h_real"`
	FluidMlHReal      *float64  `json:"fluid_ml_h_real"`
	Sensacions        *string   `json:"sensacions"`
	CreatedAt         time.Time `json:"created_at"`

	AtletaNom string `json:"atleta_nom,omitempty"`
}

type NutricioPlanWithDetails struct {
	NutricioPlan
	Revisions []NutricioRevision `json:"revisions"`
}

type CreateNutricioPlanRequest struct {
	AtletaID           string   `json:"atleta_id" binding:"required"`
	Titol              string   `json:"titol" binding:"required"`
	ObjectiuChGH       *float64 `json:"objectiu_ch_g_h"`
	ObjectiuSodiMgH    *float64 `json:"objectiu_sodi_mg_h"`
	ObjectiuFluidMlH   *float64 `json:"objectiu_fluid_ml_h"`
	ProductesPropostes *string  `json:"productes_propostes"`
	Instruccions       *string  `json:"instruccions"`
	DataRevisio        *string  `json:"data_revisio"`
}

type CreateNutricioRevisionRequest struct {
	ObjectiuChGH       *float64 `json:"objectiu_ch_g_h"`
	ObjectiuSodiMgH    *float64 `json:"objectiu_sodi_mg_h"`
	ObjectiuFluidMlH   *float64 `json:"objectiu_fluid_ml_h"`
	ProductesPropostes *string  `json:"productes_propostes"`
	Instruccions       *string  `json:"instruccions"`
	DataRevisio        *string  `json:"data_revisio"`
}

type CreateNutricioFeedbackRequest struct {
	DataSortida        string   `json:"data_sortida" binding:"required"`
	DuradaHores        *float64 `json:"durada_hores"`
	ProductesConsumits *string  `json:"productes_consumits"`
	ChGHReal           *float64 `json:"ch_g_h_real"`
	SodiMgHReal        *float64 `json:"sodi_mg_h_real"`
	FluidMlHReal       *float64 `json:"fluid_ml_h_real"`
	Sensacions         *string  `json:"sensacions"`
}

type UpdateNutricioPlanEstatRequest struct {
	Estat string `json:"estat" binding:"required"` // actiu, completat, arxivat
}
