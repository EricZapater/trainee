import axios from './axios'
import type { Test, CreateTestRequest, UpdateRecordatoriRequest } from '@/types'

export const createTest = async (data: CreateTestRequest): Promise<Test> => {
  const response = await axios.post('/entrenador/tests', data)
  return response.data
}

export const getPendingTests = async (): Promise<Test[]> => {
  const response = await axios.get('/entrenador/tests/pendents')
  return response.data
}

export const getRecordatorisTests = async (): Promise<Test[]> => {
  const response = await axios.get('/entrenador/tests/recordatoris')
  return response.data
}

export const traspassarTest = async (id: string): Promise<void> => {
  await axios.post(`/entrenador/tests/${id}/traspassar`)
}

export const updateRecordatoriTest = async (id: string, data: UpdateRecordatoriRequest): Promise<void> => {
  await axios.patch(`/entrenador/tests/${id}/recordatori`, data)
}

export const getTest = async (id: string): Promise<Test> => {
  const response = await axios.get(`/tests/${id}`)
  return response.data
}
