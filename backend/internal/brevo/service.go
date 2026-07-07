package brevo

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

type Service interface {
	SyncContact(email, name, surname string, active bool) (*int64, error)
	DeleteContact(email string) error
}

type service struct {
	apiKey string
	client *http.Client
}

func NewService(apiKey string) Service {
	return &service{
		apiKey: apiKey,
		client: &http.Client{},
	}
}

type brevoAttributes struct {
	Name     string `json:"NOMBRE"`
	Apellido string `json:"APELLIDOS"`
}

type brevoContactRequest struct {
	Email         string          `json:"email"`
	Attributes    brevoAttributes `json:"attributes"`
	ListIds       []int           `json:"listIds,omitempty"`
	UnlinkListIds []int           `json:"unlinkListIds,omitempty"`
	UpdateEnabled bool            `json:"updateEnabled"`
}

type brevoContactResponse struct {
	ID int64 `json:"id"`
}

// SyncContact creates or updates a contact in Brevo.
// If active is true, it adds to list 6. If false, it removes from list 6.
func (s *service) SyncContact(email, name, surname string, active bool) (*int64, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("brevo API key not configured")
	}

	reqBody := brevoContactRequest{
		Email: email,
		Attributes: brevoAttributes{
			Name:     name,
			Apellido: surname,
		},
		UpdateEnabled: true,
	}

	if active {
		reqBody.ListIds = []int{6}
	} else {
		reqBody.UnlinkListIds = []int{6}
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("error marshaling brevo request: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, "https://api.brevo.com/v3/contacts", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("error creating brevo request: %w", err)
	}

	req.Header.Set("api-key", s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error executing brevo request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("brevo API returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// If it returns a body with the ID, parse it.
	var resBody brevoContactResponse
	if err := json.NewDecoder(resp.Body).Decode(&resBody); err == nil && resBody.ID != 0 {
		return &resBody.ID, nil
	}

	return nil, nil
}

func (s *service) DeleteContact(email string) error {
	if s.apiKey == "" {
		return fmt.Errorf("brevo API key not configured")
	}

	encodedEmail := url.PathEscape(email)
	req, err := http.NewRequest(http.MethodDelete, "https://api.brevo.com/v3/contacts/"+encodedEmail, nil)
	if err != nil {
		return fmt.Errorf("error creating brevo delete request: %w", err)
	}

	req.Header.Set("api-key", s.apiKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("error executing brevo delete request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNotFound {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("brevo API returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}
