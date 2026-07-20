import api from './axios'
import type { MaterialProducte, MaterialComanda, MaterialSettings, CreateMaterialComandaItem } from '@/types'

export async function getMaterialProductes(): Promise<MaterialProducte[]> {
  const { data } = await api.get<MaterialProducte[]>('/material/productes')
  return data
}

export async function createMaterialProducte(req: Partial<MaterialProducte>): Promise<MaterialProducte> {
  const { data } = await api.post<MaterialProducte>('/entrenador/material/productes', req)
  return data
}

export async function updateMaterialProducte(id: string, req: Partial<MaterialProducte>): Promise<MaterialProducte> {
  const { data } = await api.put<MaterialProducte>(`/entrenador/material/productes/${id}`, req)
  return data
}

export async function deleteMaterialProducte(id: string): Promise<void> {
  await api.delete(`/entrenador/material/productes/${id}`)
}

export async function uploadMaterialImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('image', file)
  const { data } = await api.post<{ url: string }>('/entrenador/material/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data.url
}

export async function getMaterialSettings(): Promise<MaterialSettings> {
  const { data } = await api.get<MaterialSettings>('/material/settings')
  return data
}

export async function updateMaterialSettings(enabled: boolean): Promise<MaterialSettings> {
  const { data } = await api.put<MaterialSettings>('/entrenador/material/settings', { enabled })
  return data
}

export interface GetComandesParams {
  start_date?: string
  end_date?: string
  estat?: string
  atleta_id?: string
}

export async function getMaterialComandes(params?: GetComandesParams): Promise<MaterialComanda[]> {
  const { data } = await api.get<MaterialComanda[]>('/material/comandes', { params })
  return data
}

export async function createMaterialComandes(items: CreateMaterialComandaItem[]): Promise<MaterialComanda[]> {
  const { data } = await api.post<MaterialComanda[]>('/material/comandes', { items })
  return data
}

export async function updateMaterialComanda(id: string, req: { talla?: string; quantitat: number; estat?: string; notes?: string }): Promise<MaterialComanda> {
  const { data } = await api.put<MaterialComanda>(`/material/comandes/${id}`, req)
  return data
}

export async function deleteMaterialComanda(id: string): Promise<void> {
  await api.delete(`/material/comandes/${id}`)
}

export async function bulkUpdateComandesState(comanda_ids: string[], nou_estat: string): Promise<void> {
  await api.put('/entrenador/material/comandes/bulk-status', { comanda_ids, nou_estat })
}

export async function exportMaterialComandesCSV(params?: GetComandesParams): Promise<Blob> {
  const response = await api.get('/entrenador/material/comandes/export', {
    params,
    responseType: 'blob'
  })
  return response.data
}
