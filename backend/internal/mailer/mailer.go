package mailer

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"html/template"
	"log"
	"net/smtp"
	"os"

	_ "embed"
	"trainee-backend/internal/models"
)

//go:embed reminder_CAT.html
var reminderCATHTML string

//go:embed reminder_ESP.html
var reminderESPHTML string

//go:embed reminder_ENG.html
var reminderENGHTML string

//go:embed new_athlete_CAT.html
var newAthleteCATHTML string

//go:embed new_athlete_ESP.html
var newAthleteESPHTML string

//go:embed new_athlete_ENG.html
var newAthleteENGHTML string

//go:embed new_competition_CAT.html
var newCompetitionCATHTML string

//go:embed new_competition_ESP.html
var newCompetitionESPHTML string

//go:embed new_competition_ENG.html
var newCompetitionENGHTML string

//go:embed password_reset_CAT.html
var passwordResetCATHTML string

//go:embed password_reset_ESP.html
var passwordResetESPHTML string

//go:embed password_reset_ENG.html
var passwordResetENGHTML string

//go:embed feedback_reply_CAT.html
var feedbackReplyCATHTML string

//go:embed new_feedback_CAT.html
var newFeedbackCATHTML string

//go:embed new_feedback_ESP.html
var newFeedbackESPHTML string

//go:embed new_feedback_ENG.html
var newFeedbackENGHTML string

//go:embed feedback_reply_ESP.html
var feedbackReplyESPHTML string

//go:embed feedback_reply_ENG.html
var feedbackReplyENGHTML string

//go:embed new_form_response_CAT.html
var newFormResponseCATHTML string

//go:embed new_form_response_ESP.html
var newFormResponseESPHTML string

//go:embed new_form_response_ENG.html
var newFormResponseENGHTML string

//go:embed new_anunci_CAT.html
var newAnunciCATHTML string

//go:embed new_anunci_ESP.html
var newAnunciESPHTML string

//go:embed new_anunci_ENG.html
var newAnunciENGHTML string

//go:embed nutricio_feedback_CAT.html
var nutricioFeedbackCATHTML string

//go:embed nutricio_revision_CAT.html
var nutricioRevisionCATHTML string

type Mailer interface {
	SendReminder(toEmail, toName, magicToken, weekStart, idioma string) error
	SendNewAthleteNotification(entrenadorEmail, entrenadorNom, atletaNom, idioma string) error
	SendNewCompetitionNotification(entrenadorEmail, entrenadorNom, atletaNom, competicioNom, idioma string) error
	SendPasswordResetNotification(toEmail, toName, newPassword, idioma string) error
	SendFeedbackReplyNotification(toEmail, toName, resum, resposta, estat, idioma string, respostaImatges []string) error
	SendWeekPlannedNotification(toEmail, toName, weekStart, idioma string) error
	SendNewFeedbackNotification(toEmail, toName, informadorNom, tipus, resum, descripcio string, imatges []string, idioma string) error
	SendNewFormResponseNotification(toEmail, toName, formTitol, candidatNom, candidatEmail, idioma string) error
	SendNewAnunciNotification(toEmail, toName, autorNom, titol, descripcio, contacte, idioma string) error
	SendNutricioRevisionNotification(toEmail, toName, planTitol, versio, dataRevisio, instruccions, idioma string) error
	SendNutricioFeedbackNotification(toEmail, toName, atletaNom, planTitol, dataSortida, sensacions, idioma string) error
	SendCoachUnconciliatedSummary(coachEmail, coachNom, mesLabel string, items []models.CoachUnconciliatedInvoice, idioma string) error
	SendPolitePaymentReminder(atletaEmail, atletaNom, numFactura, concepte string, totalFactura, importPendent float64, dataVenciment, ibanEmpresa, nomComercial, idioma string) error
}

type LogMailer struct{}

func (m *LogMailer) SendReminder(toEmail, toName, magicToken, weekStart, idioma string) error {
	log.Printf("[MAILER LOG] Enviant recordatori a: %s (%s) per setmana %s. Token: %s. Idioma: %s\n", toName, toEmail, weekStart, magicToken, idioma)
	return nil
}

func (m *LogMailer) SendNewAthleteNotification(entrenadorEmail, entrenadorNom, atletaNom, idioma string) error {
	log.Printf("[MAILER LOG] Enviant notificació de nou atleta (%s) a: %s (%s). Idioma: %s\n", atletaNom, entrenadorNom, entrenadorEmail, idioma)
	return nil
}

func (m *LogMailer) SendNewCompetitionNotification(entrenadorEmail, entrenadorNom, atletaNom, competicioNom, idioma string) error {
	log.Printf("[MAILER LOG] Enviant notificació de nova competició (%s de %s) a: %s (%s). Idioma: %s\n", competicioNom, atletaNom, entrenadorNom, entrenadorEmail, idioma)
	return nil
}

func (m *LogMailer) SendPasswordResetNotification(toEmail, toName, newPassword, idioma string) error {
	log.Printf("[MAILER LOG] Enviant nova contrasenya a: %s (%s). Idioma: %s\n", toName, toEmail, idioma)
	return nil
}

