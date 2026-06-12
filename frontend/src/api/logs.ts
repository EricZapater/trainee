import api from './axios'

export interface SystemLog {
  id: string
  accio: string
  nivell: string
  missatge: string
  detalls: string | null
  created_at: string
}

export async function getSystemLogs(limit: number = 100, offset: number = 0): Promise<SystemLog[]> {
  const { data } = await api.get<SystemLog[]>('/entrenador/system-logs', {
    params: { limit, offset }
  })
  return data
}
