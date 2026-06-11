import api from './axios'
import type { AuthResponse, Entrenador, Usuari } from '@/types'

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
  return data
}

export async function register(payload: { nom: string; email: string; password: string; rol: string; idioma: string; entrenador_id: string }): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', payload)
  return data
}

export async function getEntrenadors(): Promise<Entrenador[]> {
  const { data } = await api.get<Entrenador[]>('/entrenadors')
  return data
}

export async function getMe(): Promise<Usuari> {
  const { data } = await api.get<Usuari>('/atletes/me')
  return data
}

export async function changePassword(payload: { old_password: string; new_password: string }): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/change-password', payload)
  return data
}

export async function updateIdioma(idioma: string): Promise<{ message: string }> {
  const { data } = await api.patch<{ message: string }>('/usuaris/me/idioma', { idioma })
  return data
}