func (m *LogMailer) SendFeedbackReplyNotification(toEmail, toName, resum, resposta, estat, idioma string, respostaImatges []string) error {
	log.Printf("[MAILER LOG] Enviant resposta feedback a: %s (%s). Ticket: %s. Nou estat: %s. Imatges: %v\n", toName, toEmail, resum, estat, respostaImatges)
	return nil
}

func (m *LogMailer) SendNewFeedbackNotification(toEmail, toName, informadorNom, tipus, resum, descripcio string, imatges []string, idioma string) error {
	log.Printf("[MAILER LOG] Enviant notificació nou feedback a: %s (%s). Informador: %s. Resum: %s. Imatges: %v. Idioma: %s\n", toName, toEmail, informadorNom, resum, imatges, idioma)
	return nil
}

func (m *LogMailer) SendWeekPlannedNotification(toEmail, toName, weekStart, idioma string) error {
	log.Printf("[MAILER LOG] Enviant notificació planificació a: %s (%s). Setmana: %s. Idioma: %s\n", toName, toEmail, weekStart, idioma)
	return nil
}

func (m *LogMailer) SendNewFormResponseNotification(toEmail, toName, formTitol, candidatNom, candidatEmail, idioma string) error {
	log.Printf("[LOG-MAILER] Sending form response notification to %s for form %s from %s", toEmail, formTitol, candidatNom)
	return nil
}

func (m *LogMailer) SendNewAnunciNotification(toEmail, toName, autorNom, titol, descripcio, contacte, idioma string) error {
	log.Printf("[LOG-MAILER] Sending new anunci notification to %s from %s: %s (contacte: %s)", toEmail, autorNom, titol, contacte)
	return nil
}

func (m *LogMailer) SendNutricioRevisionNotification(toEmail, toName, planTitol, versio, dataRevisio, instruccions, idioma string) error {
	log.Printf("[LOG-MAILER] Sending nutricio revision notification to %s for plan %s (v%s)", toEmail, planTitol, versio)
	return nil
}

func (m *LogMailer) SendNutricioFeedbackNotification(toEmail, toName, atletaNom, planTitol, dataSortida, sensacions, idioma string) error {
	log.Printf("[LOG-MAILER] Sending nutricio feedback notification to %s from %s on plan %s", toEmail, atletaNom, planTitol)
	return nil
}

func (m *LogMailer) SendCoachUnconciliatedSummary(coachEmail, coachNom, mesLabel string, items []models.CoachUnconciliatedInvoice, idioma string) error {
	log.Printf("[LOG-MAILER] Avis dia limit a entrenador %s (%s) pel mes %s amb %d atletes pendents de conciliar", coachNom, coachEmail, mesLabel, len(items))
	return nil
}

func (m *LogMailer) SendPolitePaymentReminder(atletaEmail, atletaNom, numFactura, concepte string, totalFactura, importPendent float64, dataVenciment, ibanEmpresa, nomComercial, idioma string) error {
	log.Printf("[LOG-MAILER] Recordatori amable (dia limit+1) a atleta %s (%s) per factura %s (%s) pendent %.2f € [idioma=%s]", atletaNom, atletaEmail, numFactura, concepte, importPendent, idioma)
	return nil
}

type SMTPMailer struct {
	Host     string
	Port     string
	Username string
	Password string
}

type templateData struct {
	Nom     string
	AppURL  string
	LogoURL string
}

type newAthleteData struct {
	EntrenadorNom string
	AtletaNom     string
	AppURL        string
}

type newCompetitionData struct {
	EntrenadorNom string
	AtletaNom     string
	CompeticioNom string
	AppURL        string
}

type passwordResetData struct {
	Nom         string
	NewPassword string
	AppURL      string
	LogoURL     string
}

type feedbackReplyData struct {
	Nom             string
	Resum           string
	Resposta        string
	Estat           string
	RespostaImatges []string
	LogoURL         string
}

type newFeedbackData struct {
	Nom           string
	InformadorNom string
	Tipus         string
	Resum         string
	Descripcio    string
	Imatges       []string
	LogoURL       string
}

type weekPlannedData struct {
	Nom       string
	WeekStart string
	AppURL    string
	LogoURL   string
}

// --- Week Planned Templates ---
const weekPlannedCATHTML = `
<!DOCTYPE html>
<html>
<head><style>body { font-family: sans-serif; color: #333; line-height: 1.6; } .btn { display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }</style></head>
<body>
    <h2>Hola {{.Nom}},</h2>
    <p>El teu entrenador acaba de planificar els entrenaments per la setmana del <strong>{{.WeekStart}}</strong>.</p>
    <p>Ja pots entrar a TrainingPeaks per veure els detalls i preparar-te!</p>
    <a href="https://www.trainingpeaks.com" class="btn">Anar a TrainingPeaks</a>
    <p>Salutacions,<br>L'equip d'entrenador trail</p>
    {{if .LogoURL}}<div style="margin-top:30px;"><img src="{{.LogoURL}}" alt="Logo" style="height:40px;"/></div>{{end}}
</body>
</html>
`

