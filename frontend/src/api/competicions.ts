import axios from './axios'
import type { Competicio, CreateCompeticioRequest } from '@/types'

export const getAtletaCompeticions = async (): Promise<Competicio[]> => {
  const { data } = await axios.get('/atletes/competicions')
  return data
}

export const createCompeticio = async (data: CreateCompeticioRequest): Promise<Competicio> => {
  const formData = new FormData()
  formData.append('nom', data.nom)
  formData.append('data', data.data)
  formData.append('enllac', data.enllac)
  
  if (data.kms !== undefined) formData.append('kms', data.kms.toString())
  if (data.desnivell !== undefined) formData.append('desnivell', data.desnivell.toString())
  if (data.comentaris) formData.append('comentaris', data.comentaris)
  if (data.track_gpx) formData.append('track_gpx', data.track_gpx)

  const response = await axios.post('/atletes/competicions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

export const getEntrenadorCompeticions = async (): Promise<Competicio[]> => {
  const { data } = await axios.get('/entrenador/competicions')
  return data
}

export const traspassarCompeticio = async (id: string): Promise<void> => {
  await axios.post(`/entrenador/competicions/${id}/traspassar`)
}

export const getCompeticio = async (id: string): Promise<Competicio> => {
  const { data } = await axios.get(`/competicions/${id}`)
  return data
}
