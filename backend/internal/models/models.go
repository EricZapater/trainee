package models

import "time"

// ============================================================
// Domain Models
// ============================================================

type Usuari struct {
	ID           string    `json:"id"`
	Nom          string    `json:"nom"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Rol          string    `json:"rol"`
	CreatedAt    time.Time `json:"created_at"`
}

type Entrenador struct {
	ID        string    `json:"id"`
	UsuariID  *string   `json:"usuari_id"`
	Nom       string    `json:"nom"`
	CreatedAt time.Time `json:"created_at"`
}

type Atleta struct {
	ID           string    `json:"id"`
	UsuariID     string    `json:"usuari_id"`
	EntrenadorID string    `json:"entrenador_id"`
	CreatedAt    time.Time `json:"created_at"`
	Nom          string    `json:"nom,omitempty"`
	Email        string    `json:"email,omitempty"`
}

type Activitat struct {
	ID        string    `json:"id"`
	Nom       string    `json:"nom"`
	Icona     string    `json:"icona"`
	Color     string    `json:"color"`
	Ordre     int       `json:"ordre"`
	Activa    bool      `json:"activa"`
	CreatedAt time.Time `json:"created_at"`
}

type ManagedWeek struct {
	ID           string    `json:"id"`
	EntrenadorID string    `json:"entrenador_id"`
	WeekStart    string    `json:"week_start"`
	Estat        string    `json:"estat"`
	CreatedAt    time.Time `json:"created_at"`
}

type WeeklySubmission struct {
	ID           string    `json:"id"`
	AtletaID     string    `json:"atleta_id"`
	WeekStart    string    `json:"week_start"`
	NotesSetmana *string   `json:"notes_setmana"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type SlotEntry struct {
	ID             string  `json:"id"`
	SubmissionID   string  `json:"submission_id"`
	Dia            int     `json:"dia"`
	Ordre          int     `json:"ordre"`
	ActivitatID    string  `json:"activitat_id"`
	CompeticioID   *string `json:"competicio_id"`
	TestID         *string `json:"test_id"`
	DuradaHores    float64 `json:"durada_hores"`
	Notes          *string `json:"notes"`
	ActivitatNom   string  `json:"activitat_nom,omitempty"`
	ActivitatIcona string  `json:"activitat_icona,omitempty"`
	ActivitatColor string  `json:"activitat_color,omitempty"`
}

// ============================================================
// Competicions Models
// ============================================================

type Competicio struct {
	ID           string    `json:"id"`
	AtletaID     string    `json:"atleta_id"`
	EntrenadorID string    `json:"entrenador_id"`
	Nom          string    `json:"nom"`
	Data         string    `json:"data"` // YYYY-MM-DD
	Kms          *float64  `json:"kms"`
	Desnivell    *float64  `json:"desnivell"`
	Enllac       string    `json:"enllac"`
	TrackGpxPath *string   `json:"track_gpx_path"`
	Comentaris   *string   `json:"comentaris"`
	Registrat    bool      `json:"registrat"`
	CreatedAt    time.Time `json:"created_at"`

	AtletaNom *string `json:"atleta_nom,omitempty"`
}

type CreateCompeticioRequest struct {
	Nom          string   `form:"nom" binding:"required"`
	Data         string   `form:"data" binding:"required"`
	Kms          *float64 `form:"kms"`
	Desnivell    *float64 `form:"desnivell"`
	Enllac       string   `form:"enllac" binding:"required"`
	Comentaris   *string  `form:"comentaris"`
	TrackGpxPath *string  `form:"-"` // Not bound from form, set manually
}

// ============================================================
// Tests Models
// ============================================================

type Test struct {
	ID               string    `json:"id"`
	AtletaID         string    `json:"atleta_id"`
	EntrenadorID     string    `json:"entrenador_id"`
	Titol            string    `json:"titol"`
	DataTest         string    `json:"data_test"` // YYYY-MM-DD
	Comentaris       *string   `json:"comentaris"`
	DataRecordatori  *string   `json:"data_recordatori"` // YYYY-MM-DD
	EstatRecordatori string    `json:"estat_recordatori"`
	Registrat        bool      `json:"registrat"`
	CreatedAt        time.Time `json:"created_at"`

	AtletaNom *string `json:"atleta_nom,omitempty"`
}

type CreateTestRequest struct {
	AtletaID        string  `json:"atleta_id" binding:"required"`
	Titol           string  `json:"titol" binding:"required"`
	DataTest        string  `json:"data_test" binding:"required"`
	Comentaris      *string `json:"comentaris"`
	DataRecordatori *string `json:"data_recordatori"`
}

type UpdateRecordatoriRequest struct {
	Estat string `json:"estat" binding:"required,oneof=resolt cancelat pendent"`
}

// ============================================================
// Auth Request / Response
// ============================================================

type RegisterRequest struct {
	Nom          string `json:"nom" binding:"required"`
	Email        string `json:"email" binding:"required,email"`
	Password     string `json:"password" binding:"required,min=6"`
	Rol          string `json:"rol" binding:"required,oneof=atleta entrenador"`
	EntrenadorID string `json:"entrenador_id"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token  string `json:"token"`
	Usuari Usuari `json:"usuari"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

// ============================================================
// Submission Request / Response
// ============================================================

type SubmissionRequest struct {
	WeekStart    string             `json:"week_start" binding:"required"`
	NotesSetmana string             `json:"notes_setmana"`
	Slots        []SlotEntryRequest `json:"slots"`
}

type SlotEntryRequest struct {
	Dia          int     `json:"dia"`
	Ordre        int     `json:"ordre"`
	ActivitatID  string  `json:"activitat_id" binding:"required,uuid"`
	CompeticioID *string `json:"competicio_id"`
	TestID       *string `json:"test_id"`
	DuradaHores  float64 `json:"durada_hores" binding:"required"`
	Notes        string  `json:"notes"`
}

type SubmissionResponse struct {
	SubmissionID string `json:"submission_id"`
	UpdatedAt    string `json:"updated_at"`
}

type MySubmissionResponse struct {
	WeekStart    string      `json:"week_start"`
	NotesSetmana *string     `json:"notes_setmana"`
	Slots        []SlotEntry `json:"slots"`
}

// ============================================================
// Entrenador Dashboard Response
// ============================================================

type AtletaSubmissionSummary struct {
	AtletaID  string      `json:"atleta_id"`
	Nom       string      `json:"nom"`
	Email     string      `json:"email"`
	HaRespost bool        `json:"ha_respost"`
	Slots     []SlotEntry `json:"slots"`
}

type EntrenadorSubmissionsResponse struct {
	WeekStart string                    `json:"week_start"`
	Atletes   []AtletaSubmissionSummary `json:"atletes"`
}

// ============================================================
// Weeks Management
// ============================================================

type CreateWeekRequest struct {
	WeekStart string `json:"week_start" binding:"required"`
}

type UpdateWeekRequest struct {
	Estat string `json:"estat" binding:"required,oneof=oberta tancada traspassada inactiva"`
}

type ManagedWeekWithCount struct {
	ManagedWeek
	NumAtletesRespost int `json:"num_atletes_respost"`
}

// ============================================================
// Activitats Management
// ============================================================

type CreateActivitatRequest struct {
	Nom   string `json:"nom" binding:"required"`
	Icona string `json:"icona" binding:"required"`
	Color string `json:"color" binding:"required"`
}

type UpdateActivitatRequest struct {
	Nom    *string `json:"nom"`
	Icona  *string `json:"icona"`
	Color  *string `json:"color"`
	Activa *bool   `json:"activa"`
}

type ReorderItem struct {
	ID    string `json:"id" binding:"required,uuid"`
	Ordre int    `json:"ordre" binding:"required"`
}

type InformeResumActivitat struct {
	ActivitatNom   string  `json:"activitat_nom"`
	ActivitatIcona string  `json:"activitat_icona"`
	ActivitatColor string  `json:"activitat_color"`
	TotalHores     float64 `json:"total_hores"`
}

type InformeDia struct {
	Data  string      `json:"data"` // YYYY-MM-DD
	Slots []SlotEntry `json:"slots"`
}

type InformeResponse struct {
	AtletaID        string                  `json:"atleta_id"`
	AtletaNom       string                  `json:"atleta_nom"`
	ResumActivitats []InformeResumActivitat `json:"resum_activitats"`
	DetallPerDies   []InformeDia            `json:"detall_per_dies"`
}

// ============================================================
// JWT Claims
// ============================================================

type JWTClaims struct {
	Sub string `json:"sub"`
	Rol string `json:"rol"`
	Nom string `json:"nom"`
}