const weekPlannedESPHTML = `
<!DOCTYPE html>
<html>
<head><style>body { font-family: sans-serif; color: #333; line-height: 1.6; } .btn { display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }</style></head>
<body>
    <h2>Hola {{.Nom}},</h2>
    <p>Tu entrenador acaba de planificar los entrenamientos para la semana del <strong>{{.WeekStart}}</strong>.</p>
    <p>¡Ya puedes entrar a TrainingPeaks para ver los detalles y prepararte!</p>
    <a href="https://www.trainingpeaks.com" class="btn">Ir a TrainingPeaks</a>
    <p>Saludos,<br>El equipo de entrenador trail</p>
    {{if .LogoURL}}<div style="margin-top:30px;"><img src="{{.LogoURL}}" alt="Logo" style="height:40px;"/></div>{{end}}
</body>
</html>
`

const weekPlannedENGHTML = `
<!DOCTYPE html>
<html>
<head><style>body { font-family: sans-serif; color: #333; line-height: 1.6; } .btn { display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }</style></head>
<body>
    <h2>Hello {{.Nom}},</h2>
    <p>Your coach just planned your training for the week of <strong>{{.WeekStart}}</strong>.</p>
    <p>You can now open TrainingPeaks to see the details and get ready!</p>
    <a href="https://www.trainingpeaks.com" class="btn">Go to TrainingPeaks</a>
    <p>Best regards,<br>The Entrenador Trail team</p>
    {{if .LogoURL}}<div style="margin-top:30px;"><img src="{{.LogoURL}}" alt="Logo" style="height:40px;"/></div>{{end}}
</body>
</html>
`

func (m *SMTPMailer) sendRawEmail(toEmail, subject, bodyHTML string) error {
	var message bytes.Buffer
	message.WriteString(fmt.Sprintf("From: \"Entrenador Trail\" <%s>\r\n", m.Username))
	message.WriteString(fmt.Sprintf("To: %s\r\n", toEmail))
	message.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	message.WriteString("MIME-Version: 1.0\r\n")
	message.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	message.WriteString("\r\n")
	message.WriteString(bodyHTML)

	auth := smtp.PlainAuth("", m.Username, m.Password, m.Host)
	addr := fmt.Sprintf("%s:%s", m.Host, m.Port)

	tlsconfig := &tls.Config{
		InsecureSkipVerify: true,
		ServerName:         m.Host,
	}

	conn, err := tls.Dial("tcp", addr, tlsconfig)
	if err != nil {
		// Fallback to non-TLS / STARTTLS
		err = smtp.SendMail(addr, auth, m.Username, []string{toEmail}, message.Bytes())
		if err != nil {
			log.Printf("[SMTP ERROR] Error enviant correu a %s: %v", toEmail, err)
			return err
		}
		log.Printf("[MAILER SMTP] Correu enviat a %s", toEmail)
		return nil
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, m.Host)
	if err != nil {
		return err
	}

	if err = client.Auth(auth); err != nil {
		return err
	}

	if err = client.Mail(m.Username); err != nil {
		return err
	}

	if err = client.Rcpt(toEmail); err != nil {
		return err
	}

	w, err := client.Data()
	if err != nil {
		return err
	}

	_, err = w.Write(message.Bytes())
	if err != nil {
		return err
	}

	err = w.Close()
	if err != nil {
		return err
	}

	client.Quit()

	log.Printf("[MAILER SMTP] Correu enviat a %s", toEmail)
	return nil
}

func (m *SMTPMailer) SendReminder(toEmail, toName, magicToken, weekStart, idioma string) error {
	var subject string
	var tmplHTML string

	switch idioma {
	case "ENG":
		subject = "Reminder: Plan your next week"
		tmplHTML = reminderENGHTML
	case "CAT":
		subject = "Recordatori: Planifica la teva propera setmana"
		tmplHTML = reminderCATHTML
	default: // ESP is default
		subject = "Recordatorio: Planifica tu próxima semana"
		tmplHTML = reminderESPHTML
	}
	
	tmpl, err := template.New("reminder").Parse(tmplHTML)
	if err != nil {
		return fmt.Errorf("error parsejant la plantilla: %v", err)
	}

	appURL := os.Getenv("FRONTEND_URL")
	if appURL == "" {
		appURL = "https://trainee.entrenadortrail.es" // Fallback
	}
	
	// Create the magic link
	magicLink := fmt.Sprintf("%s/magic-login?token=%s&week=%s", appURL, magicToken, weekStart)
	
	logoURL := os.Getenv("MAILER_LOGO_URL")
	if logoURL == "" {
		logoURL = "https://trainee.entrenadortrail.es/logo.png"
	}

	data := templateData{
		Nom:     toName,
		AppURL:  magicLink,
		LogoURL: logoURL,
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return fmt.Errorf("error executant la plantilla: %v", err)
	}

	return m.sendRawEmail(toEmail, subject, body.String())
}

