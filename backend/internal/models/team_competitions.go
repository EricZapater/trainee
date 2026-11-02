package models

import "time"

type TeamCompetitionParticipant struct {
	ID                string    `json:"id"`
	TeamCompetitionID string    `json:"team_competition_id"`
	UsuariID          string    `json:"usuari_id"`
	UsuariNom         string    `json:"usuari_nom"`
	Estat             string    `json:"estat"`      // 'inscrit', 'interessat', 'baixa'
	Objectiu          string    `json:"objectiu"`   // 'acabar', 'competir', 'entrenament', 'A', 'B', 'C'
	DisposaCotxe      bool      `json:"disposa_cotxe"`
	PlacesLliures     int       `json:"places_lliures"`
	Privacitat        string    `json:"privacitat"` // 'equip', 'privat'
	Comentari         *string   `json:"comentari,omitempty"`
	Kms               *float64  `json:"kms,omitempty"`
	CiutatOrigen      *string   `json:"ciutat_origen,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`

	// Frontend compatibility aliases
	AtletaID              string `json:"atleta_id"`
	Nom                   string `json:"nom"`
	Cognoms               string `json:"cognoms"`
	TipusObjectiu         string `json:"tipus_objectiu"`
	ComparteixTransport   bool   `json:"comparteix_transport"`
	CiutatOrigenTransport string `json:"ciutat_origen_transport,omitempty"`
	EsPrivada             bool   `json:"es_privada"`
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
	NotesEquip        *string                      `json:"notes_equip,omitempty"`
	CreatPer          *string                      `json:"creat_per,omitempty"`
	ParticipantsCount int                          `json:"participants_count"`
	TotalPlacesCotxe  int                          `json:"total_places_cotxe"`
	Participants      []TeamCompetitionParticipant `json:"participants"`
	UserParticipant   *TeamCompetitionParticipant  `json:"user_participant,omitempty"`
	CreatedAt         time.Time                    `json:"created_at"`
	UpdatedAt         time.Time                    `json:"updated_at"`

	// Frontend compatibility aliases
	Data          string                       `json:"data"`
	Poblacio      *string                      `json:"poblacio,omitempty"`
	Kms           *float64                     `json:"kms,omitempty"`
	Desnivell     *int                         `json:"desnivell,omitempty"`
	EnllacOficial *string                      `json:"enllac_oficial,omitempty"`
	GpxURL        *string                      `json:"gpx_url,omitempty"`
	TotalInscrits int                          `json:"total_inscrits"`
	TotalPublics  int                          `json:"total_publics"`
	Atletes       []TeamCompetitionParticipant `json:"atletes"`
}

type CreateTeamCompetitionRequest struct {
	Nom              string   `json:"nom" binding:"required"`
	DataInici        string   `json:"data_inici"`
	Data             string   `json:"data"` // alias
	DataFi           *string  `json:"data_fi"`
	Localitzacio     *string  `json:"localitzacio"`
	Poblacio         *string  `json:"poblacio"` // alias
	Modalitat        *string  `json:"modalitat"`
	DistanciaKm      *float64 `json:"distancia_km"`
	Kms              *float64 `json:"kms"` // alias
	DesnivellPositiu *int     `json:"desnivell_positiu"`
	Desnivell        *int     `json:"desnivell"` // alias
	WebOficial       *string  `json:"web_oficial"`
	EnllacOficial    *string  `json:"enllac_oficial"` // alias
	FitxerGpx        *string  `json:"fitxer_gpx"`
	NotesEquip       *string  `json:"notes_equip"`
}

type JoinTeamCompetitionRequest struct {
	Estat                 string   `json:"estat"`
	Objectiu              string   `json:"objectiu"`
	TipusObjectiu         string   `json:"tipus_objectiu"` // alias
	DisposaCotxe          *bool    `json:"disposa_cotxe"`
	ComparteixTransport   *bool    `json:"comparteix_transport"` // alias
	PlacesLliures         int      `json:"places_lliures"`
	Privacitat            string   `json:"privacitat"`
	VisibilitatEquip      *bool    `json:"visibilitat_equip"` // alias
	Comentari             *string  `json:"comentari"`
	Kms                   *float64 `json:"kms"`
	CiutatOrigen          *string  `json:"ciutat_origen"`
	CiutatOrigenTransport *string  `json:"ciutat_origen_transport"` // alias
}
