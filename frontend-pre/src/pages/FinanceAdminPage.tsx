import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ConfirmModal } from '../components/ConfirmModal'
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
  Pencil,
  Zap,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  CreditCard,
  Bell,
  Send
} from 'lucide-react'
import { getEntrenadorsList } from '../api/entrenador'
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
  listFinFacturesVenda,
  createFinFacturaVenda,
  emetreFinFacturaVenda,
  conciliarFinFacturaVenda,
  marcarImpagadaFinFacturaVenda,
  crearAbonamentFinFacturaVenda,
  deleteFinFacturaVenda,
  listFinCompres,
  createFinCompra,
  updateFinCompra,
  deleteFinCompra,
  listFinDespeses,
  createFinDespesa,
  updateFinDespesa,
  deleteFinDespesa,
  getFinInformeResultats,
  getFinCashflowForecast,
  uploadFinanceDocument,
  getGraellaMes,
  emetreGraella,
  generarDespesesRecurrentsMes,
  getDynamicCashflow,
  listFacturaCobraments,
  createFacturaCobrament,
  deleteFacturaCobrament,
  getFinLiquidacioEntrenadors,
  executarAvisosCobrament,
  type FinConfiguracioEmpresa,
  type FinUnitatNegoci,
  type FinSerie,
  type FinImpost,
  type FinArticle,
  type FinClient,
  type FinProveidor,
  type FinFacturaVenda,
  type FinFacturaCobrament,
  type FinCompra,
  type FinDespesa,
  type FinInformeResultats,
  type FinCashflowForecast,
  type GraellaMesResponse,
  type EmetreGraellaResponse,
  type DynamicCashflowForecast,
  type FinLiquidacioEntrenadorsResponse
} from '../api/finances'

type TabKey = 'graella' | 'vendes' | 'compres' | 'despeses' | 'liquidacio' | 'resum' | 'tresoreria' | 'config'

const TAB_TITLES: Record<TabKey, string> = {
  graella: '⚡ Facturació del Mes',
  vendes: 'Vendes & Factures',
  compres: 'Compres & Proveïdors',
  despeses: 'Despeses Operatives',
  liquidacio: '🤝 Liquidació per Entrenador',
  resum: 'Visor de Marge (P&L)',
  tresoreria: 'Previsió de Caixa (Cashflow)',
  config: 'Mestres & Configuració'
}

const TAB_DESCRIPTIONS: Record<TabKey, string> = {
  graella: 'Llançament periòdic de quotes i venciments del mes (preus IVA inclòs)',
  vendes: 'Factures amb article vinculat, cobraments parcials (Training Camps) i saldos pendents',
  compres: 'Factures de compra, proveïdors, articles i centres de cost',
  despeses: 'Nòmines, autònoms, IRPF i pagaments fixes dia 1',
  liquidacio: 'Liquidació mensual per entrenador: venut, cobrat i impagat menys comprat (IVA inclòs)',
  resum: 'Compte de resultats (P&L), marge brut i benefici net',
  tresoreria: 'Flux de caixa dinàmic mòbil i tresoreria projectada',
  config: 'Articles (preu final IVA inclòs), dia límit de pago, sèries, IVA i empresa',
}

const calcReverseVat = (pvpInput: number, ivaPct: number, irpfPct = 0) => {
  const pvp = Math.round((Number(pvpInput) || 0) * 100) / 100
  const base = Math.round((pvp / (1 + (Number(ivaPct) || 0) / 100)) * 100) / 100
  const iva = Math.round((pvp - base) * 100) / 100
  const irpf = Math.round((base * ((Number(irpfPct) || 0) / 100)) * 100) / 100
  const total = Math.round((pvp - irpf) * 100) / 100
  return { pvp, base, iva, irpf, total }
}