func (m *SMTPMailer) SendNewAthleteNotification(entrenadorEmail, entrenadorNom, atletaNom, idioma string) error {
	var subject string
	var tmplHTML string

	switch idioma {
	case "ENG":
		subject = fmt.Sprintf("New athlete registered: %s", atletaNom)
		tmplHTML = newAthleteENGHTML
	case "CAT":
		subject = fmt.Sprintf("Nou atleta registrat: %s", atletaNom)
		tmplHTML = newAthleteCATHTML
	default:
		subject = fmt.Sprintf("Nuevo atleta registrado: %s", atletaNom)
		tmplHTML = newAthleteESPHTML
	}

	tmpl, err := template.New("new_athlete").Parse(tmplHTML)
	if err != nil {
		return fmt.Errorf("error parsejant la plantilla: %v", err)
	}

	appURL := os.Getenv("FRONTEND_URL")
	if appURL == "" {
		appURL = "https://trainee.entrenadortrail.es"
	}

	data := newAthleteData{
		EntrenadorNom: entrenadorNom,
		AtletaNom:     atletaNom,
		AppURL:        appURL,
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return fmt.Errorf("error executant la plantilla: %v", err)
	}

	return m.sendRawEmail(entrenadorEmail, subject, body.String())
}

func (m *SMTPMailer) SendNewCompetitionNotification(entrenadorEmail, entrenadorNom, atletaNom, competicioNom, idioma string) error {
	var subject string
	var tmplHTML string

	switch idioma {
	case "ENG":
		subject = fmt.Sprintf("New competition added by %s: %s", atletaNom, competicioNom)
		tmplHTML = newCompetitionENGHTML
	case "CAT":
		subject = fmt.Sprintf("Nova competició afegida per %s: %s", atletaNom, competicioNom)
		tmplHTML = newCompetitionCATHTML
	default:
		subject = fmt.Sprintf("Nueva competición añadida por %s: %s", atletaNom, competicioNom)
		tmplHTML = newCompetitionESPHTML
	}

	tmpl, err := template.New("new_competition").Parse(tmplHTML)
	if err != nil {
		return fmt.Errorf("error parsejant la plantilla: %v", err)
	}

	appURL := os.Getenv("FRONTEND_URL")
	if appURL == "" {
		appURL = "https://trainee.entrenadortrail.es"
	}

	data := newCompetitionData{
		EntrenadorNom: entrenadorNom,
		AtletaNom:     atletaNom,
		CompeticioNom: competicioNom,
		AppURL:        appURL,
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return fmt.Errorf("error executant la plantilla: %v", err)
	}

	return m.sendRawEmail(entrenadorEmail, subject, body.String())
}

func (m *SMTPMailer) SendPasswordResetNotification(toEmail, toName, newPassword, idioma string) error {
	var subject string
	var tmplHTML string

	switch idioma {
	case "ENG":
		subject = "Your Trainee password has been reset"
		tmplHTML = passwordResetENGHTML
	case "CAT":
		subject = "La teva contrasenya de Trainee ha estat restablerta"
		tmplHTML = passwordResetCATHTML
	default: // ESP is default
		subject = "Tu contraseña de Trainee ha sido restablecida"
		tmplHTML = passwordResetESPHTML
	}

	tmpl, err := template.New("password_reset").Parse(tmplHTML)
	if err != nil {
		return fmt.Errorf("error parsejant la plantilla: %v", err)
	}

	appURL := os.Getenv("FRONTEND_URL")
	if appURL == "" {
		appURL = "https://trainee.entrenadortrail.es" // Fallback
	}

	logoURL := os.Getenv("MAILER_LOGO_URL")
	if logoURL == "" {
		logoURL = "https://trainee.entrenadortrail.es/logo.png"
	}

	data := passwordResetData{
		Nom:         toName,
		NewPassword: newPassword,
		AppURL:      appURL + "/login",
		LogoURL:     logoURL,
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return fmt.Errorf("error executant la plantilla: %v", err)
	}

	return m.sendRawEmail(toEmail, subject, body.String())
}

func (m *SMTPMailer) SendFeedbackReplyNotification(toEmail, toName, resum, resposta, estat, idioma string, respostaImatges []string) error {
	var subject string
	var tmplHTML string

	switch idioma {
	case "ENG":
		subject = "Update on your feedback ticket: " + resum
		tmplHTML = feedbackReplyENGHTML
	case "CAT":
		subject = "Actualització del teu tiquet de feedback: " + resum
		tmplHTML = feedbackReplyCATHTML
	default:
		subject = "Actualización de tu ticket de feedback: " + resum
		tmplHTML = feedbackReplyESPHTML
	}

	tmpl, err := template.New("feedback_reply").Parse(tmplHTML)
	if err != nil {
		return fmt.Errorf("error parsejant la plantilla: %v", err)
	}

	logoURL := os.Getenv("MAILER_LOGO_URL")
	if logoURL == "" {
		logoURL = "https://trainee.entrenadortrail.es/logo.png"
	}

	data := feedbackReplyData{
		Nom:             toName,
		Resum:           resum,
		Resposta:        resposta,
		Estat:           estat,
		RespostaImatges: respostaImatges,
		LogoURL:         logoURL,
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return fmt.Errorf("error executant la plantilla: %v", err)
	}

	return m.sendRawEmail(toEmail, subject, body.String())
}

