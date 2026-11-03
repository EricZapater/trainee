import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  Building2, 
  RefreshCw, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Eye, 
  Trash2, 
  X,
  Users,
  Percent,
  Hash,
  Briefcase,
  Tag,
  Package,
  Pencil
} from 'lucide-react'
import {
  getFinConfiguracio,
  updateFinConfiguracio,
  listFinImpostos,
  createFinImpost,
  updateFinImpost,
  deleteFinImpost,
  listFinSeries,
  createFinSerie,
  updateFinSerie,
  listFinUnitatsNegoci,
  createFinUnitatNegoci,
  updateFinUnitatNegoci,
  listFinClients,
  createFinClient,
  updateFinClient,
  syncAtletesToClients,
  listFinProveidors,
  createFinProveidor,
  updateFinProveidor,
  listFinArticles,
  createFinArticle,
  updateFinArticle,
  listFinSubscripcions,
  createFinSubscripcio,
  batchGenerateSubscripcions,
  listFinPlansCamp,
  createFinPlaCamp,
  facturarCampFita,
  listFinFacturesVenda,
  createFinFacturaVenda,
  emetreFinFacturaVenda,
  conciliarFinFacturaVenda,
  marcarImpagadaFinFacturaVenda,
  crearAbonamentFinFacturaVenda,
  deleteFinFacturaVenda,
  listFinCompres,
  createFinCompra,
  listFinDespeses,
  createFinDespesa,
  getFinInformeResultats,
  getFinCashflowForecast,
  uploadFinanceDocument,
  type FinConfiguracioEmpresa,
  type FinUnitatNegoci,
  type FinSerie,
  type FinImpost,
  type FinArticle,
  type FinClient,
  type FinProveidor,
  type FinSubscripcio,
  type FinPlaCamp,
  type FinFacturaVenda,
  type FinCompra,
  type FinDespesa,
  type FinInformeResultats,
  type FinCashflowForecast
} from '../api/finances'

type TabKey = 'resum' | 'tresoreria' | 'vendes' | 'subscripcions' | 'camps' | 'compres' | 'despeses' | 'config'

const TAB_TITLES: Record<TabKey, string> = {
  resum: 'Compte de Resultats (P&L)',
  tresoreria: 'Previsió de Caixa (Cashflow)',
  vendes: 'Vendes & Factures',
  subscripcions: 'Subscripcions Recurrents',
  camps: 'Training Camps',
  compres: 'Factures de Compra',
  despeses: 'Despeses Operatives',
  config: 'Configuració & Mestres'
}

