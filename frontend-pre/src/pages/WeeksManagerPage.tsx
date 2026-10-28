import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Clock, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Archive, 
  Lock, 
  Unlock,
  ChevronLeft,
  X
} from 'lucide-react'
import { getEntrenadorWeeks, createWeek, updateWeek, type ManagedWeekWithCount } from '../api/entrenador'

export const WeeksManagerPage: React.FC = () => {
  const [weeks, setWeeks] = useState<ManagedWeekWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newWeekDate, setNewWeekDate] = useState('')
  const [creating, setCreating] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadWeeks()
  }, [])

  const loadWeeks = async () => {
    setLoading(true)
    try {
      const data = await getEntrenadorWeeks()
      // Order descending by week_start
      setWeeks(data.sort((a, b) => b.week_start.localeCompare(a.week_start)))
    } catch (err) {
      console.error('Error carregant setmanes:', err)
      showNotification('error', 'Error carregant el llistat de setmanes.')
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text })
    setTimeout(() => setFeedback(null), 4000)
  }

  const openCreateModal = () => {
    // Suggest next monday
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? 1 : 8)
    const nextMonday = new Date(d.setDate(diff)).toISOString().split('T')[0]
    setNewWeekDate(nextMonday)
    setShowCreateModal(true)
  }

  const handleCreateWeek = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWeekDate) return

    setCreating(true)
    try {
      await createWeek(newWeekDate)
      showNotification('success', `Nova setmana del ${newWeekDate} creada correctament!`)
      setShowCreateModal(false)
      loadWeeks()
    } catch (err: any) {
      console.error('Error creant setmana:', err)
      showNotification('error', err.response?.data?.error || 'Error creant la setmana.')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateStatus = async (week: ManagedWeekWithCount, newStatus: string) => {
    try {
      await updateWeek(week.id, newStatus)
      showNotification('success', `Setmana ${week.week_start} passada a ${newStatus}.`)
      setWeeks(prev => prev.map(w => w.id === week.id ? { ...w, estat: newStatus as any } : w))
    } catch (err: any) {
      console.error('Error canviant estat setmana:', err)
      showNotification('error', err.response?.data?.error || 'Error actualitzant estat de la setmana.')
    }
  }

  const formatDate = (dateStr: string, offsetDays: number = 0) => {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    d.setDate(d.getDate() + offsetDays)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Feedback */}
      {feedback && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 border animate-fade-in ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span className="text-sm font-semibold">{feedback.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-2 rounded-xl bg-white/70 hover:bg-white text-text-muted hover:text-text-primary border border-border-light shadow-sm transition-colors"
            title="Tornar a la Matriu"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2">
              <Clock className="w-6 h-6 text-brand-500" /> Gestor de Setmanes
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Crea noves setmanes de planificació, obre la disponibilitat o tanca períodes finalitzats.
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-primary text-sm py-2.5 px-4 w-full sm:w-auto flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Crear Nova Setmana
        </button>
      </div>

      {/* Weeks Table / Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-text-muted text-sm font-medium">Carregant setmanes...</p>
        </div>
      ) : weeks.length === 0 ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-sm">No hi ha cap setmana registrada.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border-light text-text-muted font-bold uppercase text-[11px] bg-bg-surface/50">
                  <th className="py-3 px-4">Setmana (Dilluns - Diumenge)</th>
                  <th className="py-3 px-4 text-center">Estat Actual</th>
                  <th className="py-3 px-4 text-center">Respostes Atletes</th>
                  <th className="py-3 px-4 text-right">Accions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {weeks.map(w => (
                  <tr key={w.id} className="hover:bg-bg-hover/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-text-primary flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand-500 shrink-0" />
                      <span>{formatDate(w.week_start)} - {formatDate(w.week_start, 6)}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        w.estat === 'oberta' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        w.estat === 'tancada' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}>
                        {w.estat}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-text-secondary font-semibold">
                      {w.submissions_count !== undefined ? `${w.submissions_count} atletes` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {w.estat !== 'oberta' && (
                          <button
                            onClick={() => handleUpdateStatus(w, 'oberta')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-colors"
                            title="Obrir setmana perquè els atletes puguin omplir disponibilitat"
                          >
                            <Unlock className="w-3.5 h-3.5" /> Obrir
                          </button>
                        )}
                        {w.estat === 'oberta' && (
                          <button
                            onClick={() => handleUpdateStatus(w, 'tancada')}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-bold flex items-center gap-1 transition-colors"
                            title="Tancar setmana"
                          >
                            <Lock className="w-3.5 h-3.5" /> Tancar
                          </button>
                        )}
                        {w.estat !== 'traspassada' && (
                          <button
                            onClick={() => handleUpdateStatus(w, 'traspassada')}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold flex items-center gap-1 transition-colors"
                            title="Arxivar / Marcar com a traspassada"
                          >
                            <Archive className="w-3.5 h-3.5" /> Arxivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Create Week */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card bg-white p-5 sm:p-7 rounded-2xl max-w-md w-full shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-border-light">
              <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-500" /> Crear Nova Setmana
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWeek} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-text-primary mb-1">Data d'inici de la setmana (Dilluns) *</label>
                <input
                  type="date"
                  required
                  value={newWeekDate}
                  onChange={(e) => setNewWeekDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border-light focus:ring-2 focus:ring-brand-500/30 outline-none"
                />
                <p className="text-[11px] text-text-muted mt-1">
                  Recomanat: Selecciona sempre el dilluns de la setmana a planificar.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border-light">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary rounded-xl"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary text-xs py-2 px-5 disabled:opacity-50"
                >
                  {creating ? 'Creant...' : 'Crear Setmana'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