func (m *SMTPMailer) SendWeekPlannedNotification(toEmail, toName, weekStart, idioma string) error {
	var subject string
	var tmplHTML string

	switch idioma {
	case "ENG":
		subject = "Your training week is planned!"
		tmplHTML = weekPlannedENGHTML
	case "CAT":
		subject = "La teva setmana d'entrenament ja està planificada!"
		tmplHTML = weekPlannedCATHTML
	default: // ESP
		subject = "¡Tu semana de entrenamiento ya está planificada!"
		tmplHTML = weekPlannedESPHTML
	}
	
	tmpl, err := template.New("week_planned").Parse(tmplHTML)
	if err != nil {
		return fmt.Errorf("error parsejant la plantilla: %v", err)
	}

	appURL := os.Getenv("FRONTEND_URL")
	if appURL == "" {
		appURL = "https://trainee.entrenadortrail.es" // Fallback
	}
	
	logoURL := os.Getenv("MAILER_LOGO_URL")
	if logoURL == "" {
		logoURL = "https://trainee.entrenadortrail.es/logo.png"
	}

	data := weekPlannedData{
		Nom:       toName,
		WeekStart: weekStart,
		AppURL:    appURL,
		LogoURL:   logoURL,
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return fmt.Errorf("error executant la plantilla: %v", err)
	}

	return m.sendRawEmail(toEmail, subject, body.String())
}

func (m *SMTPMailer) SendNewFeedbackNotification(toEmail, toName, informadorNom, tipus, resum, descripcio string, imatges []string, idioma string) error {
	var subject string
	var tmplHTML string

	switch idioma {
	case "ENG":
		subject = "New feedback ticket: " + resum
		tmplHTML = newFeedbackENGHTML
	case "CAT":
		subject = "Nou tiquet de feedback: " + resum
		tmplHTML = newFeedbackCATHTML
	default:
		subject = "Nuevo ticket de feedback: " + resum
		tmplHTML = newFeedbackESPHTML
	}

	tmpl, err := template.New("new_feedback").Parse(tmplHTML)
	if err != nil {
		return fmt.Errorf("error parsejant la plantilla: %v", err)
	}

	logoURL := os.Getenv("MAILER_LOGO_URL")
	if logoURL == "" {
		logoURL = "https://trainee.entrenadortrail.es/logo.png"
	}

	data := newFeedbackData{
		Nom:           toName,
		InformadorNom: informadorNom,
		Tipus:         tipus,
		Resum:         resum,
		Descripcio:    descripcio,
		Imatges:       imatges,
		LogoURL:       logoURL,
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return fmt.Errorf("error executant la plantilla: %v", err)
	}

	return m.sendRawEmail(toEmail, subject, body.String())
}

func (m *SMTPMailer) SendNewFormResponseNotification(toEmail, toName, formTitol, candidatNom, candidatEmail, idioma string) error {
	var subject string
	var tmplHTML string

	switch idioma {
	case "ca":
		subject = fmt.Sprintf("Nova resposta al formulari: %s", formTitol)
		tmplHTML = newFormResponseCATHTML
	case "en":
		subject = fmt.Sprintf("New form response: %s", formTitol)
		tmplHTML = newFormResponseENGHTML
	default:
		subject = fmt.Sprintf("Nueva respuesta en el formulario: %s", formTitol)
		tmplHTML = newFormResponseESPHTML
	}

	tmpl, err := template.New("new_form_response").Parse(tmplHTML)
	if err != nil {
		return fmt.Errorf("error parsejant la plantilla: %v", err)
	}

	logoURL := os.Getenv("MAILER_LOGO_URL")
	if logoURL == "" {
		logoURL = "https://trainee.entrenadortrail.es/logo.png"
	}

	data := struct {
		Nom           string
		FormTitol     string
		CandidatNom   string
		CandidatEmail string
		LogoURL       string
	}{
		Nom:           toName,
		FormTitol:     formTitol,
		CandidatNom:   candidatNom,
		CandidatEmail: candidatEmail,
		LogoURL:       logoURL,
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return fmt.Errorf("error executant la plantilla: %v", err)
	}

	return m.sendRawEmail(toEmail, subject, body.String())
}

