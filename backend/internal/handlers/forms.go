package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"trainee-backend/internal/models"
)

func (h *Handler) getEntrenadorIDFromContext(c *gin.Context) (string, error) {
	entrenadorID := c.GetString("entrenador_id")
	if entrenadorID != "" {
		return entrenadorID, nil
	}
	usuariID := c.GetString("user_id")
	entrenadorInfo, err := h.Store.GetEntrenadorByUsuariID(c.Request.Context(), usuariID)
	if err != nil {
		return "", err
	}
	return entrenadorInfo.ID, nil
}

// ListEntrenadorForms - Llista els formularis de l'entrenador autenticat
func (h *Handler) ListEntrenadorForms(c *gin.Context) {
	entrenadorID, err := h.getEntrenadorIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No s'ha pogut identificar l'entrenador"})
		return
	}

	forms, err := h.Store.ListEntrenadorForms(c.Request.Context(), entrenadorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, forms)
}

// CreateForm - Crea un nou formulari
func (h *Handler) CreateForm(c *gin.Context) {
	entrenadorID, err := h.getEntrenadorIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No s'ha pogut identificar l'entrenador"})
		return
	}
	
	var req models.CreateFormRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	f, err := h.Store.CreateForm(c.Request.Context(), entrenadorID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, f)
}

// GetFormDetails - Obté el formulari i les preguntes
func (h *Handler) GetFormDetails(c *gin.Context) {
	id := c.Param("id")
	
	f, err := h.Store.GetFormDetails(c.Request.Context(), id)
	if err != nil {
		if err.Error() == "form not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Formulari no trobat"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// Security: Check if it's my form (coach)
	entrenadorID, _ := h.getEntrenadorIDFromContext(c)
	if entrenadorID != "" && f.EntrenadorID != entrenadorID {
		// they can see it but maybe warn them? We allow read for clone purposes
	}

	c.JSON(http.StatusOK, f)
}

// PublicGetForm - Obté el formulari i les preguntes per al candidat (només si és actiu)
func (h *Handler) PublicGetForm(c *gin.Context) {
	id := c.Param("id")
	
	f, err := h.Store.GetPublicForm(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Aquest formulari no existeix o ja no està actiu"})
		return
	}

	c.JSON(http.StatusOK, f)
}

// UpdateForm - Actualitza títol, descripció i actiu
func (h *Handler) UpdateForm(c *gin.Context) {
	entrenadorID, err := h.getEntrenadorIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No s'ha pogut identificar l'entrenador"})
		return
	}
	id := c.Param("id")

	var req models.UpdateFormRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.Store.UpdateForm(c.Request.Context(), id, entrenadorID, req)
	if err != nil {
		if err.Error() == "not found or forbidden" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Formulari no trobat o accés denegat"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Actualitzat correctament"})
}

// AddFormQuestion - Afegeix una pregunta al formulari. NO es permet si ja té respostes.
func (h *Handler) AddFormQuestion(c *gin.Context) {
	entrenadorID, err := h.getEntrenadorIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No s'ha pogut identificar l'entrenador"})
		return
	}
	id := c.Param("id")

	var req models.CreateFormQuestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	q, err := h.Store.AddFormQuestion(c.Request.Context(), id, entrenadorID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, q)
}

// UpdateFormQuestion - Actualitza una pregunta. NO es permet si ja té respostes.
func (h *Handler) UpdateFormQuestion(c *gin.Context) {
	entrenadorID, err := h.getEntrenadorIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No s'ha pogut identificar l'entrenador"})
		return
	}
	formID := c.Param("id")
	questionID := c.Param("questionId")

	var req models.CreateFormQuestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.Store.UpdateFormQuestion(c.Request.Context(), formID, questionID, entrenadorID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pregunta actualitzada"})
}

// DeleteFormQuestion - Elimina una pregunta
func (h *Handler) DeleteFormQuestion(c *gin.Context) {
	entrenadorID, err := h.getEntrenadorIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No s'ha pogut identificar l'entrenador"})
		return
	}
	formID := c.Param("id")
	questionID := c.Param("questionId")

	err = h.Store.DeleteFormQuestion(c.Request.Context(), formID, questionID, entrenadorID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pregunta esborrada"})
}

// ReorderFormQuestions - Actualitza l'ordre de les preguntes
func (h *Handler) ReorderFormQuestions(c *gin.Context) {
	entrenadorID, err := h.getEntrenadorIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No s'ha pogut identificar l'entrenador"})
		return
	}
	formID := c.Param("id")

	var req []models.ReorderFormQuestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.Store.ReorderFormQuestions(c.Request.Context(), formID, entrenadorID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reordenat correctament"})
}

// CloneForm - Clona un formulari existent sota el compte del propi entrenador
func (h *Handler) CloneForm(c *gin.Context) {
	entrenadorID, err := h.getEntrenadorIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No s'ha pogut identificar l'entrenador"})
		return
	}
	id := c.Param("id") // The form to clone

	newFormID, err := h.Store.CloneForm(c.Request.Context(), id, entrenadorID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": newFormID, "message": "Formulari clonat amb èxit"})
}

type TraspassarFormRequest struct {
	TargetEntrenadorID string `json:"target_entrenador_id" binding:"required"`
}

// TraspassarForm - Copia un formulari existent sota el compte d'un altre entrenador
func (h *Handler) TraspassarForm(c *gin.Context) {
	entrenadorID, err := h.getEntrenadorIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No s'ha pogut identificar l'entrenador"})
		return
	}
	id := c.Param("id")

	var req TraspassarFormRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify ownership
	f, err := h.Store.GetFormDetails(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Formulari no trobat"})
		return
	}
	if f.EntrenadorID != entrenadorID {
		c.JSON(http.StatusForbidden, gin.H{"error": "No ets el propietari d'aquest formulari"})
		return
	}

	newFormID, err := h.Store.CloneForm(c.Request.Context(), id, req.TargetEntrenadorID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": newFormID, "message": "Formulari copiat amb èxit"})
}

// DeleteForm
func (h *Handler) DeleteForm(c *gin.Context) {
	entrenadorID, err := h.getEntrenadorIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No s'ha pogut identificar l'entrenador"})
		return
	}
	id := c.Param("id")

	err = h.Store.DeleteForm(c.Request.Context(), id, entrenadorID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Formulari esborrat"})
}

// GetFormResponses - Llista els candidats que han respost
func (h *Handler) GetFormResponses(c *gin.Context) {
	entrenadorID, err := h.getEntrenadorIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No s'ha pogut identificar l'entrenador"})
		return
	}
	id := c.Param("id")

	responses, err := h.Store.GetFormResponses(c.Request.Context(), id, entrenadorID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, responses)
}

// UpdateResponseStatus - Canvia l'estat d'una resposta
func (h *Handler) UpdateResponseStatus(c *gin.Context) {
	entrenadorID, err := h.getEntrenadorIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No s'ha pogut identificar l'entrenador"})
		return
	}
	responseID := c.Param("responseId")

	var req models.UpdateFormResponseStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.Store.UpdateResponseStatus(c.Request.Context(), responseID, entrenadorID, req.Estat)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Estat actualitzat"})
}

// SubmitFormResponse - L'endpoint públic on s'envien les respostes
func (h *Handler) SubmitFormResponse(c *gin.Context) {
	id := c.Param("id") // form_id

	var req models.SubmitFormResponseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.Store.SubmitFormResponse(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Formulari enviat correctament!"})
}
