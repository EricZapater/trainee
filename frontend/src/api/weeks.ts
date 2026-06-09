import api from './axios'
import type { ManagedWeek } from '@/types'

export async function getOpenWeeks(): Promise<ManagedWeek[]> {
  const { data } = await api.get<ManagedWeek[]>('/weeks')
  return data
}