func (m *SMTPMailer) SendNewAnunciNotification(toEmail, toName, autorNom, titol, descripcio, contacte, idioma string) error {
	var subject string
	var tmplHTML string

	switch idioma {
	case "ca", "CAT":
		subject = fmt.Sprintf("Nou anunci al tauler: %s", titol)
		tmplHTML = newAnunciCATHTML
	case "en", "ENG":
		subject = fmt.Sprintf("New announcement: %s", titol)
		tmplHTML = newAnunciENGHTML
	default:
		subject = fmt.Sprintf("Nuevo anuncio en el tablón: %s", titol)
		tmplHTML = newAnunciESPHTML
	}

	tmpl, err := template.New("new_anunci").Parse(tmplHTML)
	if err != nil {
		return fmt.Errorf("error parsejant la plantilla: %v", err)
	}

	appURL := os.Getenv("FRONTEND_URL")
	if appURL == "" {
		appURL = "https://trainee.entrenadortrail.es"
	}

	data := struct {
		Nom           string
		EntrenadorNom string
		AutorNom      string
		Titol         string
		Descripcio    string
		Contacte      string
		AppURL        string
	}{
		Nom:           toName,
		EntrenadorNom: toName,
		AutorNom:      autorNom,
		Titol:         titol,
		Descripcio:    descripcio,
		Contacte:      contacte,
		AppURL:        appURL,
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return fmt.Errorf("error executant la plantilla: %v", err)
	}

	return m.sendRawEmail(toEmail, subject, body.String())
}

func (m *SMTPMailer) SendNutricioRevisionNotification(toEmail, toName, planTitol, versio, dataRevisio, instruccions, idioma string) error {
	subject := fmt.Sprintf("Actualització Pla Nutricional (v%s): %s", versio, planTitol)
	tmplHTML := nutricioRevisionCATHTML

	tmpl, err := template.New("nutricio_revision").Parse(tmplHTML)
	if err != nil {
		return fmt.Errorf("error parsejant la plantilla: %v", err)
	}

	appURL := os.Getenv("FRONTEND_URL")
	if appURL == "" {
		appURL = "https://trainee.entrenadortrail.es"
	}

	data := struct {
		Nom          string
		PlanTitol    string
		Versio       string
		DataRevisio  string
		Instruccions string
		AppURL       string
	}{
		Nom:          toName,
		PlanTitol:    planTitol,
		Versio:       versio,
		DataRevisio:  dataRevisio,
		Instruccions: instruccions,
		AppURL:       appURL,
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return fmt.Errorf("error executant la plantilla: %v", err)
	}

	return m.sendRawEmail(toEmail, subject, body.String())
}

func (m *SMTPMailer) SendNutricioFeedbackNotification(toEmail, toName, atletaNom, planTitol, dataSortida, sensacions, idioma string) error {
	subject := fmt.Sprintf("Nou registre nutricional de %s: %s", atletaNom, planTitol)
	tmplHTML := nutricioFeedbackCATHTML

	tmpl, err := template.New("nutricio_feedback").Parse(tmplHTML)
	if err != nil {
		return fmt.Errorf("error parsejant la plantilla: %v", err)
	}

	appURL := os.Getenv("FRONTEND_URL")
	if appURL == "" {
		appURL = "https://trainee.entrenadortrail.es"
	}

	data := struct {
		EntrenadorNom string
		AtletaNom     string
		PlanTitol     string
		DataSortida   string
		Sensacions    string
		AppURL        string
	}{
		EntrenadorNom: toName,
		AtletaNom:     atletaNom,
		PlanTitol:     planTitol,
		DataSortida:   dataSortida,
		Sensacions:    sensacions,
		AppURL:        appURL,
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return fmt.Errorf("error executant la plantilla: %v", err)
	}

	return m.sendRawEmail(toEmail, subject, body.String())
}

