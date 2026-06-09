import api from './axios'
import type { 
  EntrenadorSubmissionsResponse, 
  ManagedWeekWithCount, 
  ManagedWeek, 
  CreateWeekRequest, 
  UpdateWeekRequest,
  Activitat,
  CreateActivitatRequest,
  UpdateActivitatRequest,
  ReorderItem,
  InformeResponse
} from '@/types'

export async function getInformeAtleta(id: string, start: string, end: string): Promise<InformeResponse> {
  const { data } = await api.get<InformeResponse>(`/entrenador/atletes/${id}/informe?start_date=${start}&end_date=${end}`)
  return data
}

export async function getAtletes(): Promise<{ id: string; nom: string; email: string }[]> {
  const { data } = await api.get<{ id: string; nom: string; email: string }[]>('/entrenador/atletes')
  return data
}

export async function getEntrenadorSubmissions(weekStart: string): Promise<EntrenadorSubmissionsResponse> {
  const { data } = await api.get<EntrenadorSubmissionsResponse>(`/entrenador/submissions?week=${weekStart}`)
  return data
}

export async function getEntrenadorWeeks(): Promise<ManagedWeekWithCount[]> {
  const { data } = await api.get<ManagedWeekWithCount[]>('/entrenador/weeks')
  return data
}

export async function createWeek(payload: CreateWeekRequest): Promise<ManagedWeek> {
  const { data } = await api.post<ManagedWeek>('/entrenador/weeks', payload)
  return data
}

export async function updateWeek(id: string, payload: UpdateWeekRequest): Promise<ManagedWeek> {
  const { data } = await api.patch<ManagedWeek>(`/entrenador/weeks/${id}`, payload)
  return data
}

export async function getAllActivitats(): Promise<Activitat[]> {
  const { data } = await api.get<Activitat[]>('/entrenador/activitats')
  return data
}

export async function createActivitat(payload: CreateActivitatRequest): Promise<Activitat> {
  const { data } = await api.post<Activitat>('/entrenador/activitats', payload)
  return data
}

export async function updateActivitat(id: string, payload: UpdateActivitatRequest): Promise<Activitat> {
  const { data } = await api.patch<Activitat>(`/entrenador/activitats/${id}`, payload)
  return data
}

export async function reorderActivitats(items: ReorderItem[]): Promise<void> {
  await api.patch('/entrenador/activitats/reorder', items)
}

export async function deleteActivitat(id: string): Promise<void> {
  await api.delete(`/entrenador/activitats/${id}`)
}
