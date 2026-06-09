import api from './axios'
import type { SubmissionRequest, SubmissionResponse, MySubmissionResponse, InformeResponse } from '@/types'

export async function createSubmission(payload: SubmissionRequest): Promise<SubmissionResponse> {
  const { data } = await api.post<SubmissionResponse>('/submissions', payload)
  return data
}

export async function getMySubmission(weekStart: string): Promise<MySubmissionResponse> {
  const { data } = await api.get<MySubmissionResponse>(`/submissions/me?week=${weekStart}`)
  return data
}

export async function getInformeMe(start: string, end: string): Promise<InformeResponse> {
  const { data } = await api.get<InformeResponse>(`/atletes/me/informe?start_date=${start}&end_date=${end}`)
  return data
}

