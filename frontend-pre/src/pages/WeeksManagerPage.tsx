import React, { useState, useEffect, useMemo } from 'react'
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
  X,
  Search,
  Filter,
  RotateCcw
} from 'lucide-react'
import { getEntrenadorWeeks, createWeek, updateWeek, type ManagedWeekWithCount } from '../api/entrenador'

export const WeeksManagerPage: React.FC = () => {
  const [weeks, setWeeks] = useState<ManagedWeekWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newWeekDate, setNewWeekDate] = useState('')
  const [creating, setCreating] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'oberta' | 'tancada' | 'traspassada'>('all')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

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

  // Available years from weeks
  const availableYears = useMemo(() => {
    const years = new Set<string>()
    weeks.forEach(w => {
      if (w.week_start) {
        years.add(w.week_start.slice(0, 4))
      }
    })
    return Array.from(years).sort().reverse()
  }, [weeks])

  // Summary counts
  const counts = useMemo(() => {
    return {
      all: weeks.length,
      oberta: weeks.filter(w => w.estat === 'oberta').length,
      tancada: weeks.filter(w => w.estat === 'tancada').length,
      traspassada: weeks.filter(w => w.estat === 'traspassada').length,
    }
  }, [weeks])

  // Filtered weeks
  const filteredWeeks = useMemo(() => {
    return weeks.filter(w => {
      // Status filter
      if (statusFilter !== 'all' && w.estat !== statusFilter) return false

      // Year filter
      if (yearFilter !== 'all' && !w.week_start.startsWith(yearFilter)) return false

      // Search query (matches formatted date or raw date)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const formatted = `${formatDate(w.week_start)} - ${formatDate(w.week_start, 6)}`.toLowerCase()
        const raw = w.week_start.toLowerCase()
        if (!formatted.includes(q) && !raw.includes(q)) return false
      }

      return true
    })
  }, [weeks, statusFilter, yearFilter, searchQuery])

  const hasActiveFilters = statusFilter !== 'all' || yearFilter !== 'all' || searchQuery.trim() !== ''

  const resetFilters = () => {
    setStatusFilter('all')
    setYearFilter('all')
    setSearchQuery('')
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
            className="p-2 rounded-xl bg-white/70 hover:bg-white text-text-muted hover:text-text-primary border border-border shadow-sm transition-colors"
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

      {/* KPI Cards / Quick Filter Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'all'
              ? 'bg-brand-50/80 border-brand-300 shadow-sm'
              : 'glass-card hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">Totes</span>
          <span className="text-2xl font-black text-text-primary mt-1 block">{counts.all}</span>
        </button>

        <button
          onClick={() => setStatusFilter('oberta')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'oberta'
              ? 'bg-emerald-50 border-emerald-300 shadow-sm'
              : 'glass-card hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">Obertes</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">{counts.oberta}</span>
        </button>

        <button
          onClick={() => setStatusFilter('tancada')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'tancada'
              ? 'bg-amber-50 border-amber-300 shadow-sm'
              : 'glass-card hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider block">Tancades</span>
          <span className="text-2xl font-black text-amber-700 mt-1 block">{counts.tancada}</span>
        </button>

        <button
          onClick={() => setStatusFilter('traspassada')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'traspassada'
              ? 'bg-slate-100 border-slate-300 shadow-sm'
              : 'glass-card hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">Arxivades</span>
          <span className="text-2xl font-black text-slate-700 mt-1 block">{counts.traspassada}</span>
        </button>
      </div>

      {/* Filter Toolbar Card */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cercar per data (ex: 26/10 o 2026)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-bg-surface border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Year selector */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-muted shrink-0" />
            <select
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
              className="bg-bg-surface border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-primary focus:outline-none focus:border-brand-500"
            >
              <option value="all">Tots els anys</option>
              {availableYears.map(year => (
                <option key={year} value={year}>Any {year}</option>
              ))}
            </select>
          </div>

          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-bg-surface border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-primary focus:outline-none focus:border-brand-500"
          >
            <option value="all">Tots els estats</option>
            <option value="oberta">Només Obertes</option>
            <option value="tancada">Només Tancades</option>
            <option value="traspassada">Només Arxivades</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-brand-600 hover:bg-brand-50 transition-colors self-end sm:self-auto border border-border"
            title="Netejar filtres"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablir filtres</span>
          </button>
        )}
      </div>

      {/* Weeks Table / Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-text-muted text-sm font-medium">Carregant setmanes...</p>
        </div>
      ) : filteredWeeks.length === 0 ? (
        <div className="glass-card p-12 text-center text-text-muted space-y-2">
          <Calendar className="w-10 h-10 mx-auto text-slate-300" />
          <p className="font-semibold text-sm text-text-primary">No s'ha trobat cap setmana</p>
          <p className="text-xs">
            {hasActiveFilters 
              ? 'Cap setmana coincideix amb els filtres aplicats.' 
              : 'Encara no hi ha cap setmana registrada.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-3 px-3.5 py-1.5 rounded-xl bg-bg-surface border border-border text-xs font-semibold text-text-primary hover:border-brand-500 transition-colors"
            >
              Netejar filtres
            </button>
          )}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted font-bold uppercase text-[11px] bg-bg-surface/50">
                  <th className="py-3 px-4">Setmana (Dilluns - Diumenge)</th>
                  <th className="py-3 px-4 text-center">Estat Actual</th>
                  <th className="py-3 px-4 text-center">Respostes Atletes</th>
                  <th className="py-3 px-4 text-right">Accions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredWeeks.map(w => (
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
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-500" /> Crear Nova Setmana
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWeek} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Data d'Inici (Dilluns)
                </label>
                <input 
                  type="date"
                  required
                  value={newWeekDate}
                  onChange={e => setNewWeekDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-bg-surface text-text-primary text-sm focus:outline-none focus:border-brand-500"
                />
                <p className="text-[11px] text-text-muted mt-1">
                  Recomanat seleccionar sempre el dilluns de la setmana a programar.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-text-secondary hover:bg-bg-hover text-sm font-semibold transition-colors"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary text-sm py-2 px-5 font-semibold flex items-center gap-1.5"
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
