import api from './axios'
import type { WeekTemplate, CreateTemplateRequest } from '@/types'

export async function listWeekTemplates(): Promise<WeekTemplate[]> {
  const { data } = await api.get<WeekTemplate[]>('/atletes/templates')
  return data
}

export async function createWeekTemplate(payload: CreateTemplateRequest): Promise<WeekTemplate> {
  const { data } = await api.post<WeekTemplate>('/atletes/templates', payload)
  return data
}

export async function deleteWeekTemplate(id: string): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/atletes/templates/${id}`)
  return data
}
