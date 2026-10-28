import api from './client'
import type { Week, Activitat, MySubmissionResponse, SubmissionRequest, WeekTemplate, InformeResponse } from '../types'

export async function getOpenWeeks(): Promise<Week[]> {
  const res = await api.get<Week[]>('/weeks')
  return res.data
}

export async function getActivitats(): Promise<Activitat[]> {
  const res = await api.get<Activitat[]>('/activitats')
  return res.data
}

export async function getMySubmission(weekStart: string): Promise<MySubmissionResponse> {
  const res = await api.get<MySubmissionResponse>(`/submissions/me?week_start=${weekStart}`)
  return res.data
}

export async function saveSubmission(data: SubmissionRequest): Promise<{ submission_id: string; updated_at: string }> {
  const res = await api.post<{ submission_id: string; updated_at: string }>('/submissions', data)
  return res.data
}

export async function getWeekTemplates(): Promise<WeekTemplate[]> {
  const res = await api.get<WeekTemplate[]>('/atletes/templates')
  return res.data
}

export async function createWeekTemplate(nom: string, slots: WeekTemplate['slots']): Promise<WeekTemplate> {
  const res = await api.post<WeekTemplate>('/atletes/templates', { nom, slots })
  return res.data
}

export async function deleteWeekTemplate(id: string): Promise<void> {
  await api.delete(`/atletes/templates/${id}`)
}

export async function getInformeMe(start: string, end: string): Promise<InformeResponse> {
  const res = await api.get<InformeResponse>(`/atletes/me/informe?start_date=${start}&end_date=${end}`)
  return res.data
}

