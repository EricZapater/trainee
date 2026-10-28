import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAtletes, getInformeAtleta } from '../api/entrenador'
import { getInformeMe } from '../api/calendar'
import type { InformeResponse } from '../types'
import { 
  FileText, 
  Calendar, 
  User, 
  Clock, 
  Activity, 
  BarChart2, 
  Loader2, 
  AlertTriangle, 
  Sparkles,
  MessageSquare
} from 'lucide-react'

export const InformePage: React.FC = () => {
  const { isEntrenador, isAdmin } = useAuth()
  const [searchParams] = useSearchParams()

  const canSelectAthlete = isEntrenador || isAdmin
  const queryAtletaId = searchParams.get('atletaId')

  const [atletes, setAtletes] = useState<{ id: string; nom: string; cognoms: string; email: string; actiu: boolean }[]>([])
  const [selectedAtletaId, setSelectedAtletaId] = useState<string>(queryAtletaId || '')
  
  // Date range defaults: last 30 days
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]
  })

  const [informe, setInforme] = useState<InformeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load athletes list if coach/admin
  useEffect(() => {
    if (canSelectAthlete) {
      getAtletes()
        .then(data => {
          const active = (data || []).filter(a => a.actiu)
          setAtletes(active)
          // If no queryAtletaId was passed and we have athletes, pick the first one by default
          if (!queryAtletaId && active.length > 0) {
            setSelectedAtletaId(active[0].id)
          }
        })
        .catch(err => {
          console.error(err)
        })
    }
  }, [canSelectAthlete, queryAtletaId])

  // Presets
  const applyPreset = (preset: '30d' | 'this_month' | '90d' | 'year') => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    setEndDate(todayStr)

    if (preset === '30d') {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      setStartDate(d.toISOString().split('T')[0])
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      setStartDate(firstDay.toISOString().split('T')[0])
    } else if (preset === '90d') {
      const d = new Date()
      d.setDate(d.getDate() - 90)
      setStartDate(d.toISOString().split('T')[0])
    } else if (preset === 'year') {
      const firstDay = new Date(now.getFullYear(), 0, 1)
      setStartDate(firstDay.toISOString().split('T')[0])
    }
  }

  // Fetch report
  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      setError('Selecciona les dates d\'inici i de fi.')
      return
    }
    if (canSelectAthlete && !selectedAtletaId) {
      setError('Selecciona un atleta per generar l\'informe.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      let res: InformeResponse
      if (canSelectAthlete) {
        res = await getInformeAtleta(selectedAtletaId, startDate, endDate)
      } else {
        res = await getInformeMe(startDate, endDate)
      }
      setInforme(res)
      setInitialLoaded(true)
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || 'No s\'ha pogut generar l\'informe per al període seleccionat.')
      setInforme(null)
    } finally {
      setLoading(false)
    }
  }

  // Auto-generate report when atletaId is ready or if athlete
  useEffect(() => {
    if (!canSelectAthlete) {
      handleGenerateReport()
    } else if (selectedAtletaId && !initialLoaded) {
      handleGenerateReport()
    }
  }, [selectedAtletaId, canSelectAthlete])

  // KPI calculations
  const totalHours = useMemo(() => {
    if (!informe || !informe.resum_activitats) return 0
    return Number(informe.resum_activitats.reduce((acc, curr) => acc + (curr.total_hores || 0), 0).toFixed(1))
  }, [informe])

  const totalSessions = useMemo(() => {
    if (!informe || !informe.detall_per_dies) return 0
    return informe.detall_per_dies.reduce((acc, dia) => acc + (dia.slots?.length || 0), 0)
  }, [informe])

  const daysInRange = useMemo(() => {
    if (!startDate || !endDate) return 1
    const s = new Date(startDate).getTime()
    const e = new Date(endDate).getTime()
    const diff = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1)
    return diff
  }, [startDate, endDate])

  const averageHoursPerWeek = useMemo(() => {
    const weeks = Math.max(1, daysInRange / 7)
    return (totalHours / weeks).toFixed(1)
  }, [totalHours, daysInRange])

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">Informe d'Entrenament</h1>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Anàlisi de volum horari, distribució per esports i diari de sessions en el període seleccionat.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="glass-card p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/* Athlete Selector (if coach/admin) */}
          {canSelectAthlete && (
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                Atleta
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedAtletaId}
                  onChange={e => setSelectedAtletaId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="">Selecciona un atleta...</option>
                  {atletes.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nom} {a.cognoms}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Start Date */}
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
              Data d'inici
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
              Data de fi
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BarChart2 className="w-4 h-4" />
              )}
              Generar Informe
            </button>
          </div>
        </div>

        {/* Date presets */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border text-xs">
          <span className="text-text-muted text-[11px] font-bold uppercase flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Rangs ràpids:
          </span>
          <button
            onClick={() => applyPreset('30d')}
            className="px-2.5 py-1 rounded-lg bg-bg-surface hover:bg-bg-hover text-text-secondary border border-border font-medium transition-colors"
          >
            Últims 30 dies
          </button>
          <button
            onClick={() => applyPreset('this_month')}
            className="px-2.5 py-1 rounded-lg bg-bg-surface hover:bg-bg-hover text-text-secondary border border-border font-medium transition-colors"
          >
            Aquest mes
          </button>
          <button
            onClick={() => applyPreset('90d')}
            className="px-2.5 py-1 rounded-lg bg-bg-surface hover:bg-bg-hover text-text-secondary border border-border font-medium transition-colors"
          >
            Darrers 3 mesos
          </button>
          <button
            onClick={() => applyPreset('year')}
            className="px-2.5 py-1 rounded-lg bg-bg-surface hover:bg-bg-hover text-text-secondary border border-border font-medium transition-colors"
          >
            Any actual
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Report Content */}
      {loading ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-3" />
          <p className="text-sm font-semibold">Generant l'informe de dades...</p>
        </div>
      ) : !informe ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <FileText className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
          <h3 className="text-base font-bold text-text-primary">Cap informe carregat</h3>
          <p className="text-xs text-text-muted mt-1">
            Selecciona les dates i fes clic a «Generar Informe» per visualitzar les dades.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Athlete Header */}
          <div className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 font-bold flex items-center justify-center">
                {informe.atleta_nom?.charAt(0) || 'A'}
              </div>
              <div>
                <h2 className="text-base font-black text-text-primary">{informe.atleta_nom}</h2>
                <p className="text-xs text-text-muted">
                  Període: {new Date(startDate + 'T00:00:00').toLocaleDateString('ca-ES')} — {new Date(endDate + 'T00:00:00').toLocaleDateString('ca-ES')} ({daysInRange} dies)
                </p>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-4 sm:p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-black">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-text-muted uppercase">Volum Total</p>
                <p className="text-2xl font-black text-text-primary">{totalHours} <span className="text-sm font-normal text-text-muted">hores</span></p>
              </div>
            </div>

            <div className="glass-card p-4 sm:p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-text-muted uppercase">Sessions Totals</p>
                <p className="text-2xl font-black text-text-primary">{totalSessions} <span className="text-sm font-normal text-text-muted">activitats</span></p>
              </div>
            </div>

            <div className="glass-card p-4 sm:p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-text-muted uppercase">Mitjana Setmanal</p>
                <p className="text-2xl font-black text-text-primary">{averageHoursPerWeek} <span className="text-sm font-normal text-text-muted">h/setmana</span></p>
              </div>
            </div>
          </div>

          {/* Activity Breakdown */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-brand-500" />
                Distribució per Activitats
              </h3>
              <span className="text-xs text-text-muted">
                {informe.resum_activitats?.length || 0} disciplines practicades
              </span>
            </div>

            {/* Proportion Bar */}
            {totalHours > 0 && (
              <div className="h-4 w-full rounded-full overflow-hidden flex bg-bg-surface border border-border">
                {informe.resum_activitats.map(act => {
                  const pct = totalHours > 0 ? (act.total_hores / totalHours) * 100 : 0
                  if (pct <= 0) return null
                  return (
                    <div
                      key={act.activitat_nom}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: act.activitat_color || '#e3001b'
                      }}
                      title={`${act.activitat_nom}: ${act.total_hores}h (${pct.toFixed(1)}%)`}
                      className="h-full transition-all hover:opacity-90 cursor-help"
                    />
                  )
                })}
              </div>
            )}

            {/* Activity Cards Grid */}
            {informe.resum_activitats.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">
                No hi ha hores enregistrades en el període seleccionat.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                {informe.resum_activitats.map(act => {
                  const pct = totalHours > 0 ? Math.round((act.total_hores / totalHours) * 100) : 0
                  return (
                    <div
                      key={act.activitat_nom}
                      className="p-3 rounded-xl bg-bg-surface border border-border relative overflow-hidden"
                      style={{ borderTop: `3px solid ${act.activitat_color || '#e3001b'}` }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-text-primary truncate">
                          {act.activitat_nom}
                        </span>
                        <span className="text-[11px] font-black text-text-muted">
                          {pct}%
                        </span>
                      </div>
                      <p className="text-lg font-black text-text-primary leading-tight">
                        {act.total_hores} <span className="text-xs font-normal text-text-muted">h</span>
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Timeline of Daily Sessions */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-base font-black text-text-primary flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Diari de Sessions Realitzades
            </h3>

            {informe.detall_per_dies.length === 0 ? (
              <p className="text-xs text-text-muted py-8 text-center">
                Cap sessió programada en aquest interval de dates.
              </p>
            ) : (
              <div className="space-y-4 pt-1">
                {informe.detall_per_dies.map(dia => {
                  const dateObj = new Date(dia.data + 'T00:00:00')
                  const formattedDate = dateObj.toLocaleDateString('ca-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })

                  if (!dia.slots || dia.slots.length === 0) return null

                  return (
                    <div key={dia.data} className="p-3.5 rounded-xl bg-bg-surface/80 border border-border space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-text-secondary border-b border-border pb-1.5 capitalize">
                        <span>{formattedDate}</span>
                        <span className="text-[11px] text-text-muted">
                          {dia.slots.length} {dia.slots.length === 1 ? 'sessió' : 'sessions'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {dia.slots.map(slot => (
                          <div
                            key={slot.id || `${dia.data}-${slot.ordre}`}
                            className="p-2.5 rounded-xl bg-bg-base border border-border flex items-start gap-2.5"
                            style={{ borderLeft: `3px solid ${slot.activitat_color || '#e3001b'}` }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-text-primary truncate">
                                  {slot.activitat_nom || 'Activitat'}
                                </span>
                                <span className="shrink-0 px-2 py-0.5 rounded-md text-[11px] font-black bg-brand-50 text-brand-600">
                                  {slot.durada_hores >= 4.0 ? '>3' : slot.durada_hores}h
                                </span>
                              </div>
                              {slot.notes && (
                                <p className="text-[11px] text-text-muted mt-1 flex items-start gap-1 line-clamp-2">
                                  <MessageSquare className="w-3 h-3 text-text-muted shrink-0 mt-0.5" />
                                  <span>{slot.notes}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
