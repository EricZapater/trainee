import api from './axios'
import type { Activitat } from '@/types'

export async function getActivitats(): Promise<Activitat[]> {
  const { data } = await api.get<Activitat[]>('/activitats')
  return data
}
