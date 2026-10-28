import api from './client'

export interface FormQuestion {
  id: string
  form_id: string
  pregunta: string
  tipus: 'text' | 'textarea' | 'number' | 'select' | 'boolean'
  opcions: string | null
  obligatori: boolean
  ordre: number
  imatges: string[]
  created_at: string
}

export interface FormWithQuestions {
  id: string
  titol: string
  descripcio: string | null
  imatges: string[]
  actiu: boolean
  notificar_entrenadors: boolean
  created_at: string
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
  answers?: FormAnswer[]
}

export async function getForms(): Promise<FormWithQuestions[]> {
  const { data } = await api.get<FormWithQuestions[]>('/forms')
  return data
}

export async function getFormById(id: string): Promise<FormWithQuestions> {
  const { data } = await api.get<FormWithQuestions>(`/forms/${id}`)
  return data
}

export async function createForm(req: Partial<FormWithQuestions>): Promise<FormWithQuestions> {
  const { data } = await api.post<FormWithQuestions>('/forms', req)
  return data
}

export async function updateForm(id: string, req: Partial<FormWithQuestions>): Promise<FormWithQuestions> {
  const { data } = await api.put<FormWithQuestions>(`/forms/${id}`, req)
  return data
}

export async function deleteForm(id: string): Promise<void> {
  await api.delete(`/forms/${id}`)
}

export async function getFormResponses(formId: string): Promise<FormResponse[]> {
  const { data } = await api.get<FormResponse[]>(`/forms/${formId}/responses`)
  return data
}
