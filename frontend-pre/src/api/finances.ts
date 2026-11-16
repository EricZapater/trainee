import api from './client'

export interface FinConfiguracioEmpresa {
  id: number
  rao_social: string
  nom_comercial: string
  nif_cif: string
  adreca: string
  cp: string
  poblacio: string
  provincia: string
  pais: string
  email_administracio: string
  telefon: string
  iban_principal: string
  logo_url: string
  peu_legal: string
  iva_defecte: number
  irpf_defecte_vendes: number
  irpf_defecte_compres: number
  saldo_inicial: number
  data_tall_saldo: string
  updated_at?: string
}

export interface FinImpost {
  id: string
  nom: string
  tipus: 'iva' | 'irpf'
  percentatge: number
  causa_exempcio: string
  per_defecte: boolean
  actiu: boolean
}

export interface FinSerie {
  id: string
  codi: string
  descripcio: string
  tipus: 'ordinaria' | 'rectificativa'
  any_fiscal: number
  prefix: string
  ultim_numero: number
  activa: boolean
}

export interface FinUnitatNegoci {
  id: string
  codi: string
  nom: string
  descripcio: string
  serie_defecte_id?: string | null
  serie_codi?: string
  activa: boolean
  ordre: number
}

export interface FinClient {
  id: string
  usuari_id?: string | null
  usuari_nom?: string
  nom_fiscal: string
  tipus_id_fiscal: string
  nif_cif: string
  adreca: string
  cp: string
  poblacio: string
  provincia: string
  pais: string
  email: string
  telefon: string
  notes: string
  actiu: boolean
}

export interface FinProveidor {
  id: string
  nom_fiscal: string
  nif_cif: string
  adreca: string
  cp: string
  poblacio: string
  provincia: string
  pais: string
  iban: string
  email: string
  telefon: string
  iva_defecte: number
  irpf_defecte: number
  unitat_negoci_defecte_id?: string | null
  entrenador_defecte_id?: string | null
  unitat_negoci_nom?: string
  entrenador_nom?: string
  notes: string
  actiu: boolean
}

export interface FinArticle {
  id: string
  codi: string
  nom: string
  descripcio: string
  categoria: string
  es_recurrent?: boolean
  periodicitat_mesos?: 1 | 3 | 6 | 12
  unitat_negoci_id: string
  unitat_negoci_nom?: string
  preu_base: number
  iva_percentatge: number
  irpf_percentatge: number
  causa_exempcio: string
  actiu: boolean
}

export interface FinSubscripcio {
  id: string
  client_id: string
  client_nom?: string
  article_id: string
  article_nom?: string
  unitat_negoci_id: string
  unitat_negoci_nom?: string
  entrenador_id?: string | null
  entrenador_nom?: string
  periodicitat_mesos: 1 | 3 | 6 | 12
  concepte_personalitzat: string
  base_imposable: number
  iva_percentatge: number
  irpf_percentatge: number
  dies_venciment: number
  data_inici: string
  propera_data_facturacio: string
  data_fi?: string | null
  activa: boolean
}

export interface FinPlaCampFita {
  id: string
  pla_camp_id: string
  ordre: number
  concepte_fita: string
  data_prevista: string
  base_imposable: number
  iva_percentatge: number
  irpf_percentatge: number
  factura_id?: string | null
  factura_numero?: string
  factura_estat?: string
}

export interface FinPlaCamp {
  id: string
  client_id: string
  client_nom?: string
  article_id?: string | null
  article_nom?: string
  unitat_negoci_id: string
  unitat_negoci_nom?: string
  entrenador_id?: string | null
  entrenador_nom?: string
  titol_camp: string
  periode_camp_inici: string
  periode_camp_fi: string
  total_base_pactada: number
  iva_percentatge: number
  irpf_percentatge: number
  estat: string
  notes: string
  fites: FinPlaCampFita[]
}

