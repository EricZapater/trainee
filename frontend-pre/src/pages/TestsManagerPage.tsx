import React, { useState, useEffect, useMemo } from 'react'
import { 
  ClipboardList, 
  CalendarPlus, 
  BellRing, 
  Plus, 
  Calendar, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  X, 
  Check, 
  BellOff, 
  Clock,
  Sparkles
} from 'lucide-react'
import { getAtletes } from '../api/entrenador'
import { 
  getPendingTests, 
  getRecordatorisTests, 
  createTest, 
  traspassarTest, 
  updateRecordatoriTest 
} from '../api/tests'
import type { Test, CreateTestRequest } from '../types'

export const TestsManagerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pendents' | 'recordatoris'>('pendents')
  const [pendingTests, setPendingTests] = useState<Test[]>([])
  const [recordatoris, setRecordatoris] = useState<Test[]>([])
  const [atletes, setAtletes] = useState<{ id: string; nom: string; cognoms: string; email: string; actiu: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Create Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [resolentRecordatoriId, setResolentRecordatoriId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<CreateTestRequest>({
    atleta_id: '',
    titol: '',
    data_test: new Date().toISOString().split('T')[0],
    data_recordatori: '',
    comentaris: ''
  })

  // Action in progress state
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [atletesData, pendentsData, recsData] = await Promise.all([
        getAtletes(),
        getPendingTests(),
        getRecordatorisTests()
      ])
      setAtletes((atletesData || []).filter(a => a.actiu))
      setPendingTests(pendentsData || [])
      setRecordatoris(recsData || [])
    } catch (err) {
      console.error(err)
      showToast('Error carregant les dades de proves físiques', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Check if reminder is urgent (due today or in past)
  const isUrgent = (dueDate?: string) => {
    if (!dueDate) return false
    const due = new Date(dueDate).setHours(0, 0, 0, 0)
    const today = new Date().setHours(0, 0, 0, 0)
    return due <= today
  }

  const urgentCount = useMemo(() => {
    return recordatoris.filter(r => isUrgent(r.data_recordatori)).length
  }, [recordatoris])

  // Open create modal
  const openCreateModal = (recordatoriId?: string, atletaId?: string, oldTitol?: string) => {
    const todayStr = new Date().toISOString().split('T')[0]
    setForm({
      atleta_id: atletaId || (atletes.length > 0 ? atletes[0].id : ''),
      titol: oldTitol || '',
      data_test: todayStr,
      data_recordatori: '',
      comentaris: ''
    })
    setResolentRecordatoriId(recordatoriId || null)
    setModalOpen(true)
  }

  // Quick helper to add weeks to reminder date
  const setReminderOffsetWeeks = (weeks: number) => {
    const base = form.data_test ? new Date(form.data_test) : new Date()
    base.setDate(base.getDate() + weeks * 7)
    setForm(prev => ({ ...prev, data_recordatori: base.toISOString().split('T')[0] }))
  }

  // Submit test creation
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.atleta_id || !form.titol.trim() || !form.data_test) {
      showToast('Si us plau omple tots els camps obligatoris', 'error')
      return
    }

    setSubmitting(true)
    try {
      await createTest({
        atleta_id: form.atleta_id,
        titol: form.titol.trim(),
        data_test: form.data_test,
        data_recordatori: form.data_recordatori || undefined,
        comentaris: form.comentaris?.trim() || undefined
      })

      // If resolving reminder
      if (resolentRecordatoriId) {
        await updateRecordatoriTest(resolentRecordatoriId, { estat: 'resolt' })
      }

      showToast('Test creat i afegit a la safata de planificació')
      setModalOpen(false)
      loadData()
      setActiveTab('pendents')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Error creant el test', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Transfer test to calendar
  const handleTraspassar = async (testId: string) => {
    setActionInProgressId(testId)
    try {
      await traspassarTest(testId)
      showToast('Test programat correctament al calendari de l\'atleta')
      loadData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Error en traspassar el test', 'error')
    } finally {
      setActionInProgressId(null)
    }
  }

  // Cancel reminder
  const handleCancelReminder = async (testId: string) => {
    setActionInProgressId(testId)
    try {
      await updateRecordatoriTest(testId, { estat: 'cancelat' })
      showToast('Recordatori cancel·lat')
      loadData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Error al cancel·lar el recordatori', 'error')
    } finally {
      setActionInProgressId(null)
    }
  }

  const suggestedTitles = [
    'Test VAM 2000m (Pista)',
    'Test FTP 20 min (Rodet/Pujada)',
    'Test Llindar Lactat 30 min',
    'Test 5k / 10k Control',
    'Test Potència Sprint 15s'
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      {toastMessage && (
        <div 
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 animate-fade-in ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">Proves Físiques i Tests</h1>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Programa avaluacions de rendiment, gestiona el traspàs al calendari i rep alertes de reavaluació.
            </p>
          </div>
        </div>

        <button
          onClick={() => openCreateModal()}
          className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center justify-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nou Test
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('pendents')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'pendents'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <CalendarPlus className="w-4 h-4" />
          <span>Pendents de programar</span>
          {pendingTests.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeTab === 'pendents' ? 'bg-white text-brand-600' : 'bg-brand-100 text-brand-700'
            }`}>
              {pendingTests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('recordatoris')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'recordatoris'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <BellRing className="w-4 h-4" />
          <span>Recordatoris de reavaluació</span>
          {recordatoris.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
              urgentCount > 0 
                ? 'bg-rose-500 text-white animate-pulse' 
                : activeTab === 'recordatoris' 
                  ? 'bg-white text-brand-600' 
                  : 'bg-amber-100 text-amber-800'
            }`}>
              {recordatoris.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-3" />
          <p className="text-sm font-semibold">Carregant proves físiques...</p>
        </div>
      ) : activeTab === 'pendents' ? (
        // PENDENTS DE PROGRAMAR
        pendingTests.length === 0 ? (
          <div className="glass-card p-12 text-center text-text-muted">
            <ClipboardList className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
            <h3 className="text-base font-bold text-text-primary">Cap test pendent de programar</h3>
            <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
              Tots els tests creats ja han estat traspassats al calendari setmanal dels atletes.
            </p>
            <button
              onClick={() => openCreateModal()}
              className="mt-4 px-3.5 py-1.5 rounded-xl text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Crear un nou test
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingTests.map(test => (
              <div 
                key={test.id} 
                className="glass-card p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:border-brand-300 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <h3 className="font-bold text-base text-text-primary leading-snug">
                        {test.titol}
                      </h3>
                    </div>
                    <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Pendent
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                    <span className="flex items-center gap-1 font-medium text-text-primary">
                      <User className="w-3.5 h-3.5 text-brand-500" />
                      {test.atleta_nom || 'Atleta'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-text-muted" />
                      {new Date(test.data_test + 'T00:00:00').toLocaleDateString('ca-ES', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>

                  {test.comentaris && (
                    <p className="text-xs text-text-muted bg-bg-surface p-2.5 rounded-xl border border-border line-clamp-3">
                      {test.comentaris}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                  <span className="text-[11px] text-text-muted">
                    Creat: {new Date(test.created_at).toLocaleDateString('ca-ES')}
                  </span>
                  <button
                    onClick={() => handleTraspassar(test.id)}
                    disabled={actionInProgressId === test.id}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {actionInProgressId === test.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    Traspassar al calendari
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // RECORDATORIS DE REAVALUACIÓ
        recordatoris.length === 0 ? (
          <div className="glass-card p-12 text-center text-text-muted">
            <BellOff className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
            <h3 className="text-base font-bold text-text-primary">Cap recordatori de reavaluació actiu</h3>
            <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
              Quan creïs un test amb una data de revisió o recordatori futur, apareixerà aquí quan arribi el moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recordatoris.map(rec => {
              const urgent = isUrgent(rec.data_recordatori)
              return (
                <div 
                  key={rec.id} 
                  className={`glass-card p-4 sm:p-5 flex flex-col justify-between space-y-4 transition-all ${
                    urgent ? 'border-rose-400 bg-rose-50/20 shadow-sm' : 'hover:border-amber-300'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${urgent ? 'bg-rose-500 animate-ping' : 'bg-amber-500'}`} />
                          <h3 className="font-bold text-base text-text-primary leading-snug">
                            Reavaluar: {rec.titol}
                          </h3>
                        </div>
                        <p className="text-xs font-medium text-text-secondary mt-1 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-brand-500" />
                          {rec.atleta_nom || 'Atleta'}
                        </p>
                      </div>

                      {urgent ? (
                        <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Urgent
                        </span>
                      ) : (
                        <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Programat
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-xl bg-bg-surface border border-border text-xs space-y-1">
                      <div className="flex items-center justify-between text-text-secondary">
                        <span className="text-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Últim test realitzat:
                        </span>
                        <strong className="text-text-primary">
                          {new Date(rec.data_test + 'T00:00:00').toLocaleDateString('ca-ES')}
                        </strong>
                      </div>
                      {rec.data_recordatori && (
                        <div className="flex items-center justify-between text-text-secondary">
                          <span className="text-text-muted flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Data prevista reavaluació:
                          </span>
                          <strong className={urgent ? 'text-rose-600 font-black' : 'text-text-primary'}>
                            {new Date(rec.data_recordatori + 'T00:00:00').toLocaleDateString('ca-ES')}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleCancelReminder(rec.id)}
                      disabled={actionInProgressId === rec.id}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      Cancel·lar
                    </button>
                    <button
                      onClick={() => openCreateModal(rec.id, rec.atleta_id, rec.titol)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Programar nou test
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Modal Crear Test */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card bg-bg-surface w-full max-w-lg p-6 rounded-2xl shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-brand-500" />
                {resolentRecordatoriId ? 'Reavaluar Test Físic' : 'Crear Nou Test Físic'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-4 pt-1">
              {/* Athlete Select */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Atleta <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={form.atleta_id}
                  onChange={e => setForm(prev => ({ ...prev, atleta_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="">Selecciona un atleta...</option>
                  {atletes.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nom} {a.cognoms} ({a.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title & Suggestions */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Títol de la prova <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Test VAM 2000m o Test FTP 20 min"
                  value={form.titol}
                  onChange={e => setForm(prev => ({ ...prev, titol: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
                {/* Suggestions pills */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {suggestedTitles.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, titol: s }))}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-bg-surface hover:bg-bg-hover text-text-secondary border border-border transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date of Test & Date of Reminder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                    Data del test <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.data_test}
                    onChange={e => setForm(prev => ({ ...prev, data_test: e.target.value }))}
                    className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-text-secondary uppercase">
                      Recordatori reavaluació
                    </label>
                    <span className="text-[10px] text-text-muted">Opcional</span>
                  </div>
                  <input
                    type="date"
                    value={form.data_recordatori || ''}
                    onChange={e => setForm(prev => ({ ...prev, data_recordatori: e.target.value }))}
                    className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Quick offset buttons for reminder */}
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Repetir en:
                </span>
                <button
                  type="button"
                  onClick={() => setReminderOffsetWeeks(4)}
                  className="px-2 py-0.5 rounded-md bg-bg-surface hover:bg-bg-hover border border-border text-[11px] font-bold text-text-secondary"
                >
                  +4 setm.
                </button>
                <button
                  type="button"
                  onClick={() => setReminderOffsetWeeks(8)}
                  className="px-2 py-0.5 rounded-md bg-bg-surface hover:bg-bg-hover border border-border text-[11px] font-bold text-text-secondary"
                >
                  +8 setm.
                </button>
                <button
                  type="button"
                  onClick={() => setReminderOffsetWeeks(12)}
                  className="px-2 py-0.5 rounded-md bg-bg-surface hover:bg-bg-hover border border-border text-[11px] font-bold text-text-secondary"
                >
                  +12 setm.
                </button>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Comentaris / Pautes
                </label>
                <textarea
                  rows={3}
                  placeholder="Instruccions per a l'atleta, protocol d'escalfament, terreny recomanat..."
                  value={form.comentaris || ''}
                  onChange={e => setForm(prev => ({ ...prev, comentaris: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.atleta_id || !form.titol.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Crear Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
