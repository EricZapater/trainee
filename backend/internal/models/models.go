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
	Actiu        bool      `json:"actiu"`
	Idioma       string    `json:"idioma"`
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
	Actiu        bool      `json:"actiu"`
	Idioma       string    `json:"idioma,omitempty"`
}

type ReassignAtletaRequest struct {
	NewEntrenadorID string `json:"new_entrenador_id" binding:"required"`
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
	Estat        string    `json:"estat"`
	Gestionat    bool      `json:"gestionat"`
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
	Tipus        string    `json:"tipus"` // A, B, C
	Kms          *float64  `json:"kms"`
	Desnivell    *float64  `json:"desnivell"`
	Enllac       string    `json:"enllac"`
	TrackGpxPath *string   `json:"track_gpx_path"`
	Comentaris   *string   `json:"comentaris"`
	Registrat    bool      `json:"registrat"`
	Estat        string    `json:"estat"` // activa, descartada
	CreatedAt    time.Time `json:"created_at"`

	AtletaNom *string `json:"atleta_nom,omitempty"`
}

type CreateCompeticioRequest struct {
	Nom          string   `form:"nom" binding:"required"`
	Data         string   `form:"data" binding:"required"`
	Tipus        string   `form:"tipus" binding:"required,oneof=A B C"`
	Kms          *float64 `form:"kms"`
	Desnivell    *float64 `form:"desnivell"`
	Enllac       string   `form:"enllac" binding:"required"`
	Comentaris   *string  `form:"comentaris"`
	TrackGpxPath *string  `form:"-"` // Not bound from form, set manually
}

type UpdateCompeticioRequest struct {
	Nom          string   `form:"nom" binding:"required"`
	Data         string   `form:"data" binding:"required"`
	Tipus        string   `form:"tipus" binding:"required,oneof=A B C"`
	Kms          *float64 `form:"kms"`
	Desnivell    *float64 `form:"desnivell"`
	Enllac       string   `form:"enllac" binding:"required"`
	Comentaris   *string  `form:"comentaris"`
	Estat        string   `form:"estat" binding:"required,oneof=activa descartada"`
	TrackGpxPath *string  `form:"-"` // Optional to update file
}

type UpdateCompeticioTipusRequest struct {
	Tipus string `json:"tipus" binding:"required,oneof=A B C"`
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
	Idioma       string `json:"idioma" binding:"required,oneof=CAT ESP ENG"`
	EntrenadorID string `json:"entrenador_id"`
}

type UpdateIdiomaRequest struct {
	Idioma string `json:"idioma" binding:"required,oneof=CAT ESP ENG"`
}

