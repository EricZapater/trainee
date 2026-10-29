import api from './client'
import type { Competicio } from '../types'

export async function getAtletaCompeticions(): Promise<Competicio[]> {
  const res = await api.get<Competicio[]>('/atletes/competicions')
  return res.data
}

export async function createCompeticio(formData: FormData): Promise<Competicio> {
  const res = await api.post<Competicio>('/atletes/competicions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data
}

export async function updateCompeticio(id: string, formData: FormData): Promise<Competicio> {
  const res = await api.patch<Competicio>(`/atletes/competicions/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data
}

export async function getAtletaCompeticionsByEntrenador(atletaId: string): Promise<Competicio[]> {
  const res = await api.get<Competicio[]>(`/entrenador/atletes/${atletaId}/competicions`)
  return res.data
}
