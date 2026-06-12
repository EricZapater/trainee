import api from './axios'

export interface AdminUser {
  id: string
  nom: string
  email: string
  rol: string
  actiu: boolean
  idioma: string
  created_at: string
}

export interface ImpersonateResponse {
  token: string
  user: {
    id: string
    nom: string
    email: string
    rol: string
    idioma: string
  }
}

export async function getUsuaris(): Promise<AdminUser[]> {
  const { data } = await api.get<AdminUser[]>('/admin/usuaris')
  return data
}

export async function impersonateUser(id: string): Promise<ImpersonateResponse> {
  const { data } = await api.post<ImpersonateResponse>(`/admin/impersonate/${id}`)
  return data
}
