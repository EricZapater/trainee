import apiClient from './axios'

// Types
export interface Form {
  id: string
  entrenador_id: string
  titol: string
  descripcio: string | null
  actiu: boolean
  created_at: string
}

export interface FormQuestion {
  id: string
  form_id: string
  pregunta: string
  tipus: 'text' | 'textarea' | 'number' | 'select' | 'boolean'
  opcions: string | null
  obligatori: boolean
  ordre: number
  created_at: string
}

export interface FormWithQuestions extends Form {
  questions: FormQuestion[]
  responses_count: number
}

export interface FormAnswer {
  id: string
  response_id: string
  question_id: string
  valor: string | null
  created_at: string
}

export interface FormResponse {
  id: string
  form_id: string
  nom_candidat: string
  email_candidat: string
  telefon_candidat: string | null
  estat: 'pendent' | 'contactat' | 'descartat' | 'acceptat'
  created_at: string
}

export interface FormResponseWithAnswers extends FormResponse {
  answers: FormAnswer[]
}

// Entrenador Endpoints
export const listEntrenadorForms = async (): Promise<FormWithQuestions[]> => {
  const { data } = await apiClient.get('/entrenador/forms')
  return data
}

export const createForm = async (titol: string, descripcio: string | null, actiu: boolean): Promise<Form> => {
  const { data } = await apiClient.post('/entrenador/forms', { titol, descripcio, actiu })
  return data
}

export const getFormDetails = async (id: string): Promise<FormWithQuestions> => {
  const { data } = await apiClient.get(`/entrenador/forms/${id}`)
  return data
}

export const updateForm = async (id: string, payload: { titol: string; descripcio: string | null; actiu: boolean }): Promise<void> => {
  await apiClient.put(`/entrenador/forms/${id}`, payload)
}

export const deleteForm = async (id: string): Promise<void> => {
  await apiClient.delete(`/entrenador/forms/${id}`)
}

export const cloneForm = async (id: string): Promise<{ id: string; message: string }> => {
  const { data } = await apiClient.post(`/entrenador/forms/${id}/clone`)
  return data
}

export const traspassarForm = async (id: string, targetEntrenadorId: string): Promise<{ id: string; message: string }> => {
  const { data } = await apiClient.post(`/entrenador/forms/${id}/traspassar`, { target_entrenador_id: targetEntrenadorId })
  return data
}

export const addFormQuestion = async (
  formId: string, 
  payload: { pregunta: string; tipus: string; opcions: string | null; obligatori: boolean; ordre: number }
): Promise<FormQuestion> => {
  const { data } = await apiClient.post(`/entrenador/forms/${formId}/questions`, payload)
  return data
}

export const updateFormQuestion = async (
  formId: string, 
  questionId: string, 
  payload: { pregunta: string; tipus: string; opcions: string | null; obligatori: boolean; ordre: number }
): Promise<void> => {
  await apiClient.put(`/entrenador/forms/${formId}/questions/${questionId}`, payload)
}

export const deleteFormQuestion = async (formId: string, questionId: string): Promise<void> => {
  await apiClient.delete(`/entrenador/forms/${formId}/questions/${questionId}`)
}

export const reorderFormQuestions = async (formId: string, updates: { id: string; ordre: number }[]): Promise<void> => {
  await apiClient.put(`/entrenador/forms/${formId}/questions/reorder`, updates)
}

export const getFormResponses = async (formId: string): Promise<FormResponseWithAnswers[]> => {
  const { data } = await apiClient.get(`/entrenador/forms/${formId}/responses`)
  return data
}

export const updateResponseStatus = async (responseId: string, estat: string): Promise<void> => {
  await apiClient.put(`/entrenador/responses/${responseId}/status`, { estat })
}

// Public Endpoints
export const getPublicForm = async (id: string): Promise<FormWithQuestions> => {
  const { data } = await apiClient.get(`/public/forms/${id}`)
  return data
}

export const submitFormResponse = async (
  id: string, 
  payload: { 
    nom_candidat: string; 
    email_candidat: string; 
    telefon_candidat?: string; 
    answers: { question_id: string; valor: string | null }[] 
  }
): Promise<{ message: string }> => {
  const { data } = await apiClient.post(`/public/forms/${id}/submit`, payload)
  return data
}
