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

//go:embed reminder.html
var reminderHTML string

type Mailer interface {
	SendReminder(toEmail, toName, magicToken, weekStart string) error
}

type LogMailer struct{}

func (m *LogMailer) SendReminder(toEmail, toName, magicToken, weekStart string) error {
	log.Printf("[MAILER LOG] Enviant recordatori a: %s (%s) per setmana %s. Token: %s\n", toName, toEmail, weekStart, magicToken)
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

func (m *SMTPMailer) SendReminder(toEmail, toName, magicToken, weekStart string) error {
	subject := "Recordatori: Planifica la teva propera setmana"
	
	tmpl, err := template.New("reminder").Parse(reminderHTML)
	if err != nil {
		return fmt.Errorf("error parsejant la plantilla: %v", err)
	}

	appURL := os.Getenv("FRONTEND_URL")
	if appURL == "" {
		appURL = "https://app.entrenadortrail.es" // Fallback
	}
	
	// Create the magic link
	magicLink := fmt.Sprintf("%s/magic-login?token=%s&week=%s", appURL, magicToken, weekStart)
	
	logoURL := os.Getenv("MAILER_LOGO_URL")
	// If empty, the template handles it via {{if .LogoURL}}

	data := templateData{
		Nom:     toName,
		AppURL:  magicLink,
		LogoURL: logoURL,
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return fmt.Errorf("error executant la plantilla: %v", err)
	}

	// Construir l'email MIME
	var message bytes.Buffer
	message.WriteString(fmt.Sprintf("From: %s\r\n", m.Username))
	message.WriteString(fmt.Sprintf("To: %s\r\n", toEmail))
	message.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	message.WriteString("MIME-Version: 1.0\r\n")
	message.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	message.WriteString("\r\n")
	message.Write(body.Bytes())

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
