import api from './client'
import type { Week, SlotEntry } from '../types'

export interface ManagedWeekWithCount extends Week {
  submissions_count?: number
  athletes_count?: number
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
  wellness?: {
    score?: number
    alerta?: 'verd' | 'groc' | 'vermell' | 'pendent'
    zones_dolor?: string[]
    rpe_setmanal?: number
    notes?: string
  }
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

export async function getEntrenadorWellnessOverview(weekStart: string): Promise<{ week_start: string; atletes: any[] }> {
  const res = await api.get<{ week_start: string; atletes: any[] }>(`/entrenador/wellness/overview?week_start=${weekStart}`)
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
