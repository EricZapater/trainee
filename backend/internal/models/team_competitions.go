package models

import "time"

type TeamCompetitionParticipant struct {
	ID                string    `json:"id"`
	TeamCompetitionID string    `json:"team_competition_id"`
	UsuariID          string    `json:"usuari_id"`
	UsuariNom         string    `json:"usuari_nom"`
	Estat             string    `json:"estat"`      // 'inscrit', 'interessat', 'baixa'
	Objectiu          string    `json:"objectiu"`   // 'acabar', 'competir', 'entrenament'
	DisposaCotxe      bool      `json:"disposa_cotxe"`
	PlacesLliures     int       `json:"places_lliures"`
	Privacitat        string    `json:"privacitat"` // 'equip', 'privat'
	Comentari         *string   `json:"comentari,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type TeamCompetition struct {
	ID                string                       `json:"id"`
	Nom               string                       `json:"nom"`
	DataInici         string                       `json:"data_inici"` // YYYY-MM-DD
	DataFi            *string                      `json:"data_fi,omitempty"`
	Localitzacio      *string                      `json:"localitzacio,omitempty"`
	Modalitat         *string                      `json:"modalitat,omitempty"`
	DistanciaKm       *float64                     `json:"distancia_km,omitempty"`
	DesnivellPositiu  *int                         `json:"desnivell_positiu,omitempty"`
	WebOficial        *string                      `json:"web_oficial,omitempty"`
	FitxerGpx         *string                      `json:"fitxer_gpx,omitempty"`
	CreatPer          *string                      `json:"creat_per,omitempty"`
	ParticipantsCount int                          `json:"participants_count"`
	TotalPlacesCotxe  int                          `json:"total_places_cotxe"`
	Participants      []TeamCompetitionParticipant `json:"participants"`
	UserParticipant   *TeamCompetitionParticipant  `json:"user_participant,omitempty"`
	CreatedAt         time.Time                    `json:"created_at"`
	UpdatedAt         time.Time                    `json:"updated_at"`
}

type CreateTeamCompetitionRequest struct {
	Nom              string   `json:"nom" binding:"required"`
	DataInici        string   `json:"data_inici" binding:"required"`
	DataFi           *string  `json:"data_fi"`
	Localitzacio     *string  `json:"localitzacio"`
	Modalitat        *string  `json:"modalitat"`
	DistanciaKm      *float64 `json:"distancia_km"`
	DesnivellPositiu *int     `json:"desnivell_positiu"`
	WebOficial       *string  `json:"web_oficial"`
	FitxerGpx        *string  `json:"fitxer_gpx"`
}

type JoinTeamCompetitionRequest struct {
	Estat         string  `json:"estat" binding:"required,oneof=inscrit interessat baixa"`
	Objectiu      string  `json:"objectiu" binding:"required,oneof=acabar competir entrenament"`
	DisposaCotxe  bool    `json:"disposa_cotxe"`
	PlacesLliures int     `json:"places_lliures" binding:"min=0"`
	Privacitat    string  `json:"privacitat" binding:"required,oneof=equip privat"`
	Comentari     *string `json:"comentari"`
}
