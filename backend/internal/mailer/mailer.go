package mailer

import (
	"crypto/tls"
	"fmt"
	"log"
	"net/smtp"
)

type Mailer interface {
	SendReminder(toEmail, toName string) error
}

type LogMailer struct{}

func (m *LogMailer) SendReminder(toEmail, toName string) error {
	log.Printf("[MAILER LOG] Enviant recordatori a: %s (%s). Assumpte: Recordatori de planificació setmanal\n", toName, toEmail)
	return nil
}

type SMTPMailer struct {
	Host     string
	Port     string
	Username string
	Password string
}

func (m *SMTPMailer) SendReminder(toEmail, toName string) error {
	// Com que el client passarà la plantilla més endavant, enviarem un text pla bàsic
	subject := "Recordatori: Planifica la teva propera setmana"
	body := fmt.Sprintf("Hola %s,\n\nEt recordem que encara no has completat la planificació per a la propera setmana. Si us plau, entra a l'aplicació i omple els teus entrenaments.\n\nSalutacions,\nL'equip.", toName)

	message := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s", m.Username, toEmail, subject, body)

	auth := smtp.PlainAuth("", m.Username, m.Password, m.Host)
	addr := fmt.Sprintf("%s:%s", m.Host, m.Port)

	// Depenent de la configuració de SMTP, a vegades cal InsecureSkipVerify per desenvolupament
	tlsconfig := &tls.Config{
		InsecureSkipVerify: true,
		ServerName:         m.Host,
	}

	conn, err := tls.Dial("tcp", addr, tlsconfig)
	if err != nil {
		// Fallback to non-TLS / STARTTLS
		err = smtp.SendMail(addr, auth, m.Username, []string{toEmail}, []byte(message))
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

	_, err = w.Write([]byte(message))
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