export const FinanceAdminPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const allowedTabs: TabKey[] = ['graella', 'vendes', 'compres', 'despeses', 'liquidacio', 'resum', 'tresoreria', 'config']
  const activeTab: TabKey = allowedTabs.includes(rawTab as TabKey) ? (rawTab as TabKey) : 'graella'
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

  // Dynamic Cashflow Window state (-X a +Y mesos, màx 12 mesos)
  const [cfPastMonths, setCfPastMonths] = useState(3)
  const [cfFutureMonths, setCfFutureMonths] = useState(6)
  const [dynamicCfData, setDynamicCfData] = useState<DynamicCashflowForecast | null>(null)
  const [dynamicCfLoading, setDynamicCfLoading] = useState(false)

  // Graella Facturació Periòdica del Mes state
  const [graellaMes, setGraellaMes] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [graellaData, setGraellaData] = useState<GraellaMesResponse | null>(null)
  const [graellaSelected, setGraellaSelected] = useState<Record<string, boolean>>({})
  const [graellaCustomAmounts, setGraellaCustomAmounts] = useState<Record<string, number>>({})
  const [graellaCustomConcepts, setGraellaCustomConcepts] = useState<Record<string, string>>({})
  const [graellaLoading, setGraellaLoading] = useState(false)
  const [graellaEmitting, setGraellaEmitting] = useState(false)
  const [graellaSuccess, setGraellaSuccess] = useState<EmetreGraellaResponse | null>(null)

  // Master data state
  const [config, setConfig] = useState<FinConfiguracioEmpresa | null>(null)
  const [unitats, setUnitats] = useState<FinUnitatNegoci[]>([])
  const [series, setSeries] = useState<FinSerie[]>([])
  const [impostos, setImpostos] = useState<FinImpost[]>([])
  const [articles, setArticles] = useState<FinArticle[]>([])
  const [clients, setClients] = useState<FinClient[]>([])
  const [proveidors, setProveidors] = useState<FinProveidor[]>([])
  const [activeConfigSubtab, setActiveConfigSubtab] = useState<'empresa' | 'unitats' | 'series' | 'impostos' | 'articles' | 'clients' | 'proveidors'>('empresa')
  const [filterOnlySenseNif, setFilterOnlySenseNif] = useState(false)

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
  const [newArticle, setNewArticle] = useState({ codi: '', nom: '', descripcio: '', tipus: 'venda' as 'venda' | 'compra' | 'ambdos', categoria: 'entrenament_recurrent', es_recurrent: false, periodicitat_mesos: 1 as 1 | 3 | 6 | 12, unitat_negoci_id: '', preu_base: 0, preu_final: 0, iva_percentatge: 21, irpf_percentatge: 0, causa_exempcio: '', actiu: true })

  const [showClientModal, setShowClientModal] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [newClient, setNewClient] = useState({ nom_fiscal: '', tipus_id_fiscal: 'NIF', nif_cif: '', adreca: '', cp: '', poblacio: '', provincia: '', pais: 'Espanya', email: '', telefon: '', notes: '', actiu: true })

  const [showProveidorModal, setShowProveidorModal] = useState(false)
  const [editingProveidorId, setEditingProveidorId] = useState<string | null>(null)
  const [newProveidor, setNewProveidor] = useState({ nom_fiscal: '', nif_cif: '', adreca: '', cp: '', poblacio: '', provincia: '', pais: 'Espanya', iban: '', email: '', telefon: '', iva_defecte: 21, irpf_defecte: 0, unitat_negoci_defecte_id: '', notes: '', actiu: true })

  // Operations state
  const [factures, setFactures] = useState<FinFacturaVenda[]>([])
  const [compres, setCompres] = useState<FinCompra[]>([])
  const [despeses, setDespeses] = useState<FinDespesa[]>([])

  // Modals & form state
  const [showFacturaModal, setShowFacturaModal] = useState(false)
  const [newFactura, setNewFactura] = useState({
    client_id: '',
    unitat_negoci_id: '',
    entrenador_id: '',
    article_id: '',
    concepte: '',
    descripcio_detall: '',
    base_imposable: 0,
    total_pvp: 0,
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

  const [entrenadorsList, setEntrenadorsList] = useState<{ id: string; nom: string }[]>([])

  // Filtres avançats Vendes, Compres i Despeses
  const [graellaFilter, setGraellaFilter] = useState<'all' | 'pendent' | 'emesa' | 'pausat'>('all')

  const [vendesStatusFilter, setVendesStatusFilter] = useState<'all' | 'pendent' | 'parcial' | 'pagada' | 'impagada' | 'esborrany'>('all')
  const [vendesDateFrom, setVendesDateFrom] = useState('')
  const [vendesDateTo, setVendesDateTo] = useState('')
  const [vendesClientId, setVendesClientId] = useState('')
  const [vendesArticleId, setVendesArticleId] = useState('')
  const [vendesSearch, setVendesSearch] = useState('')

  const [compresFilter, setCompresFilter] = useState<'all' | 'pendent' | 'pagada'>('all')
  const [compresDateFrom, setCompresDateFrom] = useState('')
  const [compresDateTo, setCompresDateTo] = useState('')
  const [compresProveidorId, setCompresProveidorId] = useState('')
  const [compresArticleId, setCompresArticleId] = useState('')
  const [compresSearch, setCompresSearch] = useState('')

  const [despesesFilter, setDespesesFilter] = useState<'all' | 'pendent' | 'pagada' | 'recurrent'>('all')
  const [despesesDateFrom, setDespesesDateFrom] = useState('')
  const [despesesDateTo, setDespesesDateTo] = useState('')
  const [despesesBeneficiari, setDespesesBeneficiari] = useState('')
  const [despesesCategoria, setDespesesCategoria] = useState('')
  const [despesesSearch, setDespesesSearch] = useState('')

  // Cobraments parcials modal state
  const [cobramentsModal, setCobramentsModal] = useState<FinFacturaVenda | null>(null)
  const [cobramentsList, setCobramentsList] = useState<FinFacturaCobrament[]>([])
  const [cobramentsLoading, setCobramentsLoading] = useState(false)
  const [newCobrament, setNewCobrament] = useState({
    data_cobrament: new Date().toISOString().split('T')[0],
    import: 0,
    metode_pagament: 'transferencia',
    notes: ''
  })

  // Liquidació per entrenador state
  const [liquidacioMes, setLiquidacioMes] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [liquidacioData, setLiquidacioData] = useState<FinLiquidacioEntrenadorsResponse | null>(null)
  const [liquidacioLoading, setLiquidacioLoading] = useState(false)
  const [expandedLiquidacioCoach, setExpandedLiquidacioCoach] = useState<Record<string, boolean>>({})

  const [showCompraModal, setShowCompraModal] = useState(false)
  const [editingCompraId, setEditingCompraId] = useState<string | null>(null)
  const [newCompra, setNewCompra] = useState({
    proveidor_id: '',
    num_factura_proveidor: '',
    unitat_negoci_id: '',
    entrenador_id: '',
    article_id: '',
    concepte: '',
    base_imposable: 0,
    preu_amb_iva: 0,
    iva_percentatge: 21,
    irpf_percentatge: 0,
    data_emissio: new Date().toISOString().split('T')[0],
    data_venciment: new Date().toISOString().split('T')[0],
    periode_inici: new Date().toISOString().split('T')[0],
    periode_fi: new Date().toISOString().split('T')[0],
    estat_pagament: 'pendent' as 'pendent' | 'pagada',
    fitxer_adjunt_path: '',
    notes: ''
  })

  const [showDespesaModal, setShowDespesaModal] = useState(false)
  const [editingDespesaId, setEditingDespesaId] = useState<string | null>(null)
  const [newDespesa, setNewDespesa] = useState({
    categoria: 'banc' as string,
    beneficiari_nom: '',
    concepte: '',
    unitat_negoci_id: '',
    entrenador_id: '',
    import_total: 0,
    es_recurrent: false,
    dia_mes_generacio: 1,
    data_devengo: new Date().toISOString().split('T')[0],
    data_venciment: new Date().toISOString().split('T')[0],
    periode_inici: new Date().toISOString().split('T')[0],
    periode_fi: new Date().toISOString().split('T')[0],
    estat_pagament: 'pendent' as 'pendent' | 'pagada',
    fitxer_adjunt_path: '',
    notes: ''
  })

  const [uploadingFile, setUploadingFile] = useState(false)

  // Dialogs i Pop-ups estilitzats amb React
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info' | 'success'
    onConfirm: () => void | Promise<void>
  } | null>(null)

  const [conciliarModal, setConciliarModal] = useState<{
    isOpen: boolean
    facturaId: string
    numeroFactura?: string
    dataConciliacio: string
  } | null>(null)

  const [impagatModal, setImpagatModal] = useState<{
    isOpen: boolean
    facturaId: string
    numeroFactura?: string
    motiu: string
  } | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (activeTab === 'graella') loadGraella()
    if (activeTab === 'resum') loadReport()
    if (activeTab === 'tresoreria') {
      loadCashflow()
      loadDynamicCashflow()
    }
    if (activeTab === 'vendes') loadFactures()
    if (activeTab === 'compres') loadCompres()
    if (activeTab === 'despeses') loadDespeses()
    if (activeTab === 'liquidacio') loadLiquidacio()
  }, [activeTab, reportMode, reportStart, reportEnd, horizonDies, inclouEndarrerits, cfPastMonths, cfFutureMonths])

  const loadLiquidacio = async (mes?: string) => {
    const targetMes = mes || liquidacioMes
    try {
      setLiquidacioLoading(true)
      const data = await getFinLiquidacioEntrenadors(targetMes)
      setLiquidacioData(data)
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error carregant la liquidació per entrenador')
    } finally {
      setLiquidacioLoading(false)
    }
  }

  const applyQuickDatePreset = (
    preset: 'all' | 'this_month' | 'last_month' | 'this_year',
    setFrom: (v: string) => void,
    setTo: (v: string) => void
  ) => {
    if (preset === 'all') {
      setFrom('')
      setTo('')
      return
    }
    const now = new Date()
    if (preset === 'this_month') {
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const lastD = new Date(y, now.getMonth() + 1, 0).getDate()
      setFrom(`${y}-${m}-01`)
      setTo(`${y}-${m}-${String(lastD).padStart(2, '0')}`)
    } else if (preset === 'last_month') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const y = prev.getFullYear()
      const m = String(prev.getMonth() + 1).padStart(2, '0')
      const lastD = new Date(y, prev.getMonth() + 1, 0).getDate()
      setFrom(`${y}-${m}-01`)
      setTo(`${y}-${m}-${String(lastD).padStart(2, '0')}`)
    } else if (preset === 'this_year') {
      const y = now.getFullYear()
      setFrom(`${y}-01-01`)
      setTo(`${y}-12-31`)
    }
  }

  const loadGraella = async (mes?: string) => {
    const targetMes = mes || graellaMes
    try {
      setGraellaLoading(true)
      const data = await getGraellaMes(targetMes)
      setGraellaData(data)
      const initialSelected: Record<string, boolean> = {}
      const initialAmounts: Record<string, number> = {}
      const initialConcepts: Record<string, string> = {}
      data.items.forEach(it => {
        initialSelected[it.id] = !it.pausat && !it.ja_emesa
        initialAmounts[it.id] = it.total_pvp
        initialConcepts[it.id] = it.concepte
      })
      setGraellaSelected(initialSelected)
      setGraellaCustomAmounts(initialAmounts)
      setGraellaCustomConcepts(initialConcepts)
      setGraellaSuccess(null)
    } catch (err: any) {
      console.error(err)
      showNotify('error', 'Error carregant la graella de facturació del mes')
    } finally {
      setGraellaLoading(false)
    }
  }

  const loadDynamicCashflow = async (past?: number, future?: number) => {
    const p = past !== undefined ? past : cfPastMonths
    const f = future !== undefined ? future : cfFutureMonths
    if (p + f > 12) {
      showNotify('error', 'La finestra temporal no pot superar els 12 mesos (1 any).')
      return
    }
    try {
      setDynamicCfLoading(true)
      const data = await getDynamicCashflow(p, f)
      setDynamicCfData(data)
    } catch (err: any) {
      console.error(err)
      showNotify('error', 'Error carregant la previsió dinàmica de tresoreria')
    } finally {
      setDynamicCfLoading(false)
    }
  }

  const handleEmetreGraella = async () => {
    if (!graellaData) return
    const selectedItems = graellaData.items
      .filter(it => graellaSelected[it.id] && !it.ja_emesa)
      .map(it => {
        const customPvp = graellaCustomAmounts[it.id] ?? it.total_pvp
        const { base } = calcReverseVat(customPvp, it.iva_percentatge)
        return {
          id: it.id,
          tipus_origen: it.tipus_origen,
          client_id: it.client_id,
          concepte: graellaCustomConcepts[it.id] || it.concepte,
          base_imposable: base,
          total_pvp: customPvp,
          iva_percentatge: it.iva_percentatge,
          fita_id: it.fita_id || null,
          centre_cost_id: it.centre_cost_id || null,
          entrenador_id: it.entrenador_id || null,
          article_id: it.article_id || null
        }
      })

    if (selectedItems.length === 0) {
      showNotify('error', 'No hi ha cap element seleccionat per a emetre!')
      return
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Emetre Factures del Mes',
      message: `Segur que vols emetre ${selectedItems.length} factures oficials del mes ${graellaMes}? S'assignarà la sèrie legal consecutiva i els documents quedaran bloquejats i registrats.`,
      confirmText: `Emetre ${selectedItems.length} Factures`,
      cancelText: 'Cancel·lar',
      variant: 'warning',
      onConfirm: async () => {
        try {
          setGraellaEmitting(true)
          const res = await emetreGraella({
            mes: graellaMes,
            items: selectedItems
          })
          setGraellaSuccess(res)
          showNotify('success', `S'han emès ${res.factures_creades} factures correctament per un total de ${res.total_facturat.toFixed(2)} €!`)
          loadGraella()
          loadFactures()
        } catch (err: any) {
          showNotify('error', err.response?.data?.error || 'Error emetent factures de la graella')
        } finally {
          setGraellaEmitting(false)
          setConfirmDialog(null)
        }
      }
    })
  }

  const handleGenerarDespesesRecurrents = async () => {
    try {
      const res = await generarDespesesRecurrentsMes(graellaMes)
      showNotify('success', `S'han generat ${res.despeses_creades} despeses recurrents del mes ${graellaMes}!`)
      loadDespeses()
      if (activeTab === 'tresoreria') loadDynamicCashflow()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error generant despeses recurrents')
    }
  }

  const showNotify = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text })
    setTimeout(() => setFeedback(null), 4000)
  }

  const loadInitialData = async () => {
    try {
      const [cfg, impList, serList, un, cl, pr, artList, coaches] = await Promise.all([
        getFinConfiguracio(),
        listFinImpostos(),
        listFinSeries(),
        listFinUnitatsNegoci(),
        listFinClients(),
        listFinProveidors(),
        listFinArticles(),
        getEntrenadorsList().catch(() => [])
      ])
      setConfig(cfg)
      setImpostos(impList || [])
      setSeries(serList || [])
      setUnitats(un || [])
      setClients(cl || [])
      setProveidors(pr || [])
      setArticles(artList || [])
      setEntrenadorsList(coaches || [])

      if (un && un.length > 0) {
        setNewFactura(prev => ({ ...prev, unitat_negoci_id: un[0].id }))
        setNewCompra(prev => ({ ...prev, unitat_negoci_id: un[0].id }))
        setNewDespesa(prev => ({ ...prev, unitat_negoci_id: un[0].id }))
        setNewArticle(prev => ({ ...prev, unitat_negoci_id: un[0].id }))
      }
      if (cl && cl.length > 0) {
        setNewFactura(prev => ({ ...prev, client_id: cl[0].id }))
      }
      if (pr && pr.length > 0) {
        setNewCompra(prev => ({ ...prev, proveidor_id: pr[0].id }))
      }
      const firstVendaArt = (artList || []).find(a => a.actiu && a.tipus !== 'compra')
      if (firstVendaArt) {
        const pvp = firstVendaArt.preu_final || Number((firstVendaArt.preu_base * (1 + firstVendaArt.iva_percentatge / 100)).toFixed(2))
        const { base } = calcReverseVat(pvp, firstVendaArt.iva_percentatge)
        setNewFactura(prev => ({
          ...prev,
          article_id: firstVendaArt.id,
          unitat_negoci_id: firstVendaArt.unitat_negoci_id || prev.unitat_negoci_id,
          concepte: firstVendaArt.nom,
          total_pvp: pvp,
          base_imposable: base,
          iva_percentatge: firstVendaArt.iva_percentatge,
          irpf_percentatge: firstVendaArt.irpf_percentatge || 0
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

  const openCreateFacturaModal = () => {
    const vendaArts = articles.filter(a => a.actiu && a.tipus !== 'compra')
    const defaultArt = vendaArts[0]
    const pvp = defaultArt ? (defaultArt.preu_final || Number((defaultArt.preu_base * (1 + defaultArt.iva_percentatge / 100)).toFixed(2))) : 0
    const ivaPct = defaultArt ? defaultArt.iva_percentatge : 21
    const irpfPct = defaultArt ? (defaultArt.irpf_percentatge || 0) : 0
    const { base } = calcReverseVat(pvp, ivaPct, irpfPct)
    const today = new Date().toISOString().split('T')[0]
    const diaLimit = config?.dia_limit_pagament || 5
    const ym = today.slice(0, 7)
    const vencDefault = `${ym}-${String(diaLimit).padStart(2, '0')}`

    setNewFactura({
      client_id: clients[0]?.id || '',
      unitat_negoci_id: defaultArt?.unitat_negoci_id || unitats[0]?.id || '',
      entrenador_id: '',
      article_id: defaultArt?.id || '',
      concepte: defaultArt?.nom || '',
      descripcio_detall: defaultArt?.descripcio || '',
      base_imposable: base,
      total_pvp: pvp,
      iva_percentatge: ivaPct,
      irpf_percentatge: irpfPct,
      data_emissio: today,
      data_venciment: vencDefault >= today ? vencDefault : today,
      periode_inici: today,
      periode_fi: today,
      emetre_directe: true
    })
    setShowFacturaModal(true)
  }

  const handleSelectFacturaArticle = (articleId: string) => {
    const art = articles.find(a => a.id === articleId)
    if (!art) {
      setNewFactura(prev => ({ ...prev, article_id: articleId }))
      return
    }
    const pvp = art.preu_final || Number((art.preu_base * (1 + art.iva_percentatge / 100)).toFixed(2))
    const { base } = calcReverseVat(pvp, art.iva_percentatge, art.irpf_percentatge || 0)
    setNewFactura(prev => ({
      ...prev,
      article_id: art.id,
      unitat_negoci_id: art.unitat_negoci_id || prev.unitat_negoci_id,
      concepte: art.nom,
      descripcio_detall: art.descripcio || prev.descripcio_detall,
      total_pvp: pvp,
      base_imposable: base,
      iva_percentatge: art.iva_percentatge,
      irpf_percentatge: art.irpf_percentatge || 0
    }))
  }

  const handleCreateFactura = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFactura.article_id) {
      showNotify('error', 'Cal seleccionar un article del catàleg vinculat a la factura.')
      return
    }
    try {
      const { base } = calcReverseVat(newFactura.total_pvp, newFactura.iva_percentatge, newFactura.irpf_percentatge)
      await createFinFacturaVenda({
        ...newFactura,
        base_imposable: base,
        total_pvp: newFactura.total_pvp,
        entrenador_id: newFactura.entrenador_id || null,
        article_id: newFactura.article_id
      })
      showNotify('success', newFactura.emetre_directe ? 'Factura emesa correctament!' : 'Esborrany de factura creat!')
      setShowFacturaModal(false)
      loadFactures()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error creant la factura')
    }
  }

  const openCobramentsModal = async (f: FinFacturaVenda) => {
    setCobramentsModal(f)
    setNewCobrament({
      data_cobrament: new Date().toISOString().split('T')[0],
      import: Number((f.import_pendent || 0).toFixed(2)),
      metode_pagament: 'transferencia',
      notes: ''
    })
    try {
      setCobramentsLoading(true)
      const list = await listFacturaCobraments(f.id)
      setCobramentsList(list || [])
    } catch (err: any) {
      showNotify('error', 'Error carregant historial de cobraments')
    } finally {
      setCobramentsLoading(false)
    }
  }

  const handleAddCobrament = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cobramentsModal) return
    try {
      const updated = await createFacturaCobrament(cobramentsModal.id, newCobrament)
      setCobramentsModal(updated)
      const list = await listFacturaCobraments(cobramentsModal.id)
      setCobramentsList(list || [])
      setNewCobrament({
        data_cobrament: new Date().toISOString().split('T')[0],
        import: Number((updated.import_pendent || 0).toFixed(2)),
        metode_pagament: 'transferencia',
        notes: ''
      })
      showNotify('success', updated.estat_cobrament === 'pagada' ? 'Factura liquidada al 100%!' : 'Pagament parcial registrat correctament!')
      loadFactures()
      if (activeTab === 'liquidacio') loadLiquidacio()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error registrant el pagament')
    }
  }

  const handleDeleteCobrament = async (cobramentId: string) => {
    if (!cobramentsModal) return
    try {
      const updated = await deleteFacturaCobrament(cobramentsModal.id, cobramentId)
      setCobramentsModal(updated)
      const list = await listFacturaCobraments(cobramentsModal.id)
      setCobramentsList(list || [])
      setNewCobrament(prev => ({ ...prev, import: Number((updated.import_pendent || 0).toFixed(2)) }))
      showNotify('success', 'Registre de cobrament eliminat')
      loadFactures()
      if (activeTab === 'liquidacio') loadLiquidacio()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error eliminant el cobrament')
    }
  }

  const handleEmetreFactura = (id: string, numeroComplet?: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Emetre Factura Oficial',
      message: `Segur que vols emetre la factura ${numeroComplet ? `"${numeroComplet}"` : ''}? S'assignarà un número correlatiu definitiu de sèrie legal i el document quedarà bloquejat per a Veri*factu. No es podrà modificar ni esborrar.`,
      confirmText: 'Emetre Factura',
      cancelText: 'Cancel·lar',
      variant: 'warning',
      onConfirm: async () => {
        try {
          await emetreFinFacturaVenda(id)
          showNotify('success', 'Factura emesa amb èxit!')
          loadFactures()
        } catch (err: any) {
          showNotify('error', err.response?.data?.error || 'Error emetent la factura')
        } finally {
          setConfirmDialog(null)
        }
      }
    })
  }

  const handleConciliarFactura = (id: string, numeroComplet?: string) => {
    setConciliarModal({
      isOpen: true,
      facturaId: id,
      numeroFactura: numeroComplet,
      dataConciliacio: new Date().toISOString().split('T')[0]
    })
  }

  const submitConciliarFactura = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conciliarModal) return
    try {
      await conciliarFinFacturaVenda(conciliarModal.facturaId, {
        data_conciliacio: conciliarModal.dataConciliacio
      })
      showNotify('success', 'Cobrament conciliat i validat a caixa!')
      setConciliarModal(null)
      loadFactures()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error conciliant la factura')
    }
  }

  const handleMarcarImpagada = (id: string, numeroComplet?: string) => {
    setImpagatModal({
      isOpen: true,
      facturaId: id,
      numeroFactura: numeroComplet,
      motiu: ''
    })
  }

  const submitMarcarImpagada = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!impagatModal) return
    try {
      await marcarImpagadaFinFacturaVenda(impagatModal.facturaId, {
        motiu_impagament: impagatModal.motiu || 'Sense motiu especificat'
      })
      showNotify('success', 'Factura marcada com a impagada')
      setImpagatModal(null)
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

  const handleDeleteFactura = (id: string, numeroComplet?: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Esborrany de Factura',
      message: `Vols eliminar permanentment l'esborrany ${numeroComplet ? `"${numeroComplet}"` : ''}? Aquesta acció no es pot desfer.`,
      confirmText: 'Eliminar Esborrany',
      cancelText: 'Cancel·lar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteFinFacturaVenda(id)
          showNotify('success', 'Esborrany eliminat')
          loadFactures()
        } catch (err: any) {
          showNotify('error', err.response?.data?.error || 'Error eliminant esborrany')
        } finally {
          setConfirmDialog(null)
        }
      }
    })
  }

  // Operacions Compres
  const openCreateCompra = () => {
    setEditingCompraId(null)
    setNewCompra({
      proveidor_id: proveidors[0]?.id || '',
      num_factura_proveidor: '',
      unitat_negoci_id: unitats[0]?.id || '',
      entrenador_id: '',
      article_id: '',
      concepte: '',
      base_imposable: 0,
      preu_amb_iva: 0,
      iva_percentatge: 21,
      irpf_percentatge: 0,
      data_emissio: new Date().toISOString().split('T')[0],
      data_venciment: new Date().toISOString().split('T')[0],
      periode_inici: new Date().toISOString().split('T')[0],
      periode_fi: new Date().toISOString().split('T')[0],
      estat_pagament: 'pendent',
      fitxer_adjunt_path: '',
      notes: ''
    })
    setShowCompraModal(true)
  }

  const openEditCompra = (c: FinCompra) => {
    setEditingCompraId(c.id)
    const pvpAmbIva = Math.round((c.base_imposable + c.iva_import) * 100) / 100
    setNewCompra({
      proveidor_id: c.proveidor_id,
      num_factura_proveidor: c.num_factura_proveidor,
      unitat_negoci_id: c.unitat_negoci_id || '',
      entrenador_id: c.entrenador_id || '',
      article_id: c.article_id || '',
      concepte: c.concepte,
      base_imposable: c.base_imposable,
      preu_amb_iva: pvpAmbIva,
      iva_percentatge: c.iva_percentatge,
      irpf_percentatge: c.irpf_percentatge,
      data_emissio: c.data_emissio,
      data_venciment: c.data_venciment,
      periode_inici: c.periode_inici,
      periode_fi: c.periode_fi,
      estat_pagament: c.estat_pagament === 'pagada' ? 'pagada' : 'pendent',
      fitxer_adjunt_path: c.fitxer_adjunt_path || '',
      notes: c.notes || ''
    })
    setShowCompraModal(true)
  }

  const handleSelectCompraArticle = (articleId: string) => {
    const art = articles.find(a => a.id === articleId)
    if (!art) {
      setNewCompra(prev => ({ ...prev, article_id: '' }))
      return
    }
    const pvp = art.preu_final || Number((art.preu_base * (1 + art.iva_percentatge / 100)).toFixed(2))
    const { base } = calcReverseVat(pvp, art.iva_percentatge, art.irpf_percentatge || 0)
    setNewCompra(prev => ({
      ...prev,
      article_id: art.id,
      unitat_negoci_id: art.unitat_negoci_id || prev.unitat_negoci_id,
      concepte: prev.concepte || art.nom,
      preu_amb_iva: pvp,
      base_imposable: base,
      iva_percentatge: art.iva_percentatge,
      irpf_percentatge: art.irpf_percentatge || prev.irpf_percentatge
    }))
  }

  const handleSaveCompra = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { base } = calcReverseVat(newCompra.preu_amb_iva, newCompra.iva_percentatge, newCompra.irpf_percentatge)
      const payload = {
        ...newCompra,
        base_imposable: newCompra.preu_amb_iva > 0 ? base : newCompra.base_imposable,
        preu_amb_iva: newCompra.preu_amb_iva > 0 ? newCompra.preu_amb_iva : undefined,
        unitat_negoci_id: newCompra.unitat_negoci_id || null,
        entrenador_id: newCompra.entrenador_id || null,
        article_id: newCompra.article_id || null
      }
      if (editingCompraId) {
        await updateFinCompra(editingCompraId, payload)
        showNotify('success', 'Factura de compra actualitzada correctament!')
      } else {
        await createFinCompra(payload)
        showNotify('success', 'Factura de compra registrada correctament!')
      }
      setShowCompraModal(false)
      loadCompres()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error desant la compra')
    }
  }

  const handleTogglePagamentCompra = async (c: FinCompra) => {
    try {
      const nextEstat = c.estat_pagament === 'pagada' ? 'pendent' : 'pagada'
      const today = new Date().toISOString().split('T')[0]
      await updateFinCompra(c.id, {
        ...c,
        estat_pagament: nextEstat,
        data_conciliacio: nextEstat === 'pagada' ? today : null
      })
      showNotify('success', nextEstat === 'pagada' ? 'Compra marcada com a pagada!' : 'Compra retornada a pendent!')
      loadCompres()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error canviant l\'estat de la compra')
    }
  }

  const handleDeleteCompra = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Factura de Compra',
      message: 'Segur que vols eliminar aquesta factura de compra? Aquesta acció no es pot desfer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancel·lar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteFinCompra(id)
          showNotify('success', 'Factura de compra eliminada')
          loadCompres()
        } catch (err: any) {
          showNotify('error', err.response?.data?.error || 'Error eliminant la compra')
        } finally {
          setConfirmDialog(null)
        }
      }
    })
  }

  // Operacions Despeses
  const openCreateDespesa = () => {
    setEditingDespesaId(null)
    setNewDespesa({
      categoria: 'banc',
      beneficiari_nom: '',
      concepte: '',
      unitat_negoci_id: unitats[0]?.id || '',
      entrenador_id: '',
      import_total: 0,
      es_recurrent: false,
      dia_mes_generacio: 1,
      data_devengo: new Date().toISOString().split('T')[0],
      data_venciment: new Date().toISOString().split('T')[0],
      periode_inici: new Date().toISOString().split('T')[0],
      periode_fi: new Date().toISOString().split('T')[0],
      estat_pagament: 'pendent',
      fitxer_adjunt_path: '',
      notes: ''
    })
    setShowDespesaModal(true)
  }

  const openEditDespesa = (d: FinDespesa) => {
    setEditingDespesaId(d.id)
    setNewDespesa({
      categoria: d.categoria,
      beneficiari_nom: d.beneficiari_nom,
      concepte: d.concepte,
      unitat_negoci_id: d.unitat_negoci_id || '',
      entrenador_id: d.entrenador_id || '',
      import_total: d.import_total,
      es_recurrent: !!d.es_recurrent,
      dia_mes_generacio: d.dia_mes_generacio || 1,
      data_devengo: d.data_devengo,
      data_venciment: d.data_venciment,
      periode_inici: d.periode_inici,
      periode_fi: d.periode_fi,
      estat_pagament: d.estat_pagament === 'pagada' ? 'pagada' : 'pendent',
      fitxer_adjunt_path: d.fitxer_adjunt_path || '',
      notes: d.notes || ''
    })
    setShowDespesaModal(true)
  }

  const handleSaveDespesa = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...newDespesa,
        unitat_negoci_id: newDespesa.unitat_negoci_id || null,
        entrenador_id: newDespesa.entrenador_id || null,
        dia_mes_generacio: newDespesa.es_recurrent ? (newDespesa.dia_mes_generacio || 1) : 1
      }
      if (editingDespesaId) {
        await updateFinDespesa(editingDespesaId, payload)
        showNotify('success', 'Despesa actualitzada correctament!')
      } else {
        await createFinDespesa(payload)
        showNotify('success', 'Despesa registrada correctament!')
      }
      setShowDespesaModal(false)
      loadDespeses()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error desant la despesa')
    }
  }

  const handleTogglePagamentDespesa = async (d: FinDespesa) => {
    try {
      const nextEstat = d.estat_pagament === 'pagada' ? 'pendent' : 'pagada'
      const today = new Date().toISOString().split('T')[0]
      await updateFinDespesa(d.id, {
        ...d,
        estat_pagament: nextEstat,
        data_conciliacio: nextEstat === 'pagada' ? today : null
      })
      showNotify('success', nextEstat === 'pagada' ? 'Despesa marcada com a pagada!' : 'Despesa retornada a pendent!')
      loadDespeses()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error canviant l\'estat de la despesa')
    }
  }

  const handleDeleteDespesa = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Despesa',
      message: 'Segur que vols eliminar aquesta despesa? Aquesta acció no es pot desfer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancel·lar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteFinDespesa(id)
          showNotify('success', 'Despesa eliminada')
          loadDespeses()
        } catch (err: any) {
          showNotify('error', err.response?.data?.error || 'Error eliminant la despesa')
        } finally {
          setConfirmDialog(null)
        }
      }
    })
  }

  const handleGenerarRecurrentsMesDespeses = async () => {
    try {
      const res = await generarDespesesRecurrentsMes(graellaMes)
      showNotify('success', `S'han generat ${res.despeses_creades} despeses recurrents del mes ${graellaMes}!`)
      loadDespeses()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error generant despeses recurrents')
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

  const handleDeleteImpost = (id: string, nom?: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Eliminar Tipus d'Impost",
      message: `Segur que vols eliminar o desactivar el tipus tributari ${nom ? `"${nom}"` : ''} del catàleg?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancel·lar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteFinImpost(id)
          showNotify('success', 'Tipus d\'impost eliminat')
          const imp = await listFinImpostos()
          setImpostos(imp)
        } catch (err: any) {
          showNotify('error', err.response?.data?.error || 'Error eliminant impost')
        } finally {
          setConfirmDialog(null)
        }
      }
    })
  }

  // 4. Articles
  const openCreateArticle = () => {
    setEditingArticleId(null)
    setNewArticle({ codi: '', nom: '', descripcio: '', tipus: 'venda', categoria: 'entrenament_recurrent', es_recurrent: false, periodicitat_mesos: 1 as 1 | 3 | 6 | 12, unitat_negoci_id: unitats[0]?.id || '', preu_base: 0, preu_final: 0, iva_percentatge: 21, irpf_percentatge: 0, causa_exempcio: '', actiu: true })
    setShowArticleModal(true)
  }
  const openEditArticle = (a: FinArticle) => {
    setEditingArticleId(a.id)
    const pvp = a.preu_final || Number((a.preu_base * (1 + a.iva_percentatge / 100)).toFixed(2))
    const { base } = calcReverseVat(pvp, a.iva_percentatge)
    setNewArticle({ codi: a.codi || '', nom: a.nom, descripcio: a.descripcio || '', tipus: (a.tipus || 'venda') as 'venda' | 'compra' | 'ambdos', categoria: a.categoria, es_recurrent: !!a.es_recurrent, periodicitat_mesos: (a.periodicitat_mesos || 1) as 1 | 3 | 6 | 12, unitat_negoci_id: a.unitat_negoci_id, preu_base: base, preu_final: pvp, iva_percentatge: a.iva_percentatge, irpf_percentatge: a.irpf_percentatge || 0, causa_exempcio: a.causa_exempcio || '', actiu: a.actiu })
    setShowArticleModal(true)
  }
  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { base, pvp } = calcReverseVat(newArticle.preu_final, newArticle.iva_percentatge)
      const payload = { ...newArticle, preu_final: pvp, preu_base: base }
      if (editingArticleId) {
        await updateFinArticle(editingArticleId, payload)
        showNotify('success', 'Article / Servei actualitzat correctament!')
      } else {
        await createFinArticle(payload)
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'compra' | 'despesa') => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      const url = await uploadFinanceDocument(file)
      if (target === 'compra') {
        setNewCompra(prev => ({ ...prev, fitxer_adjunt_path: url }))
      } else if (target === 'despesa') {
        setNewDespesa(prev => ({ ...prev, fitxer_adjunt_path: url }))
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

      {/* Breadcrumb & Contextual Header */}
      <div className="glass-card p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-text-muted font-medium mb-1.5">
            <span className="text-text-secondary font-semibold">Administració</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold border border-emerald-200/60">
              {TAB_TITLES[activeTab]}
            </span>
            {loading && (
              <span className="text-xs text-slate-400 flex items-center gap-1 ml-2">
                <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" /> Carregant...
              </span>
            )}
          </nav>

          <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
            {TAB_TITLES[activeTab]}
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            {TAB_DESCRIPTIONS[activeTab]}
          </p>
        </div>
      </div>

      {/* TAB 0: ⚡ GRAELLA DE FACTURACIÓ PERIÒDICA DEL MES */}
      {activeTab === 'graella' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header de la Graella */}
          <div className="glass-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Llançament Periòdic de Quotes & Venciments</span>
              </div>
              <h2 className="text-xl font-black text-text-primary mt-1">Facturació Mensual en Bloc</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Revisa les quotes recurrents dels atletes i les fites de vendes que vencen aquest mes abans d'emetre.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <span className="font-bold text-slate-500">Mes:</span>
                <input
                  type="month"
                  value={graellaMes}
                  onChange={e => {
                    setGraellaMes(e.target.value)
                    loadGraella(e.target.value)
                  }}
                  className="bg-transparent font-bold text-slate-900 outline-none"
                />
              </div>

              <button
                onClick={() => loadGraella(graellaMes)}
                disabled={graellaLoading}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                title="Refrescar dades del mes"
              >
                <RefreshCw className={`w-4 h-4 ${graellaLoading ? 'animate-spin text-emerald-600' : ''}`} />
              </button>

              <button
                onClick={handleGenerarDespesesRecurrents}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                title="Generar les despeses fixes del dia 1 (autònoms, lloguer) per aquest mes"
              >
                <span>🔄 Generar Despeses Dia 1</span>
              </button>
            </div>
          </div>

          {/* Banner d'èxit després d'emetre */}
          {graellaSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-950">
                    S'han emès {graellaSuccess.factures_creades} factures correctament!
                  </h4>
                  <p className="text-xs text-emerald-700">
                    Total facturat: <strong>{graellaSuccess.total_facturat.toFixed(2)} €</strong>. Tots els documents registrats amb número oficial correlatiu.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSearchParams({ tab: 'vendes' })}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors self-start sm:self-auto"
              >
                Veure Factures a Vendes →
              </button>
            </div>
          )}

          {/* Taula de Preselecció de la Graella */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    if (!graellaData) return
                    const next: Record<string, boolean> = {}
                    graellaData.items.filter(it => !it.ja_emesa && !it.pausat).forEach(it => { next[it.id] = true })
                    setGraellaSelected(next)
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
                >
                  Seleccionar Pendents
                </button>
                <button
                  onClick={() => setGraellaSelected({})}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
                >
                  Desmarcar Tots
                </button>
                <span className="text-slate-300">|</span>
                {/* Filtres d'estat de graella */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                  {[
                    { id: 'all', label: `Tots (${graellaData?.count || 0})` },
                    { id: 'pendent', label: `Pendents (${graellaData?.items.filter(i => !i.ja_emesa && !i.pausat).length || 0})` },
                    { id: 'emesa', label: `Ja emesos (${graellaData?.items.filter(i => i.ja_emesa).length || 0})` },
                    { id: 'pausat', label: `Pausats (${graellaData?.items.filter(i => i.pausat).length || 0})` }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setGraellaFilter(f.id as any)}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        graellaFilter === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                ✓ Sèrie activa per defecte assignada
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-border text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          graellaData && graellaData.items.filter(it => !it.ja_emesa && !it.pausat).length > 0
                            ? graellaData.items.filter(it => !it.ja_emesa && !it.pausat).every(it => graellaSelected[it.id])
                            : false
                        }
                        onChange={e => {
                          if (!graellaData) return
                          const next: Record<string, boolean> = { ...graellaSelected }
                          graellaData.items.filter(it => !it.ja_emesa && !it.pausat).forEach(it => {
                            next[it.id] = e.target.checked
                          })
                          setGraellaSelected(next)
                        }}
                        className="rounded text-emerald-600"
                      />
                    </th>
                    <th className="p-3">Tipus Origen</th>
                    <th className="p-3">Atleta / Client</th>
                    <th className="p-3">Concepte Factura</th>
                    <th className="p-3">Forma de Pagament</th>
                    <th className="p-3">Centre de Cost</th>
                    <th className="p-3 text-right">Base + IVA</th>
                    <th className="p-3 text-right">Preu Final (IVA incl.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-slate-700">
                  {graellaLoading ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-text-muted">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                        Carregant graella del mes {graellaMes}...
                      </td>
                    </tr>
                  ) : graellaData && graellaData.items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-text-muted">
                        No hi ha cap quota ni venciment pendent de facturar pel mes {graellaMes}.
                      </td>
                    </tr>
                  ) : graellaData && (() => {
                    const filtered = graellaData.items.filter(it => {
                      if (graellaFilter === 'pendent') return !it.ja_emesa && !it.pausat
                      if (graellaFilter === 'emesa') return it.ja_emesa
                      if (graellaFilter === 'pausat') return it.pausat
                      return true
                    })

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            Cap element coincideix amb el filtre seleccionat.
                          </td>
                        </tr>
                      )
                    }

                    return filtered.map(it => {
                      const isSelected = !!graellaSelected[it.id]
                      const customPvp = graellaCustomAmounts[it.id] ?? it.total_pvp
                      const customConcept = graellaCustomConcepts[it.id] ?? it.concepte
                      const { base: calcBase, iva: calcIva } = calcReverseVat(customPvp, it.iva_percentatge)

                      return (
                        <tr
                          key={it.id}
                          className={`hover:bg-slate-50/60 transition-colors ${
                            it.ja_emesa
                              ? 'bg-emerald-50/20'
                              : !isSelected
                              ? 'opacity-40 bg-slate-50/40'
                              : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            {it.ja_emesa ? (
                              <span title="Aquesta quota ja ha estat emesa aquest mes" className="text-emerald-700 font-black text-xs">
                                🔒
                              </span>
                            ) : (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={e => setGraellaSelected({ ...graellaSelected, [it.id]: e.target.checked })}
                                className="rounded text-emerald-600"
                              />
                            )}
                          </td>
                          <td className="p-3">
                            {it.ja_emesa ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                ✓ Emesa ({it.factura_numero || 'Emesa'})
                              </span>
                            ) : it.tipus_origen === 'quota_recurrent' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                🔄 Quota
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                📅 Venciment Pactat
                              </span>
                            )}
                            {it.pausat && (
                              <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                Pausat
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{it.client_nom}</div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                              <span>{it.client_nif || 'Sense NIF'}</span>
                              {it.entrenador_nom && (
                                <span className="text-indigo-600 font-semibold font-sans">· Coach: {it.entrenador_nom}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={customConcept}
                              disabled={it.ja_emesa}
                              onChange={e => setGraellaCustomConcepts({ ...graellaCustomConcepts, [it.id]: e.target.value })}
                              className={`w-full p-1 rounded text-xs outline-none ${
                                it.ja_emesa
                                  ? 'bg-transparent text-slate-600 cursor-not-allowed'
                                  : 'bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white'
                              }`}
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-slate-800">{it.forma_pagament}</div>
                            {it.iban && <div className="text-[10px] text-slate-400 font-mono">{it.iban.slice(0, 10)}...</div>}
                          </td>
                          <td className="p-3">
                            <span className="text-slate-600 font-medium">{it.centre_cost_nom || 'General'}</span>
                          </td>
                          <td className="p-3 text-right text-[11px] text-slate-500 font-mono">
                            <div>Base: {calcBase.toFixed(2)} €</div>
                            <div className="text-[10px] text-slate-400">IVA ({it.iva_percentatge}%): {calcIva.toFixed(2)} €</div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                step="0.01"
                                disabled={it.ja_emesa}
                                value={customPvp}
                                onChange={e => setGraellaCustomAmounts({ ...graellaCustomAmounts, [it.id]: parseFloat(e.target.value) || 0 })}
                                className={`w-24 p-1 text-right rounded text-xs font-mono font-black ${
                                  it.ja_emesa
                                    ? 'bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed'
                                    : 'border border-emerald-300 bg-emerald-50/40 text-slate-900'
                                }`}
                              />
                              <span className="font-bold">€</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>

            {/* Barra d'accions totals (Sticky Footer) */}
            {graellaData && graellaData.items.length > 0 && (() => {
              const selectedCount = graellaData.items.filter(it => graellaSelected[it.id]).length
              let sumBase = 0
              let sumPvp = 0
              let sumIva = 0
              graellaData.items.filter(it => graellaSelected[it.id]).forEach(it => {
                const p = graellaCustomAmounts[it.id] ?? it.total_pvp
                const { base, iva } = calcReverseVat(p, it.iva_percentatge)
                sumBase += base
                sumIva += iva
                sumPvp += p
              })

              return (
                <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-6 text-xs text-slate-300">
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Seleccionats</div>
                      <div className="text-lg font-black text-white">{selectedCount} factures</div>
                    </div>
                    <div className="h-8 w-px bg-slate-700 hidden sm:block"></div>
                    <div className="hidden sm:block">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Base Imposable</div>
                      <div className="text-sm font-bold text-slate-200">{sumBase.toFixed(2)} €</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">IVA</div>
                      <div className="text-sm font-bold text-slate-200">{sumIva.toFixed(2)} €</div>
                    </div>
                    <div className="h-8 w-px bg-slate-700"></div>
                    <div>
                      <div className="text-emerald-400 text-[10px] uppercase font-bold">Total a Facturar</div>
                      <div className="text-xl sm:text-2xl font-black text-emerald-400">{sumPvp.toFixed(2)} €</div>
                    </div>
                  </div>

                  <button
                    onClick={handleEmetreGraella}
                    disabled={graellaEmitting || selectedCount === 0}
                    className="w-full md:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {graellaEmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Emetent factures...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-slate-950" />
                        <span>Emetre Factures del Mes ({selectedCount})</span>
                      </>
                    )}
                  </button>
                </div>
              )
            })()}
          </div>
        </div>
      )}

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
      {activeTab === 'tresoreria' && (
        <div className="space-y-6">
          {/* SECCIÓ DINÀMICA: FINESTRA TEMPORAL (-X A +Y MESOS) */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Tresoreria Dinàmica</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    Finestra màx 12 mesos
                  </span>
                </div>
                <h3 className="text-lg font-black text-text-primary mt-0.5">Previsió de Flux de Caixa (Cashflow)</h3>
                <p className="text-xs text-text-muted">
                  Configura lliurement els mesos enrere (historial real) i mesos endavant (quotes previstes i compres).
                </p>
              </div>

              {/* Selectors dinàmics */}
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-medium">Historial:</span>
                  <select
                    value={cfPastMonths}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0
                      setCfPastMonths(val)
                      loadDynamicCashflow(val, cfFutureMonths)
                    }}
                    className="p-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                  >
                    <option value={0}>0 mesos (només futur)</option>
                    <option value={1}>-1 mes</option>
                    <option value={3}>-3 mesos</option>
                    <option value={6}>-6 mesos</option>
                    <option value={12}>-12 mesos</option>
                  </select>
                </div>

                <span className="text-slate-400">fins a</span>

                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-medium">Previsió:</span>
                  <select
                    value={cfFutureMonths}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0
                      setCfFutureMonths(val)
                      loadDynamicCashflow(cfPastMonths, val)
                    }}
                    className="p-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                  >
                    <option value={0}>0 mesos (només passat)</option>
                    <option value={3}>+3 mesos</option>
                    <option value={6}>+6 mesos</option>
                    <option value={9}>+9 mesos</option>
                    <option value={12}>+12 mesos</option>
                  </select>
                </div>
              </div>
            </div>

            {cfPastMonths + cfFutureMonths > 12 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>La finestra temporal total supera el límit permès de 12 mesos (1 any). Ajusta els selectors.</span>
              </div>
            )}

            {/* Taula de Cashflow Dinàmica */}
            {dynamicCfLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-text-muted text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
                <span>Calculant tresoreria dinàmica...</span>
              </div>
            ) : dynamicCfData && dynamicCfData.columns.length > 0 ? (
              <div className="border border-border rounded-xl overflow-x-auto shadow-xs text-xs">
                <table className="w-full text-left border-collapse min-w-[750px]">
                  <thead className="bg-slate-50/80 border-b border-border text-slate-600 font-bold text-[11px] uppercase">
                    <tr>
                      <th className="p-2.5 bg-slate-100 text-slate-700 font-bold">Concepte / Flux</th>
                      {dynamicCfData.columns.map(col => {
                        const badgeColor = col.tipus === 'past'
                          ? 'bg-slate-200 text-slate-700'
                          : col.tipus === 'current'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-blue-100 text-blue-800'
                        return (
                          <th key={col.month_key} className="p-2.5 text-right whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded ${badgeColor} font-bold text-[11px]`}>
                              {col.label}
                            </span>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="bg-slate-50/60 font-semibold text-slate-600">
                      <td className="p-2.5 font-bold">Saldo Inicial Banc</td>
                      {dynamicCfData.columns.map(c => (
                        <td key={c.month_key} className="p-2.5 text-right font-mono font-medium">
                          {c.saldo_inicial.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-emerald-800">+ Quotes recurrents atletes</td>
                      {dynamicCfData.columns.map(c => (
                        <td key={c.month_key} className="p-2.5 text-right font-mono font-medium text-emerald-700">
                          {c.quotes_atletes > 0 ? `+${c.quotes_atletes.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '—'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-blue-800">+ Fites de vendes (Campus / Acords)</td>
                      {dynamicCfData.columns.map(c => (
                        <td key={c.month_key} className="p-2.5 text-right font-mono font-medium text-blue-700">
                          {c.vendes_fites > 0 ? `+${c.vendes_fites.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '—'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-rose-800">- Factures de compra (Proveïdors)</td>
                      {dynamicCfData.columns.map(c => (
                        <td key={c.month_key} className="p-2.5 text-right font-mono font-medium text-rose-600">
                          {c.compres > 0 ? `-${c.compres.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '—'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-amber-800">- Despeses fixes dia 1 (Autònoms, lloguer)</td>
                      {dynamicCfData.columns.map(c => (
                        <td key={c.month_key} className="p-2.5 text-right font-mono font-medium text-amber-700">
                          {c.despeses > 0 ? `-${c.despeses.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '—'}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-slate-100/70 font-bold border-t border-b border-slate-300">
                      <td className="p-2.5 text-slate-900">Flux Net del Mes</td>
                      {dynamicCfData.columns.map(c => (
                        <td key={c.month_key} className={`p-2.5 text-right font-mono font-black ${c.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {c.net >= 0 ? '+' : ''}{c.net.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-slate-900 text-white font-black">
                      <td className="p-2.5">Saldo Final Estimat</td>
                      {dynamicCfData.columns.map(c => (
                        <td key={c.month_key} className="p-2.5 text-right font-mono text-emerald-400 font-black">
                          {c.saldo_final.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          {/* DESGLOSSAMENT DETALLAT A CURT TERMINI (CASHFLOW ENGINE EXISTING) */}
          {cashflowData && (
            <>
          <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">Horitzó de projecció diària:</span>
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
          </>
          )}
        </div>
      )}

      {/* TAB 3: VENDES & FACTURES */}
      {activeTab === 'vendes' && (() => {
        const filteredFactures = factures.filter(f => {
          if (vendesStatusFilter === 'esborrany' && f.estat_document !== 'esborrany') return false
          if (vendesStatusFilter === 'pendent' && (f.estat_document !== 'emesa' || f.estat_cobrament !== 'pendent')) return false
          if (vendesStatusFilter === 'parcial' && f.estat_cobrament !== 'parcial') return false
          if (vendesStatusFilter === 'pagada' && f.estat_cobrament !== 'pagada') return false
          if (vendesStatusFilter === 'impagada' && f.estat_cobrament !== 'impagada') return false
          if (vendesDateFrom && f.data_emissio < vendesDateFrom) return false
          if (vendesDateTo && f.data_emissio > vendesDateTo) return false
          if (vendesClientId && f.client_id !== vendesClientId) return false
          if (vendesArticleId && f.article_id !== vendesArticleId) return false
          if (vendesSearch.trim()) {
            const q = vendesSearch.toLowerCase().trim()
            const hay = `${f.numero_complet || ''} ${f.client_nom || ''} ${f.article_nom || ''} ${f.concepte || ''} ${f.descripcio_detall || ''}`.toLowerCase()
            if (!hay.includes(q)) return false
          }
          return true
        })

        const sumTotalFacturat = filteredFactures.filter(f => f.estat_document === 'emesa').reduce((acc, f) => acc + (f.total_factura || 0), 0)
        const sumTotalCobrat = filteredFactures.filter(f => f.estat_document === 'emesa').reduce((acc, f) => acc + (f.import_cobrat ?? (f.estat_cobrament === 'pagada' ? f.total_factura : 0)), 0)
        const sumTotalPendent = filteredFactures.filter(f => f.estat_document === 'emesa').reduce((acc, f) => acc + (f.import_pendent ?? (f.estat_cobrament === 'pagada' || f.estat_cobrament === 'compensada' ? 0 : f.total_factura)), 0)

        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Llibre de Factures de Venda</h2>
                <p className="text-xs text-slate-500 mt-0.5">Factures amb article vinculat, control d'import total vs pendent i pagaments parcials (Training Camps)</p>
              </div>
              <button
                onClick={openCreateFacturaModal}
                className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" /> Nova Factura
              </button>
            </div>

            {/* Barra de Filtres Vendes */}
            <div className="glass-card p-4 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                  <Filter className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Filtres de Vendes</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => applyQuickDatePreset('this_month', setVendesDateFrom, setVendesDateTo)} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">Mes actual</button>
                  <button type="button" onClick={() => applyQuickDatePreset('last_month', setVendesDateFrom, setVendesDateTo)} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">Mes passat</button>
                  <button type="button" onClick={() => applyQuickDatePreset('this_year', setVendesDateFrom, setVendesDateTo)} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">Any actual</button>
                  {(vendesDateFrom || vendesDateTo || vendesClientId || vendesArticleId || vendesSearch || vendesStatusFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setVendesDateFrom('')
                        setVendesDateTo('')
                        setVendesClientId('')
                        setVendesArticleId('')
                        setVendesSearch('')
                        setVendesStatusFilter('all')
                      }}
                      className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px]"
                    >
                      ✕ Netejar filtres
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Emissió des de</label>
                  <input type="date" value={vendesDateFrom} onChange={e => setVendesDateFrom(e.target.value)} className="w-full mt-0.5 p-1.5 border border-slate-200 rounded-lg bg-white" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Emissió fins a</label>
                  <input type="date" value={vendesDateTo} onChange={e => setVendesDateTo(e.target.value)} className="w-full mt-0.5 p-1.5 border border-slate-200 rounded-lg bg-white" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Client / Atleta</label>
                  <select value={vendesClientId} onChange={e => setVendesClientId(e.target.value)} className="w-full mt-0.5 p-1.5 border border-slate-200 rounded-lg bg-white">
                    <option value="">Tots els clients</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.nom_fiscal}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Article vinculat</label>
                  <select value={vendesArticleId} onChange={e => setVendesArticleId(e.target.value)} className="w-full mt-0.5 p-1.5 border border-slate-200 rounded-lg bg-white">
                    <option value="">Tots els articles</option>
                    {articles.filter(a => a.tipus !== 'compra').map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Concepte / Descripció</label>
                  <div className="relative mt-0.5">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={vendesSearch}
                      onChange={e => setVendesSearch(e.target.value)}
                      placeholder="Cerca concepte, núm..."
                      className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                  {[
                    { id: 'all', label: `Totes (${factures.length})` },
                    { id: 'pendent', label: `Pendents (${factures.filter(f => f.estat_document === 'emesa' && f.estat_cobrament === 'pendent').length})` },
                    { id: 'parcial', label: `Parcials (${factures.filter(f => f.estat_cobrament === 'parcial').length})` },
                    { id: 'pagada', label: `Pagades (${factures.filter(f => f.estat_cobrament === 'pagada').length})` },
                    { id: 'impagada', label: `Impagades (${factures.filter(f => f.estat_cobrament === 'impagada').length})` },
                    { id: 'esborrany', label: `Esborranys (${factures.filter(f => f.estat_document === 'esborrany').length})` }
                  ].map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setVendesStatusFilter(st.id as any)}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        vendesStatusFilter === st.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold">Total Facturat: </span>
                    <span className="font-black text-slate-900">{sumTotalFacturat.toFixed(2)} €</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Cobrat: </span>
                    <span className="font-black text-emerald-700">{sumTotalCobrat.toFixed(2)} €</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Pendent: </span>
                    <span className="font-black text-amber-700">{sumTotalPendent.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[920px]">
                  <thead>
                    <tr className="border-b border-border-light text-slate-400 uppercase text-[10px] font-bold bg-slate-50/50">
                      <th className="py-2.5 px-4">Núm. Factura</th>
                      <th className="py-2.5 px-4">Client</th>
                      <th className="py-2.5 px-4">Article & Concepte</th>
                      <th className="py-2.5 px-4 text-right">Base + IVA</th>
                      <th className="py-2.5 px-4 text-right">Import Total</th>
                      <th className="py-2.5 px-4 text-right">Pendent</th>
                      <th className="py-2.5 px-4">Dates</th>
                      <th className="py-2.5 px-4">Estat</th>
                      <th className="py-2.5 px-4 text-right">Accions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light font-medium">
                    {filteredFactures.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-400">
                          Cap factura coincideix amb els filtres seleccionats.
                        </td>
                      </tr>
                    ) : filteredFactures.map(f => {
                      const isEmesa = f.estat_document === 'emesa'
                      const isPagada = f.estat_cobrament === 'pagada'
                      const isParcial = f.estat_cobrament === 'parcial'
                      const isImpagada = f.estat_cobrament === 'impagada'
                      const isCompensada = f.estat_cobrament === 'compensada'
                      const numDisplay = f.numero_complet || 'ESBORRANY'
                      const cobrat = f.import_cobrat ?? (isPagada ? f.total_factura : 0)
                      const pendent = f.import_pendent ?? (isPagada || isCompensada ? 0 : f.total_factura)

                      return (
                        <tr key={f.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 flex items-center gap-1">
                              {f.tipus_factura === 'R1' && <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-black">R</span>}
                              {numDisplay}
                            </div>
                            <div className="text-[10px] text-slate-400">{f.unitat_negoci_nom}{f.entrenador_nom ? ` · ${f.entrenador_nom}` : ''}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{f.client_nom}</div>
                            <div className="text-[10px] text-slate-400">{f.client_nif || 'Sense NIF'}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 max-w-xs">
                            {f.article_nom && (
                              <span className="inline-block mb-0.5 px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                {f.article_nom}
                              </span>
                            )}
                            <div className="font-semibold text-slate-800 truncate">{f.concepte}</div>
                            {f.descripcio_detall && <div className="text-[10px] text-slate-400 truncate">{f.descripcio_detall}</div>}
                          </td>
                          <td className="py-3 px-4 text-right text-[11px] text-slate-500 font-mono">
                            <div>{f.base_imposable.toFixed(2)} €</div>
                            <div className="text-[10px] text-slate-400">+{f.iva_import.toFixed(2)} € IVA</div>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900 font-mono">{f.total_factura.toFixed(2)} €</td>
                          <td className="py-3 px-4 text-right font-mono">
                            <div className={`font-black ${pendent > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {pendent.toFixed(2)} €
                            </div>
                            {cobrat > 0 && pendent > 0 && (
                              <div className="text-[10px] text-indigo-700 font-bold">Cobrat: {cobrat.toFixed(2)} €</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap">
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
                            ) : isParcial ? (
                              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit inline-block">
                                Parcial
                              </span>
                            ) : isCompensada ? (
                              <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit inline-block">
                                Compensada
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
                                    onClick={() => handleEmetreFactura(f.id, f.numero_complet || f.concepte)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold"
                                  >
                                    Emetre
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFactura(f.id, f.numero_complet || f.concepte)}
                                    className="p-1 text-slate-400 hover:text-rose-600"
                                    title="Eliminar esborrany"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {isEmesa && f.tipus_factura !== 'R1' && !isCompensada && (
                                <button
                                  onClick={() => openCobramentsModal(f)}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1"
                                  title="Registrar pagaments parcials o veure historial de cobraments"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Pagaments</span>
                                </button>
                              )}

                              {isEmesa && !isPagada && !isCompensada && (
                                <>
                                  <button
                                    onClick={() => handleConciliarFactura(f.id, f.numero_complet || f.concepte)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold"
                                    title="Conciliar el 100% del saldo pendent"
                                  >
                                    Conciliar
                                  </button>
                                  {!isImpagada && (
                                    <button
                                      onClick={() => handleMarcarImpagada(f.id, f.numero_complet || f.concepte)}
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
          </div>
        )
      })()}

      {/* TAB 3: COMPRES FISCALS */}
      {/* TAB 4: COMPRES & PROVEÏDORS */}
      {activeTab === 'compres' && (() => {
        const filteredCompres = compres.filter(c => {
          if (compresFilter === 'pendent' && c.estat_pagament === 'pagada') return false
          if (compresFilter === 'pagada' && c.estat_pagament !== 'pagada') return false
          if (compresDateFrom && c.data_emissio < compresDateFrom) return false
          if (compresDateTo && c.data_emissio > compresDateTo) return false
          if (compresProveidorId && c.proveidor_id !== compresProveidorId) return false
          if (compresArticleId && c.article_id !== compresArticleId) return false
          if (compresSearch.trim()) {
            const q = compresSearch.toLowerCase().trim()
            const hay = `${c.num_factura_proveidor || ''} ${c.proveidor_nom || ''} ${c.article_nom || ''} ${c.concepte || ''} ${c.notes || ''}`.toLowerCase()
            if (!hay.includes(q)) return false
          }
          return true
        })

        const sumCompresTotal = filteredCompres.reduce((acc, c) => acc + (c.total_pagar || 0), 0)
        const sumCompresPendent = filteredCompres.filter(c => c.estat_pagament !== 'pagada').reduce((acc, c) => acc + (c.total_pagar || 0), 0)

        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Llibre de Factures de Compra i Proveïdors</h2>
                <p className="text-xs text-slate-500 mt-0.5">Control de factures rebudes, despeses deduïbles i assignació a unitats de negoci</p>
              </div>
              <button
                onClick={openCreateCompra}
                className="btn-primary text-xs py-2 px-3.5 bg-rose-600 hover:bg-rose-700 flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Registrar Compra
              </button>
            </div>

            {/* Barra de Filtres Compres */}
            <div className="glass-card p-4 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                  <Filter className="w-3.5 h-3.5 text-rose-600" />
                  <span>Filtres de Compres</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => applyQuickDatePreset('this_month', setCompresDateFrom, setCompresDateTo)} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">Mes actual</button>
                  <button type="button" onClick={() => applyQuickDatePreset('last_month', setCompresDateFrom, setCompresDateTo)} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">Mes passat</button>
                  <button type="button" onClick={() => applyQuickDatePreset('this_year', setCompresDateFrom, setCompresDateTo)} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">Any actual</button>
                  {(compresDateFrom || compresDateTo || compresProveidorId || compresArticleId || compresSearch || compresFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setCompresDateFrom('')
                        setCompresDateTo('')
                        setCompresProveidorId('')
                        setCompresArticleId('')
                        setCompresSearch('')
                        setCompresFilter('all')
                      }}
                      className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px]"
                    >
                      ✕ Netejar filtres
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Emissió des de</label>
                  <input type="date" value={compresDateFrom} onChange={e => setCompresDateFrom(e.target.value)} className="w-full mt-0.5 p-1.5 border border-slate-200 rounded-lg bg-white" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Emissió fins a</label>
                  <input type="date" value={compresDateTo} onChange={e => setCompresDateTo(e.target.value)} className="w-full mt-0.5 p-1.5 border border-slate-200 rounded-lg bg-white" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Proveïdor</label>
                  <select value={compresProveidorId} onChange={e => setCompresProveidorId(e.target.value)} className="w-full mt-0.5 p-1.5 border border-slate-200 rounded-lg bg-white">
                    <option value="">Tots els proveïdors</option>
                    {proveidors.map(p => <option key={p.id} value={p.id}>{p.nom_fiscal}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Article</label>
                  <select value={compresArticleId} onChange={e => setCompresArticleId(e.target.value)} className="w-full mt-0.5 p-1.5 border border-slate-200 rounded-lg bg-white">
                    <option value="">Tots els articles</option>
                    {articles.filter(a => a.tipus === 'compra' || a.tipus === 'ambdos').map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Concepte / Descripció</label>
                  <div className="relative mt-0.5">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={compresSearch}
                      onChange={e => setCompresSearch(e.target.value)}
                      placeholder="Cerca concepte, núm..."
                      className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                  {[
                    { id: 'all', label: `Totes (${compres.length})` },
                    { id: 'pendent', label: `Pendents (${compres.filter(c => c.estat_pagament !== 'pagada').length})` },
                    { id: 'pagada', label: `Pagades (${compres.filter(c => c.estat_pagament === 'pagada').length})` }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setCompresFilter(f.id as any)}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        compresFilter === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold">Total filtrat: </span>
                    <span className="font-black text-slate-900">{sumCompresTotal.toFixed(2)} €</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Pendent pagar: </span>
                    <span className="font-black text-amber-700">{sumCompresPendent.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[850px]">
                  <thead>
                    <tr className="border-b border-border-light text-slate-400 uppercase text-[10px] font-bold bg-slate-50/50">
                      <th className="py-2.5 px-4">Proveïdor</th>
                      <th className="py-2.5 px-4">Núm. Factura</th>
                      <th className="py-2.5 px-4">Article & Concepte</th>
                      <th className="py-2.5 px-4">Unitat de Negoci</th>
                      <th className="py-2.5 px-4 text-right">Base</th>
                      <th className="py-2.5 px-4 text-right">IVA</th>
                      <th className="py-2.5 px-4 text-right">IRPF Retingut</th>
                      <th className="py-2.5 px-4 text-right">Total a Pagar</th>
                      <th className="py-2.5 px-4">Estat</th>
                      <th className="py-2.5 px-4 text-right">Accions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light font-medium">
                    {filteredCompres.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-slate-400">
                          No hi ha cap factura de compra per al filtre seleccionat.
                        </td>
                      </tr>
                    ) : filteredCompres.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div>{c.proveidor_nom}</div>
                          <div className="text-[10px] text-slate-400 font-mono font-normal">{c.proveidor_nif}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">{c.num_factura_proveidor}</td>
                        <td className="py-3 px-4 text-slate-700">
                          {c.article_nom && (
                            <span className="inline-block mb-0.5 px-1.5 py-0.2 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                              {c.article_nom}
                            </span>
                          )}
                          <div>{c.concepte}</div>
                          <div className="text-[10px] text-slate-400">Emissió: {c.data_emissio} · Venc: {c.data_venciment}{c.entrenador_nom ? ` · Coach: ${c.entrenador_nom}` : ''}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                            {c.unitat_negoci_nom || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">{c.base_imposable.toFixed(2)} €</td>
                        <td className="py-3 px-4 text-right text-emerald-700">+{c.iva_import.toFixed(2)} €</td>
                        <td className="py-3 px-4 text-right text-rose-700">-{c.irpf_import.toFixed(2)} €</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">{c.total_pagar.toFixed(2)} €</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {c.estat_pagament === 'pagada' ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Pagada
                              </span>
                            ) : (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Pendent
                              </span>
                            )}
                            <button
                              onClick={() => handleTogglePagamentCompra(c)}
                              title={c.estat_pagament === 'pagada' ? "Passar a Pendent" : "Marcar com a Pagada"}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-colors ${
                                c.estat_pagament === 'pagada'
                                  ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              {c.estat_pagament === 'pagada' ? '↩️ Pendent' : '✓ Pagada'}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditCompra(c)}
                              title="Editar factura de compra"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {c.fitxer_adjunt_path && (
                              <a
                                href={c.fitxer_adjunt_path}
                                target="_blank"
                                rel="noreferrer"
                                title="Veure document adjunt"
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteCompra(c.id)}
                              title="Eliminar factura de compra"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
          </div>
        )
      })()}

      {/* TAB 5: DESPESES OPERATIVES */}
      {activeTab === 'despeses' && (() => {
        const distinctBeneficiaris = Array.from(new Set(despeses.map(d => d.beneficiari_nom).filter(Boolean))).sort()
        const filteredDespeses = despeses.filter(d => {
          if (despesesFilter === 'pendent' && d.estat_pagament === 'pagada') return false
          if (despesesFilter === 'pagada' && d.estat_pagament !== 'pagada') return false
          if (despesesFilter === 'recurrent' && !d.es_recurrent) return false
          if (despesesDateFrom && d.data_devengo < despesesDateFrom) return false
          if (despesesDateTo && d.data_devengo > despesesDateTo) return false
          if (despesesBeneficiari && d.beneficiari_nom !== despesesBeneficiari) return false
          if (despesesCategoria && d.categoria !== despesesCategoria) return false
          if (despesesSearch.trim()) {
            const q = despesesSearch.toLowerCase().trim()
            const hay = `${d.beneficiari_nom || ''} ${d.categoria || ''} ${d.concepte || ''} ${d.notes || ''}`.toLowerCase()
            if (!hay.includes(q)) return false
          }
          return true
        })

        const sumDespesesTotal = filteredDespeses.reduce((acc, d) => acc + (d.import_total || 0), 0)
        const sumDespesesPendent = filteredDespeses.filter(d => d.estat_pagament !== 'pagada').reduce((acc, d) => acc + (d.import_total || 0), 0)

        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Despeses Operatives (Nòmines, SS, Banc, Impostos, Lloguer)</h2>
                <p className="text-xs text-slate-500 mt-0.5">Gestió de despeses fixes mensuals, plantilles recurrents i pagaments puntuals</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerarRecurrentsMesDespeses}
                  title={`Generar totes les despeses fixes recurrents pel mes ${graellaMes}`}
                  className="btn-secondary text-xs py-2 px-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1.5 font-bold"
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-600" /> Generar Recurrents
                </button>
                <button
                  onClick={openCreateDespesa}
                  className="btn-primary text-xs py-2 px-3.5 bg-amber-600 hover:bg-amber-700 flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Registrar Despesa
                </button>
              </div>
            </div>

            {/* Barra de Filtres Despeses */}
            <div className="glass-card p-4 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                  <Filter className="w-3.5 h-3.5 text-amber-600" />
                  <span>Filtres de Despeses</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => applyQuickDatePreset('this_month', setDespesesDateFrom, setDespesesDateTo)} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">Mes actual</button>
                  <button type="button" onClick={() => applyQuickDatePreset('last_month', setDespesesDateFrom, setDespesesDateTo)} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">Mes passat</button>
                  <button type="button" onClick={() => applyQuickDatePreset('this_year', setDespesesDateFrom, setDespesesDateTo)} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">Any actual</button>
                  {(despesesDateFrom || despesesDateTo || despesesBeneficiari || despesesCategoria || despesesSearch || despesesFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setDespesesDateFrom('')
                        setDespesesDateTo('')
                        setDespesesBeneficiari('')
                        setDespesesCategoria('')
                        setDespesesSearch('')
                        setDespesesFilter('all')
                      }}
                      className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px]"
                    >
                      ✕ Netejar filtres
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Devengo des de</label>
                  <input type="date" value={despesesDateFrom} onChange={e => setDespesesDateFrom(e.target.value)} className="w-full mt-0.5 p-1.5 border border-slate-200 rounded-lg bg-white" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Devengo fins a</label>
                  <input type="date" value={despesesDateTo} onChange={e => setDespesesDateTo(e.target.value)} className="w-full mt-0.5 p-1.5 border border-slate-200 rounded-lg bg-white" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Beneficiari / Proveïdor</label>
                  <select value={despesesBeneficiari} onChange={e => setDespesesBeneficiari(e.target.value)} className="w-full mt-0.5 p-1.5 border border-slate-200 rounded-lg bg-white">
                    <option value="">Tots els beneficiaris</option>
                    {distinctBeneficiaris.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Categoria</label>
                  <select value={despesesCategoria} onChange={e => setDespesesCategoria(e.target.value)} className="w-full mt-0.5 p-1.5 border border-slate-200 rounded-lg bg-white">
                    <option value="">Totes les categories</option>
                    <option value="nomina">Nòmina</option>
                    <option value="seguretat_social">Seguretat Social / Autònom</option>
                    <option value="banc">Comissió Bancària</option>
                    <option value="impostos">Impostos / Taxes</option>
                    <option value="dietes">Dietes / Desplaçaments</option>
                    <option value="altres">Altres despeses</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Concepte / Descripció</label>
                  <div className="relative mt-0.5">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={despesesSearch}
                      onChange={e => setDespesesSearch(e.target.value)}
                      placeholder="Cerca concepte, notes..."
                      className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                  {[
                    { id: 'all', label: `Totes (${despeses.length})` },
                    { id: 'recurrent', label: `🔄 Recurrents (${despeses.filter(d => d.es_recurrent).length})` },
                    { id: 'pendent', label: `Pendents (${despeses.filter(d => d.estat_pagament !== 'pagada').length})` },
                    { id: 'pagada', label: `Pagades (${despeses.filter(d => d.estat_pagament === 'pagada').length})` }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setDespesesFilter(f.id as any)}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        despesesFilter === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold">Total filtrat: </span>
                    <span className="font-black text-slate-900">{sumDespesesTotal.toFixed(2)} €</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Pendent pagar: </span>
                    <span className="font-black text-amber-700">{sumDespesesPendent.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[850px]">
                  <thead>
                    <tr className="border-b border-border-light text-slate-400 uppercase text-[10px] font-bold bg-slate-50/50">
                      <th className="py-2.5 px-4">Categoria</th>
                      <th className="py-2.5 px-4">Beneficiari</th>
                      <th className="py-2.5 px-4">Concepte</th>
                      <th className="py-2.5 px-4">Unitat de Negoci</th>
                      <th className="py-2.5 px-4">Tipus Despesa</th>
                      <th className="py-2.5 px-4 text-right">Import Total</th>
                      <th className="py-2.5 px-4">Data Devengo</th>
                      <th className="py-2.5 px-4">Estat</th>
                      <th className="py-2.5 px-4 text-right">Accions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light font-medium">
                    {filteredDespeses.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-400">
                          No hi ha cap despesa per al filtre seleccionat.
                        </td>
                      </tr>
                    ) : filteredDespeses.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                            {d.categoria.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{d.beneficiari_nom}</td>
                        <td className="py-3 px-4 text-slate-700">
                          <div>{d.concepte}</div>
                          {d.entrenador_nom && <div className="text-[10px] text-indigo-600 font-semibold">Coach: {d.entrenador_nom}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                            {d.unitat_negoci_nom || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {d.es_recurrent ? (
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                              🔄 Recurrent (dia {d.dia_mes_generacio || 1})
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Puntual
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-rose-700">{d.import_total.toFixed(2)} €</td>
                        <td className="py-3 px-4 text-slate-500">{d.data_devengo}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {d.estat_pagament === 'pagada' ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Pagada
                              </span>
                            ) : (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Pendent
                              </span>
                            )}
                            <button
                              onClick={() => handleTogglePagamentDespesa(d)}
                              title={d.estat_pagament === 'pagada' ? "Passar a Pendent" : "Marcar com a Pagada"}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-colors ${
                                d.estat_pagament === 'pagada'
                                  ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              {d.estat_pagament === 'pagada' ? '↩️ Pendent' : '✓ Pagada'}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditDespesa(d)}
                              title="Editar despesa"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {d.fitxer_adjunt_path && (
                              <a
                                href={d.fitxer_adjunt_path}
                                target="_blank"
                                rel="noreferrer"
                                title="Veure document adjunt"
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteDespesa(d.id)}
                              title="Eliminar despesa"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
          </div>
        )
      })()}

      {/* TAB 6: LIQUIDACIÓ PER ENTRENADOR */}
      {activeTab === 'liquidacio' && (
        <div className="space-y-5 animate-fade-in">
          <div className="glass-card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                  Imports sobre Total Factura (IVA inclòs)
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">Liquidació Mensual per Entrenador</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Desglossament complet de vendes emeses (venut, cobrat i pendent/impagat) menys compres i despeses associades a cada entrenador.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <span className="font-bold text-slate-500">Mes-Any:</span>
                <input
                  type="month"
                  value={liquidacioMes}
                  onChange={e => {
                    setLiquidacioMes(e.target.value)
                    loadLiquidacio(e.target.value)
                  }}
                  className="bg-transparent font-bold text-slate-900 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => loadLiquidacio(liquidacioMes)}
                disabled={liquidacioLoading}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                title="Refrescar liquidació"
              >
                <RefreshCw className={`w-4 h-4 ${liquidacioLoading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>

              <a
                href={`/api/finances/liquidacio-entrenadors/csv?mes=${liquidacioMes}`}
                download
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-indigo-700 shadow-sm text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </a>
            </div>
          </div>

          {liquidacioData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-5 border-l-4 border-l-slate-700">
                <div className="text-xs font-bold uppercase text-slate-400">Total Venut ({liquidacioMes})</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{liquidacioData.total_venut.toFixed(2)} €</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Factures emeses (IVA inclòs)</div>
              </div>

              <div className="glass-card p-5 border-l-4 border-l-emerald-500">
                <div className="text-xs font-bold uppercase text-slate-400">Total Cobrat</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">{liquidacioData.total_cobrat.toFixed(2)} €</div>
                <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                  No cobrat: {liquidacioData.total_no_cobrat.toFixed(2)} € ({liquidacioData.total_impagat.toFixed(2)} € impagat)
                </div>
              </div>

              <div className="glass-card p-5 border-l-4 border-l-rose-500">
                <div className="text-xs font-bold uppercase text-slate-400">Total Comprat + Despeses</div>
                <div className="text-2xl font-black text-rose-700 mt-1">{liquidacioData.total_comprat.toFixed(2)} €</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Imputades al mes (IVA inclòs)</div>
              </div>

              <div className={`glass-card p-5 border-l-4 ${liquidacioData.liquidacio_sobre_cobrat >= 0 ? 'border-l-indigo-600' : 'border-l-rose-600'}`}>
                <div className="text-xs font-bold uppercase text-slate-400">Liquidació Real (Cobrat - Comprat)</div>
                <div className={`text-2xl font-black mt-1 ${liquidacioData.liquidacio_sobre_cobrat >= 0 ? 'text-indigo-900' : 'text-rose-600'}`}>
                  {liquidacioData.liquidacio_sobre_cobrat.toFixed(2)} €
                </div>
                <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                  Sobre venut: {liquidacioData.liquidacio_sobre_venut.toFixed(2)} €
                </div>
              </div>
            </div>
          )}

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[920px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-border text-slate-500 uppercase text-[10px] font-bold">
                    <th className="py-3 px-4">Entrenador</th>
                    <th className="py-3 px-4 text-right">Venut (Facturat)</th>
                    <th className="py-3 px-4 text-right">Cobrat</th>
                    <th className="py-3 px-4 text-right">Pendent</th>
                    <th className="py-3 px-4 text-right">Impagat</th>
                    <th className="py-3 px-4 text-right">Comprat + Despeses</th>
                    <th className="py-3 px-4 text-right">Net s/ Venut</th>
                    <th className="py-3 px-4 text-right bg-indigo-50/60 text-indigo-900">Liquidació s/ Cobrat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {liquidacioLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                        Calculant liquidació del mes {liquidacioMes}...
                      </td>
                    </tr>
                  ) : !liquidacioData || liquidacioData.files.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No hi ha dades per al mes seleccionat.
                      </td>
                    </tr>
                  ) : liquidacioData.files.map(row => {
                    const isExpanded = !!expandedLiquidacioCoach[row.entrenador_id]
                    return (
                      <React.Fragment key={row.entrenador_id}>
                        <tr
                          onClick={() => setExpandedLiquidacioCoach(prev => ({ ...prev, [row.entrenador_id]: !prev[row.entrenador_id] }))}
                          className={`cursor-pointer hover:bg-slate-50/80 transition-colors ${row.entrenador_id === '__none__' ? 'bg-slate-50/40' : ''}`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                              <div>
                                <div className="font-bold text-slate-900">{row.entrenador_nom}</div>
                                <div className="text-[10px] text-slate-400">
                                  {row.num_factures_venda} vendes · {row.num_compres_despeses} compres/despeses
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{row.venut.toFixed(2)} €</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">{row.cobrat.toFixed(2)} €</td>
                          <td className="py-3.5 px-4 text-right font-mono text-amber-700 font-semibold">{row.pendent.toFixed(2)} €</td>
                          <td className="py-3.5 px-4 text-right font-mono text-rose-700 font-semibold">{row.impagat.toFixed(2)} €</td>
                          <td className="py-3.5 px-4 text-right font-mono text-rose-700 font-bold">-{row.comprat.toFixed(2)} €</td>
                          <td className={`py-3.5 px-4 text-right font-mono font-bold ${row.net_sobre_venut >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                            {row.net_sobre_venut.toFixed(2)} €
                          </td>
                          <td className="py-3.5 px-4 text-right bg-indigo-50/40">
                            <span className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg ${
                              row.net_sobre_cobrat >= 0 ? 'bg-indigo-100 text-indigo-950' : 'bg-rose-100 text-rose-900'
                            }`}>
                              {row.net_sobre_cobrat.toFixed(2)} €
                            </span>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={8} className="p-4">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Detall Vendes */}
                                <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2">
                                  <h4 className="font-bold text-xs text-emerald-800 uppercase tracking-wider">
                                    Detall de Factures de Venda ({row.detall_vendes.length})
                                  </h4>
                                  {row.detall_vendes.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic py-2">Cap factura de venda aquest mes.</p>
                                  ) : (
                                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                                      {row.detall_vendes.map(v => (
                                        <div key={v.id} className="py-2 flex items-center justify-between gap-2 text-[11px]">
                                          <div className="min-w-0">
                                            <div className="font-bold text-slate-800 truncate">{v.client_nom} · <span className="font-mono text-slate-500">{v.numero}</span></div>
                                            <div className="text-slate-500 truncate">{v.concepte}</div>
                                          </div>
                                          <div className="text-right shrink-0 font-mono">
                                            <div className="font-bold text-slate-900">{v.total_factura.toFixed(2)} €</div>
                                            <div className={`text-[10px] font-bold ${
                                              v.estat_cobrament === 'pagada' ? 'text-emerald-700' : v.estat_cobrament === 'impagada' ? 'text-rose-700' : 'text-amber-700'
                                            }`}>
                                              {v.estat_cobrament === 'pagada' ? 'Cobrada' : `Pendent: ${v.import_pendent.toFixed(2)} €`}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Detall Compres i Despeses */}
                                <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2">
                                  <h4 className="font-bold text-xs text-rose-800 uppercase tracking-wider">
                                    Detall de Compres i Despeses Imputades ({row.detall_compres.length})
                                  </h4>
                                  {row.detall_compres.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic py-2">Cap compra ni despesa imputada aquest mes.</p>
                                  ) : (
                                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                                      {row.detall_compres.map(c => (
                                        <div key={c.id} className="py-2 flex items-center justify-between gap-2 text-[11px]">
                                          <div className="min-w-0">
                                            <div className="font-bold text-slate-800 truncate">
                                              <span className="uppercase text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 mr-1.5">{c.tipus}</span>
                                              {c.proveidor_nom}
                                            </div>
                                            <div className="text-slate-500 truncate">{c.concepte} ({c.data})</div>
                                          </div>
                                          <div className="text-right shrink-0 font-mono font-bold text-rose-700">
                                            -{c.import_total.toFixed(2)} €
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
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
              { id: 'clients', label: 'Xivato NIF (Atletes)', icon: Users, badge: clients.filter(c => !c.nif_cif || c.nif_cif.trim() === '').length },
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
                  {tab.badge && tab.badge > 0 ? (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isSelected ? 'bg-amber-200 text-amber-900' : 'bg-amber-500 text-white'
                    }`}>
                      {tab.badge}
                    </span>
                  ) : null}
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

              {/* Cicle de Cobrament i Automatització d'Avisos (Dia Límit & Dia Límit + 1) */}
              <div className="mt-4 pt-5 border-t border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-600" /> Dia Límit de Pagament i Automatització d'Emails
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      El sistema revisa cada dia a les <strong>09:00h</strong> les factures emeses amb venciment complert que Administració encara no hagi conciliat.
                    </p>
                  </div>

                  <label className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={!!config.avisos_impagament_actius}
                      onChange={e => setConfig({ ...config, avisos_impagament_actius: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span>Enviament automàtic actiu</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="font-bold text-slate-800 block">Dia Límit de Pagament Mensual (1 - 27)</label>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-slate-500 font-semibold">Dia</span>
                      <input
                        type="number"
                        min={1}
                        max={27}
                        value={config.dia_limit_pagament || 5}
                        onChange={e => {
                          const v = Math.max(1, Math.min(27, parseInt(e.target.value) || 5))
                          setConfig({ ...config, dia_limit_pagament: v })
                        }}
                        className="w-20 p-2 border border-slate-300 rounded-xl bg-white text-center font-black text-base text-emerald-700"
                      />
                      <span className="text-slate-500">de cada mes</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      També s'utilitza com a venciment per defecte en emetre les quotes de la graella mensual.
                    </p>
                  </div>

                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-amber-900">1️⃣ Dia {config.dia_limit_pagament || 5} del mes (09:00h) → Entrenadors</div>
                      <p className="text-[11px] text-amber-800 mt-1">
                        Envia un resum informatiu a cada entrenador amb els seus atletes que Administració encara no ha marcat com a conciliats.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Enviar Resum Informatiu als Entrenadors',
                          message: 'Vols executar ara mateix l\'enviament del resum d\'atletes pendents de conciliar a cada entrenador?',
                          confirmText: 'Enviar a Entrenadors',
                          variant: 'info',
                          onConfirm: async () => {
                            try {
                              const res = await executarAvisosCobrament('entrenadors')
                              showNotify('success', `S'han enviat ${res.enviats} correus de resum als entrenadors!`)
                            } catch (err: any) {
                              showNotify('error', err.response?.data?.error || 'Error enviant avisos als entrenadors')
                            } finally {
                              setConfirmDialog(null)
                            }
                          }
                        })
                      }}
                      className="mt-3 px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 w-fit"
                    >
                      <Send className="w-3 h-3" /> Executar avís entrenadors ara
                    </button>
                  </div>

                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-emerald-900">2️⃣ Dia {(config.dia_limit_pagament || 5) + 1} del mes (09:00h) → Atletes</div>
                      <p className="text-[11px] text-emerald-800 mt-1">
                        Envia un email súper amable i empàtic (CAT/ESP/ENG) només als atletes que l'endemà encara continuïn amb import pendent.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Enviar Recordatori Amable als Atletes Pendents',
                          message: 'Vols enviar ara el correu amable de recordatori als atletes amb factures vençudes pendents de pagar?',
                          confirmText: 'Enviar Recordatoris Polite',
                          variant: 'warning',
                          onConfirm: async () => {
                            try {
                              const res = await executarAvisosCobrament('atletes')
                              showNotify('success', `S'han enviat ${res.enviats} recordatoris amables als atletes!`)
                            } catch (err: any) {
                              showNotify('error', err.response?.data?.error || 'Error enviant recordatoris als atletes')
                            } finally {
                              setConfirmDialog(null)
                            }
                          }
                        })
                      }}
                      className="mt-3 px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 w-fit"
                    >
                      <Send className="w-3 h-3" /> Executar avís atletes ara
                    </button>
                  </div>
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
                              onClick={() => handleDeleteImpost(imp.id, imp.nom)}
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
                    <p className="text-xs text-slate-500">Defineix el <strong>Preu Final (IVA inclòs)</strong> i el sistema calcula automàticament la Base Imposable i la Quota d'IVA.</p>
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
                        <th className="p-3">Tipus</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3">Unitat Negoci</th>
                        <th className="p-3 text-right">Preu Final (IVA incl.)</th>
                        <th className="p-3 text-right">Base Imposable</th>
                        <th className="p-3 text-right">Quota IVA</th>
                        <th className="p-3 text-center">Estat</th>
                        <th className="p-3 text-right">Accions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {articles.map(art => {
                        const pvp = art.preu_final || Number((art.preu_base * (1 + art.iva_percentatge / 100)).toFixed(2))
                        const { base, iva } = calcReverseVat(pvp, art.iva_percentatge)
                        return (
                          <tr key={art.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono font-bold text-slate-600">{art.codi || '—'}</td>
                            <td className="p-3 font-bold text-slate-900">{art.nom}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                art.tipus === 'compra'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : art.tipus === 'ambdos'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {art.tipus === 'compra' ? 'Compra' : art.tipus === 'ambdos' ? 'Venda/Compra' : 'Venda'}
                              </span>
                            </td>
                            <td className="p-3">
                              {art.es_recurrent ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  🔄 Quota ({art.periodicitat_mesos === 1 ? 'Mensual' : art.periodicitat_mesos === 3 ? 'Trimestral' : art.periodicitat_mesos === 6 ? 'Semestral' : 'Anual'})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                                  {art.categoria.replace('_', ' ')}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-600">{art.unitat_negoci_nom || '—'}</td>
                            <td className="p-3 text-right font-mono font-black text-emerald-700 text-sm">{pvp.toFixed(2)} €</td>
                            <td className="p-3 text-right font-mono text-slate-700">{base.toFixed(2)} €</td>
                            <td className="p-3 text-right font-mono text-slate-500">{iva.toFixed(2)} € ({art.iva_percentatge}%)</td>
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
                        )
                      })}
                    </tbody>
                  </table>
                </div>
            </div>
          )}

          {/* SUBTAB 6: XIVATO D'ATLETES & CONTROL DE NIF */}
          {activeConfigSubtab === 'clients' && (() => {
            const senseNifList = clients.filter(c => !c.nif_cif || c.nif_cif.trim() === '')
            const ambNifList = clients.filter(c => c.nif_cif && c.nif_cif.trim() !== '')
            const displayedClients = filterOnlySenseNif ? senseNifList : clients

            return (
              <div className="glass-card p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b gap-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-600" /> Estat Fiscal dels Atletes (Control de NIF)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Cada atleta és responsable de mantenir les seves dades fiscals des del seu perfil o la seva fitxa. Aquí pots auditar quins atletes estan pendents d'introduir el NIF.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const res = await syncAtletesToClients()
                        showNotify('success', `S'han sincronitzat ${res.imported_count} atletes!`)
                        const cl = await listFinClients()
                        setClients(cl)
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 flex items-center gap-1.5 transition-colors"
                      title="Sincronitzar atletes amb el registre fiscal"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Sincronitzar Atletes
                    </button>
                    <button
                      onClick={openCreateClient}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-colors"
                      title="Afegir client manual o patrocinador extern"
                    >
                      <Plus className="w-3.5 h-3.5" /> Client Extern
                    </button>
                  </div>
                </div>

                {/* KPI Cards & Filtre Ràpid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div 
                    onClick={() => setFilterOnlySenseNif(false)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      !filterOnlySenseNif 
                        ? 'bg-slate-900 text-white shadow-md border-slate-900' 
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">Total Atletes Registrats</div>
                    <div className="text-xl font-black mt-0.5">{clients.length}</div>
                    <div className="text-[10px] mt-0.5 opacity-80">Veure tots els atletes</div>
                  </div>

                  <div 
                    onClick={() => setFilterOnlySenseNif(true)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      filterOnlySenseNif 
                        ? 'bg-amber-600 text-white shadow-md border-amber-600' 
                        : 'bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-950'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold uppercase tracking-wider">⚠️ Pendents de NIF (Xivato)</div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                        filterOnlySenseNif ? 'bg-white text-amber-900' : 'bg-amber-200 text-amber-900'
                      }`}>
                        {senseNifList.length}
                      </span>
                    </div>
                    <div className="text-xl font-black mt-0.5">{senseNifList.length} atletes</div>
                    <div className="text-[10px] mt-0.5 opacity-90">
                      {filterOnlySenseNif ? '✓ Filtrant només pendents' : 'Fes clic per filtrar només aquests'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">✓ Amb NIF Informat</div>
                    <div className="text-xl font-black mt-0.5 text-emerald-900">{ambNifList.length} atletes</div>
                    <div className="text-[10px] mt-0.5 text-emerald-700">A punt per emetre factura</div>
                  </div>
                </div>

                {/* Avís si hi ha atletes pendents */}
                {senseNifList.length > 0 && !filterOnlySenseNif && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚠️</span>
                      <span>
                        Hi ha <strong>{senseNifList.length} atletes</strong> sense NIF entrat. Quan s'emetin factures per aquests atletes, no tindran identificador fiscal legal.
                      </span>
                    </div>
                    <button
                      onClick={() => setFilterOnlySenseNif(true)}
                      className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 font-bold text-[11px] rounded-lg transition-colors whitespace-nowrap"
                    >
                      Veure qui són ({senseNifList.length})
                    </button>
                  </div>
                )}

                {/* Taula d'Auditoria */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b">
                      <tr>
                        <th className="p-3">Atleta / Nom Fiscal</th>
                        <th className="p-3">NIF / CIF</th>
                        <th className="p-3">Email & Telèfon</th>
                        <th className="p-3">Adreça & Població</th>
                        <th className="p-3 text-center">Estat Fiscal</th>
                        <th className="p-3 text-right">Accions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {displayedClients.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-text-muted">
                            {filterOnlySenseNif ? '🎉 Cap atleta pendent de NIF! Tots tenen el NIF degudament informat.' : 'No s\'ha trobat cap atleta.'}
                          </td>
                        </tr>
                      ) : (
                        displayedClients.map(c => {
                          const hasNif = c.nif_cif && c.nif_cif.trim() !== ''

                          return (
                            <tr key={c.id} className={`hover:bg-slate-50/50 transition-colors ${!hasNif ? 'bg-amber-50/30' : ''}`}>
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{c.nom_fiscal}</div>
                                {c.usuari_nom && c.usuari_nom !== c.nom_fiscal && (
                                  <div className="text-[10px] text-slate-400">Usuari: {c.usuari_nom}</div>
                                )}
                              </td>
                              <td className="p-3">
                                {hasNif ? (
                                  <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    {c.nif_cif}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    ⚠️ Pendent de NIF
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-slate-600">
                                <div>{c.email || '—'}</div>
                                {c.telefon && <div className="text-[10px] text-slate-400">{c.telefon}</div>}
                              </td>
                              <td className="p-3 text-slate-600">
                                {c.adreca ? (
                                  <span>{c.adreca}{c.poblacio ? `, ${c.poblacio}` : ''}{c.cp ? ` (${c.cp})` : ''}</span>
                                ) : (
                                  <span className="text-slate-400 italic">Sense adreça fiscal</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {hasNif ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    ✓ Complet
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                    Incomplet
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => openEditClient(c)}
                                  className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors inline-flex items-center gap-1 font-bold text-[11px]"
                                  title="Editar dades fiscals de l'atleta"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Editar</span>
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}

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
                <label className="font-bold text-slate-700">Client / Atleta *</label>
                <select
                  value={newFactura.client_id}
                  onChange={e => setNewFactura({ ...newFactura, client_id: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                >
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom_fiscal} ({c.nif_cif || 'Sense NIF'})</option>)}
                </select>
              </div>

              <div>
                <label className="font-bold text-emerald-800">Article del Catàleg (Obligatori) *</label>
                <select
                  value={newFactura.article_id}
                  onChange={e => handleSelectFacturaArticle(e.target.value)}
                  className="w-full mt-1 p-2 border border-emerald-300 bg-emerald-50/40 rounded-xl font-bold text-slate-900"
                  required
                >
                  <option value="">-- Selecciona un article --</option>
                  {articles.filter(a => a.actiu && a.tipus !== 'compra').map(a => {
                    const pvp = a.preu_final || Number((a.preu_base * (1 + a.iva_percentatge / 100)).toFixed(2))
                    return (
                      <option key={a.id} value={a.id}>
                        {a.nom} — {pvp.toFixed(2)} € (IVA incl.)
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Unitat de Negoci *</label>
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
                  <label className="font-bold text-slate-700">Entrenador (autodetectat si buit)</label>
                  <select
                    value={newFactura.entrenador_id}
                    onChange={e => setNewFactura({ ...newFactura, entrenador_id: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  >
                    <option value="">Automàtic segons atleta</option>
                    {entrenadorsList.map(en => <option key={en.id} value={en.id}>{en.nom}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Concepte Principal *</label>
                <input
                  type="text"
                  value={newFactura.concepte}
                  onChange={e => setNewFactura({ ...newFactura, concepte: e.target.value })}
                  placeholder="Ex: Training Camp Pirineus 2027"
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Descripció / Detall addicional</label>
                <input
                  type="text"
                  value={newFactura.descripcio_detall}
                  onChange={e => setNewFactura({ ...newFactura, descripcio_detall: e.target.value })}
                  placeholder="Ex: Estada, entrenaments guiats i allotjament..."
                  className="w-full mt-1 p-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-emerald-800">Preu Final IVA incl. (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newFactura.total_pvp}
                    onChange={e => {
                      const pvp = parseFloat(e.target.value) || 0
                      const { base } = calcReverseVat(pvp, newFactura.iva_percentatge, newFactura.irpf_percentatge)
                      setNewFactura({ ...newFactura, total_pvp: pvp, base_imposable: base })
                    }}
                    className="w-full mt-1 p-2 border border-emerald-300 bg-emerald-50/40 rounded-xl font-black font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">% IVA</label>
                  <input
                    type="number"
                    value={newFactura.iva_percentatge}
                    onChange={e => {
                      const iva = parseFloat(e.target.value) || 0
                      const { base } = calcReverseVat(newFactura.total_pvp, iva, newFactura.irpf_percentatge)
                      setNewFactura({ ...newFactura, iva_percentatge: iva, base_imposable: base })
                    }}
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

              {(() => {
                const { base, iva, irpf, total } = calcReverseVat(newFactura.total_pvp, newFactura.iva_percentatge, newFactura.irpf_percentatge)
                return (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-[11px] font-mono">
                    <span>Base: <strong>{base.toFixed(2)} €</strong></span>
                    <span>Quota IVA: <strong>+{iva.toFixed(2)} €</strong></span>
                    {irpf > 0 && <span className="text-rose-700">IRPF: <strong>-{irpf.toFixed(2)} €</strong></span>}
                    <span className="text-emerald-800 font-black">Total: {total.toFixed(2)} €</span>
                  </div>
                )
              })()}

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

      {/* MODAL CREAR / EDITAR COMPRA */}
      {showCompraModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-lg text-slate-900">
                {editingCompraId ? 'Editar Factura de Compra' : 'Registrar Factura de Compra'}
              </h3>
              <button onClick={() => setShowCompraModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveCompra} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Proveïdor *</label>
                <select
                  value={newCompra.proveidor_id}
                  onChange={e => setNewCompra({ ...newCompra, proveidor_id: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                >
                  {proveidors.map(p => <option key={p.id} value={p.id}>{p.nom_fiscal} ({p.nif_cif})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Núm. Factura Proveïdor *</label>
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
                  <label className="font-bold text-slate-700">Estat de Pagament</label>
                  <select
                    value={newCompra.estat_pagament}
                    onChange={e => setNewCompra({ ...newCompra, estat_pagament: e.target.value as any })}
                    className="w-full mt-1 p-2 border rounded-xl font-bold"
                  >
                    <option value="pendent">Pendent</option>
                    <option value="pagada">Pagada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Article de Compra (Opcional)</label>
                <select
                  value={newCompra.article_id}
                  onChange={e => handleSelectCompraArticle(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-xl"
                >
                  <option value="">Sense article de catàleg vinculat</option>
                  {articles.filter(a => a.tipus === 'compra' || a.tipus === 'ambdos').map(a => {
                    const pvp = a.preu_final || Number((a.preu_base * (1 + a.iva_percentatge / 100)).toFixed(2))
                    return (
                      <option key={a.id} value={a.id}>{a.nom} ({pvp.toFixed(2)} € IVA incl.)</option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Concepte *</label>
                <input
                  type="text"
                  value={newCompra.concepte}
                  onChange={e => setNewCompra({ ...newCompra, concepte: e.target.value })}
                  placeholder="Ex: Factura Entrenador Març"
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Unitat de Negoci (Centre de Cost)</label>
                  <select
                    value={newCompra.unitat_negoci_id}
                    onChange={e => setNewCompra({ ...newCompra, unitat_negoci_id: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  >
                    <option value="">Sense assignar / General</option>
                    {unitats.map(u => (
                      <option key={u.id} value={u.id}>{u.nom} ({u.codi})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Entrenador Vinculat (Opcional)</label>
                  <select
                    value={newCompra.entrenador_id}
                    onChange={e => setNewCompra({ ...newCompra, entrenador_id: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  >
                    <option value="">Sense entrenador vinculat</option>
                    {entrenadorsList.map(en => (
                      <option key={en.id} value={en.id}>{en.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-rose-800">Import amb IVA (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCompra.preu_amb_iva}
                    onChange={e => {
                      const pvp = parseFloat(e.target.value) || 0
                      const { base } = calcReverseVat(pvp, newCompra.iva_percentatge, newCompra.irpf_percentatge)
                      setNewCompra({ ...newCompra, preu_amb_iva: pvp, base_imposable: base })
                    }}
                    className="w-full mt-1 p-2 border border-rose-300 bg-rose-50/40 rounded-xl font-black font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">% IVA Suportat</label>
                  <input
                    type="number"
                    value={newCompra.iva_percentatge}
                    onChange={e => {
                      const iva = parseFloat(e.target.value) || 0
                      const { base } = calcReverseVat(newCompra.preu_amb_iva, iva, newCompra.irpf_percentatge)
                      setNewCompra({ ...newCompra, iva_percentatge: iva, base_imposable: base })
                    }}
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

              {(() => {
                const { base, iva, irpf, total } = calcReverseVat(newCompra.preu_amb_iva, newCompra.iva_percentatge, newCompra.irpf_percentatge)
                return (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-[11px] font-mono">
                    <span>Base: <strong>{base.toFixed(2)} €</strong></span>
                    <span>Quota IVA: <strong>+{iva.toFixed(2)} €</strong></span>
                    {irpf > 0 && <span className="text-rose-700">IRPF: <strong>-{irpf.toFixed(2)} €</strong></span>}
                    <span className="text-slate-900 font-black">Líquid a Pagar: {total.toFixed(2)} €</span>
                  </div>
                )
              })()}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Data d'Emissió</label>
                  <input
                    type="date"
                    value={newCompra.data_emissio}
                    onChange={e => setNewCompra({ ...newCompra, data_emissio: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Data de Venciment</label>
                  <input
                    type="date"
                    value={newCompra.data_venciment}
                    onChange={e => setNewCompra({ ...newCompra, data_venciment: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                    required
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
                  <div className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                    ✓ Fitxer adjuntat correctament
                  </div>
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
                  {editingCompraId ? 'Actualitzar Compra' : 'Guardar Compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR DESPESA */}
      {showDespesaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-lg text-slate-900">
                {editingDespesaId ? 'Editar Despesa Operativa' : 'Registrar Despesa Operativa'}
              </h3>
              <button onClick={() => setShowDespesaModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveDespesa} className="space-y-4 text-xs">
              {/* Selector Tipus de Despesa: Puntual vs Recurrent */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-700 block">Periodicitat de la Despesa</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewDespesa({ ...newDespesa, es_recurrent: false })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      !newDespesa.es_recurrent
                        ? 'bg-white border-amber-500 shadow-sm text-slate-900 font-bold'
                        : 'bg-transparent border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      Despesa Puntual
                    </div>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">Pagament únic (dietes, material, taxa...)</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewDespesa({ ...newDespesa, es_recurrent: true })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      newDespesa.es_recurrent
                        ? 'bg-indigo-50 border-indigo-500 shadow-sm text-indigo-950 font-bold'
                        : 'bg-transparent border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                      <RefreshCw className="w-3 h-3" />
                      Recurrent Mensual
                    </div>
                    <p className="text-[10px] text-indigo-400 font-normal mt-0.5">Nòmina, autònom, lloguer, software fix...</p>
                  </button>
                </div>

                {newDespesa.es_recurrent && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs animate-fade-in">
                    <span className="text-slate-600 font-medium">Dia del mes per generar la despesa:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-700">Dia</span>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={newDespesa.dia_mes_generacio}
                        onChange={e => setNewDespesa({ ...newDespesa, dia_mes_generacio: parseInt(e.target.value) || 1 })}
                        className="w-16 p-1 border rounded-lg text-center font-bold text-indigo-700"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Categoria *</label>
                  <select
                    value={newDespesa.categoria}
                    onChange={e => setNewDespesa({ ...newDespesa, categoria: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl capitalize"
                  >
                    <option value="nomina">Nòmina</option>
                    <option value="seguretat_social">Seguretat Social / Autònom</option>
                    <option value="banc">Comissió Bancària</option>
                    <option value="impostos">Impostos / Taxes</option>
                    <option value="dietes">Dietes / Desplaçaments</option>
                    <option value="altres">Altres despeses</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Estat de Pagament</label>
                  <select
                    value={newDespesa.estat_pagament}
                    onChange={e => setNewDespesa({ ...newDespesa, estat_pagament: e.target.value as any })}
                    className="w-full mt-1 p-2 border rounded-xl font-bold"
                  >
                    <option value="pendent">Pendent</option>
                    <option value="pagada">Pagada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Beneficiari / Proveïdor *</label>
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
                <label className="font-bold text-slate-700">Descripció / Concepte *</label>
                <input
                  type="text"
                  value={newDespesa.concepte}
                  onChange={e => setNewDespesa({ ...newDespesa, concepte: e.target.value })}
                  placeholder="Ex: Manteniment de compte T1"
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Unitat de Negoci (Centre de Cost)</label>
                  <select
                    value={newDespesa.unitat_negoci_id}
                    onChange={e => setNewDespesa({ ...newDespesa, unitat_negoci_id: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  >
                    <option value="">Sense assignar / General</option>
                    {unitats.map(u => (
                      <option key={u.id} value={u.id}>{u.nom} ({u.codi})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Entrenador Vinculat (Opcional)</label>
                  <select
                    value={newDespesa.entrenador_id}
                    onChange={e => setNewDespesa({ ...newDespesa, entrenador_id: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                  >
                    <option value="">Sense entrenador vinculat</option>
                    {entrenadorsList.map(en => (
                      <option key={en.id} value={en.id}>{en.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Import Total (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newDespesa.import_total}
                  onChange={e => setNewDespesa({ ...newDespesa, import_total: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 p-2 border rounded-xl font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Data de Devengo</label>
                  <input
                    type="date"
                    value={newDespesa.data_devengo}
                    onChange={e => setNewDespesa({ ...newDespesa, data_devengo: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Data de Venciment</label>
                  <input
                    type="date"
                    value={newDespesa.data_venciment}
                    onChange={e => setNewDespesa({ ...newDespesa, data_venciment: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Adjuntar PDF o Comprovant</label>
                <input
                  type="file"
                  onChange={e => handleFileUpload(e, 'despesa')}
                  className="w-full mt-1 text-xs"
                />
                {uploadingFile && <div className="text-[11px] text-amber-600 font-semibold mt-1">Pujant fitxer...</div>}
                {newDespesa.fitxer_adjunt_path && (
                  <div className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                    ✓ Fitxer adjuntat correctament
                  </div>
                )}
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
                  {editingDespesaId ? 'Actualitzar Despesa' : 'Guardar Despesa'}
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
              <div className="grid grid-cols-3 gap-2">
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
                  <label className="font-bold text-slate-700">Ús de l'Article</label>
                  <select
                    value={newArticle.tipus}
                    onChange={e => setNewArticle({ ...newArticle, tipus: e.target.value as any })}
                    className="w-full mt-1 p-2 border rounded-xl font-bold"
                  >
                    <option value="venda">Venda (Clients)</option>
                    <option value="compra">Compra (Proveïdors)</option>
                    <option value="ambdos">Venda i Compra</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Categoria</label>
                  <select
                    value={newArticle.categoria}
                    onChange={e => setNewArticle({ ...newArticle, categoria: e.target.value as any })}
                    className="w-full mt-1 p-2 border rounded-xl font-bold"
                  >
                    <option value="entrenament_recurrent">Entrenament / Servei</option>
                    <option value="training_camp">Training Camp</option>
                    <option value="puntual">Puntual / Altres</option>
                  </select>
                </div>
              </div>

              {/* RECURRENT & PERIODICITAT */}
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newArticle.es_recurrent}
                      onChange={e => setNewArticle({ ...newArticle, es_recurrent: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span>És una Quota Recurrent (per a subscripció d'atleta)</span>
                  </label>
                  {newArticle.es_recurrent && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Recurrent
                    </span>
                  )}
                </div>

                {newArticle.es_recurrent && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Periodicitat de la Quota</label>
                    <select
                      value={newArticle.periodicitat_mesos}
                      onChange={e => setNewArticle({ ...newArticle, periodicitat_mesos: (parseInt(e.target.value) || 1) as any })}
                      className="w-full p-2 border border-slate-300 rounded-xl font-bold bg-white text-slate-900"
                    >
                      <option value={1}>Mensual (Cobrament cada mes)</option>
                      <option value={3}>Trimestral (Cobrament cada 3 mesos)</option>
                      <option value={6}>Semestral (Cobrament cada 6 mesos)</option>
                      <option value={12}>Anual (Cobrament un cop a l'any)</option>
                    </select>
                  </div>
                )}
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
                  <label className="font-bold text-emerald-800">Preu Final (IVA inclòs) (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newArticle.preu_final}
                    onChange={e => {
                      const pvp = parseFloat(e.target.value) || 0
                      const { base } = calcReverseVat(pvp, newArticle.iva_percentatge)
                      setNewArticle({ ...newArticle, preu_final: pvp, preu_base: base })
                    }}
                    className="w-full mt-1 p-2 border border-emerald-300 bg-emerald-50/40 rounded-xl font-black font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">IVA (%)</label>
                  <select
                    value={newArticle.iva_percentatge}
                    onChange={e => {
                      const iva = parseFloat(e.target.value) || 0
                      const { base } = calcReverseVat(newArticle.preu_final, iva)
                      setNewArticle({ ...newArticle, iva_percentatge: iva, preu_base: base })
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
              {(() => {
                const { base, iva, pvp } = calcReverseVat(newArticle.preu_final, newArticle.iva_percentatge)
                return (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500">Base Imposable calculada: </span>
                      <strong className="text-slate-900">{base.toFixed(2)} €</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Quota d'IVA ({newArticle.iva_percentatge}%): </span>
                      <strong className="text-slate-900">{iva.toFixed(2)} €</strong>
                    </div>
                    <div className="text-emerald-700 font-black">
                      PVP: {pvp.toFixed(2)} €
                    </div>
                  </div>
                )
              })()}
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
      {/* POP-UP DE CONFIRMACIÓ GENÈRIC ESTILITZAT */}
      {confirmDialog && (
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* POP-UP CONCILIACIÓ BANCÀRIA DE COBRAMENT */}
      {conciliarModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Validar Cobrament i Conciliació</h3>
                  {conciliarModal.numeroFactura && (
                    <p className="text-xs text-emerald-800 font-mono font-bold">{conciliarModal.numeroFactura}</p>
                  )}
                </div>
              </div>
              <button onClick={() => setConciliarModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={submitConciliarFactura} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Data real de cobrament / apunt bancari *</label>
                <input
                  type="date"
                  required
                  value={conciliarModal.dataConciliacio}
                  onChange={e => setConciliarModal({ ...conciliarModal, dataConciliacio: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  La factura passarà a estat "Pagada" i es registrarà aquest dia com a data de conciliació oficial a caixa.
                </p>
              </div>
              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConciliarModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel·lar
                </button>
                <button type="submit" className="btn-primary py-2 px-4 bg-emerald-600 hover:bg-emerald-700 font-bold">
                  Confirmar Cobrament
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP REGISTRAR IMPAGAT */}
      {impagatModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Registrar Impagat</h3>
                  {impagatModal.numeroFactura && (
                    <p className="text-xs text-rose-700 font-mono font-bold">{impagatModal.numeroFactura}</p>
                  )}
                </div>
              </div>
              <button onClick={() => setImpagatModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={submitMarcarImpagada} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Motiu de l'impagat o incidència *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex: Rebut retornat pel banc, client pendent de resposta a avisos..."
                  value={impagatModal.motiu}
                  onChange={e => setImpagatModal({ ...impagatModal, motiu: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Aquesta factura passarà a estat "Impagada" i s'inclourà al llistat de seguiment de morositat.
                </p>
              </div>
              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setImpagatModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel·lar
                </button>
                <button type="submit" className="btn-primary py-2 px-4 bg-rose-600 hover:bg-rose-700 font-bold">
                  Marcar com a Impagada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL COBRAMENTS I PAGOS PARCIALS (TRAINING CAMPS & FACTURES) */}
      {cobramentsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-bold text-xs">
                    {cobramentsModal.numero_complet || 'FACTURA'}
                  </span>
                  <span className="text-xs font-bold text-slate-700">{cobramentsModal.client_nom}</span>
                </div>
                <h3 className="font-black text-base text-slate-900 mt-1">Gestió de Cobraments i Pagos Parcials</h3>
                <p className="text-xs text-slate-500">{cobramentsModal.concepte}</p>
              </div>
              <button onClick={() => setCobramentsModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            {/* Resum Saldos + Barra de Progrés */}
            {(() => {
              const total = cobramentsModal.total_factura || 0
              const cobrat = cobramentsModal.import_cobrat || 0
              const pendent = cobramentsModal.import_pendent || 0
              const pct = total > 0 ? Math.min(100, Math.round((cobrat / total) * 100)) : 0
              return (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Import Total</div>
                      <div className="text-base font-black text-slate-900 font-mono mt-0.5">{total.toFixed(2)} €</div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="text-[10px] uppercase font-bold text-emerald-700">Ja Cobrat ({pct}%)</div>
                      <div className="text-base font-black text-emerald-800 font-mono mt-0.5">{cobrat.toFixed(2)} €</div>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <div className="text-[10px] uppercase font-bold text-amber-700">Pendent</div>
                      <div className="text-base font-black text-amber-900 font-mono mt-0.5">{pendent.toFixed(2)} €</div>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })()}

            {/* Historial de pagaments registrats */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Historial de Pagaments Registrats ({cobramentsList.length})
              </h4>
              {cobramentsLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">Carregant pagaments...</div>
              ) : cobramentsList.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                  Encara no s'ha registrat cap pagament en aquesta factura.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                  {cobramentsList.map((cob, idx) => (
                    <div key={cob.id} className="p-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px]">#{idx + 1}</span>
                          <span>{cob.data_cobrament}</span>
                          <span className="text-[10px] uppercase px-2 py-0.2 rounded-full bg-slate-100 text-slate-600">{cob.metode_pagament}</span>
                        </div>
                        {cob.notes && <div className="text-[11px] text-slate-500 mt-0.5">{cob.notes}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-emerald-700 text-sm">+{cob.import.toFixed(2)} €</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCobrament(cob.id)}
                          title="Anul·lar aquest registre de cobrament"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formulari nou pagament parcial o total */}
            {cobramentsModal.import_pendent > 0.009 ? (
              <form onSubmit={handleAddCobrament} className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950">Registrar Nou Pagament (Parcial o Total)</span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: '25%', val: Number((cobramentsModal.total_factura * 0.25).toFixed(2)) },
                      { label: '50%', val: Number((cobramentsModal.total_factura * 0.5).toFixed(2)) },
                      { label: '100% Pendent', val: Number(cobramentsModal.import_pendent.toFixed(2)) }
                    ].map(btn => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => setNewCobrament(prev => ({ ...prev, import: Math.min(Number(cobramentsModal.import_pendent.toFixed(2)), btn.val) }))}
                        className="px-2 py-0.5 rounded bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-[10px]"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="font-bold text-slate-700">Import pagat (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={Number(cobramentsModal.import_pendent.toFixed(2))}
                      required
                      value={newCobrament.import}
                      onChange={e => setNewCobrament({ ...newCobrament, import: parseFloat(e.target.value) || 0 })}
                      className="w-full mt-1 p-2 border border-indigo-300 rounded-xl bg-white font-black font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Data cobrament *</label>
                    <input
                      type="date"
                      required
                      value={newCobrament.data_cobrament}
                      onChange={e => setNewCobrament({ ...newCobrament, data_cobrament: e.target.value })}
                      className="w-full mt-1 p-2 border rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Mètode</label>
                    <select
                      value={newCobrament.metode_pagament}
                      onChange={e => setNewCobrament({ ...newCobrament, metode_pagament: e.target.value })}
                      className="w-full mt-1 p-2 border rounded-xl bg-white font-semibold"
                    >
                      <option value="transferencia">Transferència</option>
                      <option value="sepa">Domiciliació SEPA</option>
                      <option value="targeta">Targeta / Stripe</option>
                      <option value="bizum">Bizum</option>
                      <option value="efectiu">Efectiu</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Nota / Referència del pagament</label>
                  <input
                    type="text"
                    placeholder="Ex: 1r pagament reserva Training Camp / Segon termini..."
                    value={newCobrament.notes}
                    onChange={e => setNewCobrament({ ...newCobrament, notes: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl bg-white"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button type="submit" className="btn-primary py-2 px-4 bg-indigo-600 hover:bg-indigo-700 font-bold">
                    Registrar Cobrament ({newCobrament.import.toFixed(2)} €)
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Aquesta factura està completament pagada (pendent: 0,00 €).</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