export const FinanceAdminPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const rawTab = searchParams.get('tab') as TabKey
  const activeTab: TabKey = ['resum', 'tresoreria', 'vendes', 'subscripcions', 'camps', 'compres', 'despeses', 'config'].includes(rawTab)
    ? rawTab
    : 'resum'
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Report state (Resum P&L)
  const [reportMode, setReportMode] = useState<'emissio' | 'prorratejat'>('emissio')
  const [reportStart, setReportStart] = useState(() => `${new Date().getFullYear()}-01-01`)
  const [reportEnd, setReportEnd] = useState(() => new Date().toISOString().split('T')[0])
  const [reportData, setReportData] = useState<FinInformeResultats | null>(null)

  // Cashflow state
  const [horizonDies, setHorizonDies] = useState(90)
  const [inclouEndarrerits, setInclouEndarrerits] = useState(true)
  const [cashflowData, setCashflowData] = useState<FinCashflowForecast | null>(null)

  // Master data state
  const [config, setConfig] = useState<FinConfiguracioEmpresa | null>(null)
  const [unitats, setUnitats] = useState<FinUnitatNegoci[]>([])
  const [series, setSeries] = useState<FinSerie[]>([])
  const [impostos, setImpostos] = useState<FinImpost[]>([])
  const [articles, setArticles] = useState<FinArticle[]>([])
  const [clients, setClients] = useState<FinClient[]>([])
  const [proveidors, setProveidors] = useState<FinProveidor[]>([])
  const [activeConfigSubtab, setActiveConfigSubtab] = useState<'empresa' | 'unitats' | 'series' | 'impostos' | 'articles' | 'clients' | 'proveidors'>('empresa')

  // Modals de mestres i edició
  const [showUnitatModal, setShowUnitatModal] = useState(false)
  const [editingUnitatId, setEditingUnitatId] = useState<string | null>(null)
  const [newUnitat, setNewUnitat] = useState({ codi: '', nom: '', descripcio: '', serie_defecte_id: '', activa: true, ordre: 1 })

  const [showSerieModal, setShowSerieModal] = useState(false)
  const [editingSerieId, setEditingSerieId] = useState<string | null>(null)
  const [newSerie, setNewSerie] = useState({ codi: '', descripcio: '', tipus: 'ordinaria' as 'ordinaria' | 'rectificativa', any_fiscal: new Date().getFullYear(), prefix: '', ultim_numero: 0, activa: true })

  const [showImpostModal, setShowImpostModal] = useState(false)
  const [editingImpostId, setEditingImpostId] = useState<string | null>(null)
  const [newImpost, setNewImpost] = useState({ nom: '', tipus: 'iva' as 'iva' | 'irpf', percentatge: 21, causa_exempcio: '', per_defecte: false, actiu: true })

  const [showArticleModal, setShowArticleModal] = useState(false)
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null)
  const [newArticle, setNewArticle] = useState({ codi: '', nom: '', descripcio: '', categoria: 'entrenament_recurrent' as 'entrenament_recurrent' | 'training_camp' | 'puntual', unitat_negoci_id: '', preu_base: 0, iva_percentatge: 21, irpf_percentatge: 0, causa_exempcio: '', actiu: true })

  const [showClientModal, setShowClientModal] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [newClient, setNewClient] = useState({ nom_fiscal: '', tipus_id_fiscal: 'NIF', nif_cif: '', adreca: '', cp: '', poblacio: '', provincia: '', pais: 'Espanya', email: '', telefon: '', notes: '', actiu: true })

  const [showProveidorModal, setShowProveidorModal] = useState(false)
  const [editingProveidorId, setEditingProveidorId] = useState<string | null>(null)
  const [newProveidor, setNewProveidor] = useState({ nom_fiscal: '', nif_cif: '', adreca: '', cp: '', poblacio: '', provincia: '', pais: 'Espanya', iban: '', email: '', telefon: '', iva_defecte: 21, irpf_defecte: 0, unitat_negoci_defecte_id: '', notes: '', actiu: true })

  // Operations state
  const [factures, setFactures] = useState<FinFacturaVenda[]>([])
  const [subscripcions, setSubscripcions] = useState<FinSubscripcio[]>([])
  const [plansCamp, setPlansCamp] = useState<FinPlaCamp[]>([])
  const [compres, setCompres] = useState<FinCompra[]>([])
  const [despeses, setDespeses] = useState<FinDespesa[]>([])

  // Modals & form state
  const [showFacturaModal, setShowFacturaModal] = useState(false)
  const [newFactura, setNewFactura] = useState({
    client_id: '',
    unitat_negoci_id: '',
    concepte: '',
    base_imposable: 0,
    iva_percentatge: 21,
    irpf_percentatge: 0,
    data_emissio: new Date().toISOString().split('T')[0],
    data_venciment: new Date().toISOString().split('T')[0],
    periode_inici: new Date().toISOString().split('T')[0],
    periode_fi: new Date().toISOString().split('T')[0],
    emetre_directe: false
  })

  const [showAbonamentModal, setShowAbonamentModal] = useState<string | null>(null)
  const [abonamentMotiu, setAbonamentMotiu] = useState('')

  const [showCompraModal, setShowCompraModal] = useState(false)
  const [newCompra, setNewCompra] = useState({
    proveidor_id: '',
    num_factura_proveidor: '',
    unitat_negoci_id: '',
    concepte: '',
    base_imposable: 0,
    iva_percentatge: 21,
    irpf_percentatge: 0,
    data_emissio: new Date().toISOString().split('T')[0],
    data_venciment: new Date().toISOString().split('T')[0],
    periode_inici: new Date().toISOString().split('T')[0],
    periode_fi: new Date().toISOString().split('T')[0],
    fitxer_adjunt_path: ''
  })

  const [showDespesaModal, setShowDespesaModal] = useState(false)
  const [newDespesa, setNewDespesa] = useState({
    categoria: 'banc' as const,
    beneficiari_nom: '',
    concepte: '',
    unitat_negoci_id: '',
    import_total: 0,
    data_devengo: new Date().toISOString().split('T')[0],
    data_venciment: new Date().toISOString().split('T')[0],
    periode_inici: new Date().toISOString().split('T')[0],
    periode_fi: new Date().toISOString().split('T')[0]
  })

  const [showSubModal, setShowSubModal] = useState(false)
  const [newSub, setNewSub] = useState({
    client_id: '',
    article_id: '',
    unitat_negoci_id: '',
    periodicitat_mesos: 1 as 1 | 3 | 6 | 12,
    concepte_personalitzat: '',
    base_imposable: 0,
    iva_percentatge: 21,
    irpf_percentatge: 0,
    dies_venciment: 5,
    data_inici: new Date().toISOString().split('T')[0],
    propera_data_facturacio: new Date().toISOString().split('T')[0],
    activa: true
  })

  const [showCampModal, setShowCampModal] = useState(false)
  const [newCamp, setNewCamp] = useState<{
    client_id: string
    article_id?: string
    unitat_negoci_id: string
    entrenador_id?: string
    titol_camp: string
    periode_camp_inici: string
    periode_camp_fi: string
    total_base_pactada: number
    iva_percentatge: number
    irpf_percentatge: number
    notes?: string
    fites: Array<{
      ordre: number
      concepte_fita: string
      data_prevista: string
      base_imposable: number
      iva_percentatge: number
      irpf_percentatge: number
    }>
  }>({
    client_id: '',
    article_id: '',
    unitat_negoci_id: '',
    entrenador_id: '',
    titol_camp: '',
    periode_camp_inici: new Date().toISOString().split('T')[0],
    periode_camp_fi: new Date().toISOString().split('T')[0],
    total_base_pactada: 0,
    iva_percentatge: 21,
    irpf_percentatge: 0,
    notes: '',
    fites: [
      { ordre: 1, concepte_fita: 'Reserva 30%', data_prevista: new Date().toISOString().split('T')[0], base_imposable: 0, iva_percentatge: 21, irpf_percentatge: 0 },
      { ordre: 2, concepte_fita: 'Pagament Final 70%', data_prevista: new Date().toISOString().split('T')[0], base_imposable: 0, iva_percentatge: 21, irpf_percentatge: 0 }
    ]
  })

  const [uploadingFile, setUploadingFile] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (activeTab === 'resum') loadReport()
    if (activeTab === 'tresoreria') loadCashflow()
    if (activeTab === 'vendes') loadFactures()
    if (activeTab === 'subscripcions') loadSubscripcions()
    if (activeTab === 'camps') loadPlansCamp()
    if (activeTab === 'compres') loadCompres()
    if (activeTab === 'despeses') loadDespeses()
  }, [activeTab, reportMode, reportStart, reportEnd, horizonDies, inclouEndarrerits])

  const showNotify = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text })
    setTimeout(() => setFeedback(null), 4000)
  }

  const loadInitialData = async () => {
    try {
      const [cfg, impList, serList, un, cl, pr, artList] = await Promise.all([
        getFinConfiguracio(),
        listFinImpostos(),
        listFinSeries(),
        listFinUnitatsNegoci(),
        listFinClients(),
        listFinProveidors(),
        listFinArticles()
      ])
      setConfig(cfg)
      setImpostos(impList || [])
      setSeries(serList || [])
      setUnitats(un || [])
      setClients(cl || [])
      setProveidors(pr || [])
      setArticles(artList || [])

      if (un && un.length > 0) {
        setNewFactura(prev => ({ ...prev, unitat_negoci_id: un[0].id }))
        setNewCompra(prev => ({ ...prev, unitat_negoci_id: un[0].id }))
        setNewDespesa(prev => ({ ...prev, unitat_negoci_id: un[0].id }))
        setNewCamp(prev => ({ ...prev, unitat_negoci_id: un[0].id }))
        setNewArticle(prev => ({ ...prev, unitat_negoci_id: un[0].id }))
      }
      if (cl && cl.length > 0) {
        setNewFactura(prev => ({ ...prev, client_id: cl[0].id }))
        setNewSub(prev => ({ ...prev, client_id: cl[0].id }))
        setNewCamp(prev => ({ ...prev, client_id: cl[0].id }))
      }
      if (pr && pr.length > 0) {
        setNewCompra(prev => ({ ...prev, proveidor_id: pr[0].id }))
      }
      if (artList && artList.length > 0) {
        setNewSub(prev => ({
          ...prev,
          article_id: artList[0].id,
          unitat_negoci_id: artList[0].unitat_negoci_id || (un && un.length > 0 ? un[0].id : ''),
          concepte_personalitzat: artList[0].nom,
          base_imposable: artList[0].preu_base,
          iva_percentatge: artList[0].iva_percentatge
        }))
      }
    } catch (err: any) {
      console.error('Error carregant dades mestres:', err)
      showNotify('error', 'Error carregant dades inicials')
    }
  }

  const loadReport = async () => {
    setLoading(true)
    try {
      const rep = await getFinInformeResultats({
        data_inici: reportStart,
        data_fi: reportEnd,
        mode: reportMode
      })
      setReportData(rep)
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error carregant informe de resultats')
    } finally {
      setLoading(false)
    }
  }

  const loadCashflow = async () => {
    setLoading(true)
    try {
      const cf = await getFinCashflowForecast({
        horitzo_dies: horizonDies,
        inclou_endarrerits: inclouEndarrerits
      })
      setCashflowData(cf)
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error carregant previsió de caixa')
    } finally {
      setLoading(false)
    }
  }

  const loadFactures = async () => {
    setLoading(true)
    try {
      const f = await listFinFacturesVenda()
      setFactures(f)
    } catch (err: any) {
      showNotify('error', 'Error carregant factures de venda')
    } finally {
      setLoading(false)
    }
  }

  const loadSubscripcions = async () => {
    setLoading(true)
    try {
      const s = await listFinSubscripcions()
      setSubscripcions(s)
    } catch (err: any) {
      showNotify('error', 'Error carregant subscripcions')
    } finally {
      setLoading(false)
    }
  }

  const loadPlansCamp = async () => {
    setLoading(true)
    try {
      const p = await listFinPlansCamp()
      setPlansCamp(p)
    } catch (err: any) {
      showNotify('error', 'Error carregant plans de training camps')
    } finally {
      setLoading(false)
    }
  }

  const loadCompres = async () => {
    setLoading(true)
    try {
      const c = await listFinCompres()
      setCompres(c)
    } catch (err: any) {
      showNotify('error', 'Error carregant compres')
    } finally {
      setLoading(false)
    }
  }

  const loadDespeses = async () => {
    setLoading(true)
    try {
      const d = await listFinDespeses()
      setDespeses(d)
    } catch (err: any) {
      showNotify('error', 'Error carregant despeses')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFactura = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createFinFacturaVenda(newFactura)
      showNotify('success', newFactura.emetre_directe ? 'Factura emesa correctament!' : 'Esborrany de factura creat!')
      setShowFacturaModal(false)
      loadFactures()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error creant la factura')
    }
  }

  const handleEmetreFactura = async (id: string) => {
    if (!window.confirm('Segur que vols emetre aquesta factura? S\'assignarà número correlatiu de sèrie i no es podrà modificar.')) return
    try {
      await emetreFinFacturaVenda(id)
      showNotify('success', 'Factura emesa amb èxit!')
      loadFactures()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error emetent la factura')
    }
  }

  const handleConciliarFactura = async (id: string) => {
    const dataConc = window.prompt('Introdueix la data real de validació al banc (YYYY-MM-DD):', new Date().toISOString().split('T')[0])
    if (!dataConc) return
    try {
      await conciliarFinFacturaVenda(id, { data_conciliacio: dataConc })
      showNotify('success', 'Cobrament conciliat i validat a caixa!')
      loadFactures()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error conciliant la factura')
    }
  }

  const handleMarcarImpagada = async (id: string) => {
    const motiu = window.prompt('Motiu de l\'impagat o incidència:')
    if (motiu === null) return
    try {
      await marcarImpagadaFinFacturaVenda(id, { motiu_impagament: motiu })
      showNotify('success', 'Factura marcada com a impagada')
      loadFactures()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error marcant impagat')
    }
  }

  const handleCrearAbonament = async () => {
    if (!showAbonamentModal || !abonamentMotiu) return
    try {
      await crearAbonamentFinFacturaVenda(showAbonamentModal, {
        motiu_rectificacio: abonamentMotiu,
        emetre_directe: true
      })
      showNotify('success', 'Factura Rectificativa (Abonament) emesa correctament!')
      setShowAbonamentModal(null)
      setAbonamentMotiu('')
      loadFactures()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error creant l\'abonament')
    }
  }

  const handleDeleteFactura = async (id: string) => {
    if (!window.confirm('Vols eliminar aquest esborrany?')) return
    try {
      await deleteFinFacturaVenda(id)
      showNotify('success', 'Esborrany eliminat')
      loadFactures()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error eliminant esborrany')
    }
  }

  const handleCreateCompra = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createFinCompra(newCompra)
      showNotify('success', 'Factura de compra registrada!')
      setShowCompraModal(false)
      loadCompres()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error registrant la compra')
    }
  }

  const handleCreateDespesa = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createFinDespesa(newDespesa)
      showNotify('success', 'Despesa registrada correctament!')
      setShowDespesaModal(false)
      loadDespeses()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error registrant la despesa')
    }
  }

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createFinSubscripcio(newSub)
      showNotify('success', 'Subscripció recurrent activada!')
      setShowSubModal(false)
      loadSubscripcions()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error creant subscripció')
    }
  }

  const handleBatchGenerateSubs = async () => {
    const cutoff = window.prompt('Generar esborranys per a subscripcions amb venciment fins a (YYYY-MM-DD):', new Date().toISOString().split('T')[0])
    if (!cutoff) return
    try {
      const res = await batchGenerateSubscripcions(cutoff)
      showNotify('success', `S'han generat ${res.drafts_created} esborranys de factura pendents de revisió!`)
      loadFactures()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error generant la remesa')
    }
  }

  const openCreateCamp = () => {
    const today = new Date().toISOString().split('T')[0]
    const campArticle = articles.find(a => a.categoria === 'training_camp') || articles[0]
    const defUnitat = campArticle?.unitat_negoci_id || unitats[0]?.id || ''
    const basePreu = campArticle?.preu_base || 0
    const p1 = Math.round(basePreu * 0.3 * 100) / 100
    const p2 = Math.round((basePreu - p1) * 100) / 100

    setNewCamp({
      client_id: clients[0]?.id || '',
      article_id: campArticle?.id || '',
      unitat_negoci_id: defUnitat,
      entrenador_id: '',
      titol_camp: campArticle?.nom || '',
      periode_camp_inici: today,
      periode_camp_fi: today,
      total_base_pactada: basePreu,
      iva_percentatge: campArticle?.iva_percentatge ?? 21,
      irpf_percentatge: 0,
      notes: '',
      fites: basePreu > 0 ? [
        { ordre: 1, concepte_fita: 'Reserva 30%', data_prevista: today, base_imposable: p1, iva_percentatge: campArticle?.iva_percentatge ?? 21, irpf_percentatge: 0 },
        { ordre: 2, concepte_fita: 'Pagament Final 70%', data_prevista: today, base_imposable: p2, iva_percentatge: campArticle?.iva_percentatge ?? 21, irpf_percentatge: 0 }
      ] : [
        { ordre: 1, concepte_fita: 'Reserva 30%', data_prevista: today, base_imposable: 0, iva_percentatge: 21, irpf_percentatge: 0 },
        { ordre: 2, concepte_fita: 'Pagament Final 70%', data_prevista: today, base_imposable: 0, iva_percentatge: 21, irpf_percentatge: 0 }
      ]
    })
    setShowCampModal(true)
  }

  const addFitaCamp = () => {
    const nextOrdre = newCamp.fites.length + 1
    const defaultData = newCamp.periode_camp_inici || new Date().toISOString().split('T')[0]
    setNewCamp(prev => ({
      ...prev,
      fites: [
        ...prev.fites,
        {
          ordre: nextOrdre,
          concepte_fita: `Pagament ${nextOrdre}`,
          data_prevista: defaultData,
          base_imposable: 0,
          iva_percentatge: prev.iva_percentatge,
          irpf_percentatge: prev.irpf_percentatge
        }
      ]
    }))
  }

  const removeFitaCamp = (index: number) => {
    if (newCamp.fites.length <= 1) return
    const updated = newCamp.fites.filter((_, i) => i !== index).map((f, i) => ({ ...f, ordre: i + 1 }))
    setNewCamp(prev => ({ ...prev, fites: updated }))
  }

  const applyPresetCamp = (preset: '1' | '2' | '3' | '4' | 'iguals') => {
    const tot = newCamp.total_base_pactada || 0
    const dt = newCamp.periode_camp_inici || new Date().toISOString().split('T')[0]
    const iva = newCamp.iva_percentatge
    const irpf = newCamp.irpf_percentatge

    if (preset === '1') {
      setNewCamp(prev => ({
        ...prev,
        fites: [
          { ordre: 1, concepte_fita: 'Pagament Únic (100%)', data_prevista: dt, base_imposable: tot, iva_percentatge: iva, irpf_percentatge: irpf }
        ]
      }))
    } else if (preset === '2') {
      const p1 = Math.round(tot * 0.3 * 100) / 100
      const p2 = Math.round((tot - p1) * 100) / 100
      setNewCamp(prev => ({
        ...prev,
        fites: [
          { ordre: 1, concepte_fita: 'Reserva 30%', data_prevista: dt, base_imposable: p1, iva_percentatge: iva, irpf_percentatge: irpf },
          { ordre: 2, concepte_fita: 'Pagament Final 70%', data_prevista: dt, base_imposable: p2, iva_percentatge: iva, irpf_percentatge: irpf }
        ]
      }))
    } else if (preset === '3') {
      const p1 = Math.round(tot * 0.3 * 100) / 100
      const p2 = Math.round(tot * 0.35 * 100) / 100
      const p3 = Math.round((tot - p1 - p2) * 100) / 100
      setNewCamp(prev => ({
        ...prev,
        fites: [
          { ordre: 1, concepte_fita: 'Reserva 30%', data_prevista: dt, base_imposable: p1, iva_percentatge: iva, irpf_percentatge: irpf },
          { ordre: 2, concepte_fita: '2n Pagament 35%', data_prevista: dt, base_imposable: p2, iva_percentatge: iva, irpf_percentatge: irpf },
          { ordre: 3, concepte_fita: 'Pagament Final 35%', data_prevista: dt, base_imposable: p3, iva_percentatge: iva, irpf_percentatge: irpf }
        ]
      }))
    } else if (preset === '4') {
      const p1 = Math.round(tot * 0.25 * 100) / 100
      const p2 = p1
      const p3 = p1
      const p4 = Math.round((tot - p1 - p2 - p3) * 100) / 100
      setNewCamp(prev => ({
        ...prev,
        fites: [
          { ordre: 1, concepte_fita: '1r Pagament (Reserva 25%)', data_prevista: dt, base_imposable: p1, iva_percentatge: iva, irpf_percentatge: irpf },
          { ordre: 2, concepte_fita: '2n Pagament (25%)', data_prevista: dt, base_imposable: p2, iva_percentatge: iva, irpf_percentatge: irpf },
          { ordre: 3, concepte_fita: '3r Pagament (25%)', data_prevista: dt, base_imposable: p3, iva_percentatge: iva, irpf_percentatge: irpf },
          { ordre: 4, concepte_fita: '4t Pagament Final (25%)', data_prevista: dt, base_imposable: p4, iva_percentatge: iva, irpf_percentatge: irpf }
        ]
      }))
    } else if (preset === 'iguals') {
      const n = newCamp.fites.length || 1
      const part = Math.round((tot / n) * 100) / 100
      const updated = newCamp.fites.map((f, i) => {
        if (i === n - 1) {
          return { ...f, base_imposable: Math.round((tot - part * (n - 1)) * 100) / 100 }
        }
        return { ...f, base_imposable: part }
      })
      setNewCamp(prev => ({ ...prev, fites: updated }))
    }
  }

  const adjustLastFitaCamp = () => {
    const tot = newCamp.total_base_pactada || 0
    if (newCamp.fites.length === 0) return
    const others = newCamp.fites.slice(0, -1).reduce((acc, f) => acc + (f.base_imposable || 0), 0)
    const diff = Math.round((tot - others) * 100) / 100
    const updated = [...newCamp.fites]
    updated[updated.length - 1].base_imposable = diff >= 0 ? diff : 0
    setNewCamp(prev => ({ ...prev, fites: updated }))
  }

  const adjustTotalToFitesCamp = () => {
    const sum = Math.round(newCamp.fites.reduce((acc, f) => acc + (f.base_imposable || 0), 0) * 100) / 100
    setNewCamp(prev => ({ ...prev, total_base_pactada: sum }))
  }

  const handleCreateCamp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCamp.fites || newCamp.fites.length === 0) {
      showNotify('error', 'Cal definir com a mínim 1 fita de pagament')
      return
    }
    const sumaFites = Math.round(newCamp.fites.reduce((acc, f) => acc + (f.base_imposable || 0), 0) * 100) / 100
    const totalPactat = Math.round((newCamp.total_base_pactada || 0) * 100) / 100
    if (Math.abs(sumaFites - totalPactat) > 0.05) {
      showNotify('error', `La suma de les fites (${sumaFites.toFixed(2)} €) no coincideix amb el total pactat (${totalPactat.toFixed(2)} €). Ajusta-ho abans de desar.`)
      return
    }
    try {
      const payload = {
        ...newCamp,
        unitat_negoci_id: newCamp.unitat_negoci_id || unitats[0]?.id || '',
        article_id: newCamp.article_id ? newCamp.article_id : null,
        entrenador_id: newCamp.entrenador_id ? newCamp.entrenador_id : null
      }
      await createFinPlaCamp(payload as any)
      showNotify('success', 'Pla de Training Camp registrat amb les seves fites!')
      setShowCampModal(false)
      loadPlansCamp()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error creant el Training Camp')
    }
  }

  // 1. Unitats
  const openCreateUnitat = () => {
    setEditingUnitatId(null)
    setNewUnitat({ codi: '', nom: '', descripcio: '', serie_defecte_id: '', activa: true, ordre: unitats.length + 1 })
    setShowUnitatModal(true)
  }
  const openEditUnitat = (u: FinUnitatNegoci) => {
    setEditingUnitatId(u.id)
    setNewUnitat({ codi: u.codi, nom: u.nom, descripcio: u.descripcio || '', serie_defecte_id: u.serie_defecte_id || '', activa: u.activa, ordre: u.ordre || 1 })
    setShowUnitatModal(true)
  }
  const handleSaveUnitat = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...newUnitat,
        serie_defecte_id: newUnitat.serie_defecte_id ? newUnitat.serie_defecte_id : null
      }
      if (editingUnitatId) {
        await updateFinUnitatNegoci(editingUnitatId, payload)
        showNotify('success', 'Unitat de negoci actualitzada correctament!')
      } else {
        await createFinUnitatNegoci(payload)
        showNotify('success', 'Unitat de negoci creada correctament!')
      }
      setShowUnitatModal(false)
      const un = await listFinUnitatsNegoci()
      setUnitats(un)
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error desant unitat de negoci')
    }
  }

  // 2. Sèries
  const openCreateSerie = () => {
    setEditingSerieId(null)
    setNewSerie({ codi: '', descripcio: '', tipus: 'ordinaria', any_fiscal: new Date().getFullYear(), prefix: '', ultim_numero: 0, activa: true })
    setShowSerieModal(true)
  }
  const openEditSerie = (s: FinSerie) => {
    setEditingSerieId(s.id)
    setNewSerie({ codi: s.codi, descripcio: s.descripcio || '', tipus: s.tipus, any_fiscal: s.any_fiscal, prefix: s.prefix || '', ultim_numero: s.ultim_numero || 0, activa: s.activa })
    setShowSerieModal(true)
  }
  const handleSaveSerie = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingSerieId) {
        await updateFinSerie(editingSerieId, newSerie)
        showNotify('success', 'Sèrie de facturació actualitzada!')
      } else {
        await createFinSerie(newSerie)
        showNotify('success', 'Sèrie de facturació creada!')
      }
      setShowSerieModal(false)
      const s = await listFinSeries()
      setSeries(s)
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error desant sèrie')
    }
  }

  // 3. Impostos
  const openCreateImpost = () => {
    setEditingImpostId(null)
    setNewImpost({ nom: '', tipus: 'iva', percentatge: 21, causa_exempcio: '', per_defecte: false, actiu: true })
    setShowImpostModal(true)
  }
  const openEditImpost = (imp: FinImpost) => {
    setEditingImpostId(imp.id)
    setNewImpost({ nom: imp.nom, tipus: imp.tipus, percentatge: imp.percentatge, causa_exempcio: imp.causa_exempcio || '', per_defecte: imp.per_defecte, actiu: imp.actiu })
    setShowImpostModal(true)
  }
  const handleSaveImpost = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingImpostId) {
        await updateFinImpost(editingImpostId, newImpost)
        showNotify('success', 'Tipus tributari actualitzat!')
      } else {
        await createFinImpost(newImpost)
        showNotify('success', 'Tipus tributari afegit!')
      }
      setShowImpostModal(false)
      const imp = await listFinImpostos()
      setImpostos(imp)
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error desant impost')
    }
  }

  const handleDeleteImpost = async (id: string) => {
    if (!window.confirm('Vols desactivar/eliminar aquest tipus d\'IVA?')) return
    try {
      await deleteFinImpost(id)
      showNotify('success', 'Tipus d\'impost eliminat')
      const imp = await listFinImpostos()
      setImpostos(imp)
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error eliminant impost')
    }
  }

  // 4. Articles
  const openCreateArticle = () => {
    setEditingArticleId(null)
    setNewArticle({ codi: '', nom: '', descripcio: '', categoria: 'entrenament_recurrent', unitat_negoci_id: unitats[0]?.id || '', preu_base: 0, iva_percentatge: 21, irpf_percentatge: 0, causa_exempcio: '', actiu: true })
    setShowArticleModal(true)
  }
  const openEditArticle = (a: FinArticle) => {
    setEditingArticleId(a.id)
    setNewArticle({ codi: a.codi || '', nom: a.nom, descripcio: a.descripcio || '', categoria: a.categoria, unitat_negoci_id: a.unitat_negoci_id, preu_base: a.preu_base, iva_percentatge: a.iva_percentatge, irpf_percentatge: a.irpf_percentatge || 0, causa_exempcio: a.causa_exempcio || '', actiu: a.actiu })
    setShowArticleModal(true)
  }
  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingArticleId) {
        await updateFinArticle(editingArticleId, newArticle)
        showNotify('success', 'Article / Servei actualitzat correctament!')
      } else {
        await createFinArticle(newArticle)
        showNotify('success', 'Article / Servei creat al catàleg!')
      }
      setShowArticleModal(false)
      const arts = await listFinArticles()
      setArticles(arts)
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error desant article')
    }
  }

  // 5. Clients
  const openCreateClient = () => {
    setEditingClientId(null)
    setNewClient({ nom_fiscal: '', tipus_id_fiscal: 'NIF', nif_cif: '', adreca: '', cp: '', poblacio: '', provincia: '', pais: 'Espanya', email: '', telefon: '', notes: '', actiu: true })
    setShowClientModal(true)
  }
  const openEditClient = (c: FinClient) => {
    setEditingClientId(c.id)
    setNewClient({ nom_fiscal: c.nom_fiscal, tipus_id_fiscal: c.tipus_id_fiscal || 'NIF', nif_cif: c.nif_cif || '', adreca: c.adreca || '', cp: c.cp || '', poblacio: c.poblacio || '', provincia: c.provincia || '', pais: c.pais || 'Espanya', email: c.email || '', telefon: c.telefon || '', notes: c.notes || '', actiu: c.actiu })
    setShowClientModal(true)
  }
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingClientId) {
        await updateFinClient(editingClientId, newClient)
        showNotify('success', 'Client fiscal actualitzat!')
      } else {
        await createFinClient(newClient)
        showNotify('success', 'Client fiscal creat!')
      }
      setShowClientModal(false)
      const cl = await listFinClients()
      setClients(cl)
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error desant client')
    }
  }

  // 6. Proveïdors
  const openCreateProveidor = () => {
    setEditingProveidorId(null)
    setNewProveidor({ nom_fiscal: '', nif_cif: '', adreca: '', cp: '', poblacio: '', provincia: '', pais: 'Espanya', iban: '', email: '', telefon: '', iva_defecte: 21, irpf_defecte: 0, unitat_negoci_defecte_id: '', notes: '', actiu: true })
    setShowProveidorModal(true)
  }
  const openEditProveidor = (p: FinProveidor) => {
    setEditingProveidorId(p.id)
    setNewProveidor({ nom_fiscal: p.nom_fiscal, nif_cif: p.nif_cif || '', adreca: p.adreca || '', cp: p.cp || '', poblacio: p.poblacio || '', provincia: p.provincia || '', pais: p.pais || 'Espanya', iban: p.iban || '', email: p.email || '', telefon: p.telefon || '', iva_defecte: p.iva_defecte || 21, irpf_defecte: p.irpf_defecte || 0, unitat_negoci_defecte_id: p.unitat_negoci_defecte_id || '', notes: p.notes || '', actiu: p.actiu })
    setShowProveidorModal(true)
  }
  const handleSaveProveidor = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingProveidorId) {
        await updateFinProveidor(editingProveidorId, newProveidor)
        showNotify('success', 'Proveïdor fiscal actualitzat!')
      } else {
        await createFinProveidor(newProveidor)
        showNotify('success', 'Proveïdor fiscal registrat!')
      }
      setShowProveidorModal(false)
      const pr = await listFinProveidors()
      setProveidors(pr)
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error desant proveïdor')
    }
  }

  const handleFacturarFita = async (fitaId: string) => {
    if (!window.confirm('Vols generar una factura independent per a aquest termini de pagament?')) return
    try {
      await facturarCampFita(fitaId)
      showNotify('success', 'Factura generada per a la fita del Camp!')
      loadPlansCamp()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error facturant la fita')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'compra') => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      const url = await uploadFinanceDocument(file)
      if (target === 'compra') {
        setNewCompra(prev => ({ ...prev, fitxer_adjunt_path: url }))
      }
      showNotify('success', 'Fitxer adjuntat amb èxit!')
    } catch (err: any) {
      showNotify('error', 'Error pujant document')
    } finally {
      setUploadingFile(false)
    }
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Toast Notification */}
      {feedback && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border animate-fade-in ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span className="text-sm font-semibold">{feedback.text}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="glass-card p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Mòdul d'Administració & Tresoreria
            </span>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Veri*factu Ready
            </span>
            {loading && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" /> Carregant...
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight mt-1 flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-emerald-600" />
            Finances & Resultats Analítics
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            1 NIF/CIF fiscal, 3 Unitats de Negoci, Facturació d'Entrenaments i Camps, Compres, Despeses i Previsió de Caixa.
          </p>
        </div>

        {/* Action Shortcut segons la secció activa */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'vendes' && (
            <button
              onClick={() => setShowFacturaModal(true)}
              className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nova Venda
            </button>
          )}
          {activeTab === 'compres' && (
            <button
              onClick={() => setShowCompraModal(true)}
              className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 shadow-sm text-white"
            >
              <Plus className="w-4 h-4" /> Nova Compra
            </button>
          )}
          {activeTab === 'despeses' && (
            <button
              onClick={() => setShowDespesaModal(true)}
              className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 shadow-sm text-white"
            >
              <Plus className="w-4 h-4" /> Nova Despesa
            </button>
          )}
          {activeTab === 'subscripcions' && (
            <button
              onClick={() => setShowSubModal(true)}
              className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nova Subscripció
            </button>
          )}
          {activeTab === 'camps' && (
            <button
              onClick={openCreateCamp}
              className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nou Pla de Camp
            </button>
          )}
        </div>
      </div>

      {/* Current section indicator */}
      <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary border-b border-border pb-3">
        <span className="text-text-muted">Administració</span>
        <span className="text-text-muted">/</span>
        <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full font-bold border border-emerald-200">
          {TAB_TITLES[activeTab]}
        </span>
      </div>

      {/* TAB 1: RESUM ANALÍTIC (P&L) */}
      {activeTab === 'resum' && (
        <div className="space-y-6">
          {/* Filter Bar with Toggle: Emissió vs Prorratejat */}
          <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500">Criteri d'Imputació:</span>
              <div className="bg-slate-100 p-0.5 rounded-xl flex border border-slate-200">
                <button
                  onClick={() => setReportMode('emissio')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    reportMode === 'emissio' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ingrés/Despesa Facturat (Fiscal)
                </button>
                <button
                  onClick={() => setReportMode('prorratejat')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    reportMode === 'prorratejat' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Xifra de Negoci Prorratejada (Meriteig)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={reportStart}
                onChange={e => setReportStart(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-border-light text-xs font-semibold bg-white"
              />
              <span className="text-xs text-slate-400">a</span>
              <input
                type="date"
                value={reportEnd}
                onChange={e => setReportEnd(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-border-light text-xs font-semibold bg-white"
              />
              <a
                href={`/api/finances/informes/resultats/csv?data_inici=${reportStart}&data_fi=${reportEnd}&mode=${reportMode}`}
                download
                className="p-1.5 rounded-xl bg-white border border-border-light text-slate-700 hover:text-emerald-700 shadow-sm text-xs font-bold flex items-center gap-1"
                title="Descarregar CSV per a gestoria"
              >
                <Download className="w-4 h-4" /> CSV
              </a>
            </div>
          </div>

          {/* KPI Cards */}
          {reportData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-5 border-l-4 border-l-emerald-500">
                <div className="text-xs font-bold uppercase text-slate-400">Vendes Netes (Bases)</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{reportData.total_vendes.toFixed(2)} €</div>
                <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">IVA rep: {reportData.iva_repercutit.toFixed(2)} €</div>
              </div>

              <div className="glass-card p-5 border-l-4 border-l-rose-500">
                <div className="text-xs font-bold uppercase text-slate-400">Compres de Proveïdors</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{reportData.total_compres.toFixed(2)} €</div>
                <div className="text-[11px] text-rose-600 font-semibold mt-0.5">IVA sup: {reportData.iva_suportat.toFixed(2)} €</div>
              </div>

              <div className="glass-card p-5 border-l-4 border-l-amber-500">
                <div className="text-xs font-bold uppercase text-slate-400">Despeses No Facturables</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{reportData.total_despeses.toFixed(2)} €</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Nòmines, banc, impostos</div>
              </div>

              <div className={`glass-card p-5 border-l-4 ${reportData.resultat_global >= 0 ? 'border-l-indigo-500' : 'border-l-red-600'}`}>
                <div className="text-xs font-bold uppercase text-slate-400">Resultat Net (Marge)</div>
                <div className={`text-2xl font-black mt-1 ${reportData.resultat_global >= 0 ? 'text-indigo-900' : 'text-red-600'}`}>
                  {reportData.resultat_global.toFixed(2)} €
                </div>
                <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                  Rendibilitat: {reportData.marge_global_pct.toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {/* Results by Business Unit */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border-light bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" /> Rendibilitat per Unitat de Negoci
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-light text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-2.5 px-4">Unitat de Negoci</th>
                    <th className="py-2.5 px-4 text-right">Vendes Base</th>
                    <th className="py-2.5 px-4 text-right">Compres Base</th>
                    <th className="py-2.5 px-4 text-right">Despeses</th>
                    <th className="py-2.5 px-4 text-right">Resultat Net</th>
                    <th className="py-2.5 px-4 text-right">Marge %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light font-medium">
                  {reportData?.per_unitat_negoci.map(u => (
                    <tr key={u.group_id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-bold text-slate-800">{u.group_nom}</td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-bold">{u.vendes_base.toFixed(2)} €</td>
                      <td className="py-3 px-4 text-right text-rose-700">{u.compres_base.toFixed(2)} €</td>
                      <td className="py-3 px-4 text-right text-amber-700">{u.despeses_import.toFixed(2)} €</td>
                      <td className={`py-3 px-4 text-right font-black ${u.resultat_net >= 0 ? 'text-indigo-900' : 'text-rose-600'}`}>
                        {u.resultat_net.toFixed(2)} €
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-700">{u.marge_pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results by Coach */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border-light bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" /> Rendibilitat per Entrenador / Estructura
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-light text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-2.5 px-4">Entrenador / Concepte</th>
                    <th className="py-2.5 px-4 text-right">Vendes Generades</th>
                    <th className="py-2.5 px-4 text-right">Factura / Nòmina Tècnic</th>
                    <th className="py-2.5 px-4 text-right">Altres Despeses</th>
                    <th className="py-2.5 px-4 text-right">Marge Net (€)</th>
                    <th className="py-2.5 px-4 text-right">Marge %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light font-medium">
                  {reportData?.per_entrenador.map(c => (
                    <tr key={c.group_id} className={`hover:bg-slate-50/60 ${c.group_id === '__none__' ? 'bg-slate-50/40 font-semibold' : ''}`}>
                      <td className="py-3 px-4 font-bold text-slate-800">{c.group_nom}</td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-bold">{c.vendes_base.toFixed(2)} €</td>
                      <td className="py-3 px-4 text-right text-rose-700">{c.compres_base.toFixed(2)} €</td>
                      <td className="py-3 px-4 text-right text-amber-700">{c.despeses_import.toFixed(2)} €</td>
                      <td className={`py-3 px-4 text-right font-black ${c.resultat_net >= 0 ? 'text-indigo-900' : 'text-rose-600'}`}>
                        {c.resultat_net.toFixed(2)} €
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-700">{c.marge_pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PREVISIÓ DE CAIXA (CASHFLOW) */}
      {activeTab === 'tresoreria' && cashflowData && (
        <div className="space-y-6">
          <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">Horitzó de projecció:</span>
              <div className="flex items-center gap-1">
                {[30, 60, 90, 180, 365].map(d => (
                  <button
                    key={d}
                    onClick={() => setHorizonDies(d)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      horizonDies === d ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {d} dies
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={inclouEndarrerits}
                onChange={e => setInclouEndarrerits(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Incloure documents endarrerits pendents</span>
            </label>
          </div>

          {/* Saldo summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-5">
              <div className="text-xs font-bold uppercase text-slate-400">Saldo Bancari Real Conciliat</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{cashflowData.saldo_actual_conciliat.toFixed(2)} €</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Saldo inicial ({cashflowData.saldo_inicial_tall.toFixed(2)} €) + Conciliats</div>
            </div>

            <div className="glass-card p-5">
              <div className="text-xs font-bold uppercase text-slate-400">Saldo Final Projectat ({horizonDies}d)</div>
              <div className={`text-2xl font-black mt-1 ${cashflowData.saldo_final_projectat >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {cashflowData.saldo_final_projectat.toFixed(2)} €
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Inclou recurrents i impostos trimestrals</div>
            </div>

            <div className="glass-card p-5">
              <div className="text-xs font-bold uppercase text-slate-400">Punt de Màxima Tensió de Caixa</div>
              <div className={`text-2xl font-black mt-1 ${cashflowData.saldo_minim_projectat >= 0 ? 'text-indigo-900' : 'text-rose-600'}`}>
                {cashflowData.saldo_minim_projectat.toFixed(2)} €
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Data mínima prevista: {cashflowData.data_saldo_minim}</div>
            </div>
          </div>

          {/* Monthly buckets */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border-light bg-slate-50 font-bold text-sm text-slate-800">
              Evolució Mensual de Tresoreria (Entrades vs Sortides)
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-light text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-4">Mes</th>
                  <th className="py-2.5 px-4 text-right">Saldo Inicial</th>
                  <th className="py-2.5 px-4 text-right">Entrades Líquides</th>
                  <th className="py-2.5 px-4 text-right">Sortides Líquides</th>
                  <th className="py-2.5 px-4 text-right">Flux Net</th>
                  <th className="py-2.5 px-4 text-right">Saldo Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light font-medium">
                {cashflowData.evolucio_mensual.map(m => (
                  <tr key={m.mes} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-800">{m.mes}</td>
                    <td className="py-3 px-4 text-right">{m.saldo_inicial.toFixed(2)} €</td>
                    <td className="py-3 px-4 text-right text-emerald-700 font-bold">+{m.entrades.toFixed(2)} €</td>
                    <td className="py-3 px-4 text-right text-rose-700 font-bold">-{m.sortides.toFixed(2)} €</td>
                    <td className={`py-3 px-4 text-right font-bold ${m.flux_net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {m.flux_net.toFixed(2)} €
                    </td>
                    <td className={`py-3 px-4 text-right font-black ${m.saldo_final >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                      {m.saldo_final.toFixed(2)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: VENDES & FACTURES */}
      {activeTab === 'vendes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Llibre de Factures de Venda</h2>
            <button
              onClick={() => setShowFacturaModal(true)}
              className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" /> Nova Factura
            </button>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-light text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-4">Núm. Factura</th>
                  <th className="py-2.5 px-4">Client</th>
                  <th className="py-2.5 px-4">Concepte</th>
                  <th className="py-2.5 px-4 text-right">Base Imposable</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                  <th className="py-2.5 px-4">Dates</th>
                  <th className="py-2.5 px-4">Estat</th>
                  <th className="py-2.5 px-4 text-right">Accions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light font-medium">
                {factures.map(f => {
                  const isEmesa = f.estat_document === 'emesa'
                  const isPagada = f.estat_cobrament === 'pagada'
                  const isImpagada = f.estat_cobrament === 'impagada'
                  const numDisplay = f.numero_complet || 'ESBORRANY'

                  return (
                    <tr key={f.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          {f.tipus_factura === 'R1' && <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-black">R</span>}
                          {numDisplay}
                        </div>
                        <div className="text-[10px] text-slate-400">{f.unitat_negoci_nom}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{f.client_nom}</div>
                        <div className="text-[10px] text-slate-400">{f.client_nif}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{f.concepte}</td>
                      <td className="py-3 px-4 text-right font-medium">{f.base_imposable.toFixed(2)} €</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">{f.total_factura.toFixed(2)} €</td>
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        <div>Emissió: {f.data_emissio}</div>
                        <div>Venc: {f.data_venciment}</div>
                      </td>
                      <td className="py-3 px-4">
                        {!isEmesa ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Esborrany</span>
                        ) : isPagada ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Pagada
                          </span>
                        ) : isImpagada ? (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3" /> Impagada
                          </span>
                        ) : (
                          <span className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Pendent</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`/api/finances/factures/${f.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                            title="Veure Factura / Imprimir"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </a>

                          {!isEmesa && (
                            <>
                              <button
                                onClick={() => handleEmetreFactura(f.id)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold"
                              >
                                Emetre
                              </button>
                              <button
                                onClick={() => handleDeleteFactura(f.id)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                                title="Eliminar esborrany"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {isEmesa && !isPagada && (
                            <>
                              <button
                                onClick={() => handleConciliarFactura(f.id)}
                                className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold"
                                title="Conciliar pagament validat"
                              >
                                Conciliar
                              </button>
                              {!isImpagada && (
                                <button
                                  onClick={() => handleMarcarImpagada(f.id)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold"
                                >
                                  Impagat
                                </button>
                              )}
                            </>
                          )}

                          {isEmesa && f.tipus_factura !== 'R1' && (
                            <button
                              onClick={() => {
                                setShowAbonamentModal(f.id)
                                setAbonamentMotiu(`Anul·lació o devolució de la factura ${f.numero_complet || f.id.slice(0, 8)}`)
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-red-50 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold"
                              title="Crear Factura Rectificativa"
                            >
                              Abonament
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SUBSCRIPCIONS */}
      {activeTab === 'subscripcions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Motor de Subscripcions d'Entrenament</h2>
              <p className="text-xs text-slate-500">Quotes recurrents mensuals, trimestrals, semestrals i anuals</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchGenerateSubs}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Facturar pendents del mes
              </button>
              <button
                onClick={() => setShowSubModal(true)}
                className="btn-primary text-xs py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Nova Subscripció
              </button>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-light text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-4">Client</th>
                  <th className="py-2.5 px-4">Article / Servei</th>
                  <th className="py-2.5 px-4">Periodicitat</th>
                  <th className="py-2.5 px-4 text-right">Base Imposable</th>
                  <th className="py-2.5 px-4">Propera Facturació</th>
                  <th className="py-2.5 px-4">Estat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light font-medium">
                {subscripcions.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-900">{s.client_nom}</td>
                    <td className="py-3 px-4 text-slate-700">{s.concepte_personalitzat || s.article_nom}</td>
                    <td className="py-3 px-4 font-semibold text-slate-600">
                      {s.periodicitat_mesos === 1 ? 'Mensual (1m)' : s.periodicitat_mesos === 3 ? 'Trimestral (3m)' : s.periodicitat_mesos === 6 ? 'Semestral (6m)' : 'Anual (12m)'}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">{s.base_imposable.toFixed(2)} €</td>
                    <td className="py-3 px-4 text-indigo-700 font-bold">{s.propera_data_facturacio}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.activa ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {s.activa ? 'Activa' : 'Pausada'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: TRAINING CAMPS */}
      {activeTab === 'camps' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Plans de Training Camp (1 Article en N Pagaments)</h2>
              <p className="text-xs text-slate-500">Bestretes i terminis de pagament amb factura independent per no avançar l'IVA</p>
            </div>
            <button
              onClick={openCreateCamp}
              className="btn-primary text-xs py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Nou Training Camp
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plansCamp.map(p => (
              <div key={p.id} className="glass-card p-5 border border-border-light space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">{p.unitat_negoci_nom}</span>
                    <h3 className="font-bold text-base text-slate-900">{p.titol_camp}</h3>
                    <div className="text-xs text-slate-600 font-medium">Client: <strong>{p.client_nom}</strong></div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Total Pactat</div>
                    <div className="text-lg font-black text-emerald-700">{p.total_base_pactada.toFixed(2)} €</div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-2">
                  <div className="text-xs font-bold text-slate-700">Fites de Pagament Programades:</div>
                  <div className="space-y-1.5">
                    {p.fites.map(f => (
                      <div key={f.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                        <div>
                          <div className="font-semibold text-slate-800">{f.concepte_fita}</div>
                          <div className="text-[11px] text-slate-400">Previst: {f.data_prevista}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900">{f.base_imposable.toFixed(2)} €</span>
                          {f.factura_id ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                              Facturat ({f.factura_numero || 'OK'})
                            </span>
                          ) : (
                            <button
                              onClick={() => handleFacturarFita(f.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-sm"
                            >
                              Facturar Fita
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: COMPRES FISCALS */}
      {activeTab === 'compres' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Llibre de Factures de Compra i Proveïdors</h2>
            <button
              onClick={() => setShowCompraModal(true)}
              className="btn-primary text-xs py-2 px-3.5 bg-rose-600 hover:bg-rose-700 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Registrar Compra
            </button>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-light text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-4">Proveïdor</th>
                  <th className="py-2.5 px-4">Núm. Factura</th>
                  <th className="py-2.5 px-4">Concepte</th>
                  <th className="py-2.5 px-4 text-right">Base</th>
                  <th className="py-2.5 px-4 text-right">IVA</th>
                  <th className="py-2.5 px-4 text-right">IRPF Retingut</th>
                  <th className="py-2.5 px-4 text-right">Total a Pagar</th>
                  <th className="py-2.5 px-4">Estat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light font-medium">
                {compres.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-900">{c.proveidor_nom}</td>
                    <td className="py-3 px-4 text-slate-600">{c.num_factura_proveidor}</td>
                    <td className="py-3 px-4 text-slate-700">{c.concepte}</td>
                    <td className="py-3 px-4 text-right font-medium">{c.base_imposable.toFixed(2)} €</td>
                    <td className="py-3 px-4 text-right text-emerald-700">+{c.iva_import.toFixed(2)} €</td>
                    <td className="py-3 px-4 text-right text-rose-700">-{c.irpf_import.toFixed(2)} €</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">{c.total_pagar.toFixed(2)} €</td>
                    <td className="py-3 px-4">
                      {c.estat_pagament === 'pagada' ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Pagada</span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Pendent</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: DESPESES NO FACTURABLES */}
      {activeTab === 'despeses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Despeses No Facturables (Nòmines, SS, Banc, Impostos)</h2>
            <button
              onClick={() => setShowDespesaModal(true)}
              className="btn-primary text-xs py-2 px-3.5 bg-amber-600 hover:bg-amber-700 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Registrar Despesa
            </button>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-light text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-4">Categoria</th>
                  <th className="py-2.5 px-4">Beneficiari</th>
                  <th className="py-2.5 px-4">Concepte</th>
                  <th className="py-2.5 px-4 text-right">Import Total</th>
                  <th className="py-2.5 px-4">Data Devengo</th>
                  <th className="py-2.5 px-4">Estat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light font-medium">
                {despeses.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                        {d.categoria.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{d.beneficiari_nom}</td>
                    <td className="py-3 px-4 text-slate-700">{d.concepte}</td>
                    <td className="py-3 px-4 text-right font-black text-rose-700">{d.import_total.toFixed(2)} €</td>
                    <td className="py-3 px-4 text-slate-500">{d.data_devengo}</td>
                    <td className="py-3 px-4">
                      {d.estat_pagament === 'pagada' ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Pagada</span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Pendent</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: CONFIGURACIÓ & MESTRES */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Subpestanyes de Configuració */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold border-b border-border">
            {[
              { id: 'empresa', label: 'Empresa & Emissor', icon: Building2 },
              { id: 'unitats', label: 'Unitats de Negoci', icon: Briefcase },
              { id: 'series', label: 'Sèries & Comptadors', icon: Hash },
              { id: 'impostos', label: 'Tipus d\'IVA & Retencions', icon: Percent },
              { id: 'articles', label: 'Catàleg d\'Articles', icon: Package },
              { id: 'clients', label: 'Clients Fiscals', icon: Users },
              { id: 'proveidors', label: 'Proveïdors', icon: Tag },
            ].map(tab => {
              const Icon = tab.icon
              const isSelected = activeConfigSubtab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveConfigSubtab(tab.id as any)}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors ${
                    isSelected ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* SUBTAB 1: EMPRESA */}
          {activeConfigSubtab === 'empresa' && config && (
            <div className="glass-card p-6 space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-600" /> Dades Fiscals de l'Emissor (1 Sol CIF/NIF)
                  </h3>
                  <p className="text-xs text-slate-500">Aquestes dades s'imprimeixen a les capçaleres de totes les factures emeses legalment.</p>
                </div>
                <button
                  onClick={async () => {
                    await updateFinConfiguracio(config)
                    showNotify('success', 'Configuració fiscal guardada!')
                  }}
                  className="btn-primary text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  Guardar Canvis
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700">Raó Social *</label>
                  <input
                    type="text"
                    value={config.rao_social}
                    onChange={e => setConfig({ ...config, rao_social: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Nom Comercial</label>
                  <input
                    type="text"
                    value={config.nom_comercial}
                    onChange={e => setConfig({ ...config, nom_comercial: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">CIF / NIF *</label>
                  <input
                    type="text"
                    value={config.nif_cif}
                    onChange={e => setConfig({ ...config, nif_cif: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl bg-white uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Adreça Fiscal</label>
                  <input
                    type="text"
                    value={config.adreca}
                    onChange={e => setConfig({ ...config, adreca: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Població / Província</label>
                  <input
                    type="text"
                    value={config.poblacio}
                    onChange={e => setConfig({ ...config, poblacio: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Codi Postal</label>
                  <input
                    type="text"
                    value={config.cp}
                    onChange={e => setConfig({ ...config, cp: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Email d'Administració</label>
                  <input
                    type="email"
                    value={config.email_administracio}
                    onChange={e => setConfig({ ...config, email_administracio: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Telèfon de Contacte</label>
                  <input
                    type="text"
                    value={config.telefon}
                    onChange={e => setConfig({ ...config, telefon: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">IBAN Principal de Cobrament</label>
                  <input
                    type="text"
                    value={config.iban_principal}
                    onChange={e => setConfig({ ...config, iban_principal: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl bg-white font-mono"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="font-bold text-slate-700">Peu Legal de Factura (LSSI / RGPD / Veri*factu)</label>
                  <textarea
                    rows={2}
                    value={config.peu_legal}
                    onChange={e => setConfig({ ...config, peu_legal: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-xl bg-white text-xs"
                    placeholder="Inscrita al Registre Mercantil..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 2: UNITATS DE NEGOCI */}
          {activeConfigSubtab === 'unitats' && (
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-emerald-600" /> Unitats de Negoci Analítiques
                  </h3>
                  <p className="text-xs text-slate-500">Centres de cost i línies d'activitat per a totalitzacions i P&L (Ex: Entrenaments, Training Camps, etc.).</p>
                </div>
                <button
                  onClick={openCreateUnitat}
                  className="btn-primary text-xs py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Nova Unitat
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b">
                    <tr>
                      <th className="p-3">Codi</th>
                      <th className="p-3">Nom de la Unitat</th>
                      <th className="p-3">Descripció</th>
                      <th className="p-3">Sèrie Defecte</th>
                      <th className="p-3 text-center">Estat</th>
                      <th className="p-3 text-right">Accions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {unitats.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-emerald-700">{u.codi}</td>
                        <td className="p-3 font-bold text-slate-900">{u.nom}</td>
                        <td className="p-3 text-slate-600">{u.descripcio || '—'}</td>
                        <td className="p-3 font-mono text-slate-500">{u.serie_codi || 'Per defecte'}</td>
                        <td className="p-3 text-center">
                          {u.activa ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Activa</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Inactiva</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => openEditUnitat(u)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors inline-flex items-center gap-1 font-bold text-[11px]"
                            title="Editar unitat"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUBTAB 3: SÈRIES & COMPTADORS */}
          {activeConfigSubtab === 'series' && (
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Hash className="w-5 h-5 text-emerald-600" /> Sèries de Facturació, Any Fiscal & Comptadors
                  </h3>
                  <p className="text-xs text-slate-500">Numeració correlativa legal per a factures ordinàries i rectificatives (abonaments).</p>
                </div>
                <button
                  onClick={openCreateSerie}
                  className="btn-primary text-xs py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Nova Sèrie
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b">
                    <tr>
                      <th className="p-3">Codi Sèrie</th>
                      <th className="p-3">Descripció</th>
                      <th className="p-3">Tipus</th>
                      <th className="p-3">Exercici / Any</th>
                      <th className="p-3">Prefix</th>
                      <th className="p-3 text-right">Últim Número emès</th>
                      <th className="p-3 text-center">Estat</th>
                      <th className="p-3 text-right">Accions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {series.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-emerald-700">{s.codi}</td>
                        <td className="p-3 font-semibold text-slate-900">{s.descripcio}</td>
                        <td className="p-3">
                          {s.tipus === 'rectificativa' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Rectificativa (Abonament)</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Ordinària</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-600">{s.any_fiscal}</td>
                        <td className="p-3 font-mono text-slate-600">{s.prefix}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">{s.ultim_numero}</td>
                        <td className="p-3 text-center">
                          {s.activa ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Activa</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Inactiva</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => openEditSerie(s)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors inline-flex items-center gap-1 font-bold text-[11px]"
                            title="Editar sèrie i comptadors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUBTAB 4: TIPUS D'IVA & IMPOSTOS */}
          {activeConfigSubtab === 'impostos' && (
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Percent className="w-5 h-5 text-emerald-600" /> Catàleg de Tipus d'IVA & Retencions IRPF
                  </h3>
                  <p className="text-xs text-slate-500">Configuració dinàmica dels percentatges tributaris aplicables a vendes, compres i articles (gens de hardcoded).</p>
                </div>
                <button
                  onClick={openCreateImpost}
                  className="btn-primary text-xs py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Nou Tipus d'Impost
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b">
                    <tr>
                      <th className="p-3">Nom</th>
                      <th className="p-3">Tipus Tributari</th>
                      <th className="p-3 text-right">Percentatge (%)</th>
                      <th className="p-3">Exempció</th>
                      <th className="p-3 text-center">Per Defecte</th>
                      <th className="p-3 text-center">Estat</th>
                      <th className="p-3 text-right">Accions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {impostos.map(imp => (
                      <tr key={imp.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-900">{imp.nom}</td>
                        <td className="p-3 capitalize">
                          {imp.tipus === 'iva' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 uppercase">IVA</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase">IRPF</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">{imp.percentatge.toFixed(2)} %</td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">{imp.causa_exempcio || '—'}</td>
                        <td className="p-3 text-center">
                          {imp.per_defecte && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-800">Per Defecte</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {imp.actiu ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Actiu</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Inactiu</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditImpost(imp)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors inline-flex items-center gap-1 font-bold text-[11px]"
                              title="Editar impost"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => handleDeleteImpost(imp.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              title="Eliminar aquest tipus tributari"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUBTAB 5: CATÀLEG D'ARTICLES */}
          {activeConfigSubtab === 'articles' && (
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-600" /> Catàleg d'Articles & Serveis Facturables
                  </h3>
                  <p className="text-xs text-slate-500">Articles predefinits per a factures i subscripcions recurrents (preus base, tipus d'IVA i unitat de negoci).</p>
                </div>
                <button
                  onClick={openCreateArticle}
                  className="btn-primary text-xs py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Nou Article
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b">
                    <tr>
                      <th className="p-3">Codi</th>
                      <th className="p-3">Nom de l'Article</th>
                      <th className="p-3">Categoria</th>
                      <th className="p-3">Unitat Negoci</th>
                      <th className="p-3 text-right">Preu Base</th>
                      <th className="p-3 text-right">IVA (%)</th>
                      <th className="p-3 text-center">Estat</th>
                      <th className="p-3 text-right">Accions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {articles.map(art => (
                      <tr key={art.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-600">{art.codi || '—'}</td>
                        <td className="p-3 font-bold text-slate-900">{art.nom}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                            {art.categoria.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{art.unitat_negoci_nom || '—'}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700">{art.preu_base.toFixed(2)} €</td>
                        <td className="p-3 text-right font-mono text-slate-600">{art.iva_percentatge}%</td>
                        <td className="p-3 text-center">
                          {art.actiu ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Actiu</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Inactiu</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => openEditArticle(art)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors inline-flex items-center gap-1 font-bold text-[11px]"
                            title="Editar article"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUBTAB 6: CLIENTS */}
          {activeConfigSubtab === 'clients' && (
            <div className="glass-card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b gap-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-600" /> Clients Fiscals & Destinataris
                  </h3>
                  <p className="text-xs text-slate-500">Base de clients per emetre factures legals de venda i cobraments.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const res = await syncAtletesToClients()
                      showNotify('success', `S'han importat ${res.imported_count} atletes com a clients!`)
                      const cl = await listFinClients()
                      setClients(cl)
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300"
                  >
                    Sincronitzar Atletes
                  </button>
                  <button
                    onClick={openCreateClient}
                    className="btn-primary text-xs py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Nou Client
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b">
                    <tr>
                      <th className="p-3">Nom Fiscal</th>
                      <th className="p-3">NIF / CIF</th>
                      <th className="p-3">Usuari Vinculat</th>
                      <th className="p-3">Email & Telèfon</th>
                      <th className="p-3">Població</th>
                      <th className="p-3 text-center">Estat</th>
                      <th className="p-3 text-right">Accions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {clients.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-900">{c.nom_fiscal}</td>
                        <td className="p-3 font-mono text-slate-700">{c.nif_cif || '—'}</td>
                        <td className="p-3 text-slate-600">{c.usuari_nom || '—'}</td>
                        <td className="p-3 text-slate-500">{c.email || c.telefon || '—'}</td>
                        <td className="p-3 text-slate-500">{c.poblacio || '—'}</td>
                        <td className="p-3 text-center">
                          {c.actiu ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Actiu</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Inactiu</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => openEditClient(c)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors inline-flex items-center gap-1 font-bold text-[11px]"
                            title="Editar client"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUBTAB 7: PROVEÏDORS */}
          {activeConfigSubtab === 'proveidors' && (
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-emerald-600" /> Proveïdors Fiscals de Compra
                  </h3>
                  <p className="text-xs text-slate-500">Mestres de proveïdors per a despeses i factures de compra rebudes.</p>
                </div>
                <button
                  onClick={openCreateProveidor}
                  className="btn-primary text-xs py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Nou Proveïdor
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b">
                    <tr>
                      <th className="p-3">Nom Fiscal</th>
                      <th className="p-3">NIF / CIF</th>
                      <th className="p-3">IBAN</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">IVA Defecte</th>
                      <th className="p-3 text-center">Estat</th>
                      <th className="p-3 text-right">Accions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {proveidors.map(pr => (
                      <tr key={pr.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-900">{pr.nom_fiscal}</td>
                        <td className="p-3 font-mono text-slate-700">{pr.nif_cif || '—'}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">{pr.iban || '—'}</td>
                        <td className="p-3 text-slate-500">{pr.email || '—'}</td>
                        <td className="p-3 font-mono font-bold text-slate-700">{pr.iva_defecte}%</td>
                        <td className="p-3 text-center">
                          {pr.actiu ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Actiu</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Inactiu</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => openEditProveidor(pr)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors inline-flex items-center gap-1 font-bold text-[11px]"
                            title="Editar proveïdor"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL CREAR SUBSCRIPCIÓ */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-lg text-slate-900">Nova Subscripció Recurrent</h3>
              <button onClick={() => setShowSubModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleCreateSub} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Client *</label>
                <select
                  value={newSub.client_id}
                  onChange={e => setNewSub({ ...newSub, client_id: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                >
                  <option value="">-- Selecciona un client --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom_fiscal} {c.nif_cif ? `(${c.nif_cif})` : ''}</option>)}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Article / Concepte del Catàleg *</label>
                <select
                  value={newSub.article_id}
                  onChange={e => {
                    const artId = e.target.value
                    const art = articles.find(a => a.id === artId)
                    if (art) {
                      setNewSub({
                        ...newSub,
                        article_id: artId,
                        unitat_negoci_id: art.unitat_negoci_id || newSub.unitat_negoci_id,
                        concepte_personalitzat: art.nom,
                        base_imposable: art.preu_base,
                        iva_percentatge: art.iva_percentatge,
                        irpf_percentatge: art.irpf_percentatge
                      })
                    } else {
                      setNewSub({ ...newSub, article_id: artId })
                    }
                  }}
                  className="w-full mt-1 p-2 border rounded-xl font-bold bg-white"
                  required
                >
                  <option value="">-- Selecciona article / servei --</option>
                  {articles.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nom} ({a.preu_base.toFixed(2)} € + {a.iva_percentatge}% IVA)
                    </option>
                  ))}
                </select>
                {articles.length === 0 && (
                  <p className="text-rose-600 text-[11px] mt-1 font-semibold">
                    No hi ha articles al catàleg. Ves a Configuració &gt; Articles per crear-ne un.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Unitat de Negoci *</label>
                  <select
                    value={newSub.unitat_negoci_id}
                    onChange={e => setNewSub({ ...newSub, unitat_negoci_id: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                    required
                  >
                    <option value="">-- Selecciona unitat --</option>
                    {unitats.map(u => (
                      <option key={u.id} value={u.id}>{u.nom} ({u.codi})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Concepte Personalitzat</label>
                  <input
                    type="text"
                    value={newSub.concepte_personalitzat}
                    onChange={e => setNewSub({ ...newSub, concepte_personalitzat: e.target.value })}
                    placeholder="Ex: Entrenament Trail Running Pro"
                    className="w-full mt-1 p-2 border rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Periodicitat</label>
                  <select
                    value={newSub.periodicitat_mesos}
                    onChange={e => setNewSub({ ...newSub, periodicitat_mesos: parseInt(e.target.value) as any })}
                    className="w-full mt-1 p-2 border rounded-xl font-bold"
                  >
                    <option value={1}>Mensual (1 mes)</option>
                    <option value={3}>Trimestral (3 mesos)</option>
                    <option value={6}>Semestral (6 mesos)</option>
                    <option value={12}>Anual (12 mesos)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Base Imposable (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newSub.base_imposable}
                    onChange={e => setNewSub({ ...newSub, base_imposable: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 border rounded-xl font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">IVA (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newSub.iva_percentatge}
                    onChange={e => setNewSub({ ...newSub, iva_percentatge: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 border rounded-xl font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Data Inici</label>
                  <input
                    type="date"
                    value={newSub.data_inici}
                    onChange={e => setNewSub({ ...newSub, data_inici: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Propera Facturació</label>
                  <input
                    type="date"
                    value={newSub.propera_data_facturacio}
                    onChange={e => setNewSub({ ...newSub, propera_data_facturacio: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel·lar
                </button>
                <button type="submit" className="btn-primary py-2 px-4 bg-emerald-600 hover:bg-emerald-700">
                  Activar Subscripció
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR TRAINING CAMP */}
      {showCampModal && (() => {
        const sumaFites = Math.round(newCamp.fites.reduce((acc, f) => acc + (f.base_imposable || 0), 0) * 100) / 100
        const totalPactat = Math.round((newCamp.total_base_pactada || 0) * 100) / 100
        const diferencia = Math.round((totalPactat - sumaFites) * 100) / 100
        const esQuadrat = Math.abs(diferencia) <= 0.01

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Nou Training Camp</h3>
                  <p className="text-xs text-slate-500">1 Article global dividit en N pagaments amb facturació independent</p>
                </div>
                <button onClick={() => setShowCampModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleCreateCamp} className="space-y-4 text-xs">
                {/* 1. Article del Catàleg */}
                <div>
                  <label className="font-bold text-slate-700">Article / Servei del Catàleg (opcional)</label>
                  <select
                    value={newCamp.article_id || ''}
                    onChange={e => {
                      const artId = e.target.value
                      const art = articles.find(a => a.id === artId)
                      if (art) {
                        const tot = art.preu_base || 0
                        const p1 = Math.round(tot * 0.3 * 100) / 100
                        const p2 = Math.round((tot - p1) * 100) / 100
                        setNewCamp(prev => ({
                          ...prev,
                          article_id: art.id,
                          titol_camp: art.nom,
                          unitat_negoci_id: art.unitat_negoci_id || prev.unitat_negoci_id,
                          total_base_pactada: tot,
                          iva_percentatge: art.iva_percentatge ?? 21,
                          fites: tot > 0 ? [
                            { ordre: 1, concepte_fita: 'Reserva 30%', data_prevista: prev.periode_camp_inici, base_imposable: p1, iva_percentatge: art.iva_percentatge ?? 21, irpf_percentatge: 0 },
                            { ordre: 2, concepte_fita: 'Pagament Final 70%', data_prevista: prev.periode_camp_fi, base_imposable: p2, iva_percentatge: art.iva_percentatge ?? 21, irpf_percentatge: 0 }
                          ] : prev.fites
                        }))
                      } else {
                        setNewCamp(prev => ({ ...prev, article_id: '' }))
                      }
                    }}
                    className="w-full mt-1 p-2 border rounded-xl font-medium"
                  >
                    <option value="">-- Personalitzat / Cap article vinculat --</option>
                    {articles.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nom} ({a.preu_base.toFixed(2)} € + {a.iva_percentatge}% IVA) {a.categoria === 'training_camp' ? '⭐ (Training Camp)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Client i Unitat de Negoci */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700">Client / Atleta *</label>
                    <select
                      value={newCamp.client_id}
                      onChange={e => setNewCamp({ ...newCamp, client_id: e.target.value })}
                      className="w-full mt-1 p-2 border rounded-xl"
                      required
                    >
                      <option value="">-- Selecciona client --</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nom_fiscal} ({c.nif_cif})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Unitat de Negoci *</label>
                    <select
                      value={newCamp.unitat_negoci_id}
                      onChange={e => setNewCamp({ ...newCamp, unitat_negoci_id: e.target.value })}
                      className="w-full mt-1 p-2 border rounded-xl"
                      required
                    >
                      {unitats.map(u => (
                        <option key={u.id} value={u.id}>{u.nom} ({u.codi})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Nom de l'Estada */}
                <div>
                  <label className="font-bold text-slate-700">Nom de l'Estada / Camp *</label>
                  <input
                    type="text"
                    value={newCamp.titol_camp}
                    onChange={e => setNewCamp({ ...newCamp, titol_camp: e.target.value })}
                    placeholder="Ex: Stage Trail Pirineus 2026"
                    className="w-full mt-1 p-2 border rounded-xl"
                    required
                  />
                </div>

                {/* 4. Dates de Celebració del Camp */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700">Data Inici Estada (Camp) *</label>
                    <input
                      type="date"
                      value={newCamp.periode_camp_inici}
                      onChange={e => {
                        const dt = e.target.value
                        setNewCamp(prev => ({
                          ...prev,
                          periode_camp_inici: dt,
                          fites: prev.fites.map((f, i) => i === 0 ? { ...f, data_prevista: dt } : f)
                        }))
                      }}
                      className="w-full mt-1 p-2 border rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Data Fi Estada (Camp) *</label>
                    <input
                      type="date"
                      value={newCamp.periode_camp_fi}
                      onChange={e => {
                        const dt = e.target.value
                        setNewCamp(prev => ({
                          ...prev,
                          periode_camp_fi: dt,
                          fites: prev.fites.map((f, i) => i === prev.fites.length - 1 ? { ...f, data_prevista: dt } : f)
                        }))
                      }}
                      className="w-full mt-1 p-2 border rounded-xl"
                      required
                    />
                  </div>
                </div>

                {/* 5. Total Pactat i IVA */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700">Total Base Imposable Pactada (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newCamp.total_base_pactada}
                      onChange={e => {
                        const tot = parseFloat(e.target.value) || 0
                        setNewCamp({ ...newCamp, total_base_pactada: tot })
                      }}
                      className="w-full mt-1 p-2 border rounded-xl font-bold font-mono text-emerald-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Tipus d'IVA (%)</label>
                    <select
                      value={newCamp.iva_percentatge}
                      onChange={e => {
                        const iva = parseFloat(e.target.value) || 0
                        setNewCamp(prev => ({
                          ...prev,
                          iva_percentatge: iva,
                          fites: prev.fites.map(f => ({ ...f, iva_percentatge: iva }))
                        }))
                      }}
                      className="w-full mt-1 p-2 border rounded-xl font-bold"
                    >
                      <option value={21}>21% (General)</option>
                      <option value={10}>10% (Reduït)</option>
                      <option value={4}>4% (Superreduït)</option>
                      <option value={0}>0% (Exempt)</option>
                    </select>
                  </div>
                </div>

                {/* 6. BLOC DE FITES DE PAGAMENT (N TERMINIS) */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Fites de Pagament Programades</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          {newCamp.fites.length} {newCamp.fites.length === 1 ? 'pagament' : 'pagaments'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Cada termini generarà una factura independent quan es premi "Facturar Fita".</p>
                    </div>
                    <button
                      type="button"
                      onClick={addFitaCamp}
                      className="btn-primary py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 text-[11px] font-bold self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" /> Afegir Pagament
                    </button>
                  </div>

                  {/* Barra de Presets / Plantilles ràpides */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] font-bold text-slate-400">Repartiments ràpids:</span>
                    <button
                      type="button"
                      onClick={() => applyPresetCamp('1')}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border rounded-lg text-[10px] font-bold transition-colors"
                    >
                      1 Pagament (100%)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetCamp('2')}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border rounded-lg text-[10px] font-bold transition-colors"
                    >
                      2 Pagaments (30% / 70%)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetCamp('3')}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border rounded-lg text-[10px] font-bold transition-colors"
                    >
                      3 Pagaments (30% / 35% / 35%)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetCamp('4')}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border rounded-lg text-[10px] font-bold transition-colors"
                    >
                      4 Pagaments (25% x 4)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetCamp('iguals')}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold transition-colors"
                      title="Reparteix el total entre el nombre actual de fites"
                    >
                      Parts iguals
                    </button>
                  </div>

                  {/* Llista de Fites */}
                  <div className="space-y-2 pt-2">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase px-1">
                      <div className="col-span-1 text-center">#</div>
                      <div className="col-span-5">Concepte Fita / Termini</div>
                      <div className="col-span-3 text-right">Base Imposable (€)</div>
                      <div className="col-span-2">Data Prevista</div>
                      <div className="col-span-1 text-center"></div>
                    </div>

                    {newCamp.fites.map((f, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                        <div className="col-span-1 text-center font-bold text-slate-400 text-xs">
                          #{f.ordre}
                        </div>
                        <div className="col-span-5">
                          <input
                            type="text"
                            required
                            placeholder="Ex: Reserva 30%"
                            value={f.concepte_fita}
                            onChange={e => {
                              const nextF = [...newCamp.fites]
                              nextF[i].concepte_fita = e.target.value
                              setNewCamp({ ...newCamp, fites: nextF })
                            }}
                            className="w-full p-1.5 border rounded-lg text-xs"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={f.base_imposable}
                            onChange={e => {
                              const nextF = [...newCamp.fites]
                              nextF[i].base_imposable = parseFloat(e.target.value) || 0
                              setNewCamp({ ...newCamp, fites: nextF })
                            }}
                            className="w-full p-1.5 border rounded-lg text-xs font-bold font-mono text-right"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="date"
                            required
                            value={f.data_prevista}
                            onChange={e => {
                              const nextF = [...newCamp.fites]
                              nextF[i].data_prevista = e.target.value
                              setNewCamp({ ...newCamp, fites: nextF })
                            }}
                            className="w-full p-1.5 border rounded-lg text-xs"
                          />
                        </div>
                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            disabled={newCamp.fites.length <= 1}
                            onClick={() => removeFitaCamp(i)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                            title={newCamp.fites.length <= 1 ? "Com a mínim cal 1 fita" : "Eliminar aquest pagament"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Resum de Quadratura */}
                  <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row items-center justify-between gap-2 ${
                    esQuadrat ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-amber-50/80 border-amber-300 text-amber-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Total Pactat: {totalPactat.toFixed(2)} €</span>
                      <span>|</span>
                      <span>Suma Fites: <strong>{sumaFites.toFixed(2)} €</strong></span>
                      {esQuadrat ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                          ✓ Quadrat
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                          {diferencia > 0 ? `Falten ${diferencia.toFixed(2)} €` : `Sobren ${Math.abs(diferencia).toFixed(2)} €`}
                        </span>
                      )}
                    </div>
                    {!esQuadrat && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={adjustLastFitaCamp}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold"
                          title="Assigna la diferència a l'últim termini de pagament"
                        >
                          Ajustar a l'última fita
                        </button>
                        <button
                          type="button"
                          onClick={adjustTotalToFitesCamp}
                          className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[10px] font-bold"
                          title="Modifica el total pactat perquè sumi les fites actuals"
                        >
                          Ajustar Total Pactat
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCampModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel·lar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary py-2 px-4 bg-emerald-600 hover:bg-emerald-700 font-bold"
                  >
                    Crear Camp & Fites ({newCamp.fites.length})
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}

      {/* MODAL CREAR FACTURA VENDA */}
      {showFacturaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-lg text-slate-900">Nova Venda / Factura</h3>
              <button onClick={() => setShowFacturaModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleCreateFactura} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Client</label>
                <select
                  value={newFactura.client_id}
                  onChange={e => setNewFactura({ ...newFactura, client_id: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                >
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom_fiscal} ({c.nif_cif})</option>)}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Unitat de Negoci</label>
                <select
                  value={newFactura.unitat_negoci_id}
                  onChange={e => setNewFactura({ ...newFactura, unitat_negoci_id: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                >
                  {unitats.map(u => <option key={u.id} value={u.id}>{u.nom}</option>)}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Concepte</label>
                <input
                  type="text"
                  value={newFactura.concepte}
                  onChange={e => setNewFactura({ ...newFactura, concepte: e.target.value })}
                  placeholder="Ex: Entrenament Personalitzat Abril"
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Base Imposable (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newFactura.base_imposable}
                    onChange={e => setNewFactura({ ...newFactura, base_imposable: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 border rounded-xl font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">% IVA</label>
                  <input
                    type="number"
                    value={newFactura.iva_percentatge}
                    onChange={e => setNewFactura({ ...newFactura, iva_percentatge: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">% IRPF (si s'aplica)</label>
                  <input
                    type="number"
                    value={newFactura.irpf_percentatge}
                    onChange={e => setNewFactura({ ...newFactura, irpf_percentatge: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Data d'Emissió</label>
                  <input
                    type="date"
                    value={newFactura.data_emissio}
                    onChange={e => setNewFactura({ ...newFactura, data_emissio: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Data de Venciment</label>
                  <input
                    type="date"
                    value={newFactura.data_venciment}
                    onChange={e => setNewFactura({ ...newFactura, data_venciment: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                    required
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={newFactura.emetre_directe}
                  onChange={e => setNewFactura({ ...newFactura, emetre_directe: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Emetre directament (assignar número de sèrie i bloquejar edició)</span>
              </label>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFacturaModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  className="btn-primary py-2 px-4 bg-emerald-600 hover:bg-emerald-700"
                >
                  Guardar Factura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ABONAMENT / RECTIFICATIVA */}
      {showAbonamentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Emetre Factura Rectificativa (Abonament)</h3>
            <p className="text-xs text-slate-500">
              Es generarà una factura rectificativa en la sèrie R amb imports negatius vinculada a la factura original.
            </p>
            <div>
              <label className="text-xs font-bold text-slate-700">Motiu de la rectificació (obligatori)</label>
              <textarea
                value={abonamentMotiu}
                onChange={e => setAbonamentMotiu(e.target.value)}
                className="w-full mt-1 p-2 border rounded-xl text-xs"
                rows={3}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAbonamentModal(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleCrearAbonament}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs"
              >
                Emetre Abonament
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR COMPRA */}
      {showCompraModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-lg text-slate-900">Registrar Factura de Compra</h3>
              <button onClick={() => setShowCompraModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleCreateCompra} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Proveïdor</label>
                <select
                  value={newCompra.proveidor_id}
                  onChange={e => setNewCompra({ ...newCompra, proveidor_id: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                >
                  {proveidors.map(p => <option key={p.id} value={p.id}>{p.nom_fiscal} ({p.nif_cif})</option>)}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Núm. Factura del Proveïdor</label>
                <input
                  type="text"
                  value={newCompra.num_factura_proveidor}
                  onChange={e => setNewCompra({ ...newCompra, num_factura_proveidor: e.target.value })}
                  placeholder="Ex: FRA-2026-089"
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Concepte</label>
                <input
                  type="text"
                  value={newCompra.concepte}
                  onChange={e => setNewCompra({ ...newCompra, concepte: e.target.value })}
                  placeholder="Ex: Factura Entrenador Març"
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Base Imposable (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCompra.base_imposable}
                    onChange={e => setNewCompra({ ...newCompra, base_imposable: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 border rounded-xl font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">% IVA Suportat</label>
                  <input
                    type="number"
                    value={newCompra.iva_percentatge}
                    onChange={e => setNewCompra({ ...newCompra, iva_percentatge: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">% Retenció IRPF</label>
                  <input
                    type="number"
                    value={newCompra.irpf_percentatge}
                    onChange={e => setNewCompra({ ...newCompra, irpf_percentatge: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Adjuntar PDF o Imatge de la Factura</label>
                <input
                  type="file"
                  onChange={e => handleFileUpload(e, 'compra')}
                  className="w-full mt-1 text-xs"
                />
                {uploadingFile && <div className="text-[11px] text-amber-600 font-semibold mt-1">Pujant fitxer...</div>}
                {newCompra.fitxer_adjunt_path && (
                  <div className="text-[11px] text-emerald-700 font-semibold mt-1">✓ Fitxer adjuntat correctament</div>
                )}
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCompraModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel·lar
                </button>
                <button type="submit" className="btn-primary py-2 px-4 bg-rose-600 hover:bg-rose-700">
                  Guardar Compra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR DESPESA */}
      {showDespesaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-lg text-slate-900">Registrar Despesa No Facturable</h3>
              <button onClick={() => setShowDespesaModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleCreateDespesa} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Categoria</label>
                <select
                  value={newDespesa.categoria}
                  onChange={e => setNewDespesa({ ...newDespesa, categoria: e.target.value as any })}
                  className="w-full mt-1 p-2 border rounded-xl"
                >
                  <option value="nomina">Nòmina</option>
                  <option value="seguretat_social">Seguretat Social / Autònom</option>
                  <option value="banc">Comissió Bancària</option>
                  <option value="impostos">Impostos / Taxes</option>
                  <option value="dietes">Dietes / Desplaçaments</option>
                  <option value="altres">Altres</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Beneficiari / Concepte</label>
                <input
                  type="text"
                  value={newDespesa.beneficiari_nom}
                  onChange={e => setNewDespesa({ ...newDespesa, beneficiari_nom: e.target.value })}
                  placeholder="Ex: Treballador / Banc Santander"
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Descripció</label>
                <input
                  type="text"
                  value={newDespesa.concepte}
                  onChange={e => setNewDespesa({ ...newDespesa, concepte: e.target.value })}
                  placeholder="Ex: Manteniment de compte T1"
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Import Total (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newDespesa.import_total}
                  onChange={e => setNewDespesa({ ...newDespesa, import_total: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 p-2 border rounded-xl font-bold"
                  required
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDespesaModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel·lar
                </button>
                <button type="submit" className="btn-primary py-2 px-4 bg-amber-600 hover:bg-amber-700">
                  Guardar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UNITAT DE NEGOCI (CREAR / EDITAR) */}
      {showUnitatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-slate-900">
                {editingUnitatId ? 'Editar Unitat de Negoci' : 'Nova Unitat de Negoci Analítica'}
              </h3>
              <button onClick={() => setShowUnitatModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveUnitat} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Codi Identificador *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: CAMP, ENT, MAT..."
                  value={newUnitat.codi}
                  onChange={e => setNewUnitat({ ...newUnitat, codi: e.target.value.toUpperCase() })}
                  className="w-full mt-1 p-2 border rounded-xl font-mono uppercase"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Nom de la Unitat *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Training Camps i Campus"
                  value={newUnitat.nom}
                  onChange={e => setNewUnitat({ ...newUnitat, nom: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Descripció</label>
                <textarea
                  rows={2}
                  placeholder="Descripció analítica del centre de cost"
                  value={newUnitat.descripcio}
                  onChange={e => setNewUnitat({ ...newUnitat, descripcio: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Sèrie de Facturació per Defecte</label>
                <select
                  value={newUnitat.serie_defecte_id || ''}
                  onChange={e => setNewUnitat({ ...newUnitat, serie_defecte_id: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl font-medium"
                >
                  <option value="">-- Sèrie global per defecte --</option>
                  {series.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.codi} {s.prefix ? `(${s.prefix})` : ''} — {s.descripcio || s.tipus} {!s.activa ? '(Inactiva)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Les noves factures i subscripcions associades a aquesta unitat faran servir aquesta sèrie de manera automàtica.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-2 font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newUnitat.activa}
                    onChange={e => setNewUnitat({ ...newUnitat, activa: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Unitat Activa</span>
                </label>
              </div>
              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUnitatModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel·lar
                </button>
                <button type="submit" className="btn-primary py-2 px-4 bg-emerald-600 hover:bg-emerald-700">
                  {editingUnitatId ? 'Desar Canvis' : 'Crear Unitat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SÈRIE DE FACTURACIÓ (CREAR / EDITAR) */}
      {showSerieModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-slate-900">
                {editingSerieId ? 'Editar Sèrie de Facturació' : 'Nova Sèrie de Facturació'}
              </h3>
              <button onClick={() => setShowSerieModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveSerie} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Codi Sèrie *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: F2026, R2026"
                    value={newSerie.codi}
                    onChange={e => setNewSerie({ ...newSerie, codi: e.target.value.toUpperCase() })}
                    className="w-full mt-1 p-2 border rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Tipus de Sèrie</label>
                  <select
                    value={newSerie.tipus}
                    onChange={e => setNewSerie({ ...newSerie, tipus: e.target.value as any })}
                    className="w-full mt-1 p-2 border rounded-xl font-bold"
                  >
                    <option value="ordinaria">Ordinària</option>
                    <option value="rectificativa">Rectificativa (Abonament)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Exercici / Any Fiscal</label>
                  <input
                    type="number"
                    required
                    value={newSerie.any_fiscal}
                    onChange={e => setNewSerie({ ...newSerie, any_fiscal: parseInt(e.target.value) || 2026 })}
                    className="w-full mt-1 p-2 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Prefix Número</label>
                  <input
                    type="text"
                    placeholder="Ex: F2026-"
                    value={newSerie.prefix}
                    onChange={e => setNewSerie({ ...newSerie, prefix: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Últim Número Emès</label>
                  <input
                    type="number"
                    value={newSerie.ultim_numero || 0}
                    onChange={e => setNewSerie({ ...newSerie, ultim_numero: parseInt(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 border rounded-xl font-mono"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={newSerie.activa}
                      onChange={e => setNewSerie({ ...newSerie, activa: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span>Sèrie Activa</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">Descripció</label>
                <input
                  type="text"
                  placeholder="Ex: Facturació ordinària de vendes de serveis"
                  value={newSerie.descripcio}
                  onChange={e => setNewSerie({ ...newSerie, descripcio: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                />
              </div>
              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSerieModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel·lar
                </button>
                <button type="submit" className="btn-primary py-2 px-4 bg-emerald-600 hover:bg-emerald-700">
                  {editingSerieId ? 'Desar Canvis' : 'Crear Sèrie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPOST IVA / IRPF (CREAR / EDITAR) */}
      {showImpostModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-slate-900">
                {editingImpostId ? 'Editar Tipus Tributari' : 'Nou Tipus Tributari (IVA / IRPF)'}
              </h3>
              <button onClick={() => setShowImpostModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveImpost} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Nom descriptiu *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: IVA General (21%), IRPF Nous Professionals (7%)"
                  value={newImpost.nom}
                  onChange={e => setNewImpost({ ...newImpost, nom: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Tipus Tributari</label>
                  <select
                    value={newImpost.tipus}
                    onChange={e => setNewImpost({ ...newImpost, tipus: e.target.value as any })}
                    className="w-full mt-1 p-2 border rounded-xl font-bold"
                  >
                    <option value="iva">IVA</option>
                    <option value="irpf">Retenció IRPF</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Percentatge (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newImpost.percentatge}
                    onChange={e => setNewImpost({ ...newImpost, percentatge: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 border rounded-xl font-bold font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">Causa d'Exempció (si % és 0)</label>
                <input
                  type="text"
                  placeholder="Ex: E1 - Operació exempta segons art. 20 LIVA"
                  value={newImpost.causa_exempcio}
                  onChange={e => setNewImpost({ ...newImpost, causa_exempcio: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                />
              </div>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newImpost.per_defecte}
                    onChange={e => setNewImpost({ ...newImpost, per_defecte: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Per defecte</span>
                </label>
                <label className="flex items-center gap-2 font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newImpost.actiu}
                    onChange={e => setNewImpost({ ...newImpost, actiu: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Actiu</span>
                </label>
              </div>
              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowImpostModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel·lar
                </button>
                <button type="submit" className="btn-primary py-2 px-4 bg-emerald-600 hover:bg-emerald-700">
                  {editingImpostId ? 'Desar Canvis' : 'Desar Impost'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ARTICLE / SERVEI (CREAR / EDITAR) */}
      {showArticleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-slate-900">
                {editingArticleId ? 'Editar Article / Servei' : 'Nou Article / Servei al Catàleg'}
              </h3>
              <button onClick={() => setShowArticleModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveArticle} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Codi Article</label>
                  <input
                    type="text"
                    placeholder="Ex: ENT-TRAIL-PRO"
                    value={newArticle.codi}
                    onChange={e => setNewArticle({ ...newArticle, codi: e.target.value.toUpperCase() })}
                    className="w-full mt-1 p-2 border rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Categoria</label>
                  <select
                    value={newArticle.categoria}
                    onChange={e => setNewArticle({ ...newArticle, categoria: e.target.value as any })}
                    className="w-full mt-1 p-2 border rounded-xl font-bold"
                  >
                    <option value="entrenament_recurrent">Entrenament Recurrent (Subscripció)</option>
                    <option value="training_camp">Training Camp (Fites)</option>
                    <option value="puntual">Puntual / Assessorament</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">Nom de l'Article o Servei *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Entrenament Personalitzat Trail Running"
                  value={newArticle.nom}
                  onChange={e => setNewArticle({ ...newArticle, nom: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Unitat de Negoci *</label>
                <select
                  value={newArticle.unitat_negoci_id}
                  onChange={e => setNewArticle({ ...newArticle, unitat_negoci_id: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                >
                  <option value="">-- Selecciona unitat de negoci --</option>
                  {unitats.map(u => (
                    <option key={u.id} value={u.id}>{u.nom} ({u.codi})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Preu Base Imposable (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newArticle.preu_base}
                    onChange={e => setNewArticle({ ...newArticle, preu_base: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 border rounded-xl font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">IVA (%)</label>
                  <select
                    value={newArticle.iva_percentatge}
                    onChange={e => setNewArticle({ ...newArticle, iva_percentatge: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 border rounded-xl font-bold"
                  >
                    <option value={21}>21% (General)</option>
                    <option value={10}>10% (Reduït)</option>
                    <option value={4}>4% (Superreduït)</option>
                    <option value={0}>0% (Exempt)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Retenció IRPF (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newArticle.irpf_percentatge || 0}
                    onChange={e => setNewArticle({ ...newArticle, irpf_percentatge: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 border rounded-xl font-mono"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={newArticle.actiu}
                      onChange={e => setNewArticle({ ...newArticle, actiu: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span>Article Actiu</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">Descripció addicional</label>
                <textarea
                  rows={2}
                  placeholder="Detalls del servei que s'inclouran a la factura"
                  value={newArticle.descripcio}
                  onChange={e => setNewArticle({ ...newArticle, descripcio: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                />
              </div>
              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowArticleModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel·lar
                </button>
                <button type="submit" className="btn-primary py-2 px-4 bg-emerald-600 hover:bg-emerald-700">
                  {editingArticleId ? 'Desar Canvis' : 'Desar Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CLIENT FISCAL (CREAR / EDITAR) */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-slate-900">
                {editingClientId ? 'Editar Client Fiscal' : 'Nou Client Fiscal'}
              </h3>
              <button onClick={() => setShowClientModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveClient} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Nom Fiscal / Raó Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Marta Font Gomez"
                  value={newClient.nom_fiscal}
                  onChange={e => setNewClient({ ...newClient, nom_fiscal: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Tipus ID</label>
                  <select
                    value={newClient.tipus_id_fiscal}
                    onChange={e => setNewClient({ ...newClient, tipus_id_fiscal: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  >
                    <option value="NIF">NIF/DNI</option>
                    <option value="CIF">CIF</option>
                    <option value="NIE">NIE</option>
                    <option value="Passaport">Passaport</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-700">NIF / CIF *</label>
                  <input
                    type="text"
                    required
                    placeholder="12345678Z"
                    value={newClient.nif_cif}
                    onChange={e => setNewClient({ ...newClient, nif_cif: e.target.value.toUpperCase() })}
                    className="w-full mt-1 p-2 border rounded-xl font-mono uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Email</label>
                  <input
                    type="email"
                    placeholder="factures@client.com"
                    value={newClient.email}
                    onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Telèfon</label>
                  <input
                    type="text"
                    placeholder="+34 600..."
                    value={newClient.telefon}
                    onChange={e => setNewClient({ ...newClient, telefon: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">Adreça Postal</label>
                <input
                  type="text"
                  placeholder="Carrer Major 12, 1r 2a"
                  value={newClient.adreca}
                  onChange={e => setNewClient({ ...newClient, adreca: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Codi Postal</label>
                  <input
                    type="text"
                    placeholder="08001"
                    value={newClient.cp}
                    onChange={e => setNewClient({ ...newClient, cp: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Població</label>
                  <input
                    type="text"
                    placeholder="Barcelona"
                    value={newClient.poblacio}
                    onChange={e => setNewClient({ ...newClient, poblacio: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Província</label>
                  <input
                    type="text"
                    placeholder="Barcelona"
                    value={newClient.provincia}
                    onChange={e => setNewClient({ ...newClient, provincia: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-2 font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newClient.actiu}
                    onChange={e => setNewClient({ ...newClient, actiu: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Client Actiu</span>
                </label>
              </div>
              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel·lar
                </button>
                <button type="submit" className="btn-primary py-2 px-4 bg-emerald-600 hover:bg-emerald-700">
                  {editingClientId ? 'Desar Canvis' : 'Desar Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PROVEÏDOR (CREAR / EDITAR) */}
      {showProveidorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-slate-900">
                {editingProveidorId ? 'Editar Proveïdor' : 'Nou Proveïdor de Compra'}
              </h3>
              <button onClick={() => setShowProveidorModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveProveidor} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Nom Fiscal del Proveïdor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Allnutrition SL / Strava Inc"
                  value={newProveidor.nom_fiscal}
                  onChange={e => setNewProveidor({ ...newProveidor, nom_fiscal: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">CIF / NIF</label>
                  <input
                    type="text"
                    placeholder="B12345678"
                    value={newProveidor.nif_cif}
                    onChange={e => setNewProveidor({ ...newProveidor, nif_cif: e.target.value.toUpperCase() })}
                    className="w-full mt-1 p-2 border rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">IVA Defecte (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProveidor.iva_defecte}
                    onChange={e => setNewProveidor({ ...newProveidor, iva_defecte: parseFloat(e.target.value) || 21 })}
                    className="w-full mt-1 p-2 border rounded-xl font-bold font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Email Proveïdor</label>
                  <input
                    type="email"
                    placeholder="info@proveidor.com"
                    value={newProveidor.email}
                    onChange={e => setNewProveidor({ ...newProveidor, email: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Telèfon</label>
                  <input
                    type="text"
                    placeholder="+34 93..."
                    value={newProveidor.telefon}
                    onChange={e => setNewProveidor({ ...newProveidor, telefon: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">IBAN del Proveïdor</label>
                <input
                  type="text"
                  placeholder="ES00 0000 0000 0000 0000 0000"
                  value={newProveidor.iban}
                  onChange={e => setNewProveidor({ ...newProveidor, iban: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Adreça Postal</label>
                <input
                  type="text"
                  placeholder="Polígon Industrial Nord, nau 4"
                  value={newProveidor.adreca}
                  onChange={e => setNewProveidor({ ...newProveidor, adreca: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Codi Postal</label>
                  <input
                    type="text"
                    placeholder="08220"
                    value={newProveidor.cp}
                    onChange={e => setNewProveidor({ ...newProveidor, cp: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Població</label>
                  <input
                    type="text"
                    placeholder="Terrassa"
                    value={newProveidor.poblacio}
                    onChange={e => setNewProveidor({ ...newProveidor, poblacio: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-2 font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newProveidor.actiu}
                    onChange={e => setNewProveidor({ ...newProveidor, actiu: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Proveïdor Actiu</span>
                </label>
              </div>
              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProveidorModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel·lar
                </button>
                <button type="submit" className="btn-primary py-2 px-4 bg-emerald-600 hover:bg-emerald-700">
                  {editingProveidorId ? 'Desar Canvis' : 'Desar Proveïdor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
