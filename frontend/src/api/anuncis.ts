import api from './axios'

export interface Anunci {
  id: string
  autor_id: string
  autor_nom: string
  titol: string
  descripcio: string
  enllac?: string
  imatges: string[]
  tags: string[]
  estat: string
  actiu: boolean
  created_at: string
}

export interface CreateAnunciRequest {
  titol: string
  descripcio: string
  enllac?: string
  imatges: string[]
  tags: string[]
  actiu: boolean
}

export async function getAnuncis(): Promise<Anunci[]> {
  const { data } = await api.get<Anunci[]>('/anuncis')
  return data
}

export async function createAnunci(req: CreateAnunciRequest): Promise<Anunci> {
  const { data } = await api.post<Anunci>('/anuncis', req)
  return data
}

export async function updateAnunciStatus(id: string, actiu: boolean): Promise<void> {
  await api.patch(`/anuncis/${id}/status`, { actiu })
}

export async function updateAnunciEstat(id: string, estat: string): Promise<void> {
  await api.patch(`/anuncis/${id}/estat`, { estat })
}

export async function getAnunciTags(): Promise<string[]> {
  const { data } = await api.get<string[]>('/anuncis/tags')
  return data
}

export async function uploadAnunciImages(files: File[]): Promise<string[]> {
  const formData = new FormData()
  files.forEach(file => {
    formData.append('images', file)
  })
  const { data } = await api.post<{urls: string[]}>('/anuncis/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return data.urls
}
