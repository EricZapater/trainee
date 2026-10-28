import api from './client'

export interface AdminUser {
  id: string
  nom: string
  cognoms: string
  email: string
  rol: 'atleta' | 'entrenador' | 'admin'
  actiu: boolean
  idioma?: string
  brevo_sync_status?: string
  created_at: string
}

export interface ImpersonateResponse {
  token: string
  user: {
    id: string
    nom: string
    cognoms?: string
    email: string
    rol: 'atleta' | 'entrenador' | 'admin'
    idioma?: string
    actiu: boolean
  }
}

export async function getUsuaris(): Promise<AdminUser[]> {
  const res = await api.get<AdminUser[]>('/admin/usuaris')
  return res.data
}

export async function impersonateUser(id: string): Promise<ImpersonateResponse> {
  const res = await api.post<ImpersonateResponse>(`/admin/impersonate/${id}`)
  return res.data
}

export async function resetUserPassword(id: string): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>(`/admin/usuaris/${id}/reset-password`)
  return res.data
}

export async function forceBrevoSync(id: string): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>(`/admin/usuaris/${id}/brevo-sync`)
  return res.data
}