const coachUnconciliatedHTML = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6; max-width: 680px; margin: 0 auto; padding: 20px; }
  .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
  th { background: #f8fafc; text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; color: #64748b; text-transform: uppercase; font-size: 11px; }
  td { padding: 10px; border-bottom: 1px solid #f1f5f9; }
  .badge { background: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
</style>
</head>
<body>
  <div class="card">
    <span class="badge">Avís Dia Límit de Pagament · {{.MesLabel}}</span>
    <h2 style="margin-top: 12px; color: #0f172a;">Hola {{.CoachNom}},</h2>
    <p>Avui és el dia límit mensual de pagament configurat a l'empresa. T'enviem aquest resum informatiu amb els teus atletes que, a hores d'ara, encara consten com a <strong>pendents de conciliar</strong> per part d'Administració:</p>
    <table>
      <thead>
        <tr>
          <th>Atleta</th>
          <th>Factura</th>
          <th>Concepte</th>
          <th style="text-align:right;">Total</th>
          <th style="text-align:right;">Pendent</th>
        </tr>
      </thead>
      <tbody>
        {{range .Items}}
        <tr>
          <td><strong>{{.AtletaNom}}</strong></td>
          <td>{{.NumeroFactura}}</td>
          <td>{{.Concepte}}</td>
          <td style="text-align:right;">{{printf "%.2f" .TotalFactura}} €</td>
          <td style="text-align:right; color:#b45309; font-weight:700;">{{printf "%.2f" .ImportPendent}} €</td>
        </tr>
        {{end}}
      </tbody>
    </table>
    <p style="margin-top: 18px; font-size: 13px; color: #475569;">
      ℹ️ <strong>Nota:</strong> Qui marca la conciliació a l'aplicació és exclusivament Administració. Si tens constància d'algun canvi o acord amb algun d'aquests atletes, comenta-ho amb Administració avui mateix, ja que demà s'enviarà automàticament un recordatori amable als atletes que continuïn pendents.
    </p>
    <p style="margin-top: 24px; color: #64748b; font-size: 12px;">Salutacions,<br>Administració · TrainEE</p>
  </div>
</body>
</html>
`

const politePaymentCATHTML = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 20px; }
  .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; }
  .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 14px; }
  .btn { display: inline-block; padding: 11px 22px; background-color: #059669; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; margin-top: 8px; }
</style>
</head>
<body>
  <div class="card">
    <h2 style="color: #0f172a; margin-top: 0;">Hola {{.AtletaNom}}! 👋</h2>
    <p>Esperem que estiguis tenint una molt bona setmana i que els entrenaments vagin genial!</p>
    <p>T'escrivim amb tota la confiança només per fer-te un petit recordatori amable, ja que revisant l'administració hem vist que ens consta pendent de conciliar la següent factura:</p>
    <div class="box">
      <div><strong>Factura:</strong> {{.NumFactura}}</div>
      <div><strong>Concepte:</strong> {{.Concepte}}</div>
      <div><strong>Import total:</strong> {{printf "%.2f" .TotalFactura}} €</div>
      <div style="margin-top: 6px; color: #047857; font-size: 15px;"><strong>Import pendent: {{printf "%.2f" .ImportPendent}} €</strong></div>
      {{if .IbanEmpresa}}<div style="margin-top: 8px; font-size: 13px; color: #475569;"><strong>IBAN per a transferència:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">{{.IbanEmpresa}}</code></div>{{end}}
    </div>
    <p style="font-size: 14px; color: #475569;">
      🙏 <em>Si ja has fet el pagament o la transferència en les últimes hores, moltíssimes gràcies i disculpa les molèsties! De vegades els moviments bancaris triguen un parell de dies a reflectir-se, així que pots ignorar completament aquest missatge.</em>
    </p>
    <p>Pots consultar o descarregar la factura en qualsevol moment des del teu espai personal:</p>
    <a href="{{.AppURL}}/factures" class="btn">Veure les meves factures</a>
    <p style="margin-top: 28px; color: #64748b; font-size: 13px;">Qualsevol dubte o consulta, som a la teva disposició.<br>Moltes gràcies per la teva confiança i bons entrenaments!<br><strong>L'equip de {{.NomComercial}}</strong></p>
  </div>
</body>
</html>
`

const politePaymentESPHTML = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 20px; }
  .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; }
  .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 14px; }
  .btn { display: inline-block; padding: 11px 22px; background-color: #059669; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; margin-top: 8px; }
</style>
</head>
<body>
  <div class="card">
    <h2 style="color: #0f172a; margin-top: 0;">¡Hola {{.AtletaNom}}! 👋</h2>
    <p>¡Esperamos que estés teniendo una gran semana y que los entrenamientos vayan genial!</p>
    <p>Te escribimos con total confianza únicamente para hacerte un pequeño recordatorio amable, ya que revisando la administración hemos visto que nos consta pendiente de conciliar la siguiente factura:</p>
    <div class="box">
      <div><strong>Factura:</strong> {{.NumFactura}}</div>
      <div><strong>Concepto:</strong> {{.Concepte}}</div>
      <div><strong>Importe total:</strong> {{printf "%.2f" .TotalFactura}} €</div>
      <div style="margin-top: 6px; color: #047857; font-size: 15px;"><strong>Importe pendiente: {{printf "%.2f" .ImportPendent}} €</strong></div>
      {{if .IbanEmpresa}}<div style="margin-top: 8px; font-size: 13px; color: #475569;"><strong>IBAN para transferencia:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">{{.IbanEmpresa}}</code></div>{{end}}
    </div>
    <p style="font-size: 14px; color: #475569;">
      🙏 <em>Si ya has realizado el pago o la transferencia en las últimas horas, ¡muchísimas gracias y disculpa las molestias! A veces las transferencias bancarias tardan un par de días en reflejarse, así que puedes ignorar por completo este mensaje.</em>
    </p>
    <p>Puedes consultar o descargar tu factura en cualquier momento desde tu espacio personal:</p>
    <a href="{{.AppURL}}/factures" class="btn">Ver mis facturas</a>
    <p style="margin-top: 28px; color: #64748b; font-size: 13px;">Para cualquier duda o consulta, estamos a tu entera disposición.<br>¡Muchas gracias por tu confianza y buenos entrenos!<br><strong>El equipo de {{.NomComercial}}</strong></p>
  </div>
</body>
</html>
`

const politePaymentENGHTML = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 20px; }
  .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; }
  .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 14px; }
  .btn { display: inline-block; padding: 11px 22px; background-color: #059669; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; margin-top: 8px; }
</style>
</head>
<body>
  <div class="card">
    <h2 style="color: #0f172a; margin-top: 0;">Hi {{.AtletaNom}}! 👋</h2>
    <p>We hope you are having a great week and that your training is going smoothly!</p>
    <p>We are reaching out with a very gentle and friendly reminder, as our records show the following invoice is still awaiting reconciliation:</p>
    <div class="box">
      <div><strong>Invoice:</strong> {{.NumFactura}}</div>
      <div><strong>Description:</strong> {{.Concepte}}</div>
      <div><strong>Total amount:</strong> {{printf "%.2f" .TotalFactura}} €</div>
      <div style="margin-top: 6px; color: #047857; font-size: 15px;"><strong>Remaining balance: {{printf "%.2f" .ImportPendent}} €</strong></div>
      {{if .IbanEmpresa}}<div style="margin-top: 8px; font-size: 13px; color: #475569;"><strong>IBAN for bank transfer:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">{{.IbanEmpresa}}</code></div>{{end}}
    </div>
    <p style="font-size: 14px; color: #475569;">
      🙏 <em>If you have already sent the payment in the last couple of days, thank you very much and please disregard this message while the bank transfer settles!</em>
    </p>
    <p>You can view or download your invoice anytime from your athlete portal:</p>
    <a href="{{.AppURL}}/factures" class="btn">View my invoices</a>
    <p style="margin-top: 28px; color: #64748b; font-size: 13px;">Please let us know if you have any questions at all.<br>Thank you so much for your trust and happy training!<br><strong>The {{.NomComercial}} Team</strong></p>
  </div>
</body>
</html>
`

func RenderCoachUnconciliatedEmail(coachNom, mesLabel string, items []models.CoachUnconciliatedInvoice, idioma string) (string, string, error) {
	subject := fmt.Sprintf("Resum d'atletes pendents de conciliar (%s)", mesLabel)
	tmpl, err := template.New("coach_unconciliated").Parse(coachUnconciliatedHTML)
	if err != nil {
		return "", "", err
	}
	data := struct {
		CoachNom string
		MesLabel string
		Items    []models.CoachUnconciliatedInvoice
	}{
		CoachNom: coachNom,
		MesLabel: mesLabel,
		Items:    items,
	}
	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return "", "", err
	}
	return subject, body.String(), nil
}

