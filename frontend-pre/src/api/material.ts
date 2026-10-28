import api from './client'

export interface MaterialProducte {
  id: string
  nom: string
  descripcio?: string
  preu: number
  imatge_url?: string
  talles: string[]
  actiu: boolean
  created_at?: string
}

export interface MaterialComanda {
  id: string
  atleta_id: string
  atleta_nom?: string
  atleta_email?: string
  producte_id: string
  producte_nom?: string
  producte_preu?: number
  producte_imatge?: string
  talla?: string
  quantitat: number
  estat: 'pendent' | 'confirmada' | 'entregada' | 'cancelada'
  notes?: string
  created_at: string
}

export interface MaterialSettings {
  enabled: boolean
}

export interface CreateMaterialComandaItem {
  producte_id: string
  talla?: string
  quantitat: number
  notes?: string
}

export interface GetComandesParams {
  start_date?: string
  end_date?: string
  estat?: string
  atleta_id?: string
}

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
