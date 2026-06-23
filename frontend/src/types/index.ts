export interface Usuari {
  id: string
  nom: string
  email: string
  rol: 'atleta' | 'entrenador' | 'admin'
  actiu: boolean
  idioma: string
  created_at: string
}

export interface Entrenador {
  id: string
  usuari_id: string | null
  nom: string
  created_at: string
}

export interface Atleta {
  id: string
  usuari_id: string
  entrenador_id: string
  created_at: string
  nom?: string
  email?: string
  actiu?: boolean
}

export interface Activitat {
  id: string
  nom: string
  icona: string
  color: string
  ordre: number
  activa: boolean
  created_at: string
}

export interface ManagedWeek {
  id: string
  entrenador_id: string
  week_start: string
  estat: 'oberta' | 'tancada' | 'traspassada' | 'inactiva'
  created_at: string
}

export interface ManagedWeekWithCount extends ManagedWeek {
  num_atletes_respost: number
}

export interface SlotEntry {
  id?: string
  submission_id?: string
  dia: number
  ordre: number
  activitat_id: string
  competicio_id?: string
  test_id?: string
  durada_hores: number
  notes?: string
  activitat_nom?: string
  activitat_icona?: string
  activitat_color?: string
}

export interface SlotData {
  activitat_id: string
  competicio_id?: string
  test_id?: string
  activitat_nom: string
  activitat_icona: string
  activitat_color: string
  durada_hores: number
  notes: string
}

export interface AuthResponse {
  token: string
  usuari: Usuari
}

export interface SubmissionRequest {
  week_start: string
  notes_setmana: string
  estat: string
  slots: {
    dia: number
    ordre: number
    activitat_id: string
    competicio_id?: string
    test_id?: string
    durada_hores: number
    notes: string
  }[]
}

export interface SubmissionResponse {
  submission_id: string
  updated_at: string
}

export interface MySubmissionResponse {
  week_start: string
  notes_setmana: string | null
  slots: SlotEntry[]
}

export interface AtletaSubmissionSummary {
  atleta_id: string
  submission_id?: string
  nom: string
  email: string
  ha_respost: boolean
  estat: string
  notes_setmana?: string
  gestionat: boolean
  slots: SlotEntry[]
}

export interface EntrenadorSubmissionsResponse {
  week_start: string
  atletes: AtletaSubmissionSummary[]
}

export interface CreateWeekRequest {
  week_start: string
}

export interface UpdateWeekRequest {
  estat: 'oberta' | 'tancada' | 'traspassada' | 'inactiva'
}

export interface CreateActivitatRequest {
  nom: string
  icona: string
  color: string
}

export interface UpdateActivitatRequest {
  nom?: string
  icona?: string
  color?: string
  activa?: boolean
}

export interface ReorderItem {
  id: string
  ordre: number
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

export interface Competicio {
  id: string
  atleta_id: string
  entrenador_id: string
  nom: string
  data: string
  tipus: string
  kms?: number
  desnivell?: number
  enllac: string
  track_gpx_path?: string
  comentaris?: string
  registrat: boolean
  estat: 'activa' | 'descartada'
  created_at: string
  atleta_nom?: string
}

export interface CreateCompeticioRequest {
  nom: string
  data: string
  tipus: string
  kms?: number
  desnivell?: number
  enllac: string
  track_gpx?: File
  comentaris?: string
}

export interface UpdateCompeticioRequest {
  nom: string
  data: string
  tipus: string
  kms?: number
  desnivell?: number
  enllac: string
  track_gpx?: File
  comentaris?: string
  estat: 'activa' | 'descartada'
}

export interface UserStatusHistory {
  id: string
  usuari_id: string
  accio: 'activate' | 'deactivate'
  changed_by: string | null
  created_at: string
}

export interface ToggleUserStatusRequest {
  actiu: boolean
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

