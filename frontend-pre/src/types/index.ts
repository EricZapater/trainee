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

export interface Activitat {
  id: string
  nom: string
  icona: string
  color: string
  ordre: number
  activa: boolean
}

export interface Week {
  id: string
  week_start: string
  estat: 'oberta' | 'tancada' | 'traspassada' | 'inactiva'
  created_at?: string
}

export interface SlotEntry {
  id?: string
  submission_id?: string
  dia: number // 0 = Dilluns, 6 = Diumenge
  ordre: number
  activitat_id: string
  durada_hores: number
  notes?: string
  competicio_id?: string
  test_id?: string
  activitat_nom?: string
  activitat_icona?: string
  activitat_color?: string
}

export interface SubmissionRequest {
  week_start: string
  notes_setmana: string
  estat: 'esborrany' | 'completada'
  slots: SlotEntry[]
}

export interface MySubmissionResponse {
  week_start: string
  notes_setmana: string | null
  estat: string
  slots: SlotEntry[]
}

export interface WeekTemplate {
  id: string
  atleta_id?: string
  nom: string
  slots: {
    dia: number
    ordre: number
    activitat_id: string
    durada_hores: number
    notes?: string
  }[]
  created_at?: string
}

export interface Competicio {
  id: string
  atleta_id: string
  entrenador_id?: string
  nom: string
  data: string // YYYY-MM-DD
  tipus: 'A' | 'B' | 'C'
  kms?: number | null
  desnivell?: number | null
  enllac?: string
  track_gpx_path?: string | null
  comentaris?: string | null
  registrat?: boolean
  estat: 'activa' | 'descartada'
  created_at?: string
  atleta_nom?: string
  atleta_cognoms?: string
}

export interface WellnessData {
  qualitat_son: number
  nivell_estres: number
  dolor_muscular: number
  estat_anim: number
  rpe_global: number
  zones_molestia: string[]
  comentari_molestia?: string
  wellness_score?: number
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
    tipus_objectiu?: string
    kms?: number
    comparteix_transport?: boolean
    ciutat_origen_transport?: string
    es_privada?: boolean
  }[]
}

export interface UserStatusHistory {
  id: string
  usuari_id: string
  accio: 'activate' | 'deactivate'
  changed_by: string | null
  created_at: string
}

export interface Test {
  id: string
  atleta_id: string
  entrenador_id: string
  titol: string
  data_test: string
  comentaris?: string
  data_recordatori?: string
  estat_recordatori: 'cap' | 'pendent' | 'resolt' | 'cancelat'
  registrat: boolean
  created_at: string
  atleta_nom?: string
}

export interface CreateTestRequest {
  atleta_id: string
  titol: string
  data_test: string
  comentaris?: string
  data_recordatori?: string
}

export interface UpdateRecordatoriRequest {
  estat: 'resolt' | 'cancelat' | 'pendent'
}

export interface InformeResumActivitat {
  activitat_nom: string
  activitat_icona: string
  activitat_color: string
  total_hores: number
}

export interface InformeDia {
  data: string
  slots: SlotEntry[]
}

export interface InformeResponse {
  atleta_id: string
  atleta_nom: string
  resum_activitats: InformeResumActivitat[]
  detall_per_dies: InformeDia[]
}

