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
  Users
} from 'lucide-react'
import {
  getFinConfiguracio,
  updateFinConfiguracio,
  listFinImpostos,
  listFinSeries,
  listFinUnitatsNegoci,
  listFinClients,
  syncAtletesToClients,
  listFinProveidors,
  listFinArticles,
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
  const [clients, setClients] = useState<FinClient[]>([])
  const [proveidors, setProveidors] = useState<FinProveidor[]>([])

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
  const [newCamp, setNewCamp] = useState({
    client_id: '',
    unitat_negoci_id: '',
    titol_camp: '',
    periode_camp_inici: new Date().toISOString().split('T')[0],
    periode_camp_fi: new Date().toISOString().split('T')[0],
    total_base_pactada: 0,
    iva_percentatge: 21,
    irpf_percentatge: 0,
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
      const [cfg, , , un, cl, pr] = await Promise.all([
        getFinConfiguracio(),
        listFinImpostos(),
        listFinSeries(),
        listFinUnitatsNegoci(),
        listFinClients(),
        listFinProveidors(),
        listFinArticles()
      ])
      setConfig(cfg)
      setUnitats(un)
      setClients(cl)
      setProveidors(pr)
      if (un.length > 0) {
        setNewFactura(prev => ({ ...prev, unitat_negoci_id: un[0].id }))
        setNewCompra(prev => ({ ...prev, unitat_negoci_id: un[0].id }))
        setNewDespesa(prev => ({ ...prev, unitat_negoci_id: un[0].id }))
        setNewSub(prev => ({ ...prev, unitat_negoci_id: un[0].id }))
        setNewCamp(prev => ({ ...prev, unitat_negoci_id: un[0].id }))
      }
      if (cl.length > 0) {
        setNewFactura(prev => ({ ...prev, client_id: cl[0].id }))
        setNewSub(prev => ({ ...prev, client_id: cl[0].id }))
        setNewCamp(prev => ({ ...prev, client_id: cl[0].id }))
      }
      if (pr.length > 0) {
        setNewCompra(prev => ({ ...prev, proveidor_id: pr[0].id }))
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

  const handleCreateCamp = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createFinPlaCamp(newCamp)
      showNotify('success', 'Pla de Training Camp registrat amb les seves fites!')
      setShowCampModal(false)
      loadPlansCamp()
    } catch (err: any) {
      showNotify('error', err.response?.data?.error || 'Error creant el Training Camp')
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

        {/* Global Action Shortcut */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFacturaModal(true)}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nova Venda
          </button>
          <button
            onClick={() => setShowCompraModal(true)}
            className="p-2 rounded-xl bg-white border border-border-light text-slate-700 hover:text-slate-900 shadow-sm text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5 text-rose-500" /> Compra
          </button>
          <button
            onClick={() => setShowDespesaModal(true)}
            className="p-2 rounded-xl bg-white border border-border-light text-slate-700 hover:text-slate-900 shadow-sm text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5 text-amber-500" /> Despesa
          </button>
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
              onClick={() => setShowCampModal(true)}
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
      {activeTab === 'config' && config && (
        <div className="space-y-6">
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" /> Dades Fiscals de l'Emissor (1 Sol CIF/NIF)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-600">Raó Social</label>
                <input
                  type="text"
                  value={config.rao_social}
                  onChange={e => setConfig({ ...config, rao_social: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl bg-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600">CIF / NIF</label>
                <input
                  type="text"
                  value={config.nif_cif}
                  onChange={e => setConfig({ ...config, nif_cif: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl bg-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600">IBAN Principal de Cobrament</label>
                <input
                  type="text"
                  value={config.iban_principal}
                  onChange={e => setConfig({ ...config, iban_principal: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-xl bg-white font-mono"
                />
              </div>
            </div>
            <button
              onClick={async () => {
                await updateFinConfiguracio(config)
                showNotify('success', 'Configuració fiscal guardada!')
              }}
              className="btn-primary text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-700"
            >
              Guardar Configuració
            </button>
          </div>

          {/* Sync Athletes to Clients */}
          <div className="glass-card p-5 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-800">Sincronització d'Atletes a la base de Clients</h4>
              <p className="text-xs text-slate-500">Crea la fitxa de client per a tots els atletes actius que encara no en tinguin</p>
            </div>
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
          </div>
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
                <label className="font-bold text-slate-700">Client</label>
                <select
                  value={newSub.client_id}
                  onChange={e => setNewSub({ ...newSub, client_id: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                >
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom_fiscal}</option>)}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Concepte Personalitzat / Servei</label>
                <input
                  type="text"
                  value={newSub.concepte_personalitzat}
                  onChange={e => setNewSub({ ...newSub, concepte_personalitzat: e.target.value })}
                  placeholder="Ex: Entrenament Trail Running Pro"
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
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
      {showCampModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-lg text-slate-900">Nou Training Camp</h3>
              <button onClick={() => setShowCampModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleCreateCamp} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Client / Atleta</label>
                <select
                  value={newCamp.client_id}
                  onChange={e => setNewCamp({ ...newCamp, client_id: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                >
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom_fiscal}</option>)}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Nom de l'Estada / Camp</label>
                <input
                  type="text"
                  value={newCamp.titol_camp}
                  onChange={e => setNewCamp({ ...newCamp, titol_camp: e.target.value })}
                  placeholder="Ex: Stage Trail Pirineus 2026"
                  className="w-full mt-1 p-2 border rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Data Inici Camp</label>
                  <input
                    type="date"
                    value={newCamp.periode_camp_inici}
                    onChange={e => setNewCamp({ ...newCamp, periode_camp_inici: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Data Fi Camp</label>
                  <input
                    type="date"
                    value={newCamp.periode_camp_fi}
                    onChange={e => setNewCamp({ ...newCamp, periode_camp_fi: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Total Pactat (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newCamp.total_base_pactada}
                  onChange={e => {
                    const tot = parseFloat(e.target.value) || 0
                    setNewCamp({
                      ...newCamp,
                      total_base_pactada: tot,
                      fites: [
                        { ...newCamp.fites[0], base_imposable: Math.round(tot * 0.3 * 100) / 100 },
                        { ...newCamp.fites[1], base_imposable: Math.round(tot * 0.7 * 100) / 100 }
                      ]
                    })
                  }}
                  className="w-full mt-1 p-2 border rounded-xl font-bold"
                  required
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700">Fites de Pagament automàtiques (30% i 70%):</span>
                {newCamp.fites.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={f.concepte_fita}
                      onChange={e => {
                        const nextF = [...newCamp.fites]
                        nextF[i].concepte_fita = e.target.value
                        setNewCamp({ ...newCamp, fites: nextF })
                      }}
                      className="flex-1 p-1.5 border rounded-lg text-xs"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={f.base_imposable}
                      onChange={e => {
                        const nextF = [...newCamp.fites]
                        nextF[i].base_imposable = parseFloat(e.target.value) || 0
                        setNewCamp({ ...newCamp, fites: nextF })
                      }}
                      className="w-24 p-1.5 border rounded-lg text-xs font-bold"
                    />
                    <input
                      type="date"
                      value={f.data_prevista}
                      onChange={e => {
                        const nextF = [...newCamp.fites]
                        nextF[i].data_prevista = e.target.value
                        setNewCamp({ ...newCamp, fites: nextF })
                      }}
                      className="w-32 p-1.5 border rounded-lg text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCampModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel·lar
                </button>
                <button type="submit" className="btn-primary py-2 px-4 bg-emerald-600 hover:bg-emerald-700">
                  Crear Camp & Fites
                </button>
              </div>
            </form>
          </div>
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
    </div>
  )
}