export interface FinFacturaVenda {
  id: string
  serie_id?: string | null
  serie_codi?: string
  numero_seq?: number | null
  numero_complet?: string | null
  tipus_factura: 'F1' | 'R1'
  estat_document: 'esborrany' | 'emesa'
  client_id: string
  client_nom?: string
  client_nif?: string
  subscripcio_id?: string | null
  fita_camp_id?: string | null
  factura_origen_id?: string | null
  factura_origen_num?: string
  motiu_rectificacio: string
  unitat_negoci_id: string
  unitat_negoci_nom?: string
  entrenador_id?: string | null
  entrenador_nom?: string
  article_id?: string | null
  article_nom?: string
  concepte: string
  descripcio_detall: string
  base_imposable: number
  iva_percentatge: number
  causa_exempcio: string
  iva_import: number
  irpf_percentatge: number
  irpf_import: number
  total_factura: number
  data_emissio: string
  data_venciment: string
  periode_inici: string
  periode_fi: string
  estat_cobrament: 'pendent' | 'pagada' | 'impagada' | 'compensada'
  data_conciliacio?: string | null
  data_impagament?: string | null
  motiu_impagament: string
  notes_tresoreria: string
  emesa_at?: string
}

export interface FinCompra {
  id: string
  proveidor_id: string
  proveidor_nom?: string
  proveidor_nif?: string
  num_factura_proveidor: string
  unitat_negoci_id?: string | null
  unitat_negoci_nom?: string
  entrenador_id?: string | null
  entrenador_nom?: string
  concepte: string
  base_imposable: number
  iva_percentatge: number
  iva_import: number
  irpf_percentatge: number
  irpf_import: number
  total_pagar: number
  data_emissio: string
  data_venciment: string
  periode_inici: string
  periode_fi: string
  estat_pagament: 'pendent' | 'pagada' | 'impagada'
  data_conciliacio?: string | null
  fitxer_adjunt_path: string
  notes: string
}

export interface FinDespesa {
  id: string
  categoria: string
  beneficiari_nom: string
  concepte: string
  unitat_negoci_id?: string | null
  unitat_negoci_nom?: string
  entrenador_id?: string | null
  entrenador_nom?: string
  import_total: number
  es_recurrent?: boolean
  dia_mes_generacio?: number
  data_devengo: string
  data_venciment: string
  periode_inici: string
  periode_fi: string
  estat_pagament: 'pendent' | 'pagada'
  data_conciliacio?: string | null
  fitxer_adjunt_path: string
  notes: string
}

export interface FinRecurrentSortida {
  id: string
  tipus_desti: 'compra' | 'despesa'
  proveidor_id?: string | null
  proveidor_nom?: string
  categoria_despesa: string
  beneficiari_nom: string
  concepte: string
  unitat_negoci_id: string
  unitat_negoci_nom?: string
  entrenador_id?: string | null
  entrenador_nom?: string
  periodicitat_mesos: number
  base_o_import: number
  iva_percentatge: number
  irpf_percentatge: number
  dies_venciment: number
  propera_data: string
  data_fi?: string | null
  actiu: boolean
}

export interface FinAnalyticalRow {
  group_id: string
  group_nom: string
  sub_group_id?: string
  sub_group_nom?: string
  vendes_base: number
  compres_base: number
  despeses_import: number
  resultat_net: number
  marge_pct: number
}

export interface FinInformeResultats {
  data_inici: string
  data_fi: string
  mode: 'emissio' | 'prorratejat'
  total_vendes: number
  total_compres: number
  total_despeses: number
  resultat_global: number
  marge_global_pct: number
  iva_repercutit: number
  iva_suportat: number
  irpf_retingut_compres: number
  irpf_suportat_vendes: number
  per_unitat_negoci: FinAnalyticalRow[]
  per_entrenador: FinAnalyticalRow[]
  matriu_creuada: FinAnalyticalRow[]
}

export interface FinCashflowItem {
  data: string
  tipus: 'entrada' | 'sortida'
  origen: string
  concepte: string
  tercer: string
  unitat_negoci: string
  import_liquid: number
  endarrerit: boolean
  referencia_id?: string
}

export interface FinCashflowMonthBucket {
  mes: string
  saldo_inicial: number
  entrades: number
  sortides: number
  flux_net: number
  saldo_final: number
}

export interface FinCashflowForecast {
  data_tall_saldo: string
  saldo_inicial_tall: number
  cobraments_conciliats: number
  pagaments_conciliats: number
  saldo_actual_conciliat: number
  horitzo_dies: number
  inclou_endarrerits: boolean
  endarrerits_cobrar: number
  endarrerits_pagar: number
  total_impagats_exclosos: number
  saldo_final_projectat: number
  saldo_minim_projectat: number
  data_saldo_minim: string
  evolucio_mensual: FinCashflowMonthBucket[]
  moviments_projectats: FinCashflowItem[]
}

