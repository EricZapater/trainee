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
  Activity,
  X
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
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 border animate-fade-in ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
            <span className="text-sm font-semibold">{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100 font-bold ml-2">&times;</button>
        </div>
      )}

      {/* View Mode 1: Selected Plan Detail */}
      {selectedPlan ? (
        <div className="space-y-6">
          {/* Top Bar Detail */}
          <div className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <button
                onClick={() => setSelectedPlanId(null)}
                className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition mb-1 font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Tornar a la llista de plans</span>
              </button>

              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">{selectedPlan.titol}</h1>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  selectedPlan.estat === 'actiu' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}>
                  {selectedPlan.estat.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-text-muted mt-0.5">
                {isCoach ? (
                  <span>Atleta: <strong className="text-text-primary">{selectedPlan.atleta_nom} {selectedPlan.atleta_cognoms}</strong></span>
                ) : (
                  <span>Entrenador: <strong className="text-text-primary">{selectedPlan.entrenador_nom || 'Equip Tècnic'}</strong></span>
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
                      className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 font-bold shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nova Revisió</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleTogglePlanEstat(selectedPlan)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-bg-surface hover:bg-bg-hover text-text-primary border border-border rounded-xl text-xs font-bold transition shadow-sm"
                    title={selectedPlan.estat === 'actiu' ? 'Desactivar pla' : 'Activar pla'}
                  >
                    {selectedPlan.estat === 'actiu' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{selectedPlan.estat === 'actiu' ? 'Desactivar' : 'Activar'}</span>
                  </button>

                  <button
                    onClick={() => handleDeletePlan(selectedPlan)}
                    className="p-2 text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-border"
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
            <div className="glass-card p-6 sm:p-8 space-y-6 shadow-md border-brand-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="px-3 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-brand-500" />
                    <span>Versió {selectedPlan.revisions[0].versio} (Actual)</span>
                  </div>

                  {selectedPlan.revisions[0].data_revisio && (
                    <div className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-xl border ${
                      isRevisionOverdueOrToday(selectedPlan.revisions[0].data_revisio)
                        ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                        : 'bg-bg-surface text-text-secondary border-border'
                    }`}>
                      <Calendar className="w-3.5 h-3.5 text-text-muted" />
                      <span>Propera revisió: {new Date(selectedPlan.revisions[0].data_revisio).toLocaleDateString('ca-ES')}</span>
                      {isRevisionOverdueOrToday(selectedPlan.revisions[0].data_revisio) && (
                        <span className="text-amber-800 font-bold ml-1">(Pendent!)</span>
                      )}
                    </div>
                  )}
                </div>

                {selectedPlan.estat === 'actiu' && (
                  <button
                    onClick={() => openFeedbackModal(selectedPlan.revisions[0])}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm self-start sm:self-auto"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Registrar Entrenament / Sensacions</span>
                  </button>
                )}
              </div>

              {/* Targets 3-column KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Flame className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-amber-800 font-bold block">Carbohidrats</span>
                    <div className="text-2xl font-black text-amber-900">
                      {selectedPlan.revisions[0].objectiu_ch_g_h ?? '-'}{' '}
                      <span className="text-xs font-normal text-amber-700">g/h</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-indigo-800 font-bold block">Sodi</span>
                    <div className="text-2xl font-black text-indigo-900">
                      {selectedPlan.revisions[0].objectiu_sodi_mg_h ?? '-'}{' '}
                      <span className="text-xs font-normal text-indigo-700">mg/h</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200 flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
                    <Droplet className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-cyan-800 font-bold block">Hidratació</span>
                    <div className="text-2xl font-black text-cyan-900">
                      {selectedPlan.revisions[0].objectiu_fluid_ml_h ?? '-'}{' '}
                      <span className="text-xs font-normal text-cyan-700">ml/h</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions & Products details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {selectedPlan.revisions[0].productes_propostes && (
                  <div className="p-4 rounded-2xl bg-bg-surface border border-border space-y-1.5">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-amber-800 flex items-center gap-1.5">
                      <Apple className="w-4 h-4 text-amber-600" />
                      <span>Productes i Suplements Proposts</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-text-secondary whitespace-pre-line leading-relaxed">
                      {selectedPlan.revisions[0].productes_propostes}
                    </p>
                  </div>
                )}

                {selectedPlan.revisions[0].instruccions && (
                  <div className="p-4 rounded-2xl bg-bg-surface border border-border space-y-1.5">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-emerald-800 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-600" />
                      <span>Instruccions / Estratègia de Cursa</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-text-secondary whitespace-pre-line leading-relaxed">
                      {selectedPlan.revisions[0].instruccions}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Revisions & Feedback History Timeline */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <History className="w-5 h-5 text-brand-500" />
              <span>Historial de Versions & Feedbacks ({selectedPlan.revisions?.length || 0})</span>
            </h3>

            <div className="space-y-2.5">
              {selectedPlan.revisions?.map(rev => {
                const isOpen = expandedRevisions[rev.id]
                return (
                  <div key={rev.id} className="glass-card overflow-hidden">
                    <button
                      onClick={() => toggleRevisionAccordion(rev.id)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-bg-hover/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-text-primary text-sm">Versió {rev.versio}</span>
                        <span className="text-xs text-text-muted">
                          ({new Date(rev.created_at).toLocaleDateString('ca-ES')})
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-bold">
                          {rev.feedbacks?.length || 0} registres
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-3 text-xs text-text-muted">
                          <span><strong>CH:</strong> {rev.objectiu_ch_g_h ?? '-'} g/h</span>
                          <span><strong>Sodi:</strong> {rev.objectiu_sodi_mg_h ?? '-'} mg/h</span>
                          <span><strong>Fluid:</strong> {rev.objectiu_fluid_ml_h ?? '-'} ml/h</span>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="p-4 border-t border-border bg-bg-hover/30 space-y-3">
                        {/* Feedbacks list */}
                        {(!rev.feedbacks || rev.feedbacks.length === 0) ? (
                          <p className="text-xs text-text-muted italic">
                            Cap registre o comentari introduït en aquesta versió.
                          </p>
                        ) : (
                          <div className="space-y-2.5">
                            {rev.feedbacks.map(fb => (
                              <div key={fb.id} className="p-3.5 rounded-xl bg-bg-surface border border-border space-y-1.5">
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-1.5 text-text-primary font-bold">
                                    <Calendar className="w-3.5 h-3.5 text-brand-500" />
                                    <span>{new Date(fb.data_sortida).toLocaleDateString('ca-ES')}</span>
                                    {fb.durada_hores && <span className="text-text-muted font-normal">({fb.durada_hores} h)</span>}
                                  </div>
                                  <span className="text-text-muted font-medium">Per {fb.atleta_nom || 'Atleta'}</span>
                                </div>

                                {/* Comparison Pills */}
                                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                  {fb.ch_g_h_real !== undefined && (
                                    <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                                      CH Real: <strong>{fb.ch_g_h_real}</strong> g/h{' '}
                                      <span className="opacity-70">(obj: {rev.objectiu_ch_g_h ?? '-'})</span>
                                    </span>
                                  )}
                                  {fb.sodi_mg_h_real !== undefined && (
                                    <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 font-medium">
                                      Sodi Real: <strong>{fb.sodi_mg_h_real}</strong> mg/h{' '}
                                      <span className="opacity-70">(obj: {rev.objectiu_sodi_mg_h ?? '-'})</span>
                                    </span>
                                  )}
                                  {fb.fluid_ml_h_real !== undefined && (
                                    <span className="px-2 py-0.5 rounded-lg bg-cyan-50 text-cyan-800 border border-cyan-200 font-medium">
                                      Fluid Real: <strong>{fb.fluid_ml_h_real}</strong> ml/h{' '}
                                      <span className="opacity-70">(obj: {rev.objectiu_fluid_ml_h ?? '-'})</span>
                                    </span>
                                  )}
                                </div>

                                {fb.productes_consumits && (
                                  <div className="text-xs text-text-secondary">
                                    <strong className="text-text-primary">Productes:</strong> {fb.productes_consumits}
                                  </div>
                                )}

                                {fb.sensacions && (
                                  <div className="text-xs text-text-secondary bg-bg-hover/80 p-2.5 rounded-lg border border-border italic">
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
        /* View Mode 2: Plans Catalog */
        <div className="space-y-6">
          {/* Header */}
          <div className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Apple className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">Estratègia Nutricional & Curses</h1>
              </div>
              <p className="text-xs sm:text-sm text-text-muted mt-1">
                {isCoach 
                  ? 'Planificació de pautes de carbohidrats, hidratació i sodi per a cada atleta amb seguiment de tolerància.' 
                  : 'Consulta els teus objectius nutricionals horaris i registra les sensacions dels teus entrenaments.'}
              </p>
            </div>

            {isCoach && (
              <button
                onClick={() => setCreatePlanOpen(true)}
                className="btn-primary text-sm py-2.5 px-4 w-full sm:w-auto flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Nou Pla Nutricional</span>
              </button>
            )}
          </div>

          {/* Filters Bar */}
          <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cercar per títol o atleta..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
              {isCoach && (
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-text-muted" />
                  <select
                    value={selectedAtletaFilter}
                    onChange={e => setSelectedAtletaFilter(e.target.value)}
                    className="bg-bg-surface border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-primary focus:outline-none focus:border-brand-500"
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

              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-text-muted" />
                <select
                  value={selectedEstatFilter}
                  onChange={e => setSelectedEstatFilter(e.target.value as any)}
                  className="bg-bg-surface border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-primary focus:outline-none focus:border-brand-500"
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
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
              <p className="text-text-muted text-sm font-medium">Carregant plans nutricionals...</p>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="glass-card p-12 text-center text-text-muted space-y-3">
              <Apple className="w-12 h-12 mx-auto text-slate-300" />
              <h3 className="text-base font-bold text-text-primary">Cap pla nutricional trobat</h3>
              <p className="text-xs max-w-sm mx-auto">
                {isCoach 
                  ? 'Crea un pla nutricional per establir els objectius de carbohidrats i hidratació dels teus atletes.'
                  : 'Encara no tens cap pla de nutrició assignat pel teu entrenador.'}
              </p>
              {isCoach && (
                <button
                  onClick={() => setCreatePlanOpen(true)}
                  className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-4 font-bold"
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
                    className="glass-card p-5 flex flex-col justify-between cursor-pointer hover:border-brand-300 transition-all shadow-sm hover:shadow-md group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          plan.estat === 'actiu'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}>
                          {plan.estat.toUpperCase()}
                        </span>

                        {isOverdue && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Revisió Pendent!</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-text-primary group-hover:text-brand-600 transition-colors line-clamp-1">
                        {plan.titol}
                      </h3>

                      <p className="text-xs text-text-muted mt-0.5">
                        {isCoach ? (
                          <span>Atleta: <strong className="text-text-primary">{plan.atleta_nom} {plan.atleta_cognoms}</strong></span>
                        ) : (
                          <span>Entrenador: <strong className="text-text-primary">{plan.entrenador_nom || 'Equip'}</strong></span>
                        )}
                      </p>

                      {/* Current Targets Metric Preview */}
                      {currentRev && (
                        <div className="mt-3.5 grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-bg-hover/70 border border-border text-center">
                          <div>
                            <span className="text-[10px] uppercase text-text-muted block font-bold">CH</span>
                            <span className="text-sm font-black text-amber-700">{currentRev.objectiu_ch_g_h ?? '-'} <small className="text-[9px] text-text-muted">g/h</small></span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-text-muted block font-bold">Sodi</span>
                            <span className="text-sm font-black text-indigo-700">{currentRev.objectiu_sodi_mg_h ?? '-'} <small className="text-[9px] text-text-muted">mg/h</small></span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-text-muted block font-bold">Fluid</span>
                            <span className="text-sm font-black text-cyan-700">{currentRev.objectiu_fluid_ml_h ?? '-'} <small className="text-[9px] text-text-muted">ml/h</small></span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
                      <span className="flex items-center gap-1.5 font-medium">
                        <History className="w-3.5 h-3.5 text-text-muted" />
                        <span>V{currentRev?.versio || 1} • {plan.revisions?.reduce((acc, r) => acc + (r.feedbacks?.length || 0), 0) || 0} feedbacks</span>
                      </span>

                      <span className="text-brand-600 font-bold group-hover:translate-x-0.5 transition-transform">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Apple className="w-5 h-5 text-brand-500" />
                <span>Nou Pla Nutricional</span>
              </h3>
              <button 
                onClick={() => setCreatePlanOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Atleta Destinatari *
                </label>
                <select
                  required
                  value={planForm.atleta_id}
                  onChange={e => setPlanForm(prev => ({ ...prev, atleta_id: e.target.value }))}
                  className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:border-brand-500 text-sm font-semibold"
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
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Títol del Pla *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pla Nutrició Cursa Ultra Trail"
                  value={planForm.titol}
                  onChange={e => setPlanForm(prev => ({ ...prev, titol: e.target.value }))}
                  className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-sm font-semibold"
                />
              </div>

              {/* Targets */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    CH (g/h)
                  </label>
                  <input
                    type="number"
                    value={planForm.objectiu_ch_g_h}
                    onChange={e => setPlanForm(prev => ({ ...prev, objectiu_ch_g_h: Number(e.target.value) }))}
                    className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Sodi (mg/h)
                  </label>
                  <input
                    type="number"
                    value={planForm.objectiu_sodi_mg_h}
                    onChange={e => setPlanForm(prev => ({ ...prev, objectiu_sodi_mg_h: Number(e.target.value) }))}
                    className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Fluid (ml/h)
                  </label>
                  <input
                    type="number"
                    value={planForm.objectiu_fluid_ml_h}
                    onChange={e => setPlanForm(prev => ({ ...prev, objectiu_fluid_ml_h: Number(e.target.value) }))}
                    className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Productes i Suplements Recomanats
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Gels 30g CH amb cafeïna, barretes energètiques, sals minerals..."
                  value={planForm.productes_propostes}
                  onChange={e => setPlanForm(prev => ({ ...prev, productes_propostes: e.target.value }))}
                  className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Instruccions / Estratègia
                </label>
                <textarea
                  rows={3}
                  placeholder="Timing de les preses, pautes de carbohidrats pre-cursa, líquids en avituallaments..."
                  value={planForm.instruccions}
                  onChange={e => setPlanForm(prev => ({ ...prev, instruccions: e.target.value }))}
                  className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Data de Propera Revisió (opcional)
                </label>
                <input
                  type="date"
                  value={planForm.data_revisio}
                  onChange={e => setPlanForm(prev => ({ ...prev, data_revisio: e.target.value }))}
                  className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:border-brand-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCreatePlanOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-hover rounded-xl border border-border transition"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={submittingPlan || !planForm.atleta_id}
                  className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingPlan && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Crear Pla</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Revision (Coach) */}
      {createRevisionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Zap className="w-5 h-5 text-brand-500" />
                <span>Nova Revisió de l'Estratègia</span>
              </h3>
              <button 
                onClick={() => setCreateRevisionOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRevision} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    CH (g/h)
                  </label>
                  <input
                    type="number"
                    value={revisionForm.objectiu_ch_g_h}
                    onChange={e => setRevisionForm(prev => ({ ...prev, objectiu_ch_g_h: Number(e.target.value) }))}
                    className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Sodi (mg/h)
                  </label>
                  <input
                    type="number"
                    value={revisionForm.objectiu_sodi_mg_h}
                    onChange={e => setRevisionForm(prev => ({ ...prev, objectiu_sodi_mg_h: Number(e.target.value) }))}
                    className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Fluid (ml/h)
                  </label>
                  <input
                    type="number"
                    value={revisionForm.objectiu_fluid_ml_h}
                    onChange={e => setRevisionForm(prev => ({ ...prev, objectiu_fluid_ml_h: Number(e.target.value) }))}
                    className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Productes i Suplements Recomanats
                </label>
                <textarea
                  rows={2}
                  value={revisionForm.productes_propostes}
                  onChange={e => setRevisionForm(prev => ({ ...prev, productes_propostes: e.target.value }))}
                  className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Noves Instruccions / Ajustaments
                </label>
                <textarea
                  rows={3}
                  value={revisionForm.instruccions}
                  onChange={e => setRevisionForm(prev => ({ ...prev, instruccions: e.target.value }))}
                  className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Propera Data de Revisió
                </label>
                <input
                  type="date"
                  value={revisionForm.data_revisio}
                  onChange={e => setRevisionForm(prev => ({ ...prev, data_revisio: e.target.value }))}
                  className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCreateRevisionOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-hover rounded-xl border border-border transition"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={submittingRevision}
                  className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingRevision && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Publicar Nova Revisió</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Feedback (Athlete / Coach) */}
      {feedbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <span>Registrar Sortida / Sensacions</span>
              </h3>
              <button 
                onClick={() => setFeedbackModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFeedback} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Data de la Sortida *
                  </label>
                  <input
                    type="date"
                    required
                    value={feedbackForm.data_sortida}
                    onChange={e => setFeedbackForm(prev => ({ ...prev, data_sortida: e.target.value }))}
                    className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Durada (hores)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={feedbackForm.durada_hores}
                    onChange={e => setFeedbackForm(prev => ({ ...prev, durada_hores: Number(e.target.value) }))}
                    className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Real intake values */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    CH Real (g/h)
                  </label>
                  <input
                    type="number"
                    value={feedbackForm.ch_g_h_real}
                    onChange={e => setFeedbackForm(prev => ({ ...prev, ch_g_h_real: Number(e.target.value) }))}
                    className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Sodi Real (mg/h)
                  </label>
                  <input
                    type="number"
                    value={feedbackForm.sodi_mg_h_real}
                    onChange={e => setFeedbackForm(prev => ({ ...prev, sodi_mg_h_real: Number(e.target.value) }))}
                    className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Fluid Real (ml/h)
                  </label>
                  <input
                    type="number"
                    value={feedbackForm.fluid_ml_h_real}
                    onChange={e => setFeedbackForm(prev => ({ ...prev, fluid_ml_h_real: Number(e.target.value) }))}
                    className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Productes Consumits
                </label>
                <input
                  type="text"
                  placeholder="Ex: 3 gels Maurten, 1 bidó 500ml isotònic..."
                  value={feedbackForm.productes_consumits}
                  onChange={e => setFeedbackForm(prev => ({ ...prev, productes_consumits: e.target.value }))}
                  className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Sensacions Digestives i Energia
                </label>
                <textarea
                  rows={3}
                  placeholder="Com ha respost l'estómac? S'ha mantingut l'energia constant?"
                  value={feedbackForm.sensacions}
                  onChange={e => setFeedbackForm(prev => ({ ...prev, sensacions: e.target.value }))}
                  className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setFeedbackModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-hover rounded-xl border border-border transition"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingFeedback && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
