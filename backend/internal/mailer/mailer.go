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

type Mailer interface {
	SendReminder(toEmail, toName, magicToken, weekStart, idioma string) error
	SendNewAthleteNotification(entrenadorEmail, entrenadorNom, atletaNom, idioma string) error
	SendNewCompetitionNotification(entrenadorEmail, entrenadorNom, atletaNom, competicioNom, idioma string) error
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
		appURL = "https://trainee.ericzapater.cat" // Fallback
	}
	
	// Create the magic link
	magicLink := fmt.Sprintf("%s/magic-login?token=%s&week=%s", appURL, magicToken, weekStart)
	
	logoURL := os.Getenv("MAILER_LOGO_URL")
	if logoURL == "" {
		logoURL = "https://trainee.ericzapater.cat/logo.png"
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
		appURL = "https://trainee.ericzapater.cat"
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
		appURL = "https://trainee.ericzapater.cat"
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