type UpdateProfileRequest struct {
	Nom   string `json:"nom" binding:"required"`
	Email string `json:"email" binding:"required,email"`
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
// User Status History
// ============================================================

type UserStatusHistory struct {
	ID        string    `json:"id"`
	UsuariID  string    `json:"usuari_id"`
	Accio     string    `json:"accio"`
	ChangedBy *string   `json:"changed_by"`
	CreatedAt time.Time `json:"created_at"`
}

type ToggleUserStatusRequest struct {
	Actiu bool `json:"actiu"`
}

// ============================================================
// System Logs
// ============================================================

type SystemLog struct {
	ID        string    `json:"id"`
	Accio     string    `json:"accio"`
	Nivell    string    `json:"nivell"` // INFO, WARN, ERROR
	Missatge  string    `json:"missatge"`
	Detalls   *string   `json:"detalls"`
	CreatedAt time.Time `json:"created_at"`
}

// ============================================================
// System Settings (Cron configs)
// ============================================================

type CronConfig struct {
	Time    string `json:"time"`    // "HH:mm"
	Days    []int  `json:"days"`    // 0-6 (Sunday-Saturday)
	Enabled bool   `json:"enabled"`
}

type SystemSettings struct {
	WeekGenerator CronConfig `json:"week_generator"`
	ReminderCron  CronConfig `json:"reminder_cron"`
}

// ============================================================
// Submission Request / Response
// ============================================================

type SubmissionRequest struct {
	WeekStart    string             `json:"week_start" binding:"required"`
	NotesSetmana string             `json:"notes_setmana"`
	Estat        string             `json:"estat"`
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
	Estat        string      `json:"estat"`
	Slots        []SlotEntry `json:"slots"`
}

// ============================================================
// Entrenador Dashboard Response
// ============================================================

type AtletaSubmissionSummary struct {
	AtletaID     string      `json:"atleta_id"`
	SubmissionID *string     `json:"submission_id,omitempty"`
	Nom          string      `json:"nom"`
	Email        string      `json:"email"`
	HaRespost    bool        `json:"ha_respost"`
	Estat        string      `json:"estat"`
	NotesSetmana *string     `json:"notes_setmana"`
	Gestionat    bool        `json:"gestionat"`
	Slots        []SlotEntry `json:"slots"`
}

type ToggleSubmissionGestionatRequest struct {
	Gestionat bool `json:"gestionat"`
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

// ============================================================
// Forms / Onboarding Models
// ============================================================

type Form struct {
	ID           string    `json:"id"`
	Titol        string    `json:"titol"`
	Descripcio   *string   `json:"descripcio"`
	Actiu        bool      `json:"actiu"`
	CreatedAt    time.Time `json:"created_at"`
}

type FormQuestion struct {
	ID         string    `json:"id"`
	FormID     string    `json:"form_id"`
	Pregunta   string    `json:"pregunta"`
	Tipus      string    `json:"tipus"` // text, textarea, number, select, boolean
	Opcions    *string   `json:"opcions"` // JSON string for select options
	Obligatori bool      `json:"obligatori"`
	Ordre      int       `json:"ordre"`
	CreatedAt  time.Time `json:"created_at"`
}

type FormResponse struct {
	ID              string    `json:"id"`
	FormID          string    `json:"form_id"`
	NomCandidat     string    `json:"nom_candidat"`
	EmailCandidat   string    `json:"email_candidat"`
	TelefonCandidat *string   `json:"telefon_candidat"`
	Estat           string    `json:"estat"` // pendent, contactat, descartat, acceptat
	CreatedAt       time.Time `json:"created_at"`
}

type FormAnswer struct {
	ID         string    `json:"id"`
	ResponseID string    `json:"response_id"`
	QuestionID string    `json:"question_id"`
	Valor      *string   `json:"valor"`
	CreatedAt  time.Time `json:"created_at"`
}

// Request Models

type CreateFormRequest struct {
	Titol      string `json:"titol" binding:"required"`
	Descripcio string `json:"descripcio"`
	Actiu      bool   `json:"actiu"`
}

type UpdateFormRequest struct {
	Titol      string `json:"titol" binding:"required"`
	Descripcio string `json:"descripcio"`
	Actiu      bool   `json:"actiu"`
}

type CreateFormQuestionRequest struct {
	Pregunta   string  `json:"pregunta" binding:"required"`
	Tipus      string  `json:"tipus" binding:"required"`
	Opcions    *string `json:"opcions"`
	Obligatori bool    `json:"obligatori"`
	Ordre      int     `json:"ordre" binding:"required"`
}

type ReorderFormQuestionRequest struct {
	ID    string `json:"id" binding:"required"`
	Ordre int    `json:"ordre" binding:"required"`
}

type SubmitFormResponseRequest struct {
	NomCandidat     string                   `json:"nom_candidat" binding:"required"`
	EmailCandidat   string                   `json:"email_candidat" binding:"required,email"`
	TelefonCandidat string                   `json:"telefon_candidat"`
	Answers         []SubmitFormAnswerRequest `json:"answers"`
}

type SubmitFormAnswerRequest struct {
	QuestionID string  `json:"question_id" binding:"required"`
	Valor      *string `json:"valor"`
}

type UpdateFormResponseStatusRequest struct {
	Estat string `json:"estat" binding:"required,oneof=pendent contactat descartat acceptat"`
}

// Extended response structures

type FormWithQuestions struct {
	Form
	Questions []FormQuestion `json:"questions"`
	ResponsesCount int       `json:"responses_count"`
}

type FormResponseWithAnswers struct {
	FormResponse
	Answers []FormAnswer `json:"answers"`
}

// ============================================================
// Anuncis Models
// ============================================================

type Anunci struct {
	ID         string    `json:"id"`
	AutorID    string    `json:"autor_id"`
	AutorNom   string    `json:"autor_nom"`
	Titol      string    `json:"titol"`
	Descripcio string    `json:"descripcio"`
	Enllac     *string   `json:"enllac,omitempty"`
	Imatges    []string  `json:"imatges"`
	Tags       []string  `json:"tags"`
	Estat      string    `json:"estat"` // 'pendent', 'aprovat', 'rebutjat'
	Actiu      bool      `json:"actiu"`
	CreatedAt  time.Time `json:"created_at"`
}

type CreateAnunciRequest struct {
	Titol      string   `json:"titol" binding:"required"`
	Descripcio string   `json:"descripcio" binding:"required"`
	Enllac     *string  `json:"enllac"`
	Imatges    []string `json:"imatges"`
	Tags       []string `json:"tags"`
	Actiu      bool     `json:"actiu"`
}

type UpdateAnunciStatusRequest struct {
	Actiu bool `json:"actiu"`
}

type UpdateAnunciEstatRequest struct {
	Estat string `json:"estat" binding:"required,oneof=pendent aprovat rebutjat"`
}

// ============================================================
// Feedback Models
// ============================================================

type FeedbackTicket struct {
	ID            string    `json:"id"`
	InformadorID  string    `json:"informador_id"`
	InformadorNom string    `json:"informador_nom,omitempty"`
	Tipus         string    `json:"tipus"` // bug, petició
	Resum         string    `json:"resum"`
	Descripcio    string    `json:"descripcio"`
	ImatgePath    *string   `json:"imatge_path,omitempty"`
	Estat         string    `json:"estat"` // pendent, en curs, desplegat, descartat
	CreatedAt     time.Time `json:"created_at"`
}

type CreateFeedbackRequest struct {
	Tipus      string `form:"tipus" binding:"required"`
	Resum      string `form:"resum" binding:"required"`
	Descripcio string `form:"descripcio" binding:"required"`
}
