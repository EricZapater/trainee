import api from './axios'
import type { ManagedWeek } from '@/types'

export async function getOpenWeeks(force: boolean = false): Promise<ManagedWeek[]> {
  const url = force ? `/weeks?_t=${Date.now()}` : '/weeks'
  const { data } = await api.get<ManagedWeek[]>(url)
  return data
}
