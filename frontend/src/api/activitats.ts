import api from './axios'
import type { Activitat } from '@/types'

export async function getActivitats(force: boolean = false): Promise<Activitat[]> {
  const url = force ? `/activitats?_t=${Date.now()}` : '/activitats'
  const { data } = await api.get<Activitat[]>(url)
  return data
}
