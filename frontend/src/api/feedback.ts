import api from './axios'

export interface FeedbackTicket {
  id: string
  informador_id: string
  informador_nom?: string
  tipus: string
  resum: string
  descripcio: string
  imatge_path?: string
  imatges: string[]
  estat: string
  resposta?: string
  resposta_imatges: string[]
  created_at: string
}

export interface UpdateFeedbackRequest {
  estat: string
  resposta?: string
}

export const getFeedbackTickets = async (): Promise<FeedbackTicket[]> => {
  const { data } = await api.get('/feedback')
  return data
}

export const createFeedbackTicket = async (formData: FormData): Promise<FeedbackTicket> => {
  const { data } = await api.post('/feedback', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return data
}

export const updateFeedbackTicket = async (id: string, formData: FormData): Promise<{message: string}> => {
  const { data } = await api.patch(`/feedback/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return data
}