// ============================================================
// API Methods
// ============================================================

export const getFinConfiguracio = () => api.get<FinConfiguracioEmpresa>('/finances/configuracio').then(r => r.data)
export const updateFinConfiguracio = (data: Partial<FinConfiguracioEmpresa>) => api.put<FinConfiguracioEmpresa>('/finances/configuracio', data).then(r => r.data)

export const listFinImpostos = () => api.get<FinImpost[]>('/finances/impostos').then(r => r.data)
export const createFinImpost = (data: Partial<FinImpost>) => api.post<FinImpost>('/finances/impostos', data).then(r => r.data)
export const updateFinImpost = (id: string, data: Partial<FinImpost>) => api.put<FinImpost>(`/finances/impostos/${id}`, data).then(r => r.data)
export const deleteFinImpost = (id: string) => api.delete(`/finances/impostos/${id}`).then(r => r.data)

export const listFinSeries = () => api.get<FinSerie[]>('/finances/series').then(r => r.data)
export const createFinSerie = (data: Partial<FinSerie>) => api.post<FinSerie>('/finances/series', data).then(r => r.data)
export const updateFinSerie = (id: string, data: Partial<FinSerie>) => api.put<FinSerie>(`/finances/series/${id}`, data).then(r => r.data)

export const listFinUnitatsNegoci = () => api.get<FinUnitatNegoci[]>('/finances/unitats-negoci').then(r => r.data)
export const createFinUnitatNegoci = (data: Partial<FinUnitatNegoci>) => api.post<FinUnitatNegoci>('/finances/unitats-negoci', data).then(r => r.data)
export const updateFinUnitatNegoci = (id: string, data: Partial<FinUnitatNegoci>) => api.put<FinUnitatNegoci>(`/finances/unitats-negoci/${id}`, data).then(r => r.data)

export const listFinClients = () => api.get<FinClient[]>('/finances/clients').then(r => r.data)
export const createFinClient = (data: Partial<FinClient>) => api.post<FinClient>('/finances/clients', data).then(r => r.data)
export const updateFinClient = (id: string, data: Partial<FinClient>) => api.put<FinClient>(`/finances/clients/${id}`, data).then(r => r.data)
export const syncAtletesToClients = () => api.post<{ imported_count: number }>('/finances/clients/sync-atletes').then(r => r.data)

export const listFinProveidors = () => api.get<FinProveidor[]>('/finances/proveidors').then(r => r.data)
export const createFinProveidor = (data: Partial<FinProveidor>) => api.post<FinProveidor>('/finances/proveidors', data).then(r => r.data)
export const updateFinProveidor = (id: string, data: Partial<FinProveidor>) => api.put<FinProveidor>(`/finances/proveidors/${id}`, data).then(r => r.data)

export const listFinArticles = () => api.get<FinArticle[]>('/finances/articles').then(r => r.data)
export const createFinArticle = (data: Partial<FinArticle>) => api.post<FinArticle>('/finances/articles', data).then(r => r.data)
export const updateFinArticle = (id: string, data: Partial<FinArticle>) => api.put<FinArticle>(`/finances/articles/${id}`, data).then(r => r.data)

export const listFinSubscripcions = () => api.get<FinSubscripcio[]>('/finances/subscripcions').then(r => r.data)
export const createFinSubscripcio = (data: Partial<FinSubscripcio>) => api.post<FinSubscripcio>('/finances/subscripcions', data).then(r => r.data)
export const updateFinSubscripcio = (id: string, data: Partial<FinSubscripcio>) => api.put<FinSubscripcio>(`/finances/subscripcions/${id}`, data).then(r => r.data)
export const batchGenerateSubscripcions = (cutoff_date: string) => api.post<{ drafts_created: number }>('/finances/subscripcions/generar-remesa', { cutoff_date }).then(r => r.data)

export const listFinPlansCamp = () => api.get<FinPlaCamp[]>('/finances/plans-camp').then(r => r.data)
export const createFinPlaCamp = (data: any) => api.post<FinPlaCamp>('/finances/plans-camp', data).then(r => r.data)
export const facturarCampFita = (fitaId: string) => api.post<FinFacturaVenda>(`/finances/plans-camp/fites/${fitaId}/facturar`).then(r => r.data)

