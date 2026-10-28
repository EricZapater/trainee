import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  Apple, 
  Plus, 
  Flame, 
  Droplet, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  ArrowLeft,
  Calendar, 
  MessageSquare,
  History,
  Search,
  Filter,
  Pause,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp,
  User,
  Zap,
  Activity
} from 'lucide-react'
import { 
  getNutricioPlans, 
  createNutricioPlan, 
  createNutricioRevision,
  addNutricioFeedback, 
  updateNutricioPlanEstat,
  deleteNutricioPlan,
  type NutricioPlanWithDetails, 
  type NutricioRevision
} from '../api/nutricio'
import { getAtletes } from '../api/entrenador'

export const NutricioManagerPage: React.FC = () => {
  const { isEntrenador, isAdmin } = useAuth()
  const isCoach = isEntrenador || isAdmin

  const [plans, setPlans] = useState<NutricioPlanWithDetails[]>([])
  const [atletes, setAtletes] = useState<{ id: string; nom: string; cognoms: string; email: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedAtletaFilter, setSelectedAtletaFilter] = useState<string>('all')
  const [selectedEstatFilter, setSelectedEstatFilter] = useState<'all' | 'actiu' | 'inactiu'>('all')

  // Selected plan detail view
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  // Expanded revisions map in detail view: { [revisionId]: boolean }
  const [expandedRevisions, setExpandedRevisions] = useState<Record<string, boolean>>({})

  // Modal: Create Plan (Coach)
  const [createPlanOpen, setCreatePlanOpen] = useState(false)
  const [planForm, setPlanForm] = useState({
    atleta_id: '',
    titol: 'Estratègia Nutricional Competició',
    objectiu_ch_g_h: 60,
    objectiu_sodi_mg_h: 500,
    objectiu_fluid_ml_h: 500,
    productes_propostes: '',
    instruccions: '',
    data_revisio: ''
  })
  const [submittingPlan, setSubmittingPlan] = useState(false)

  // Modal: Create Revision (Coach)
  const [createRevisionOpen, setCreateRevisionOpen] = useState(false)
  const [revisionForm, setRevisionForm] = useState({
    objectiu_ch_g_h: 60,
    objectiu_sodi_mg_h: 500,
    objectiu_fluid_ml_h: 500,
    productes_propostes: '',
    instruccions: '',
    data_revisio: ''
  })
  const [submittingRevision, setSubmittingRevision] = useState(false)

  // Modal: Add Feedback (Athlete or Coach)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [targetRevisionForFeedback, setTargetRevisionForFeedback] = useState<NutricioRevision | null>(null)
  const [feedbackForm, setFeedbackForm] = useState({
    data_sortida: new Date().toISOString().split('T')[0],
    durada_hores: 2.5,
    ch_g_h_real: 60,
    sodi_mg_h_real: 500,
    fluid_ml_h_real: 500,
    productes_consumits: '',
    sensacions: ''
  })
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [plansData, atletesData] = await Promise.all([
        getNutricioPlans(),
        isCoach ? getAtletes().catch(() => []) : Promise.resolve([])
      ])
      setPlans(plansData)
      if (isCoach && atletesData) {
        setAtletes(atletesData)
        if (atletesData.length > 0 && !planForm.atleta_id) {
          setPlanForm(prev => ({ ...prev, atleta_id: atletesData[0].id }))
        }
      }
    } catch {
      showToast('Error en carregar els plans nutricionals', 'error')
    } finally {
      setLoading(false)
    }
  }, [isCoach, planForm.atleta_id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const selectedPlan = useMemo(() => {
    if (!selectedPlanId) return null
    return plans.find(p => p.id === selectedPlanId) || null
  }, [plans, selectedPlanId])

  // Automatically expand the current revision when opening a plan
  useEffect(() => {
    if (selectedPlan && selectedPlan.revisions && selectedPlan.revisions.length > 0) {
      setExpandedRevisions(prev => ({
        ...prev,
        [selectedPlan.revisions[0].id]: true
      }))
    }
  }, [selectedPlan])

  const isRevisionOverdueOrToday = (dataRevisio?: string) => {
    if (!dataRevisio) return false
    const today = new Date().toISOString().split('T')[0]
    return dataRevisio <= today
  }

  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      // Estat filter
      if (selectedEstatFilter !== 'all' && p.estat !== selectedEstatFilter) return false

      // Atleta filter (Coach only)
      if (isCoach && selectedAtletaFilter !== 'all') {
        if (p.atleta_id !== selectedAtletaFilter) return false
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchTitle = p.titol.toLowerCase().includes(q)
        const matchAtleta = (p.atleta_nom || '').toLowerCase().includes(q) || (p.atleta_cognoms || '').toLowerCase().includes(q)
        if (!matchTitle && !matchAtleta) return false
      }

      return true
    })
  }, [plans, selectedEstatFilter, selectedAtletaFilter, search, isCoach])

  // Handlers
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!planForm.atleta_id || !planForm.titol.trim()) {
      showToast('Selecciona un atleta i introdueix un títol', 'error')
      return
    }

    setSubmittingPlan(true)
    try {
      const created = await createNutricioPlan({
        atleta_id: planForm.atleta_id,
        titol: planForm.titol.trim(),
        objectiu_ch_g_h: Number(planForm.objectiu_ch_g_h) || undefined,
        objectiu_sodi_mg_h: Number(planForm.objectiu_sodi_mg_h) || undefined,
        objectiu_fluid_ml_h: Number(planForm.objectiu_fluid_ml_h) || undefined,
        productes_propostes: planForm.productes_propostes.trim() || undefined,
        instruccions: planForm.instruccions.trim() || undefined,
        data_revisio: planForm.data_revisio || undefined
      })
      showToast('Pla nutricional creat correctament!')
      setCreatePlanOpen(false)
      await loadData()
      if (created?.id) setSelectedPlanId(created.id)
    } catch {
      showToast('Error al crear el pla nutricional', 'error')
    } finally {
      setSubmittingPlan(false)
    }
  }

  const openRevisionModal = (plan: NutricioPlanWithDetails) => {
    const lastRev = plan.revisions && plan.revisions.length > 0 ? plan.revisions[0] : null
    setRevisionForm({
      objectiu_ch_g_h: lastRev?.objectiu_ch_g_h || 60,
      objectiu_sodi_mg_h: lastRev?.objectiu_sodi_mg_h || 500,
      objectiu_fluid_ml_h: lastRev?.objectiu_fluid_ml_h || 500,
      productes_propostes: lastRev?.productes_propostes || '',
      instruccions: lastRev?.instruccions || '',
      data_revisio: ''
    })
    setCreateRevisionOpen(true)
  }

  const handleCreateRevision = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlan) return

    setSubmittingRevision(true)
    try {
      await createNutricioRevision(selectedPlan.id, {
        objectiu_ch_g_h: Number(revisionForm.objectiu_ch_g_h) || undefined,
        objectiu_sodi_mg_h: Number(revisionForm.objectiu_sodi_mg_h) || undefined,
        objectiu_fluid_ml_h: Number(revisionForm.objectiu_fluid_ml_h) || undefined,
        productes_propostes: revisionForm.productes_propostes.trim() || undefined,
        instruccions: revisionForm.instruccions.trim() || undefined,
        data_revisio: revisionForm.data_revisio || undefined
      })
      showToast('Nova revisió afegida al pla!')
      setCreateRevisionOpen(false)
      await loadData()
    } catch {
      showToast('Error al crear la revisió', 'error')
    } finally {
      setSubmittingRevision(false)
    }
  }

  const handleTogglePlanEstat = async (plan: NutricioPlanWithDetails) => {
    const nouEstat = plan.estat === 'actiu' ? 'inactiu' : 'actiu'
    try {
      await updateNutricioPlanEstat(plan.id, nouEstat)
      showToast(`El pla ara està ${nouEstat}`)
      await loadData()
    } catch {
      showToast('Error en actualitzar l\'estat del pla', 'error')
    }
  }

  const handleDeletePlan = async (plan: NutricioPlanWithDetails) => {
    if (!window.confirm(`Segur que vols eliminar el pla "${plan.titol}"? Aquesta acció no es pot desfer.`)) return
    try {
      await deleteNutricioPlan(plan.id)
      showToast('Pla eliminat correctament')
      if (selectedPlanId === plan.id) setSelectedPlanId(null)
      await loadData()
    } catch {
      showToast('Error en eliminar el pla', 'error')
    }
  }

  const openFeedbackModal = (rev: NutricioRevision) => {
    setTargetRevisionForFeedback(rev)
    setFeedbackForm({
      data_sortida: new Date().toISOString().split('T')[0],
      durada_hores: 2.5,
      ch_g_h_real: rev.objectiu_ch_g_h || 60,
      sodi_mg_h_real: rev.objectiu_sodi_mg_h || 500,
      fluid_ml_h_real: rev.objectiu_fluid_ml_h || 500,
      productes_consumits: '',
      sensacions: ''
    })
    setFeedbackModalOpen(true)
  }

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetRevisionForFeedback) return

    setSubmittingFeedback(true)
    try {
      await addNutricioFeedback(targetRevisionForFeedback.id, {
        data_sortida: feedbackForm.data_sortida,
        durada_hores: Number(feedbackForm.durada_hores) || undefined,
        ch_g_h_real: Number(feedbackForm.ch_g_h_real) || undefined,
        sodi_mg_h_real: Number(feedbackForm.sodi_mg_h_real) || undefined,
        fluid_ml_h_real: Number(feedbackForm.fluid_ml_h_real) || undefined,
        productes_consumits: feedbackForm.productes_consumits.trim() || undefined,
        sensacions: feedbackForm.sensacions.trim() || undefined
      })
      showToast('Feedback nutricional registrat correctament!')
      setFeedbackModalOpen(false)
      await loadData()
    } catch {
      showToast('Error en registrar el feedback', 'error')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  const toggleRevisionAccordion = (revId: string) => {
    setExpandedRevisions(prev => ({
      ...prev,
      [revId]: !prev[revId]
    }))
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Alert */}
      {toast && (
        <div className={`p-4 rounded-xl text-sm flex items-center justify-between shadow-lg transition-all border ${
          toast.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span>{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100 font-bold">&times;</button>
        </div>
      )}

      {/* View Mode 1: Selected Plan Detail */}
      {selectedPlan ? (
        <div className="space-y-6">
          {/* Top Bar Detail */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
            <div>
              <button
                onClick={() => setSelectedPlanId(null)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Tornar a la llista de plans</span>
              </button>

              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white tracking-tight">{selectedPlan.titol}</h1>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  selectedPlan.estat === 'actiu' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {selectedPlan.estat.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-slate-400 mt-1">
                {isCoach ? (
                  <span>Atleta: <strong className="text-white">{selectedPlan.atleta_nom} {selectedPlan.atleta_cognoms}</strong></span>
                ) : (
                  <span>Entrenador: <strong className="text-white">{selectedPlan.entrenador_nom || 'Equip Tècnic'}</strong></span>
                )}
                <span className="mx-2">•</span>
                <span>Creat el {new Date(selectedPlan.created_at).toLocaleDateString('ca-ES')}</span>
              </p>
            </div>

            {/* Coach Actions for Plan */}
            <div className="flex items-center gap-2 flex-wrap">
              {isCoach && (
                <>
                  {selectedPlan.estat === 'actiu' && (
                    <button
                      onClick={() => openRevisionModal(selectedPlan)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-600/20 active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nova Revisió</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleTogglePlanEstat(selectedPlan)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
                    title={selectedPlan.estat === 'actiu' ? 'Desactivar pla' : 'Activar pla'}
                  >
                    {selectedPlan.estat === 'actiu' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{selectedPlan.estat === 'actiu' ? 'Desactivar' : 'Activar'}</span>
                  </button>

                  <button
                    onClick={() => handleDeletePlan(selectedPlan)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition border border-slate-800"
                    title="Eliminar pla"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Current Active Revision Card */}
          {selectedPlan.revisions && selectedPlan.revisions.length > 0 && (
            <div className="bg-slate-900/60 rounded-3xl border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-xl space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Versió {selectedPlan.revisions[0].versio} (Actual)</span>
                  </div>

                  {selectedPlan.revisions[0].data_revisio && (
                    <div className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-xl border ${
                      isRevisionOverdueOrToday(selectedPlan.revisions[0].data_revisio)
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 font-semibold'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Propera revisió: {new Date(selectedPlan.revisions[0].data_revisio).toLocaleDateString('ca-ES')}</span>
                      {isRevisionOverdueOrToday(selectedPlan.revisions[0].data_revisio) && (
                        <span className="text-amber-400 font-bold ml-1">(Pendent!)</span>
                      )}
                    </div>
                  )}
                </div>

                {selectedPlan.estat === 'actiu' && (
                  <button
                    onClick={() => openFeedbackModal(selectedPlan.revisions[0])}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 active:scale-95 self-start sm:self-auto"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Registrar Entrenament / Sensacions</span>
                  </button>
                )}
              </div>

              {/* Targets 3-column KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                    <Flame className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Carbohidrats</span>
                    <div className="text-2xl font-black text-white">
                      {selectedPlan.revisions[0].objectiu_ch_g_h ?? '-'}{' '}
                      <span className="text-xs font-normal text-slate-400">g/h</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Sodi</span>
                    <div className="text-2xl font-black text-white">
                      {selectedPlan.revisions[0].objectiu_sodi_mg_h ?? '-'}{' '}
                      <span className="text-xs font-normal text-slate-400">mg/h</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                    <Droplet className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Hidratació</span>
                    <div className="text-2xl font-black text-white">
                      {selectedPlan.revisions[0].objectiu_fluid_ml_h ?? '-'}{' '}
                      <span className="text-xs font-normal text-slate-400">ml/h</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions & Products details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedPlan.revisions[0].productes_propostes && (
                  <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-5 space-y-2">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-indigo-400 flex items-center gap-2">
                      <Apple className="w-4 h-4" />
                      <span>Productes i Suplements Proposts</span>
                    </h4>
                    <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                      {selectedPlan.revisions[0].productes_propostes}
                    </p>
                  </div>
                )}

                {selectedPlan.revisions[0].instruccions && (
                  <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-5 space-y-2">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      <span>Instruccions / Estratègia de Cursa</span>
                    </h4>
                    <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                      {selectedPlan.revisions[0].instruccions}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Revisions & Feedback History Timeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              <span>Historial de Versions & Feedbacks ({selectedPlan.revisions?.length || 0})</span>
            </h3>

            <div className="space-y-3">
              {selectedPlan.revisions?.map(rev => {
                const isOpen = expandedRevisions[rev.id]
                return (
                  <div key={rev.id} className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
                    <button
                      onClick={() => toggleRevisionAccordion(rev.id)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/40 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white text-sm">Versió {rev.versio}</span>
                        <span className="text-xs text-slate-400">
                          ({new Date(rev.created_at).toLocaleDateString('ca-ES')})
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {rev.feedbacks?.length || 0} registres
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
                          <span><strong>CH:</strong> {rev.objectiu_ch_g_h ?? '-'} g/h</span>
                          <span><strong>Sodi:</strong> {rev.objectiu_sodi_mg_h ?? '-'} mg/h</span>
                          <span><strong>Fluid:</strong> {rev.objectiu_fluid_ml_h ?? '-'} ml/h</span>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="p-5 border-t border-slate-800/80 bg-slate-950/40 space-y-4">
                        {/* Feedbacks list */}
                        {(!rev.feedbacks || rev.feedbacks.length === 0) ? (
                          <p className="text-xs text-slate-500 italic">
                            Cap registre o comentari introduït en aquesta versió.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {rev.feedbacks.map(fb => (
                              <div key={fb.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>{new Date(fb.data_sortida).toLocaleDateString('ca-ES')}</span>
                                    {fb.durada_hores && <span className="text-slate-400 font-normal">({fb.durada_hores} h)</span>}
                                  </div>
                                  <span className="text-slate-500">Per {fb.atleta_nom || 'Atleta'}</span>
                                </div>

                                {/* Comparison Pills */}
                                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                  {fb.ch_g_h_real !== undefined && (
                                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                      CH Real: <strong>{fb.ch_g_h_real}</strong> g/h{' '}
                                      <span className="opacity-70">(obj: {rev.objectiu_ch_g_h ?? '-'})</span>
                                    </span>
                                  )}
                                  {fb.sodi_mg_h_real !== undefined && (
                                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                      Sodi Real: <strong>{fb.sodi_mg_h_real}</strong> mg/h{' '}
                                      <span className="opacity-70">(obj: {rev.objectiu_sodi_mg_h ?? '-'})</span>
                                    </span>
                                  )}
                                  {fb.fluid_ml_h_real !== undefined && (
                                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                      Fluid Real: <strong>{fb.fluid_ml_h_real}</strong> ml/h{' '}
                                      <span className="opacity-70">(obj: {rev.objectiu_fluid_ml_h ?? '-'})</span>
                                    </span>
                                  )}
                                </div>

                                {fb.productes_consumits && (
                                  <div className="text-xs text-slate-300">
                                    <strong className="text-slate-400">Productes consumits:</strong> {fb.productes_consumits}
                                  </div>
                                )}

                                {fb.sensacions && (
                                  <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 italic">
                                    "{fb.sensacions}"
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        /* View Mode 2: Plans Catalog / Manager */
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Apple className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Estratègia Nutricional & Curses</h1>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {isCoach 
                  ? 'Planificació de pautes de carbohidrats, hidratació i sodi per a cada atleta amb seguiment de tolerància.' 
                  : 'Consulta els teus objectius nutricionals horaris i registra les sensacions dels teus entrenaments.'}
              </p>
            </div>

            {isCoach && (
              <button
                onClick={() => setCreatePlanOpen(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition shadow-lg shadow-indigo-600/20 active:scale-95 text-sm self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Nou Pla Nutricional</span>
              </button>
            )}
          </div>

          {/* Filters Bar */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cercar per títol o atleta..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
              {isCoach && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <select
                    value={selectedAtletaFilter}
                    onChange={e => setSelectedAtletaFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">Tots els atletes</option>
                    {atletes.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nom} {a.cognoms || ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedEstatFilter}
                  onChange={e => setSelectedEstatFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">Tots els estats</option>
                  <option value="actiu">Actiu</option>
                  <option value="inactiu">Inactiu</option>
                </select>
              </div>
            </div>
          </div>

          {/* Plans Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-slate-400 text-sm">Carregant plans nutricionals...</p>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="p-16 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
              <Apple className="w-12 h-12 mx-auto text-slate-600" />
              <h3 className="text-lg font-semibold text-white">Cap pla nutricional trobat</h3>
              <p className="text-sm max-w-sm mx-auto">
                {isCoach 
                  ? 'Crea un pla nutricional per establir els objectius de carbohidrats i hidratació dels teus atletes.'
                  : 'Encara no tens cap pla de nutrició assignat pel teu entrenador.'}
              </p>
              {isCoach && (
                <button
                  onClick={() => setCreatePlanOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear primer pla</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPlans.map(plan => {
                const currentRev = plan.revisions && plan.revisions.length > 0 ? plan.revisions[0] : null
                const isOverdue = currentRev?.data_revisio ? isRevisionOverdueOrToday(currentRev.data_revisio) : false

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className="bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-all p-5 flex flex-col justify-between cursor-pointer group shadow-sm hover:shadow-indigo-500/5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                          plan.estat === 'actiu'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {plan.estat.toUpperCase()}
                        </span>

                        {isOverdue && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Revisió Pendent!</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {plan.titol}
                      </h3>

                      <p className="text-xs text-slate-400 mt-1">
                        {isCoach ? (
                          <span>Atleta: <strong className="text-slate-200">{plan.atleta_nom} {plan.atleta_cognoms}</strong></span>
                        ) : (
                          <span>Entrenador: <strong className="text-slate-200">{plan.entrenador_nom || 'Equip'}</strong></span>
                        )}
                      </p>

                      {/* Current Targets Metric Preview */}
                      {currentRev && (
                        <div className="mt-4 grid grid-cols-3 gap-2 py-3 px-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 block font-semibold">CH</span>
                            <span className="text-sm font-bold text-amber-400">{currentRev.objectiu_ch_g_h ?? '-'} <small className="text-[9px] text-slate-500">g/h</small></span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 block font-semibold">Sodi</span>
                            <span className="text-sm font-bold text-indigo-400">{currentRev.objectiu_sodi_mg_h ?? '-'} <small className="text-[9px] text-slate-500">mg/h</small></span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 block font-semibold">Fluid</span>
                            <span className="text-sm font-bold text-cyan-400">{currentRev.objectiu_fluid_ml_h ?? '-'} <small className="text-[9px] text-slate-500">ml/h</small></span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-slate-500" />
                        <span>V{currentRev?.versio || 1} • {plan.revisions?.reduce((acc, r) => acc + (r.feedbacks?.length || 0), 0) || 0} feedbacks</span>
                      </span>

                      <span className="text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform">
                        Detall &gt;
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Plan (Coach) */}
      {createPlanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Apple className="w-5 h-5 text-amber-400" />
                <span>Nou Pla Nutricional</span>
              </h3>
              <button 
                onClick={() => setCreatePlanOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Atleta Destinatari *
                </label>
                <select
                  required
                  value={planForm.atleta_id}
                  onChange={e => setPlanForm(prev => ({ ...prev, atleta_id: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm"
                >
                  <option value="">Selecciona un atleta...</option>
                  {atletes.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nom} {a.cognoms || ''} ({a.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Títol del Pla *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pla Nutrició Cursa Ultra Trail"
                  value={planForm.titol}
                  onChange={e => setPlanForm(prev => ({ ...prev, titol: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              {/* Targets */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    CH (g/h)
                  </label>
                  <input
                    type="number"
                    value={planForm.objectiu_ch_g_h}
                    onChange={e => setPlanForm(prev => ({ ...prev, objectiu_ch_g_h: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Sodi (mg/h)
                  </label>
                  <input
                    type="number"
                    value={planForm.objectiu_sodi_mg_h}
                    onChange={e => setPlanForm(prev => ({ ...prev, objectiu_sodi_mg_h: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Fluid (ml/h)
                  </label>
                  <input
                    type="number"
                    value={planForm.objectiu_fluid_ml_h}
                    onChange={e => setPlanForm(prev => ({ ...prev, objectiu_fluid_ml_h: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Productes i Suplements Recomanats
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Gels 30g CH amb cafeïna, barretes energètiques, sals minerals..."
                  value={planForm.productes_propostes}
                  onChange={e => setPlanForm(prev => ({ ...prev, productes_propostes: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Instruccions / Estratègia
                </label>
                <textarea
                  rows={3}
                  placeholder="Timing de les preses, pautes de carbohidrats pre-cursa, líquids en avituallaments..."
                  value={planForm.instruccions}
                  onChange={e => setPlanForm(prev => ({ ...prev, instruccions: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Data de Propera Revisió (opcional)
                </label>
                <input
                  type="date"
                  value={planForm.data_revisio}
                  onChange={e => setPlanForm(prev => ({ ...prev, data_revisio: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreatePlanOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-xl transition"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={submittingPlan || !planForm.atleta_id}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingPlan && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Crear Pla</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Revision (Coach) */}
      {createRevisionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-400" />
                <span>Nova Revisió de l'Estratègia</span>
              </h3>
              <button 
                onClick={() => setCreateRevisionOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateRevision} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    CH (g/h)
                  </label>
                  <input
                    type="number"
                    value={revisionForm.objectiu_ch_g_h}
                    onChange={e => setRevisionForm(prev => ({ ...prev, objectiu_ch_g_h: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Sodi (mg/h)
                  </label>
                  <input
                    type="number"
                    value={revisionForm.objectiu_sodi_mg_h}
                    onChange={e => setRevisionForm(prev => ({ ...prev, objectiu_sodi_mg_h: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Fluid (ml/h)
                  </label>
                  <input
                    type="number"
                    value={revisionForm.objectiu_fluid_ml_h}
                    onChange={e => setRevisionForm(prev => ({ ...prev, objectiu_fluid_ml_h: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Productes i Suplements Recomanats
                </label>
                <textarea
                  rows={2}
                  value={revisionForm.productes_propostes}
                  onChange={e => setRevisionForm(prev => ({ ...prev, productes_propostes: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Noves Instruccions / Ajustaments
                </label>
                <textarea
                  rows={3}
                  value={revisionForm.instruccions}
                  onChange={e => setRevisionForm(prev => ({ ...prev, instruccions: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Propera Data de Revisió
                </label>
                <input
                  type="date"
                  value={revisionForm.data_revisio}
                  onChange={e => setRevisionForm(prev => ({ ...prev, data_revisio: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateRevisionOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-xl transition"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={submittingRevision}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingRevision && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Publicar Nova Revisió</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Feedback (Athlete / Coach) */}
      {feedbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <span>Registrar Sortida / Sensacions</span>
              </h3>
              <button 
                onClick={() => setFeedbackModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddFeedback} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Data de la Sortida *
                  </label>
                  <input
                    type="date"
                    required
                    value={feedbackForm.data_sortida}
                    onChange={e => setFeedbackForm(prev => ({ ...prev, data_sortida: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Durada (hores)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={feedbackForm.durada_hores}
                    onChange={e => setFeedbackForm(prev => ({ ...prev, durada_hores: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              {/* Real intake values */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    CH Real (g/h)
                  </label>
                  <input
                    type="number"
                    value={feedbackForm.ch_g_h_real}
                    onChange={e => setFeedbackForm(prev => ({ ...prev, ch_g_h_real: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Sodi Real (mg/h)
                  </label>
                  <input
                    type="number"
                    value={feedbackForm.sodi_mg_h_real}
                    onChange={e => setFeedbackForm(prev => ({ ...prev, sodi_mg_h_real: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Fluid Real (ml/h)
                  </label>
                  <input
                    type="number"
                    value={feedbackForm.fluid_ml_h_real}
                    onChange={e => setFeedbackForm(prev => ({ ...prev, fluid_ml_h_real: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Productes Consumits
                </label>
                <input
                  type="text"
                  placeholder="Ex: 3 gels Maurten, 1 barreja isotònica 500ml..."
                  value={feedbackForm.productes_consumits}
                  onChange={e => setFeedbackForm(prev => ({ ...prev, productes_consumits: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Sensacions Digestives i Energia
                </label>
                <textarea
                  rows={3}
                  placeholder="Com ha respost l'estómac? S'ha mantingut l'energia constant? Alguna molèstia?"
                  value={feedbackForm.sensacions}
                  onChange={e => setFeedbackForm(prev => ({ ...prev, sensacions: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setFeedbackModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-xl transition"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingFeedback && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Guardar Registre</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
