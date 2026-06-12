import api from './axios'

export interface CronConfig {
  time: string
  days: number[]
  enabled: boolean
}

export interface SystemSettings {
  week_generator: CronConfig
  reminder_cron: CronConfig
}

export async function getCronSettings(): Promise<SystemSettings> {
  const { data } = await api.get<SystemSettings>('/entrenador/settings/cron')
  return data
}

export async function updateCronSettings(settings: SystemSettings): Promise<{ message: string }> {
  const { data } = await api.put<{ message: string }>('/entrenador/settings/cron', settings)
  return data
}