export const listFinFacturesVenda = (params?: { estat_document?: string; estat_cobrament?: string; unitat_negoci_id?: string; entrenador_id?: string }) =>
  api.get<FinFacturaVenda[]>('/finances/factures', { params }).then(r => r.data)
export const getFinFacturaVenda = (id: string) => api.get<FinFacturaVenda>(`/finances/factures/${id}`).then(r => r.data)
export const createFinFacturaVenda = (data: any) => api.post<FinFacturaVenda>('/finances/factures', data).then(r => r.data)
export const updateFinFacturaVenda = (id: string, data: any) => api.put<FinFacturaVenda>(`/finances/factures/${id}`, data).then(r => r.data)
export const deleteFinFacturaVenda = (id: string) => api.delete(`/finances/factures/${id}`).then(r => r.data)
export const emetreFinFacturaVenda = (id: string, data?: { serie_id?: string; data_emissio?: string; data_venciment?: string }) =>
  api.post<FinFacturaVenda>(`/finances/factures/${id}/emetre`, data || {}).then(r => r.data)
export const conciliarFinFacturaVenda = (id: string, data: { data_conciliacio: string; notes?: string }) =>
  api.post<FinFacturaVenda>(`/finances/factures/${id}/conciliar`, data).then(r => r.data)
export const marcarImpagadaFinFacturaVenda = (id: string, data?: { data_impagament?: string; motiu_impagament?: string }) =>
  api.post<FinFacturaVenda>(`/finances/factures/${id}/marcar-impagada`, data || {}).then(r => r.data)
export const crearAbonamentFinFacturaVenda = (id: string, data: { serie_rectificativa_id?: string; motiu_rectificacio: string; base_abonar_positiva?: number; data_emissio?: string; emetre_directe?: boolean }) =>
  api.post<FinFacturaVenda>(`/finances/factures/${id}/abonament`, data).then(r => r.data)

export const listFinCompres = (params?: { estat_pagament?: string; unitat_negoci_id?: string; entrenador_id?: string }) =>
  api.get<FinCompra[]>('/finances/compres', { params }).then(r => r.data)
export const createFinCompra = (data: any) => api.post<FinCompra>('/finances/compres', data).then(r => r.data)
export const updateFinCompra = (id: string, data: any) => api.put<FinCompra>(`/finances/compres/${id}`, data).then(r => r.data)
export const deleteFinCompra = (id: string) => api.delete(`/finances/compres/${id}`).then(r => r.data)
export const conciliarFinCompra = (id: string, data: { data_conciliacio: string; notes?: string }) =>
  api.post(`/finances/compres/${id}/conciliar`, data).then(r => r.data)

export const listFinDespeses = (params?: { estat_pagament?: string; unitat_negoci_id?: string; entrenador_id?: string }) =>
  api.get<FinDespesa[]>('/finances/despeses', { params }).then(r => r.data)
export const createFinDespesa = (data: any) => api.post<FinDespesa>('/finances/despeses', data).then(r => r.data)
export const updateFinDespesa = (id: string, data: any) => api.put<FinDespesa>(`/finances/despeses/${id}`, data).then(r => r.data)
export const deleteFinDespesa = (id: string) => api.delete(`/finances/despeses/${id}`).then(r => r.data)
export const conciliarFinDespesa = (id: string, data: { data_conciliacio: string; notes?: string }) =>
  api.post(`/finances/despeses/${id}/conciliar`, data).then(r => r.data)

export const listFinRecurrentsSortida = () => api.get<FinRecurrentSortida[]>('/finances/recurrents-sortida').then(r => r.data)
export const createFinRecurrentSortida = (data: any) => api.post<FinRecurrentSortida>('/finances/recurrents-sortida', data).then(r => r.data)
export const deleteFinRecurrentSortida = (id: string) => api.delete(`/finances/recurrents-sortida/${id}`).then(r => r.data)

export const getFinInformeResultats = (params: { data_inici: string; data_fi: string; mode: 'emissio' | 'prorratejat' }) =>
  api.get<FinInformeResultats>('/finances/informes/resultats', { params }).then(r => r.data)

export const getFinCashflowForecast = (params?: { horitzo_dies?: number; inclou_endarrerits?: boolean }) =>
  api.get<FinCashflowForecast>('/finances/tresoreria/cashflow', { params }).then(r => r.data)

