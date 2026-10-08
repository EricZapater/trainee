import api from './axios'

export interface NutricioFeedback {
  id: string
  revision_id: string
  atleta_id: string
  atleta_nom?: string
  data_sortida: string
  durada_hores?: number
  productes_consumits?: string
  ch_g_h_real?: number
  sodi_mg_h_real?: number
  fluid_ml_h_real?: number
  sensacions?: string
  created_at: string
}

export interface NutricioRevision {
  id: string
  plan_id: string
  versio: number
  objectiu_ch_g_h?: number
  objectiu_sodi_mg_h?: number
  objectiu_fluid_ml_h?: number
  productes_propostes?: string
  instruccions?: string
  data_revisio?: string
  created_at: string
  feedbacks: NutricioFeedback[]
}

export interface NutricioPlanWithDetails {
  id: string
  atleta_id: string
  entrenador_id: string
  titol: string
  estat: string
  created_at: string
  atleta_nom?: string
  atleta_cognoms?: string
  entrenador_nom?: string
  revisions: NutricioRevision[]
}

export interface CreateNutricioPlanRequest {
  atleta_id: string
  titol: string
  objectiu_ch_g_h?: number
  objectiu_sodi_mg_h?: number
  objectiu_fluid_ml_h?: number
  productes_propostes?: string
  instruccions?: string
  data_revisio?: string
}

export interface CreateNutricioRevisionRequest {
  objectiu_ch_g_h?: number
  objectiu_sodi_mg_h?: number
  objectiu_fluid_ml_h?: number
  productes_propostes?: string
  instruccions?: string
  data_revisio?: string
}

export interface CreateNutricioFeedbackRequest {
  data_sortida: string
  durada_hores?: number
  productes_consumits?: string
  ch_g_h_real?: number
  sodi_mg_h_real?: number
  fluid_ml_h_real?: number
  sensacions?: string
}

export async function getNutricioPlans(atletaId?: string): Promise<NutricioPlanWithDetails[]> {
  const { data } = await api.get<NutricioPlanWithDetails[]>('/nutricio/plans', {
    params: atletaId ? { atleta_id: atletaId } : undefined
  })
  return data
}

export async function getNutricioPlanDetails(id: string): Promise<NutricioPlanWithDetails> {
  const { data } = await api.get<NutricioPlanWithDetails>(`/nutricio/plans/${id}`)
  return data
}

export async function createNutricioPlan(req: CreateNutricioPlanRequest): Promise<NutricioPlanWithDetails> {
  const { data } = await api.post<NutricioPlanWithDetails>('/nutricio/plans', req)
  return data
}

export async function createNutricioRevision(planId: string, req: CreateNutricioRevisionRequest): Promise<NutricioRevision> {
  const { data } = await api.post<NutricioRevision>(`/nutricio/plans/${planId}/revisions`, req)
  return data
}

export async function addNutricioFeedback(revisionId: string, req: CreateNutricioFeedbackRequest): Promise<NutricioFeedback> {
  const { data } = await api.post<NutricioFeedback>(`/nutricio/revisions/${revisionId}/feedbacks`, req)
  return data
}

export async function updateNutricioPlanEstat(planId: string, estat: string): Promise<void> {
  await api.patch(`/nutricio/plans/${planId}/estat`, { estat })
}

export async function deleteNutricioPlan(planId: string): Promise<void> {
  await api.delete(`/nutricio/plans/${planId}`)
}