func RenderPolitePaymentReminderEmail(atletaNom, numFactura, concepte string, totalFactura, importPendent float64, dataVenciment, ibanEmpresa, nomComercial, idioma string) (string, string, error) {
	if nomComercial == "" {
		nomComercial = "Entrenador Trail"
	}
	var subject, tmplHTML string
	switch idioma {
	case "ENG":
		subject = fmt.Sprintf("Friendly reminder: Invoice %s (%s)", numFactura, nomComercial)
		tmplHTML = politePaymentENGHTML
	case "ESP":
		subject = fmt.Sprintf("Recordatorio amable: Factura %s (%s)", numFactura, nomComercial)
		tmplHTML = politePaymentESPHTML
	default:
		subject = fmt.Sprintf("Recordatori amable: Factura %s (%s)", numFactura, nomComercial)
		tmplHTML = politePaymentCATHTML
	}

	tmpl, err := template.New("polite_payment").Parse(tmplHTML)
	if err != nil {
		return "", "", err
	}
	appURL := os.Getenv("FRONTEND_URL")
	if appURL == "" {
		appURL = "https://trainee.entrenadortrail.es"
	}
	data := struct {
		AtletaNom     string
		NumFactura    string
		Concepte      string
		TotalFactura  float64
		ImportPendent float64
		DataVenciment string
		IbanEmpresa   string
		NomComercial  string
		AppURL        string
	}{
		AtletaNom:     atletaNom,
		NumFactura:    numFactura,
		Concepte:      concepte,
		TotalFactura:  totalFactura,
		ImportPendent: importPendent,
		DataVenciment: dataVenciment,
		IbanEmpresa:   ibanEmpresa,
		NomComercial:  nomComercial,
		AppURL:        appURL,
	}
	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return "", "", err
	}
	return subject, body.String(), nil
}

func (m *SMTPMailer) SendCoachUnconciliatedSummary(coachEmail, coachNom, mesLabel string, items []models.CoachUnconciliatedInvoice, idioma string) error {
	subject, htmlBody, err := RenderCoachUnconciliatedEmail(coachNom, mesLabel, items, idioma)
	if err != nil {
		return err
	}
	return m.sendRawEmail(coachEmail, subject, htmlBody)
}

func (m *SMTPMailer) SendPolitePaymentReminder(atletaEmail, atletaNom, numFactura, concepte string, totalFactura, importPendent float64, dataVenciment, ibanEmpresa, nomComercial, idioma string) error {
	subject, htmlBody, err := RenderPolitePaymentReminderEmail(atletaNom, numFactura, concepte, totalFactura, importPendent, dataVenciment, ibanEmpresa, nomComercial, idioma)
	if err != nil {
		return err
	}
	return m.sendRawEmail(atletaEmail, subject, htmlBody)
}

// NewMailer creates a new Mailer. If host is empty, it returns a LogMailer.
func NewMailer(host, port, username, password string) Mailer {
	if host == "" || username == "" {
		log.Println("[MAILER] Iniciant en mode LOG (sense configuració SMTP)")
		return &LogMailer{}
	}
	log.Println("[MAILER] Iniciant en mode SMTP")
	return &SMTPMailer{
		Host:     host,
		Port:     port,
		Username: username,
		Password: password,
	}
}
