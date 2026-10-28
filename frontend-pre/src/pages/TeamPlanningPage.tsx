import React, { useState, useEffect } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Layers
} from 'lucide-react'
import { getEntrenadorWeeks, getEntrenadorSubmissions, type ManagedWeekWithCount, type AtletaSubmissionSummary } from '../api/entrenador'

const DIES_SETMANA = [
  'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'
]

export const TeamPlanningPage: React.FC = () => {
  const [weeks, setWeeks] = useState<ManagedWeekWithCount[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string>('')
  const [atletes, setAtletes] = useState<AtletaSubmissionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDayMobile, setActiveDayMobile] = useState<number>(0)

  useEffect(() => {
    loadWeeks()
  }, [])

  useEffect(() => {
    if (selectedWeek) {
      loadSubmissions(selectedWeek)
    }
  }, [selectedWeek])

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
    } finally {
      setLoading(false)
    }
  }

  const loadSubmissions = async (weekStart: string) => {
    setLoading(true)
    try {
      const res = await getEntrenadorSubmissions(weekStart)
      setAtletes(res.atletes || [])
    } catch (err) {
      console.error('Error carregant submissions de planning:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string, offsetDays: number = 0) => {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    d.setDate(d.getDate() + offsetDays)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
  }

  // Aggregate stats per day
  const getDayPlan = (diaIdx: number) => {
    const list: { athlete: AtletaSubmissionSummary; slot: any }[] = []
    let totalHores = 0
    const activityCounts: { [nom: string]: { count: number; color: string } } = {}

    atletes.forEach(ath => {
      if (ath.slots) {
        ath.slots.filter(s => s.dia === diaIdx).forEach(s => {
          list.push({ athlete: ath, slot: s })
          totalHores += (s.durada_hores || 0)
          const nom = s.activitat_nom || 'Activitat'
          if (!activityCounts[nom]) {
            activityCounts[nom] = { count: 0, color: s.activitat_color || '#e3001b' }
          }
          activityCounts[nom].count++
        })
      }
    })

    return { list, totalHores, activityCounts }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="glass-card p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              Vista Panoràmica
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2.5 mt-1">
            <Layers className="w-6 h-6 text-indigo-600" />
            Planning d'Equip Agregat
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Observa el volum d'activitats de tot el grup per dia per detectar dies de màxima càrrega o sortides conjuntes.
          </p>
        </div>

        {/* Week Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <button 
            onClick={() => {
              const idx = weeks.findIndex(w => w.week_start === selectedWeek)
              if (idx > 0) setSelectedWeek(weeks[idx - 1].week_start)
            }}
            disabled={weeks.findIndex(w => w.week_start === selectedWeek) <= 0}
            className="p-2 rounded-xl bg-white/70 hover:bg-white text-text-primary border border-border-light shadow-sm disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm font-bold rounded-xl bg-white border border-border-light text-text-primary shadow-sm focus:outline-none"
          >
            {weeks.map(w => (
              <option key={w.id} value={w.week_start}>
                Setmana {formatDate(w.week_start)} - {formatDate(w.week_start, 6)}
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
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Day Selector Tabs (< 1024px) */}
      <div className="block lg:hidden overflow-x-auto pb-1">
        <div className="flex gap-1.5 w-max">
          {DIES_SETMANA.map((nomDia, idx) => {
            const plan = getDayPlan(idx)
            const isSelected = activeDayMobile === idx

            return (
              <button
                key={nomDia}
                onClick={() => setActiveDayMobile(idx)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center min-w-[70px] border ${
                  isSelected 
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm scale-105' 
                    : 'bg-white/70 text-text-secondary border-border-light'
                }`}
              >
                <span>{nomDia.substring(0, 3)}</span>
                <span className="text-[10px] opacity-80">{formatDate(selectedWeek, idx)}</span>
                <span className="text-[10px] mt-1 font-extrabold">{plan.totalHores}h</span>
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-text-muted text-sm font-medium">Carregant planning d'equip...</p>
        </div>
      ) : (
        <>
          {/* Mobile Single Day Expanded View (< 1024px) */}
          <div className="block lg:hidden">
            {(() => {
              const plan = getDayPlan(activeDayMobile)

              return (
                <div className="glass-card p-4 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border-light">
                    <div>
                      <h3 className="font-bold text-base text-text-primary">
                        {DIES_SETMANA[activeDayMobile]} ({formatDate(selectedWeek, activeDayMobile)})
                      </h3>
                      <p className="text-xs text-text-muted">{plan.list.length} sessions programades</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-extrabold text-indigo-700">{plan.totalHores}h</span>
                      <p className="text-[10px] text-text-muted">volum total</p>
                    </div>
                  </div>

                  {/* Activity tags breakdown */}
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(plan.activityCounts).map(([nom, data]) => (
                      <span 
                        key={nom}
                        className="px-2 py-0.5 rounded-lg text-xs font-bold border"
                        style={{
                          backgroundColor: `${data.color}15`,
                          borderColor: `${data.color}40`,
                          color: data.color
                        }}
                      >
                        {data.count}x {nom}
                      </span>
                    ))}
                  </div>

                  {/* Athletes List */}
                  <div className="space-y-2 pt-2">
                    {plan.list.length === 0 ? (
                      <p className="text-xs text-text-muted italic py-3">Cap atleta té entrenament aquest dia.</p>
                    ) : (
                      plan.list.map((item, i) => (
                        <div key={i} className="p-3 rounded-xl bg-white shadow-2xs border border-border-light flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-text-primary">
                            {item.athlete.nom} {item.athlete.cognoms}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="font-bold px-2 py-0.5 rounded-md"
                              style={{
                                backgroundColor: `${item.slot.activitat_color || '#e3001b'}15`,
                                color: item.slot.activitat_color || '#1e293b'
                              }}
                            >
                              {item.slot.durada_hores}h {item.slot.activitat_nom}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Desktop 7-Column Grid (>= 1024px) */}
          <div className="hidden lg:grid grid-cols-7 gap-3">
            {DIES_SETMANA.map((nomDia, diaIdx) => {
              const plan = getDayPlan(diaIdx)

              return (
                <div 
                  key={nomDia}
                  className="glass-card p-3 flex flex-col justify-between min-h-[420px] border border-border-light space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-border-light">
                      <div>
                        <span className="font-bold text-xs text-text-primary">{nomDia.substring(0, 3)}</span>
                        <span className="text-[10px] text-text-muted ml-1">{formatDate(selectedWeek, diaIdx)}</span>
                      </div>
                      <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {plan.totalHores}h
                      </span>
                    </div>

                    {/* Activity summary pill badges */}
                    <div className="flex flex-wrap gap-1 my-2">
                      {Object.entries(plan.activityCounts).map(([nom, data]) => (
                        <span 
                          key={nom}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            backgroundColor: `${data.color}20`,
                            color: data.color
                          }}
                        >
                          {data.count} {nom.substring(0, 4)}
                        </span>
                      ))}
                    </div>

                    {/* Athletes list */}
                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {plan.list.length === 0 ? (
                        <p className="text-[11px] text-text-muted italic py-4 text-center">-</p>
                      ) : (
                        plan.list.map((item, i) => (
                          <div 
                            key={i}
                            className="p-1.5 rounded-lg bg-white border border-border-light text-[11px] space-y-0.5 shadow-2xs"
                          >
                            <div className="font-bold text-text-primary truncate">{item.athlete.nom}</div>
                            <div 
                              className="font-semibold text-[10px] truncate"
                              style={{ color: item.slot.activitat_color || '#e3001b' }}
                            >
                              {item.slot.durada_hores}h {item.slot.activitat_nom}
                            </div>
                            {item.slot.notes && (
                              <div className="text-[9px] text-text-muted italic truncate">"{item.slot.notes}"</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border-light text-[10px] text-text-muted text-center font-medium">
                    {plan.list.length} atletes actius
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
