import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Layers, 
  Calendar as CalendarIcon, 
  Apple, 
  Flame, 
  Droplet, 
  Zap, 
  ClipboardList, 
  Search, 
  Clock, 
  ArrowRight, 
  ExternalLink, 
  FileDown, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  EyeOff,
  Activity,
  CalendarCheck
} from 'lucide-react'
import { getAtletes, getEntrenadorWeeks, getEntrenadorSubmissions, type ManagedWeekWithCount, type AtletaSubmissionSummary } from '../api/entrenador'
import { getAtletaCompeticionsByEntrenador } from '../api/competicions'
import { getAtletaTestsByEntrenador } from '../api/tests'
import { getNutricioPlans, type NutricioPlanWithDetails } from '../api/nutricio'
import type { Competicio, Test } from '../types'

const DIES_SETMANA = [
  'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'
]

interface NutricioTimelineEvent {
  id: string
  type: 'revision_created' | 'revision_scheduled'
  planId: string
  planTitle: string
  versio: number
  ch?: number
  sodi?: number
  fluid?: number
  dateStr?: string
}

export const TeamPlanningPage: React.FC = () => {
  const navigate = useNavigate()

  // Mode de vista: 'timeline' (per setmanes: curses, tests, nutrició) o 'agregat' (panoràmica d'equip setmanal)
  const [activeTab, setActiveTab] = useState<'timeline' | 'agregat'>('timeline')

  // --- ESTAT DEL TIMELINE DE TEMPORADA ---
  const [atletesList, setAtletesList] = useState<{ id: string; nom: string; cognoms: string; email: string; actiu: boolean }[]>([])
  const [selectedAtletaId, setSelectedAtletaId] = useState<string>('')
  const [atletaStatusFilter, setAtletaStatusFilter] = useState<'actius' | 'inactius' | 'tots'>('actius')
  const [atletaSearchQuery, setAtletaSearchQuery] = useState('')

  // Paràmetres temporals
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    // Per defecte: Dilluns de la setmana en curs
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    return monday.toISOString().split('T')[0]
  })
  const [selectedPeriod, setSelectedPeriod] = useState<number>(6) // mesos
  const [hideDiscarded, setHideDiscarded] = useState<boolean>(false)

  // Dades de l'atleta seleccionat
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [competicions, setCompeticions] = useState<Competicio[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [nutricioPlans, setNutricioPlans] = useState<NutricioPlanWithDetails[]>([])

  // Modals de detall
  const [selectedCompModal, setSelectedCompModal] = useState<Competicio | null>(null)
  const [selectedTestModal, setSelectedTestModal] = useState<Test | null>(null)

  // --- ESTAT DE LA PANORÀMICA AGREGADA ---
  const [weeks, setWeeks] = useState<ManagedWeekWithCount[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string>('')
  const [agregatAtletes, setAgregatAtletes] = useState<AtletaSubmissionSummary[]>([])
  const [loadingAgregat, setLoadingAgregat] = useState(false)
  const [activeDayMobile, setActiveDayMobile] = useState<number>(0)

  // Carrega inicial d'atletes i setmanes
  useEffect(() => {
    loadAtletesData()
    loadWeeksData()
  }, [])

  const loadAtletesData = async () => {
    try {
      const data = await getAtletes()
      setAtletesList(data || [])
      // Seleccionar el primer atleta actiu per defecte si n'hi ha
      const primerActiu = data.find(a => a.actiu)
      if (primerActiu) {
        setSelectedAtletaId(primerActiu.id)
      } else if (data.length > 0) {
        setSelectedAtletaId(data[0].id)
      }
    } catch (err) {
      console.error('Error carregant atletes per planning:', err)
    }
  }

  const loadWeeksData = async () => {
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
      console.error('Error carregant setmanes agregades:', err)
    }
  }

  // Carregar dades de l'atleta seleccionat (Timeline)
  useEffect(() => {
    if (!selectedAtletaId) {
      setCompeticions([])
      setTests([])
      setNutricioPlans([])
      return
    }

    const fetchAthleteData = async () => {
      setLoadingTimeline(true)
      try {
        const [compsData, testsData, plansData] = await Promise.all([
          getAtletaCompeticionsByEntrenador(selectedAtletaId).catch(err => {
            console.error('Error carregant competicions:', err)
            return [] as Competicio[]
          }),
          getAtletaTestsByEntrenador(selectedAtletaId).catch(err => {
            console.error('Error carregant tests:', err)
            return [] as Test[]
          }),
          getNutricioPlans(selectedAtletaId).catch(err => {
            console.error('Error carregant nutrició:', err)
            return [] as NutricioPlanWithDetails[]
          })
        ])
        setCompeticions(compsData || [])
        setTests(testsData || [])
        setNutricioPlans(plansData || [])
      } catch (err) {
        console.error('Error descarregant timeline atleta:', err)
      } finally {
        setLoadingTimeline(false)
      }
    }

    fetchAthleteData()
  }, [selectedAtletaId])

  // Carregar submissions per a la setmana seleccionada (Agregat)
  useEffect(() => {
    if (activeTab === 'agregat' && selectedWeek) {
      const loadSubmissions = async () => {
        setLoadingAgregat(true)
        try {
          const res = await getEntrenadorSubmissions(selectedWeek)
          setAgregatAtletes(res.atletes || [])
        } catch (err) {
          console.error('Error carregant submissions de planning:', err)
        } finally {
          setLoadingAgregat(false)
        }
      }
      loadSubmissions()
    }
  }, [activeTab, selectedWeek])

  // Llista filtrada d'atletes per al selector
  const filteredAtletes = useMemo(() => {
    return atletesList.filter(a => {
      if (atletaStatusFilter === 'actius' && !a.actiu) return false
      if (atletaStatusFilter === 'inactius' && a.actiu) return false
      if (atletaSearchQuery.trim()) {
        const query = atletaSearchQuery.toLowerCase()
        const full = `${a.nom} ${a.cognoms || ''} ${a.email}`.toLowerCase()
        if (!full.includes(query)) return false
      }
      return true
    })
  }, [atletesList, atletaStatusFilter, atletaSearchQuery])

  // Resum de nutrició activa de l'atleta
  const activeNutricioPlan = useMemo(() => {
    if (!nutricioPlans || nutricioPlans.length === 0) return null
    return nutricioPlans.find(p => p.estat === 'actiu') || nutricioPlans[0] || null
  }, [nutricioPlans])

  const activeNutricioRevision = useMemo(() => {
    if (!activeNutricioPlan || !activeNutricioPlan.revisions || activeNutricioPlan.revisions.length === 0) return null
    return activeNutricioPlan.revisions[0]
  }, [activeNutricioPlan])

  const isRevisionOverdue = (dateStr?: string) => {
    if (!dateStr) return false
    const today = new Date().toISOString().split('T')[0]
    return dateStr <= today
  }

  // Generador de columnes de setmanes (W1, W2...)
  const generatedWeeks = useMemo(() => {
    if (!startDateStr) return []
    const result: {
      index: number
      start: Date
      end: Date
      labelWeek: string
      labelDate: string
      isCurrent: boolean
    }[] = []

    const start = new Date(startDateStr + 'T00:00:00')
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    start.setDate(diff)
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setMonth(end.getMonth() + selectedPeriod)

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    let current = new Date(start)
    let weekNum = 1

    while (current < end) {
      const weekStart = new Date(current)
      const weekEnd = new Date(current)
      weekEnd.setDate(weekEnd.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      const labelWeek = `W${weekNum}`
      const labelDate = `${weekStart.getDate().toString().padStart(2, '0')}/${(weekStart.getMonth() + 1).toString().padStart(2, '0')}`
      const isCurrent = now >= weekStart && now <= weekEnd

      result.push({
        index: weekNum,
        start: weekStart,
        end: weekEnd,
        labelWeek,
        labelDate,
        isCurrent
      })

      current.setDate(current.getDate() + 7)
      weekNum++
    }

    return result
  }, [startDateStr, selectedPeriod])

  // Filtrar competicions per rang de setmana
  const getCompeticionsForWeek = (weekStart: Date, weekEnd: Date) => {
    return competicions.filter(comp => {
      if (hideDiscarded && comp.estat === 'descartada') return false
      const cDate = new Date(comp.data + 'T00:00:00')
      return cDate >= weekStart && cDate <= weekEnd
    })
  }

  // Filtrar tests per rang de setmana
  const getTestsForWeek = (weekStart: Date, weekEnd: Date) => {
    return tests.filter(t => {
      const tDate = new Date(t.data_test + 'T00:00:00')
      return tDate >= weekStart && tDate <= weekEnd
    })
  }

  // Filtrar esdeveniments nutricionals per rang de setmana
  const getNutricioEventsForWeek = (weekStart: Date, weekEnd: Date): NutricioTimelineEvent[] => {
    const events: NutricioTimelineEvent[] = []

    nutricioPlans.forEach(plan => {
      if (!plan.revisions) return

      plan.revisions.forEach(rev => {
        // Event 1: Creació de la revisió
        if (rev.created_at) {
          const cDate = new Date(rev.created_at)
          if (cDate >= weekStart && cDate <= weekEnd) {
            events.push({
              id: `created-${rev.id}`,
              type: 'revision_created',
              planId: plan.id,
              planTitle: plan.titol,
              versio: rev.versio,
              ch: rev.objectiu_ch_g_h,
              sodi: rev.objectiu_sodi_mg_h,
              fluid: rev.objectiu_fluid_ml_h
            })
          }
        }

        // Event 2: Propera revisió agendada
        if (rev.data_revisio) {
          const sDate = new Date(rev.data_revisio + 'T12:00:00')
          if (sDate >= weekStart && sDate <= weekEnd) {
            events.push({
              id: `scheduled-${rev.id}`,
              type: 'revision_scheduled',
              planId: plan.id,
              planTitle: plan.titol,
              versio: rev.versio,
              ch: rev.objectiu_ch_g_h,
              sodi: rev.objectiu_sodi_mg_h,
              fluid: rev.objectiu_fluid_ml_h,
              dateStr: rev.data_revisio
            })
          }
        }
      })
    })

    return events
  }

  const formatDisplayDate = (dStr?: string) => {
    if (!dStr) return '-'
    const parts = dStr.split('T')[0].split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dStr
  }

  const getCompBadgeStyle = (comp: Competicio) => {
    if (comp.estat === 'descartada') {
      return 'bg-slate-100 text-slate-500 border-slate-300 line-through dark:bg-slate-800 dark:text-slate-400'
    }
    if (comp.tipus === 'A') {
      return 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'
    }
    if (comp.tipus === 'B') {
      return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800'
    }
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
  }

  const getCompTypePill = (tipus: string, estat?: string) => {
    if (estat === 'descartada') return 'bg-slate-400 text-white'
    if (tipus === 'A') return 'bg-rose-600 text-white'
    if (tipus === 'B') return 'bg-amber-500 text-white'
    return 'bg-emerald-600 text-white'
  }

  // --- MÈTODES PER A LA VISTA AGREGADA ---
  const formatAgregatDate = (dateStr: string, offsetDays: number = 0) => {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    d.setDate(d.getDate() + offsetDays)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
  }

  const getDayPlan = (diaIdx: number) => {
    const list: { athlete: AtletaSubmissionSummary; slot: any }[] = []
    let totalHores = 0
    const activityCounts: { [nom: string]: { count: number; color: string } } = {}

    agregatAtletes.forEach(ath => {
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

  const selectedAtletaObj = atletesList.find(a => a.id === selectedAtletaId)

  return (
    <div className="space-y-6 pb-20">
      {/* Capçalera amb Tabs de Selecció */}
      <div className="glass-card p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
              <CalendarCheck className="w-3.5 h-3.5" /> Planificació Tècnica
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2.5 mt-1">
            <Layers className="w-6 h-6 text-brand-500" />
            Planning & Macrocicles
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Organitza la temporada a llarg termini per setmanes (curses, tests i nutrició) o consulta la panoràmica setmanal d'hores del grup.
          </p>
        </div>

        {/* Switch de pestanyes */}
        <div className="flex items-center p-1 bg-black/5 dark:bg-white/5 rounded-2xl border border-border w-full md:w-auto self-stretch md:self-auto">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'timeline'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            Timeline per Setmanes
          </button>
          <button
            onClick={() => setActiveTab('agregat')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'agregat'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Activity className="w-4 h-4" />
            Panoràmica Setmanal Grup
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TIMELINE DE TEMPORADA PER SETMANES (CURSES, TESTS, NUTRICIÓ)       */}
      {/* ========================================================================= */}
      {activeTab === 'timeline' && (
        <div className="space-y-6 animate-fade-in">
          {/* Llegenda explicativa */}
          <div className="glass-card p-3 sm:p-4 flex items-center justify-between flex-wrap gap-2 text-xs font-semibold">
            <span className="text-text-muted font-medium mr-1 hidden sm:inline">Llegenda:</span>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-600 inline-block shadow-sm"></span>
                <span>Tipus A (Principal)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-sm"></span>
                <span>Tipus B (Secundària)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block shadow-sm"></span>
                <span>Tipus C (Preparació)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block shadow-sm"></span>
                <span>Test Físic</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-teal-600 inline-block shadow-sm"></span>
                <span>Revisió Nutrició</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-500 inline-block shadow-sm"></span>
                <span>Propera Revisió</span>
              </span>
            </div>
          </div>

          {/* Barra de Filtres */}
          <div className="glass-card p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {/* Filtre Estat Atletes */}
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">Estat Atletes</label>
                <div className="flex p-0.5 bg-black/5 dark:bg-white/5 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setAtletaStatusFilter('actius')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      atletaStatusFilter === 'actius' ? 'bg-white shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    Actius
                  </button>
                  <button
                    type="button"
                    onClick={() => setAtletaStatusFilter('inactius')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      atletaStatusFilter === 'inactius' ? 'bg-white shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    Inactius
                  </button>
                  <button
                    type="button"
                    onClick={() => setAtletaStatusFilter('tots')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      atletaStatusFilter === 'tots' ? 'bg-white shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    Tots
                  </button>
                </div>
              </div>

              {/* Selector d'Atleta amb Cerca */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-text-muted">
                    Atleta ({filteredAtletes.length})
                  </label>
                  {atletaSearchQuery && (
                    <button 
                      onClick={() => setAtletaSearchQuery('')}
                      className="text-[10px] text-text-muted hover:text-text-primary"
                    >
                      Netejar
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cercar atleta..."
                      value={atletaSearchQuery}
                      onChange={(e) => setAtletaSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-white border border-border shadow-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <select
                    value={selectedAtletaId}
                    onChange={(e) => setSelectedAtletaId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl bg-white border border-border shadow-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="" disabled>Selecciona un atleta...</option>
                    {filteredAtletes.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nom} {a.cognoms || ''} {!a.actiu ? '(Inactiu)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data d'Inici */}
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">Data d'Inici</label>
                <input
                  type="date"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-white border border-border shadow-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Període en Mesos & Checkbox */}
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">Període</label>
                <div className="flex gap-1.5">
                  {[3, 6, 9, 12].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedPeriod(m)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                        selectedPeriod === m
                          ? 'bg-brand-500 text-white border-brand-600 shadow-sm'
                          : 'bg-white border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                      }`}
                    >
                      {m}M
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Checkbox Amagar Descartades */}
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text-secondary select-none">
                <input
                  type="checkbox"
                  checked={hideDiscarded}
                  onChange={(e) => setHideDiscarded(e.target.checked)}
                  className="rounded text-brand-500 focus:ring-brand-400 w-4 h-4 cursor-pointer"
                />
                <EyeOff className="w-3.5 h-3.5 text-text-muted" />
                <span>Amagar competicions descartades</span>
              </label>

              {selectedAtletaObj && (
                <div className="text-xs text-text-muted flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Atleta actiu: <strong className="text-text-primary">{selectedAtletaObj.nom} {selectedAtletaObj.cognoms}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Banner Resum Nutrició Activa de l'Atleta */}
          {selectedAtletaId && !loadingTimeline && (
            <div className="glass-card p-4 sm:p-5 border-l-4 border-l-amber-500">
              {activeNutricioPlan && activeNutricioRevision ? (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200 shadow-sm">
                      <Apple className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm sm:text-base text-text-primary">
                          {activeNutricioPlan.titol}
                        </h4>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          v{activeNutricioRevision.versio} ACTIVA
                        </span>
                        {activeNutricioPlan.estat !== 'actiu' && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {activeNutricioPlan.estat}
                          </span>
                        )}
                      </div>

                      {/* Valors nutricionals recomanats */}
                      <div className="flex items-center gap-3 text-xs text-text-secondary mt-1.5 flex-wrap">
                        {activeNutricioRevision.objectiu_ch_g_h !== undefined && (
                          <span className="text-amber-700 font-bold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                            <Flame className="w-3.5 h-3.5 text-amber-500" />
                            {activeNutricioRevision.objectiu_ch_g_h} g/h CH
                          </span>
                        )}
                        {activeNutricioRevision.objectiu_sodi_mg_h !== undefined && (
                          <span className="text-purple-700 font-bold flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                            <Zap className="w-3.5 h-3.5 text-purple-500" />
                            {activeNutricioRevision.objectiu_sodi_mg_h} mg/h Sodi
                          </span>
                        )}
                        {activeNutricioRevision.objectiu_fluid_ml_h !== undefined && (
                          <span className="text-blue-700 font-bold flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                            <Droplet className="w-3.5 h-3.5 text-blue-500" />
                            {activeNutricioRevision.objectiu_fluid_ml_h} ml/h Líquids
                          </span>
                        )}
                        {activeNutricioRevision.data_revisio && (
                          <span className={`flex items-center gap-1 font-semibold ${
                            isRevisionOverdue(activeNutricioRevision.data_revisio)
                              ? 'text-rose-600 font-extrabold animate-pulse'
                              : 'text-text-secondary'
                          }`}>
                            <CalendarIcon className="w-3.5 h-3.5" />
                            Propera revisió: {formatDisplayDate(activeNutricioRevision.data_revisio)}
                            {isRevisionOverdue(activeNutricioRevision.data_revisio) && ' (Vencuda!)'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/nutricio?plan_id=${activeNutricioPlan.id}`)}
                    className="self-start md:self-center px-4 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Veure Detall Nutricional</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Apple className="w-6 h-6 text-text-muted" />
                    <div>
                      <p className="font-semibold text-xs sm:text-sm text-text-primary">
                        Aquest atleta no té cap estratègia nutricional registrada.
                      </p>
                      <p className="text-[11px] text-text-muted">
                        Pots crear un pla d'avituallament per a les properes competicions i programar revisions periòdiques.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/nutricio')}
                    className="self-start sm:self-center px-3.5 py-1.5 rounded-xl text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors flex items-center gap-1.5"
                  >
                    <Apple className="w-3.5 h-3.5 text-brand-500" />
                    Crear Pla Nutricional
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Timeline de Setmanes */}
          <div className="glass-card p-4 sm:p-5">
            {loadingTimeline ? (
              <div className="py-16 text-center text-text-muted space-y-2">
                <Clock className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
                <p className="text-sm font-semibold">Carregant el planning de l'atleta...</p>
              </div>
            ) : !selectedAtletaId ? (
              <div className="py-16 text-center text-text-muted space-y-2">
                <User className="w-10 h-10 text-text-muted mx-auto opacity-40" />
                <p className="text-sm font-semibold text-text-primary">Selecciona un atleta</p>
                <p className="text-xs">Tria un esportista del selector superior per veure el seu planning setmanal.</p>
              </div>
            ) : (
              <div className="overflow-x-auto pb-4 custom-scrollbar">
                <div className="inline-flex gap-3 min-w-full">
                  {generatedWeeks.map((week) => {
                    const weekComps = getCompeticionsForWeek(week.start, week.end)
                    const weekTests = getTestsForWeek(week.start, week.end)
                    const weekNutris = getNutricioEventsForWeek(week.start, week.end)
                    const hasItems = weekComps.length > 0 || weekTests.length > 0 || weekNutris.length > 0

                    return (
                      <div
                        key={week.index}
                        className={`w-48 sm:w-56 shrink-0 rounded-2xl border flex flex-col transition-all ${
                          week.isCurrent
                            ? 'bg-blue-50/40 border-blue-400 dark:bg-blue-950/20 shadow-sm'
                            : 'bg-white/60 dark:bg-slate-900/40 border-border'
                        }`}
                      >
                        {/* Capçalera de Setmana */}
                        <div className={`p-2.5 rounded-t-2xl border-b flex items-center justify-between text-xs font-bold ${
                          week.isCurrent
                            ? 'bg-blue-600 text-white border-blue-700'
                            : 'bg-black/5 dark:bg-white/5 border-border text-text-primary'
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <span>{week.labelWeek}</span>
                            {week.isCurrent && (
                              <span className="text-[10px] bg-white text-blue-800 font-extrabold px-1.5 py-0.2 rounded-md">
                                Ara
                              </span>
                            )}
                          </div>
                          <span className={`text-[11px] font-medium ${week.isCurrent ? 'text-blue-100' : 'text-text-muted'}`}>
                            {week.labelDate}
                          </span>
                        </div>

                        {/* Cos de Setmana */}
                        <div className="p-2 space-y-2 flex-1 min-h-[160px]">
                          {/* 1. Competicions */}
                          {weekComps.map(comp => (
                            <div
                              key={comp.id}
                              onClick={() => setSelectedCompModal(comp)}
                              className={`p-2 rounded-xl border text-xs cursor-pointer shadow-xs transition-all hover:scale-[1.02] ${getCompBadgeStyle(comp)}`}
                              title={`Competició: ${comp.nom} (${comp.tipus})`}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${getCompTypePill(comp.tipus, comp.estat)}`}>
                                  {comp.tipus}
                                </span>
                                <span className="text-[10px] text-text-muted">
                                  {formatDisplayDate(comp.data)}
                                </span>
                              </div>
                              <p className="font-bold truncate text-text-primary">{comp.nom}</p>
                              {(comp.kms || comp.desnivell) && (
                                <p className="text-[10px] text-text-muted mt-0.5">
                                  {comp.kms ? `${comp.kms}km ` : ''}{comp.desnivell ? `+${comp.desnivell}m` : ''}
                                </p>
                              )}
                            </div>
                          ))}

                          {/* 2. Proves Físiques & Tests */}
                          {weekTests.map(test => (
                            <div
                              key={test.id}
                              onClick={() => setSelectedTestModal(test)}
                              className="p-2 rounded-xl border bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-200 text-xs cursor-pointer shadow-xs transition-all hover:scale-[1.02]"
                              title={`Test Físic: ${test.titol}`}
                            >
                              <div className="flex items-center gap-1 mb-1 text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                                <Zap className="w-3 h-3 text-indigo-500 fill-indigo-500" />
                                <span>Test Físic</span>
                              </div>
                              <p className="font-bold truncate">{test.titol}</p>
                              <p className="text-[10px] text-indigo-600/80 dark:text-indigo-300/80 mt-0.5">
                                {formatDisplayDate(test.data_test)}
                              </p>
                            </div>
                          ))}

                          {/* 3. Revisions Nutricionals */}
                          {weekNutris.map(nutri => (
                            <div
                              key={nutri.id}
                              onClick={() => navigate(`/nutricio?plan_id=${nutri.planId}`)}
                              className={`p-2 rounded-xl border text-xs cursor-pointer shadow-xs transition-all hover:scale-[1.02] ${
                                nutri.type === 'revision_scheduled'
                                  ? 'bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-200'
                                  : 'bg-teal-50 border-teal-200 text-teal-900 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-200'
                              }`}
                              title={nutri.type === 'revision_scheduled' ? `Propera revisió agendada v${nutri.versio}` : `Revisió v${nutri.versio} aplicada`}
                            >
                              <div className="flex items-center gap-1 mb-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                                <Apple className="w-3 h-3 text-amber-500" />
                                <span>{nutri.type === 'revision_scheduled' ? 'Propera Rev.' : 'Rev. Nutri'}</span>
                                <span className="ml-auto font-black">v{nutri.versio}</span>
                              </div>
                              <p className="text-[11px] font-semibold truncate">{nutri.planTitle}</p>
                              {nutri.ch !== undefined && (
                                <p className="text-[10px] text-text-muted mt-0.5">
                                  {nutri.ch} g/h CH • {nutri.sodi || 0} mg Na
                                </p>
                              )}
                            </div>
                          ))}

                          {/* Buit */}
                          {!hasItems && (
                            <div className="h-full flex items-center justify-center py-8 text-center text-text-muted text-[11px] opacity-40">
                              <span>-</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PANORÀMICA SETMANAL DE GRUP (DISPONIBILITATS DILLUNS-DIUMENGE)      */}
      {/* ========================================================================= */}
      {activeTab === 'agregat' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Selector de Setmana */}
          <div className="glass-card p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Volum Setmanal d'Equip
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Navega entre setmanes per comprovar el volum per dia de tots els esportistes.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
              <button 
                onClick={() => {
                  const idx = weeks.findIndex(w => w.week_start === selectedWeek)
                  if (idx > 0) setSelectedWeek(weeks[idx - 1].week_start)
                }}
                disabled={weeks.findIndex(w => w.week_start === selectedWeek) <= 0}
                className="p-2 rounded-xl bg-white hover:bg-bg-hover text-text-primary border border-border shadow-sm disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="px-3 py-2 text-xs sm:text-sm font-bold rounded-xl bg-white border border-border text-text-primary shadow-sm focus:outline-none"
              >
                {weeks.map(w => (
                  <option key={w.id} value={w.week_start}>
                    Setmana {formatAgregatDate(w.week_start)} - {formatAgregatDate(w.week_start, 6)}
                  </option>
                ))}
              </select>

              <button 
                onClick={() => {
                  const idx = weeks.findIndex(w => w.week_start === selectedWeek)
                  if (idx >= 0 && idx < weeks.length - 1) setSelectedWeek(weeks[idx + 1].week_start)
                }}
                disabled={weeks.findIndex(w => w.week_start === selectedWeek) >= weeks.length - 1}
                className="p-2 rounded-xl bg-white hover:bg-bg-hover text-text-primary border border-border shadow-sm disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loadingAgregat ? (
            <div className="py-16 text-center text-text-muted space-y-2 glass-card">
              <Clock className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-sm font-semibold">Carregant dades de la setmana d'equip...</p>
            </div>
          ) : (
            <>
              {/* Selector de dies per a mòbil */}
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
                        : 'bg-white border-border text-text-secondary hover:bg-bg-hover'
                    }`}
                  >
                    <span>{nomDia.slice(0, 3)}</span>
                    <span className="text-[10px] mt-0.5 opacity-80">{formatAgregatDate(selectedWeek, idx)}</span>
                    <span className={`text-[10px] font-extrabold mt-1 px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-black/5 text-text-primary'}`}>
                      {plan.totalHores}h
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Taula de 7 dies (Escriptori) */}
          <div className="hidden lg:grid grid-cols-7 gap-3">
            {DIES_SETMANA.map((nomDia, idx) => {
              const plan = getDayPlan(idx)

              return (
                <div key={nomDia} className="glass-card flex flex-col border border-border rounded-2xl overflow-hidden">
                  <div className="p-3 bg-black/5 dark:bg-white/5 border-b border-border flex flex-col items-center justify-center">
                    <span className="font-bold text-xs uppercase tracking-wider text-text-primary">{nomDia}</span>
                    <span className="text-[11px] text-text-muted mt-0.5">{formatAgregatDate(selectedWeek, idx)}</span>
                    <div className="mt-2 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full text-xs font-extrabold">
                      {plan.totalHores.toFixed(1)}h totals
                    </div>
                  </div>

                  <div className="p-2 space-y-2 flex-1 min-h-[300px] overflow-y-auto max-h-[550px]">
                    {plan.list.length === 0 ? (
                      <p className="text-center py-10 text-[11px] text-text-muted">Sense activitats</p>
                    ) : (
                      plan.list.map(({ athlete, slot }, i) => (
                        <div 
                          key={i} 
                          className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-border shadow-xs text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-text-primary truncate">{athlete.nom}</span>
                            <span className="font-extrabold text-[11px] px-1.5 py-0.5 rounded bg-black/5 text-text-primary">
                              {slot.durada_hores}h
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0" 
                              style={{ backgroundColor: slot.activitat_color || '#e3001b' }}
                            />
                            <span className="text-text-secondary truncate">{slot.activitat_nom || 'Activitat'}</span>
                          </div>
                          {slot.notes && (
                            <p className="text-[10px] text-text-muted italic truncate">"{slot.notes}"</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Vista Detall Dia (Mòbil) */}
          <div className="block lg:hidden glass-card p-4 rounded-2xl">
            {(() => {
              const plan = getDayPlan(activeDayMobile)
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div>
                      <h4 className="font-bold text-base text-text-primary">
                        {DIES_SETMANA[activeDayMobile]} ({formatAgregatDate(selectedWeek, activeDayMobile)})
                      </h4>
                      <p className="text-xs text-text-muted">{plan.list.length} atletes entrenant</p>
                    </div>
                    <span className="bg-indigo-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-sm">
                      {plan.totalHores.toFixed(1)} hores totals
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {plan.list.length === 0 ? (
                      <p className="text-center py-8 text-xs text-text-muted">Sense activitats programades per aquest dia</p>
                    ) : (
                      plan.list.map(({ athlete, slot }, i) => (
                        <div key={i} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-border shadow-xs flex items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <p className="font-bold text-xs text-text-primary truncate">{athlete.nom} {athlete.cognoms}</p>
                            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: slot.activitat_color || '#e3001b' }} />
                              <span className="truncate">{slot.activitat_nom || 'Activitat'}</span>
                            </div>
                            {slot.notes && (
                              <p className="text-[11px] text-text-muted italic truncate">"{slot.notes}"</p>
                            )}
                          </div>
                          <span className="bg-black/5 dark:bg-white/5 font-extrabold text-xs px-2.5 py-1 rounded-lg text-text-primary shrink-0">
                            {slot.durada_hores}h
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETALL DE LA COMPETICIÓ                                             */}
      {/* ========================================================================= */}
      {selectedCompModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="glass-card bg-bg-surface w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${getCompTypePill(selectedCompModal.tipus, selectedCompModal.estat)}`}>
                  Tipus {selectedCompModal.tipus}
                </span>
                <h3 className="text-lg font-bold text-text-primary mt-1">{selectedCompModal.nom}</h3>
                <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {formatDisplayDate(selectedCompModal.data)}
                </p>
              </div>
              <button
                onClick={() => setSelectedCompModal(null)}
                className="p-1.5 text-text-muted hover:text-text-primary rounded-xl hover:bg-bg-hover"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-2 border-y border-border text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/5 dark:bg-white/5 p-3 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">Distància</span>
                  <span className="font-extrabold text-sm text-text-primary">
                    {selectedCompModal.kms ? `${selectedCompModal.kms} km` : 'No definit'}
                  </span>
                </div>
                <div className="bg-black/5 dark:bg-white/5 p-3 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">Desnivell</span>
                  <span className="font-extrabold text-sm text-text-primary">
                    {selectedCompModal.desnivell ? `+${selectedCompModal.desnivell} m` : 'No definit'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-black/5 dark:bg-white/5">
                <span className="font-semibold text-text-muted">Estat al Calendari:</span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${
                  selectedCompModal.registrat
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {selectedCompModal.registrat ? 'Al calendari de disponibilitat' : 'Pendent de traspassar'}
                </span>
              </div>

              {selectedCompModal.comentaris && (
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5">
                  <span className="text-[10px] uppercase font-bold text-text-muted block mb-1">Comentaris de l'Atleta</span>
                  <p className="text-text-primary italic">"{selectedCompModal.comentaris}"</p>
                </div>
              )}

              {selectedCompModal.enllac && (
                <a
                  href={selectedCompModal.enllac}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-2xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors font-bold"
                >
                  <span className="flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4" /> Web oficial de la cursa
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              )}

              {selectedCompModal.track_gpx_path && (
                <a
                  href={`/api/competicions/${selectedCompModal.id}/track`}
                  download
                  className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors font-bold"
                >
                  <span className="flex items-center gap-1.5">
                    <FileDown className="w-4 h-4" /> Descarregar track GPX
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setSelectedCompModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-black/5 hover:bg-black/10 text-text-primary transition-colors"
              >
                Tancar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETALL DEL TEST FÍSIC                                               */}
      {/* ========================================================================= */}
      {selectedTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="glass-card bg-bg-surface w-full max-w-md rounded-3xl p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Prova Física / Test
                </span>
                <h3 className="text-lg font-bold text-text-primary mt-1">{selectedTestModal.titol}</h3>
                <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {formatDisplayDate(selectedTestModal.data_test)}
                </p>
              </div>
              <button
                onClick={() => setSelectedTestModal(null)}
                className="p-1.5 text-text-muted hover:text-text-primary rounded-xl hover:bg-bg-hover"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-2 border-y border-border text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-black/5 dark:bg-white/5">
                <span className="font-semibold text-text-muted">Estat al Calendari:</span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${
                  selectedTestModal.registrat
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {selectedTestModal.registrat ? 'Al calendari de l\'atleta' : 'Pendent de traspassar'}
                </span>
              </div>

              {selectedTestModal.data_recordatori && (
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-between">
                  <span className="font-semibold text-text-muted">Recordatori per repetir:</span>
                  <span className="font-bold text-text-primary">{formatDisplayDate(selectedTestModal.data_recordatori)}</span>
                </div>
              )}

              {selectedTestModal.comentaris ? (
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5">
                  <span className="text-[10px] uppercase font-bold text-text-muted block mb-1">Observacions & Instruccions</span>
                  <p className="text-text-primary">{selectedTestModal.comentaris}</p>
                </div>
              ) : (
                <p className="text-text-muted text-[11px] italic">Sense comentaris addicionals.</p>
              )}
            </div>

            <div className="flex justify-between items-center gap-2 pt-1">
              <button
                onClick={() => {
                  setSelectedTestModal(null)
                  navigate('/tests')
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1.5"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Anar a Gestió de Tests
              </button>
              <button
                onClick={() => setSelectedTestModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-black/5 hover:bg-black/10 text-text-primary transition-colors"
              >
                Tancar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