export const listMyFactures = () => api.get<FinFacturaVenda[]>('/perfil/factures').then(r => r.data)
export const getMyFiscalProfile = () => api.get<FinClient>('/perfil/facturacio').then(r => r.data)
export const updateMyFiscalProfile = (data: Partial<FinClient>) => api.put<FinClient>('/perfil/facturacio', data).then(r => r.data)

export const uploadFinanceDocument = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post<{ url: string }>('/finances/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data.url
}

// ==========================================
// MÒDUL RENOVAT: QUOTES, GRAELLA I CASHFLOW
// ==========================================

export interface AtletaEconomicaResponse {
  usuari_id: string
  nom: string
  cognoms: string
  email: string
  nom_fiscal?: string
  nif_cif: string
  adreca?: string
  poblacio?: string
  cp?: string
  article_quota_id?: string | null
  article_quota_nom?: string
  article_preu_base?: number
  article_iva_pct?: number
  article_total_pvp?: number
  periodicitat_mesos?: number
  centre_cost_id?: string | null
  centre_cost_nom?: string
  forma_pagament: string
  iban: string
  pausat_facturacio: boolean
  pausat_facturacio_per?: string | null
  pausat_facturacio_data?: string | null
}

export interface AtletaEconomicaRequest {
  article_quota_id?: string | null
  forma_pagament: string
  iban: string
  pausat_facturacio: boolean
  nom_fiscal?: string
  nif_cif?: string
  adreca?: string
  poblacio?: string
  cp?: string
}

export interface GraellaMesItem {
  id: string
  tipus_origen: 'quota_recurrent' | 'venciment_pactat'
  usuari_id?: string
  client_id: string
  client_nom: string
  client_nif: string
  concepte: string
  forma_pagament: string
  iban: string
  centre_cost_id?: string | null
  centre_cost_nom?: string
  article_id?: string | null
  base_imposable: number
  iva_percentatge: number
  iva_import: number
  total_pvp: number
  pausat: boolean
  data_venciment: string
  fita_id?: string | null
}

export interface GraellaMesResponse {
  mes: string
  items: GraellaMesItem[]
  total_pvp: number
  total_base: number
  total_iva: number
  count: number
}

export interface EmetreGraellaRequest {
  mes: string
  serie_id?: string
  items: {
    id: string
    tipus_origen: 'quota_recurrent' | 'venciment_pactat'
    client_id: string
    concepte: string
    base_imposable: number
    iva_percentatge: number
    fita_id?: string | null
  }[]
}

export interface EmetreGraellaResponse {
  factures_creades: number
  total_facturat: number
  factura_ids: string[]
}

export interface CashflowMonthColumn {
  month_key: string
  label: string
  tipus: 'past' | 'current' | 'future'
  saldo_inicial: number
  quotes_atletes: number
  vendes_fites: number
  compres: number
  despeses: number
  net: number
  saldo_final: number
}

export interface DynamicCashflowForecast {
  past_months: number
  future_months: number
  saldo_actual: number
  columns: CashflowMonthColumn[]
}

export const getAtletaEconomica = (id: string) =>
  api.get<AtletaEconomicaResponse>(`/finances/atletes/${id}/economica`).then(r => r.data)

export const updateAtletaEconomica = (id: string, data: AtletaEconomicaRequest) =>
  api.put<AtletaEconomicaResponse>(`/finances/atletes/${id}/economica`, data).then(r => r.data)

export const updateAtletaPausaFacturacio = (id: string, pausat: boolean) =>
  api.patch<{ message: string; pausat: boolean }>(`/finances/atletes/${id}/pausa-facturacio`, { pausat }).then(r => r.data)

export const getGraellaMes = (mes?: string) =>
  api.get<GraellaMesResponse>('/finances/graella-mes', { params: { mes } }).then(r => r.data)

export const emetreGraella = (data: EmetreGraellaRequest) =>
  api.post<EmetreGraellaResponse>('/finances/graella-mes/emetre', data).then(r => r.data)

export const generarDespesesRecurrentsMes = (mes?: string) =>
  api.post<{ despeses_creades: number }>('/finances/despeses/generar-recurrents', { mes }).then(r => r.data)

export const getDynamicCashflow = (past?: number, future?: number) =>
  api.get<DynamicCashflowForecast>('/finances/tresoreria/dynamic-cashflow', { params: { past, future } }).then(r => r.data)

