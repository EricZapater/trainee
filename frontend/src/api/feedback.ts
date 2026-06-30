import api from './axios'

export interface FeedbackTicket {
  id: string
  informador_id: string
  informador_nom?: string
  tipus: string
  resum: string
  descripcio: string
  imatge_path?: string
  estat: string
  created_at: string
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
