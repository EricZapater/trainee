import api from './client'
import type { Week, SlotEntry, UserStatusHistory, InformeResponse } from '../types'

export interface ManagedWeekWithCount extends Week {
  submissions_count?: number
  athletes_count?: number
}

export interface AthleteWellnessDetail {
  score?: number
  alerta?: 'verd' | 'groc' | 'vermell' | 'pendent'
  ha_respost?: boolean
  fatiga?: number
  son_qualitat?: number
  dolor_muscular?: number
  estres?: number
  humor?: number
  rpe_setmanal?: number
  zones_dolor?: string[]
  notes?: string
  submitted_at?: string
}

export interface AtletaSubmissionSummary {
  atleta_id: string
  submission_id?: string
  nom: string
  cognoms: string
  email: string
  actiu: boolean
  ha_respost: boolean
  estat: string // 'esborrany', 'completada', ''
  notes_setmana?: string | null
  gestionat: boolean
  absent: boolean
  reminders_auto?: number
  reminders_manual?: number
  slots: SlotEntry[]
  wellness?: AthleteWellnessDetail
}

export interface AthleteWellnessSummary {
  atleta_id: string
  nom: string
  cognoms: string
  atleta_nom?: string
  submission_id?: string
  ha_respost: boolean
  fatiga?: number
  son_qualitat?: number
  dolor_muscular?: number
  estres?: number
  humor?: number
  rpe_setmanal?: number
  zones_dolor?: string[]
  notes?: string
  score?: number
  alerta: 'verd' | 'groc' | 'vermell' | 'pendent'
  submitted_at?: string
}

export interface EntrenadorWellnessOverviewResponse {
  week_start: string
  atletes: AthleteWellnessSummary[]
}

export interface EntrenadorSubmissionsResponse {
  week_start: string
  atletes: AtletaSubmissionSummary[]
}

export async function getEntrenadorWeeks(): Promise<ManagedWeekWithCount[]> {
  const res = await api.get<ManagedWeekWithCount[]>('/entrenador/weeks')
  return res.data
}

export async function getEntrenadorSubmissions(weekStart: string): Promise<EntrenadorSubmissionsResponse> {
  const res = await api.get<EntrenadorSubmissionsResponse>(`/entrenador/submissions?week=${weekStart}`)
  return res.data
}

export async function toggleSubmissionGestionat(submissionId: string, gestionat: boolean): Promise<void> {
  await api.patch(`/entrenador/submissions/${submissionId}/gestionat`, { gestionat })
}

export async function sendManualReminder(atletaId: string, weekStart: string): Promise<void> {
  await api.post(`/entrenador/atletes/${atletaId}/remind?week=${weekStart}`)
}

export async function toggleAtletaAbsent(atletaId: string, weekStart: string, absent: boolean): Promise<void> {
  await api.patch(`/entrenador/atletes/${atletaId}/absent`, { week_start: weekStart, absent })
}

export async function createWeek(weekStart: string): Promise<Week> {
  const res = await api.post<Week>('/entrenador/weeks', { week_start: weekStart })
  return res.data
}

export async function updateWeek(id: string, estat: string): Promise<Week> {
  const res = await api.patch<Week>(`/entrenador/weeks/${id}`, { estat })
  return res.data
}

export async function getEntrenadorWellnessOverview(weekStart: string): Promise<EntrenadorWellnessOverviewResponse> {
  const res = await api.get<EntrenadorWellnessOverviewResponse>(`/entrenador/wellness/overview?week_start=${weekStart}`)
  return res.data
}

export async function getEntrenadorCompeticions(): Promise<any[]> {
  const res = await api.get<any[]>('/entrenador/competicions')
  return res.data
}

export async function getHistoricCompeticions(): Promise<any[]> {
  const res = await api.get<any[]>('/entrenador/competicions/historic')
  return res.data
}

export async function traspassarCompeticio(competicioId: string): Promise<void> {
  await api.post(`/entrenador/competicions/${competicioId}/traspassar`)
}

export async function updateCompeticioTipus(competicioId: string, tipus: string): Promise<void> {
  await api.patch(`/entrenador/competicions/${competicioId}/tipus`, { tipus })
}

export async function getAtletes(): Promise<{ id: string; nom: string; cognoms: string; email: string; actiu: boolean }[]> {
  const res = await api.get<{ id: string; nom: string; cognoms: string; email: string; actiu: boolean }[]>('/entrenador/atletes')
  return res.data
}

export async function toggleAtletaStatus(id: string, actiu: boolean): Promise<void> {
  await api.patch(`/entrenador/atletes/${id}/status`, { actiu })
}

export async function getAtletaStatusHistory(id: string): Promise<UserStatusHistory[]> {
  const res = await api.get<UserStatusHistory[]>(`/entrenador/atletes/${id}/history`)
  return res.data
}

export async function getEntrenadorsList(): Promise<{ id: string; nom: string }[]> {
  const res = await api.get<{ id: string; nom: string }[]>('/entrenadors')
  return res.data
}

export async function reassignAtleta(id: string, newEntrenadorId: string): Promise<void> {
  await api.patch(`/entrenador/atletes/${id}/reasignar`, { new_entrenador_id: newEntrenadorId })
}

export async function updateAtletaDetails(id: string, payload: { nom: string; cognoms: string }): Promise<void> {
  await api.patch(`/entrenador/atletes/${id}`, payload)
}

export async function getInformeAtleta(id: string, start: string, end: string): Promise<InformeResponse> {
  const res = await api.get<InformeResponse>(`/entrenador/atletes/${id}/informe?start_date=${start}&end_date=${end}`)
  return res.data
}

