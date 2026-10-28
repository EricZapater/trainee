import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  HeartPulse, 
  Users, 
  Send,
  ExternalLink,
  X,
  Eye
} from 'lucide-react'
import { WellnessDetailModal } from '../components/WellnessDetailModal'
import { 
  getEntrenadorWeeks, 
  getEntrenadorSubmissions, 
  toggleSubmissionGestionat, 
  sendManualReminder, 
  toggleAtletaAbsent,
  getEntrenadorWellnessOverview,
  type ManagedWeekWithCount, 
  type AtletaSubmissionSummary 
} from '../api/entrenador'

const DIES_CURTS = ['Dl', 'Dm', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg']

export const CoachSubmissionsMatrixPage: React.FC = () => {
  const [weeks, setWeeks] = useState<ManagedWeekWithCount[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string>('')
  const [atletes, setAtletes] = useState<AtletaSubmissionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'tots' | 'unplanned' | 'planned' | 'absent'>('tots')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Selected athlete for drawer/modal
  const [selectedAthlete, setSelectedAthlete] = useState<AtletaSubmissionSummary | null>(null)
  
  // Wellness Detail Modal state
  const [wellnessModalAthlete, setWellnessModalAthlete] = useState<AtletaSubmissionSummary | null>(null)
  const [isWellnessModalOpen, setIsWellnessModalOpen] = useState(false)

  useEffect(() => {
    loadWeeks()
  }, [])

  useEffect(() => {
    if (selectedWeek) {
      loadSubmissionsAndWellness(selectedWeek)
    }
  }, [selectedWeek])

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text })
    setTimeout(() => setFeedback(null), 4000)
  }

  const loadWeeks = async () => {
    setLoading(true)
    try {
      const allWeeks = await getEntrenadorWeeks()
      const openWeeks = allWeeks.filter(w => w.estat === 'oberta').sort((a, b) => a.week_start.localeCompare(b.week_start))
      setWeeks(openWeeks.length > 0 ? openWeeks : allWeeks)
      
      if (openWeeks.length > 0) {
        setSelectedWeek(openWeeks[0].week_start)
      } else if (allWeeks.length > 0) {
        setSelectedWeek(allWeeks[0].week_start)
      }
    } catch (err) {
      console.error('Error carregant setmanes:', err)
      showNotification('error', 'Error carregant les setmanes de planificació.')
    } finally {
      setLoading(false)
    }
  }

  const loadSubmissionsAndWellness = async (weekStart: string) => {
    setLoading(true)
    try {
      const [submissionsRes, wellnessRes] = await Promise.all([
        getEntrenadorSubmissions(weekStart),
        getEntrenadorWellnessOverview(weekStart).catch(() => ({ week_start: weekStart, atletes: [] }))
      ])

      const wellnessMap: { [atletaId: string]: any } = {}
      if (wellnessRes.atletes) {
        wellnessRes.atletes.forEach(w => {
          wellnessMap[w.atleta_id] = w
        })
      }

      const mergedAtletes: AtletaSubmissionSummary[] = (submissionsRes.atletes || []).map(ath => {
        const wel = wellnessMap[ath.atleta_id]
        return {
          ...ath,
          wellness: wel ? {
            score: wel.score,
            alerta: wel.alerta,
            ha_respost: wel.ha_respost,
            fatiga: wel.fatiga,
            son_qualitat: wel.son_qualitat,
            dolor_muscular: wel.dolor_muscular,
            estres: wel.estres,
            humor: wel.humor,
            rpe_setmanal: wel.rpe_setmanal,
            zones_dolor: wel.zones_dolor,
            notes: wel.notes,
            submitted_at: wel.submitted_at
          } : undefined
        }
      })

      setAtletes(mergedAtletes)
    } catch (err) {
      console.error('Error carregant submissions:', err)
      showNotification('error', 'No s\'han pogut carregar les disponibilitats de la setmana.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleGestionat = async (athlete: AtletaSubmissionSummary) => {
    if (!athlete.submission_id) return
    const nouEstat = !athlete.gestionat

    // Optimistic update
    setAtletes(prev => prev.map(a => a.atleta_id === athlete.atleta_id ? { ...a, gestionat: nouEstat } : a))

    try {
      await toggleSubmissionGestionat(athlete.submission_id, nouEstat)
      showNotification('success', nouEstat ? `${athlete.nom} marcat com a Gestionat (TrainingPeaks actualitzat)` : `${athlete.nom} desmarcat.`)
    } catch (err) {
      console.error('Error toggle gestionat:', err)
      showNotification('error', 'Error actualitzant estat de gestionat.')
      // Rollback
      setAtletes(prev => prev.map(a => a.atleta_id === athlete.atleta_id ? { ...a, gestionat: !nouEstat } : a))
    }
  }

  const handleSendReminder = async (athlete: AtletaSubmissionSummary) => {
    try {
      await sendManualReminder(athlete.atleta_id, selectedWeek)
      showNotification('success', `Recordatori enviat correctament a ${athlete.nom} (${athlete.email})!`)
      setAtletes(prev => prev.map(a => a.atleta_id === athlete.atleta_id ? {
        ...a,
        reminders_manual: (a.reminders_manual || 0) + 1
      } : a))
    } catch (err: any) {
      console.error('Error enviant recordatori:', err)
      showNotification('error', err.response?.data?.error || 'Error enviant recordatori.')
    }
  }

  const handleToggleAbsent = async (athlete: AtletaSubmissionSummary) => {
    const nouAbsent = !athlete.absent
    try {
      await toggleAtletaAbsent(athlete.atleta_id, selectedWeek, nouAbsent)
      showNotification('success', nouAbsent ? `${athlete.nom} marcat com a absent aquesta setmana.` : `${athlete.nom} marcat com a disponible.`)
      setAtletes(prev => prev.map(a => a.atleta_id === athlete.atleta_id ? { ...a, absent: nouAbsent } : a))
    } catch (err) {
      console.error('Error canviant absència:', err)
      showNotification('error', 'Error canviant absència.')
    }
  }

  // Calculate stats
  const totalAtletes = atletes.length
  const atletesResposts = atletes.filter(a => a.ha_respost).length
  const atletesGestionats = atletes.filter(a => a.gestionat).length
  const atletesPendentsPlanificar = atletes.filter(a => a.ha_respost && !a.gestionat).length

  // Filters
  const filteredAtletes = atletes.filter(a => {
    const matchesSearch = 
      a.nom.toLowerCase().includes(search.toLowerCase()) ||
      (a.cognoms && a.cognoms.toLowerCase().includes(search.toLowerCase())) ||
      a.email.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false

    if (statusFilter === 'unplanned') return a.ha_respost && !a.gestionat
    if (statusFilter === 'planned') return a.gestionat
    if (statusFilter === 'absent') return a.absent
    return true
  })

  const formatDate = (dateStr: string, offsetDays: number = 0) => {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    d.setDate(d.getDate() + offsetDays)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
  }

  const getDaySlots = (slots: AtletaSubmissionSummary['slots'], dia: number) => {
    return (slots || []).filter(s => s.dia === dia)
  }

  const getTotalHours = (slots: AtletaSubmissionSummary['slots']) => {
    return (slots || []).reduce((acc, s) => acc + (s.durada_hores || 0), 0)
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

      {/* Header & Week Selector */}
      <div className="glass-card p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Panell d'Entrenador
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2.5 mt-1">
            <Calendar className="w-6 h-6 text-brand-500" /> Matriu de Disponibilitats i Gestió
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Supervisa la disponibilitat de tots els atletes, revisa el semàfor de Wellness i marca les setmanes gestionades.
          </p>
        </div>

        {/* Week Selector Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <button 
            onClick={() => {
              const idx = weeks.findIndex(w => w.week_start === selectedWeek)
              if (idx > 0) setSelectedWeek(weeks[idx - 1].week_start)
            }}
            disabled={weeks.findIndex(w => w.week_start === selectedWeek) <= 0}
            className="p-2 rounded-xl bg-white/70 hover:bg-white text-text-primary border border-border-light shadow-sm disabled:opacity-40 transition-colors"
            title="Setmana anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm font-bold rounded-xl bg-white border border-border-light text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
          >
            {weeks.map(w => (
              <option key={w.id} value={w.week_start}>
                Setmana {formatDate(w.week_start)} - {formatDate(w.week_start, 6)} ({w.estat})
              </option>
            ))}
          </select>

          <button 
            onClick={() => {
              const idx = weeks.findIndex(w => w.week_start === selectedWeek)
              if (idx >= 0 && idx < weeks.length - 1) setSelectedWeek(weeks[idx + 1].week_start)
            }}
            disabled={weeks.findIndex(w => w.week_start === selectedWeek) >= weeks.length - 1}
            className="p-2 rounded-xl bg-white/70 hover:bg-white text-text-primary border border-border-light shadow-sm disabled:opacity-40 transition-colors"
            title="Setmana següent"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <Link
            to="/weeks"
            className="btn-primary text-xs py-2 px-3 shrink-0 ml-1 flex items-center gap-1.5"
            title="Gestionar totes les setmanes"
          >
            <Clock className="w-4 h-4" /> <span className="hidden sm:inline">Setmanes</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card p-4 text-center space-y-1">
          <span className="text-xs font-semibold text-text-muted">Total Atletes</span>
          <p className="text-2xl font-extrabold text-text-primary">{totalAtletes}</p>
        </div>
        <div className="glass-card p-4 text-center space-y-1 border-b-2 border-b-blue-500">
          <span className="text-xs font-semibold text-text-muted">Respostes Rebudes</span>
          <p className="text-2xl font-extrabold text-blue-600">{atletesResposts} / {totalAtletes}</p>
        </div>
        <div className="glass-card p-4 text-center space-y-1 border-b-2 border-b-amber-500">
          <span className="text-xs font-semibold text-text-muted">Pendents Planificar</span>
          <p className="text-2xl font-extrabold text-amber-600">{atletesPendentsPlanificar}</p>
        </div>
        <div className="glass-card p-4 text-center space-y-1 border-b-2 border-b-emerald-500">
          <span className="text-xs font-semibold text-text-muted">Gestionats a TP</span>
          <p className="text-2xl font-extrabold text-emerald-600">{atletesGestionats}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cerca atleta per nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl bg-white/80 border border-border-light focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('tots')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
              statusFilter === 'tots' ? 'bg-brand-500 text-white shadow-sm' : 'bg-white/60 text-text-secondary hover:text-text-primary'
            }`}
          >
            Tots ({atletes.length})
          </button>
          <button
            onClick={() => setStatusFilter('unplanned')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
              statusFilter === 'unplanned' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white/60 text-text-secondary hover:text-text-primary'
            }`}
          >
            Per Planificar ({atletesPendentsPlanificar})
          </button>
          <button
            onClick={() => setStatusFilter('planned')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
              statusFilter === 'planned' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white/60 text-text-secondary hover:text-text-primary'
            }`}
          >
            Gestionats ({atletesGestionats})
          </button>
          <button
            onClick={() => setStatusFilter('absent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
              statusFilter === 'absent' ? 'bg-slate-700 text-white shadow-sm' : 'bg-white/60 text-text-secondary hover:text-text-primary'
            }`}
          >
            Absents ({atletes.filter(a => a.absent).length})
          </button>
        </div>
      </div>

      {/* Main Submissions Matrix */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-text-muted text-sm font-medium">Carregant matriu de disponibilitat...</p>
        </div>
      ) : filteredAtletes.length === 0 ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-sm">Cap atleta coincideix amb els criteris de cerca.</p>
        </div>
      ) : (
        <>
          {/* ============================================================ */}
          {/* DESKTOP MATRIX TABLE (>= 768px)                              */}
          {/* ============================================================ */}
          <div className="hidden lg:block glass-card overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-light text-text-muted font-bold uppercase text-[11px] bg-bg-surface/50">
                  <th className="py-3 px-3 w-48">Atleta</th>
                  <th className="py-3 px-2 text-center w-20">Estat</th>
                  <th className="py-3 px-2 text-center w-24">Wellness</th>
                  {DIES_CURTS.map((diaNom, idx) => (
                    <th key={diaNom} className="py-3 px-1 text-center w-28">
                      <div>{diaNom}</div>
                      <div className="text-[10px] text-text-muted font-normal">{formatDate(selectedWeek, idx)}</div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center w-24">Gestionat</th>
                  <th className="py-3 px-2 text-right w-16">Acció</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {filteredAtletes.map(ath => {
                  const totalHores = getTotalHours(ath.slots)
                  const isGestionat = ath.gestionat

                  return (
                    <tr 
                      key={ath.atleta_id} 
                      className={`transition-colors hover:bg-bg-hover/60 ${
                        isGestionat ? 'bg-emerald-50/20' : ath.absent ? 'bg-slate-50 opacity-60' : ''
                      }`}
                    >
                      {/* Athlete info */}
                      <td className="py-3 px-3">
                        <div 
                          onClick={() => setSelectedAthlete(ath)}
                          className="font-bold text-text-primary hover:text-brand-600 cursor-pointer flex items-center gap-2"
                        >
                          <div className="w-7 h-7 rounded-full bg-brand-50 text-brand-600 font-bold text-xs flex items-center justify-center shrink-0 border border-brand-200">
                            {ath.nom.charAt(0)}
                          </div>
                          <div>
                            <div className="truncate max-w-[120px]">{ath.nom} {ath.cognoms}</div>
                            <div className="text-[10px] text-text-muted font-normal">
                              Total: <strong className="text-brand-600">{totalHores}h</strong>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Submission Status */}
                      <td className="py-3 px-2 text-center">
                        {ath.absent ? (
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Absent</span>
                        ) : ath.ha_respost ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ath.estat === 'completada' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ath.estat === 'completada' ? 'Enviat' : 'Esborrany'}
                          </span>
                        ) : (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Pendent</span>
                        )}
                      </td>

                      {/* Wellness Semaphore Column */}
                      <td className="py-3 px-2 text-center">
                        {ath.wellness?.ha_respost ? (
                          <button
                            type="button"
                            onClick={() => {
                              setWellnessModalAthlete(ath)
                              setIsWellnessModalOpen(true)
                            }}
                            title={`Wellness: ${ath.wellness.score || 0}/25. RPE: ${ath.wellness.rpe_setmanal || 0}/10. Zones: ${ath.wellness.zones_dolor?.join(', ') || 'Cap'} — Clica per obrir el detall complet`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all hover:scale-105 shadow-2xs cursor-pointer"
                            style={{
                              backgroundColor: ath.wellness.alerta === 'vermell' ? '#fee2e2' : ath.wellness.alerta === 'groc' ? '#fef3c7' : '#d1fae5',
                              borderColor: ath.wellness.alerta === 'vermell' ? '#fca5a5' : ath.wellness.alerta === 'groc' ? '#fde047' : '#86efac',
                              color: ath.wellness.alerta === 'vermell' ? '#991b1b' : ath.wellness.alerta === 'groc' ? '#854d0e' : '#065f46',
                            }}
                          >
                            <span className={`w-2 h-2 rounded-full ${
                              ath.wellness.alerta === 'vermell' ? 'bg-rose-600 animate-pulse' : ath.wellness.alerta === 'groc' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                            <span>{ath.wellness.alerta === 'vermell' ? 'Risc Alt' : ath.wellness.alerta === 'groc' ? 'Alerta' : 'Òptim'}</span>
                            <Eye className="w-3 h-3 opacity-60 ml-0.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setWellnessModalAthlete(ath)
                              setIsWellnessModalOpen(true)
                            }}
                            title="Aquest atleta encara no ha enviat el check-in de wellness"
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            <span>Pendent</span>
                          </button>
                        )}
                      </td>

                      {/* 7 Days Columns */}
                      {DIES_CURTS.map((_, diaIdx) => {
                        const daySlots = getDaySlots(ath.slots, diaIdx)

                        return (
                          <td key={diaIdx} className="py-2 px-1 text-center align-top">
                            {daySlots.length === 0 ? (
                              <span className="text-[11px] text-slate-300">-</span>
                            ) : (
                              <div className="space-y-1">
                                {daySlots.map((slot, sIdx) => (
                                  <div 
                                    key={sIdx}
                                    title={`${slot.activitat_nom} (${slot.durada_hores}h)${slot.notes ? ': ' + slot.notes : ''}`}
                                    className="p-1 rounded-lg text-[10px] font-bold border truncate max-w-[100px] mx-auto text-left flex items-center gap-1 shadow-2xs"
                                    style={{
                                      backgroundColor: `${slot.activitat_color || '#e3001b'}15`,
                                      borderColor: `${slot.activitat_color || '#e3001b'}40`,
                                      color: slot.activitat_color || '#1e293b'
                                    }}
                                  >
                                    <span 
                                      className="w-1.5 h-1.5 rounded-full shrink-0" 
                                      style={{ backgroundColor: slot.activitat_color || '#e3001b' }}
                                    />
                                    <span className="truncate">{slot.durada_hores}h {slot.activitat_nom}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        )
                      })}

                      {/* Gestionat Checkbox Toggle */}
                      <td className="py-3 px-3 text-center">
                        {ath.ha_respost ? (
                          <button
                            onClick={() => handleToggleGestionat(ath)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 mx-auto transition-all shadow-sm ${
                              isGestionat
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-white border border-border-light text-text-muted hover:text-emerald-700 hover:border-emerald-300'
                            }`}
                          >
                            <CheckCircle2 className={`w-3.5 h-3.5 ${isGestionat ? 'text-white' : 'text-slate-400'}`} />
                            <span>{isGestionat ? 'Fet' : 'Pendent'}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-text-muted italic">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!ath.ha_respost && !ath.absent && (
                            <button
                              onClick={() => handleSendReminder(ath)}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                              title="Enviar recordatori de disponibilitat"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedAthlete(ath)}
                            className="p-1.5 rounded-lg bg-bg-surface hover:bg-white text-text-muted hover:text-text-primary transition-colors"
                            title="Veure detall complet"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ============================================================ */}
          {/* MOBILE RESPONSIVE CARDS VIEW (< 1024px)                      */}
          {/* ============================================================ */}
          <div className="block lg:hidden space-y-3">
            {filteredAtletes.map(ath => {
              const totalHores = getTotalHours(ath.slots)
              const isGestionat = ath.gestionat

              return (
                <div 
                  key={ath.atleta_id}
                  className={`glass-card p-4 space-y-3 border transition-all ${
                    isGestionat ? 'border-emerald-300 bg-emerald-50/10' : 'border-border-light'
                  }`}
                >
                  {/* Athlete Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-600 font-bold text-sm flex items-center justify-center shrink-0 border border-brand-200">
                        {ath.nom.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-text-primary">{ath.nom} {ath.cognoms}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-brand-600 font-semibold">{totalHores}h totals</span>
                          {ath.absent ? (
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Absent</span>
                          ) : ath.ha_respost ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              ath.estat === 'completada' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {ath.estat === 'completada' ? 'Enviat' : 'Esborrany'}
                            </span>
                          ) : (
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Pendent</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Wellness Badge */}
                    {ath.wellness?.ha_respost ? (
                      <button
                        type="button"
                        onClick={() => {
                          setWellnessModalAthlete(ath)
                          setIsWellnessModalOpen(true)
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 transition-transform active:scale-95 ${
                          ath.wellness.alerta === 'vermell' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          ath.wellness.alerta === 'groc' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        <HeartPulse className="w-3 h-3" />
                        Wellness: {ath.wellness.alerta === 'vermell' ? 'Risc Alt' : ath.wellness.alerta === 'groc' ? 'Alerta' : 'Òptim'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setWellnessModalAthlete(ath)
                          setIsWellnessModalOpen(true)
                        }}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-500 border-slate-200 flex items-center gap-1"
                      >
                        <HeartPulse className="w-3 h-3 text-slate-400" /> Wellness: Pendent
                      </button>
                    )}
                  </div>

                  {/* 7 Days Preview Pills */}
                  <div className="grid grid-cols-7 gap-1 pt-1">
                    {DIES_CURTS.map((diaNom, diaIdx) => {
                      const daySlots = getDaySlots(ath.slots, diaIdx)
                      const hasSlots = daySlots.length > 0

                      return (
                        <div 
                          key={diaNom}
                          className={`p-1 text-center rounded-lg border text-[10px] ${
                            hasSlots ? 'bg-brand-50 border-brand-200 text-brand-800 font-bold' : 'bg-bg-surface/50 border-border-light text-slate-400'
                          }`}
                        >
                          <div>{diaNom}</div>
                          <div>{hasSlots ? `${daySlots.reduce((a, b) => a + (b.durada_hores || 0), 0)}h` : '-'}</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Notes summary if any */}
                  {ath.notes_setmana && (
                    <p className="text-xs text-text-muted bg-white/60 p-2 rounded-lg italic">
                      "{ath.notes_setmana}"
                    </p>
                  )}

                  {/* Mobile Actions Bar */}
                  <div className="pt-2 border-t border-border-light flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleToggleAbsent(ath)}
                      className="text-xs text-text-muted hover:text-slate-700 font-medium"
                    >
                      {ath.absent ? 'Desmarcar absent' : 'Marcar absent'}
                    </button>

                    <div className="flex items-center gap-2">
                      {!ath.ha_respost && !ath.absent && (
                        <button
                          onClick={() => handleSendReminder(ath)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" /> Recordar
                        </button>
                      )}

                      {ath.ha_respost && (
                        <button
                          onClick={() => handleToggleGestionat(ath)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm ${
                            isGestionat 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-white border border-border-light text-text-primary'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isGestionat ? 'Gestionat' : 'Marcar Gestionat'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedAthlete(ath)}
                        className="p-1.5 rounded-xl bg-bg-surface border border-border-light text-text-secondary"
                        title="Detalls"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Drawer / Modal: Athlete Full Week Details */}
      {selectedAthlete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card bg-white p-5 sm:p-7 rounded-2xl max-w-xl w-full shadow-2xl space-y-4 my-8 animate-scale-up">
            <div className="flex items-start justify-between pb-3 border-b border-border-light">
              <div>
                <h3 className="font-bold text-lg text-text-primary">
                  {selectedAthlete.nom} {selectedAthlete.cognoms}
                </h3>
                <p className="text-xs text-text-muted">{selectedAthlete.email}</p>
              </div>
              <button 
                onClick={() => setSelectedAthlete(null)}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Wellness Details in Modal */}
            {selectedAthlete.wellness && (
              <div className={`p-4 rounded-xl border space-y-2.5 text-xs ${
                !selectedAthlete.wellness.ha_respost
                  ? 'bg-slate-50 border-slate-200'
                  : selectedAthlete.wellness.alerta === 'vermell'
                  ? 'bg-rose-50 border-rose-200'
                  : selectedAthlete.wellness.alerta === 'groc'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-text-primary">
                    <HeartPulse className={`w-4 h-4 ${
                      !selectedAthlete.wellness.ha_respost
                        ? 'text-slate-400'
                        : selectedAthlete.wellness.alerta === 'vermell'
                        ? 'text-rose-600'
                        : selectedAthlete.wellness.alerta === 'groc'
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`} />
                    Wellness: {!selectedAthlete.wellness.ha_respost 
                      ? 'PENDENT' 
                      : selectedAthlete.wellness.alerta === 'vermell' 
                      ? 'RISC ALT' 
                      : selectedAthlete.wellness.alerta === 'groc' 
                      ? 'ALERTA / MODERAT' 
                      : 'ÒPTIM'}
                  </span>
                  {selectedAthlete.wellness.ha_respost && (
                    <span className="font-extrabold text-text-primary">
                      RPE: {selectedAthlete.wellness.rpe_setmanal || '-'}/10
                    </span>
                  )}
                </div>

                {selectedAthlete.wellness.ha_respost && selectedAthlete.wellness.zones_dolor && selectedAthlete.wellness.zones_dolor.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-text-muted font-medium mr-1">Zones molestes:</span>
                    {selectedAthlete.wellness.zones_dolor.map((z: string, i: number) => (
                      <span key={i} className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        {z}
                      </span>
                    ))}
                  </div>
                )}

                {selectedAthlete.wellness.ha_respost && selectedAthlete.wellness.notes && (
                  <p className="italic text-text-secondary pt-1 border-t border-border/60">
                    "{selectedAthlete.wellness.notes}"
                  </p>
                )}

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setWellnessModalAthlete(selectedAthlete)
                      setIsWellnessModalOpen(true)
                    }}
                    className="text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-white/80 hover:bg-white px-2.5 py-1 rounded-lg border border-brand-200 shadow-2xs flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Veure Check Hooper & Foster Complet
                  </button>
                </div>
              </div>
            )}

            {/* Daily Schedule */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-text-muted">Horari Setmanal</h4>
              <div className="space-y-1.5">
                {DIES_CURTS.map((diaNom, diaIdx) => {
                  const daySlots = getDaySlots(selectedAthlete.slots, diaIdx)

                  return (
                    <div key={diaNom} className="p-2.5 rounded-xl bg-bg-surface flex items-start justify-between gap-3 text-xs">
                      <span className="font-bold text-text-primary w-12 shrink-0">{diaNom} {formatDate(selectedWeek, diaIdx)}</span>
                      <div className="flex-1 space-y-1">
                        {daySlots.length === 0 ? (
                          <span className="text-text-muted italic">Sense activitat</span>
                        ) : (
                          daySlots.map((s, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="font-bold" style={{ color: s.activitat_color || '#e3001b' }}>
                                {s.durada_hores}h {s.activitat_nom}
                              </span>
                              {s.notes && <span className="text-text-muted italic text-[11px]">- {s.notes}</span>}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* General Athlete Notes */}
            {selectedAthlete.notes_setmana && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-text-primary">Notes generals de l'atleta:</span>
                <p className="italic text-slate-700">"{selectedAthlete.notes_setmana}"</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-border-light">
              <button
                onClick={() => handleToggleGestionat(selectedAthlete)}
                className={`btn-primary text-xs py-2 px-4 flex items-center gap-1.5 ${
                  selectedAthlete.gestionat ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {selectedAthlete.gestionat ? 'Marcat com a Gestionat' : 'Marcar Gestionat a TrainingPeaks'}
              </button>

              <button
                onClick={() => setSelectedAthlete(null)}
                className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary rounded-xl"
              >
                Tancar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Dedicated Wellness Detail Modal */}
      <WellnessDetailModal
        isOpen={isWellnessModalOpen}
        onClose={() => {
          setIsWellnessModalOpen(false)
          setWellnessModalAthlete(null)
        }}
        atletaNom={wellnessModalAthlete ? `${wellnessModalAthlete.nom} ${wellnessModalAthlete.cognoms || ''}`.trim() : ''}
        weekStart={selectedWeek}
        wellness={wellnessModalAthlete?.wellness}
      />
    </div>
  )
}
