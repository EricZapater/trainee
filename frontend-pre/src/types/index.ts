export interface Usuari {
  id: string
  nom: string
  cognoms: string
  email: string
  rol: 'atleta' | 'entrenador' | 'admin'
  actiu: boolean
  idioma?: string
  notificacions_tauler?: boolean
}

export interface AuthState {
  user: Usuari | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface WellnessData {
  qualitat_son: number // 1-5
  nivell_estres: number // 1-5
  dolor_muscular: number // 1-5
  estat_anim: number // 1-5
  rpe_global: number // 1-10
  zones_molestia: string[]
  comentari_molestia?: string
  wellness_score?: number // 0-100 calculated
  wellness_status?: 'optim' | 'moderat' | 'alerta'
}

export interface EsdevenimentEquip {
  id: string
  nom: string
  data: string
  poblacio?: string
  kms?: number
  desnivell?: number
  gpx_url?: string
  enllac_oficial?: string
  notes_equip?: string
  total_inscrits?: number
  total_publics?: number
  atletes?: {
    atleta_id: string
    nom: string
    cognoms: string
    tipus_objectiu?: string // A, B, C
    kms?: number
    comparteix_transport?: boolean
    ciutat_origen_transport?: string
    es_privada?: boolean
  }[]
}
