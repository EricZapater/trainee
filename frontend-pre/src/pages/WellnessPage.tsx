import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import { getOpenWeeks } from '../api/calendar'
import type { Week } from '../types'
import { 
  HeartPulse, 
  Moon, 
  Zap, 
  Activity, 
  Smile, 
  Flame, 
  AlertTriangle, 
  CheckCircle2, 
  Save, 
  Users,
  Calendar
} from 'lucide-react'

const ZONES_MOLESTIA = [
  'Bessons / Sòleus',
  'Tendó d\'Aquil·les',
  'Faixa plantar',
  'Genoll / Ròtula',
  'Cintilla iliotibial',
  'Isquiotibials',
  'Quàdriceps',
  'Maluc / Psoas',
  'Lumbars',
  'Turmell'
]

export const WellnessPage: React.FC = () => {
  const { isEntrenador, isAdmin, user } = useAuth()
  const canSeeTeamOverview = isEntrenador || isAdmin

  // Active view: admin and athletes default to their personal check-in
  const [activeTab, setActiveTab] = useState<'my_checkin' | 'team_overview'>(
    user?.rol === 'entrenador' ? 'team_overview' : 'my_checkin'
  )

  // Weeks state
  const [weeks, setWeeks] = useState<Week[]>([])
  const [currentWeekStart, setCurrentWeekStart] = useState<string>('')

  // Form states for Athlete (Hooper & Foster protocol 1-5)
  const [fatiga, setFatiga] = useState<number>(2)
  const [son, setSon] = useState<number>(4)
  const [dolor, setDolor] = useState<number>(2)
  const [estres, setEstres] = useState<number>(2)
  const [humor, setHumor] = useState<number>(4)
  const [rpe, setRpe] = useState<number>(6)
  const [selectedZones, setSelectedZones] = useState<string[]>([])
  const [notes, setNotes] = useState<string>('')
  
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  // Coach state: athletes wellness overview
  const [athletesWellness, setAthletesWellness] = useState<any[]>([])

  useEffect(() => {
    loadWeeksAndData()
  }, [])

  useEffect(() => {
    if (!currentWeekStart) return
    if (activeTab === 'my_checkin') {
      loadMyWellness(currentWeekStart)
    } else {
      loadCoachData(currentWeekStart)
    }
  }, [currentWeekStart, activeTab])

  const loadWeeksAndData = async () => {
    setIsLoading(true)
    try {
      const openWeeks = await getOpenWeeks()
      setWeeks(openWeeks)
      if (openWeeks.length > 0) {
        const defaultWeek = openWeeks.find(w => w.estat === 'oberta') || openWeeks[0]
        setCurrentWeekStart(defaultWeek.week_start)
      } else {
        const d = new Date()
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(d.setDate(diff)).toISOString().split('T')[0]
        setCurrentWeekStart(monday)
      }
    } catch (err) {
      console.error('Error carregant setmanes:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMyWellness = async (weekStart: string) => {
    try {
      const res = await api.get(`/submissions/wellness/me?week_start=${weekStart}`)
      if (res.data) {
        setFatiga(res.data.fatiga || 2)
        setSon(res.data.son_qualitat || 4)
        setDolor(res.data.dolor_muscular || 2)
        setEstres(res.data.estres || 2)
        setHumor(res.data.humor || 4)
        setRpe(res.data.rpe_setmanal || 6)
        setNotes(res.data.notes || '')
        if (Array.isArray(res.data.zones_dolor)) {
          setSelectedZones(res.data.zones_dolor)
        }
      }
    } catch (err) {
      console.error('No hi ha dades prèvies de wellness per aquesta setmana:', err)
    }
  }

  const loadCoachData = async (weekStart: string) => {
    try {
      const res = await api.get(`/entrenador/wellness/overview?week_start=${weekStart}`)
      setAthletesWellness(res.data?.atletes || [])
    } catch (e) {
      console.error('Error carregant overview entrenador:', e)
    }
  }

  // Calculate live score: 5 items (fatiga, son, dolor, estres, humor), sum from 5 to 25
  const hooperScore = fatiga + (6 - son) + dolor + estres + (6 - humor)
  // Normalized 0-100 score where 100 is best recovery
  const recoveryScore = Math.max(0, Math.min(100, Math.round(((25 - hooperScore) / 20) * 100)))
  
  const getStatus = (rScore: number, d: number, zones: string[], rpeVal: number) => {
    if (rScore < 45 || d >= 4 || zones.length >= 2 || rpeVal >= 9) {
      return { 
        label: 'Alerta Fatiga / Risc Lesió', 
        color: 'text-rose-600 bg-rose-50 border-rose-200', 
        dot: 'bg-rose-500',
        recommendation: 'Es recomana reduir intensitat, vigilar zones afectades i comunicar-ho a l’entrenador.'
      }
    }
    if (rScore < 70 || d >= 3 || zones.length > 0 || rpeVal >= 7) {
      return { 
        label: 'Estat Moderat / Fatiga Acumulada', 
        color: 'text-amber-600 bg-amber-50 border-amber-200', 
        dot: 'bg-amber-500',
        recommendation: 'Càrrega acceptable però convé prioritzar son, hidratació i mobilitat articular.'
      }
    }
    return { 
      label: 'Recuperació Òptima', 
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200', 
      dot: 'bg-emerald-500',
      recommendation: 'Bona adaptació a la càrrega! Tot a punt per seguir el pla previst.'
    }
  }

  const currentStatus = getStatus(recoveryScore, dolor, selectedZones, rpe)

  const toggleZone = (z: string) => {
    if (selectedZones.includes(z)) {
      setSelectedZones(selectedZones.filter(item => item !== z))
    } else {
      setSelectedZones([...selectedZones, z])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)
    setFeedbackError(null)

    try {
      await api.post('/submissions/wellness', {
        week_start: currentWeekStart,
        fatiga,
        son_qualitat: son,
        dolor_muscular: dolor,
        estres,
        humor,
        rpe_setmanal: rpe,
        zones_dolor: selectedZones,
        notes
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 5000)
    } catch (err: any) {
      console.error('Error guardant wellness:', err)
      setFeedbackError(err.response?.data?.error || 'Error en guardar el check-in de wellness.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-text-muted font-medium">Carregant protocol wellness...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
              Check-in Setmanal
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2.5 mt-1">
            <HeartPulse className="w-6 h-6 text-brand-500" />
            {activeTab === 'my_checkin' ? 'El meu Estat de Benestar i Recuperació' : 'Semàfor de Benestar de l\'Equip'}
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Protocol científic Hooper & Foster per monitorar la fatiga i prevenir sobreentrenament.
          </p>
        </div>

        {/* Week Selector */}
        {weeks.length > 0 && (
          <div className="flex items-center gap-2 bg-white/70 px-3 py-1.5 rounded-xl border border-border shadow-sm">
            <Calendar className="w-4 h-4 text-brand-500" />
            <select
              value={currentWeekStart}
              onChange={(e) => setCurrentWeekStart(e.target.value)}
              className="text-xs font-bold bg-transparent text-text-primary focus:outline-none cursor-pointer"
            >
              {weeks.map(w => (
                <option key={w.id} value={w.week_start}>
                  Setmana {w.week_start} ({w.estat})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Role Navigation Tabs (if Coach or Admin) */}
      {canSeeTeamOverview && (
        <div className="glass-card p-1.5 flex items-center gap-2 max-w-md">
          <button
            onClick={() => setActiveTab('my_checkin')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'my_checkin'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>El meu Check-in (Atleta)</span>
          </button>

          <button
            onClick={() => setActiveTab('team_overview')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'team_overview'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Semàfor Equip (Entrenador)</span>
          </button>
        </div>
      )}

      {activeTab === 'team_overview' ? (
        /* ============================================================ */
        /* COACH VIEW: TRAFFIC LIGHT OVERVIEW FOR ATHLETES              */
        /* ============================================================ */
        <div className="space-y-6">
          <div className="glass-card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-brand-500" />
              Semàfor de Benestar de l'Equip (Setmana {currentWeekStart})
            </h3>

            {athletesWellness.length === 0 ? (
              <p className="text-sm text-text-muted italic py-6 text-center">
                Cap atleta ha registrat el check-in de wellness per a aquesta setmana encara.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-muted font-bold uppercase text-[11px]">
                      <th className="py-3 px-3">Atleta</th>
                      <th className="py-3 px-3">Estat</th>
                      <th className="py-3 px-3">Score</th>
                      <th className="py-3 px-3">Fatiga</th>
                      <th className="py-3 px-3">Son</th>
                      <th className="py-3 px-3">Dolor</th>
                      <th className="py-3 px-3">RPE</th>
                      <th className="py-3 px-3">Zones Molèstia</th>
                      <th className="py-3 px-3 text-right">Data enviament</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {athletesWellness.map((item, idx) => {
                      const isDanger = item.score <= 12 || (item.dolor || 0) >= 4 || (item.zones_dolor?.length || 0) >= 2 || (item.rpe || 0) >= 9
                      const isWarning = item.score < 18 || (item.dolor || 0) >= 3 || (item.zones_dolor?.length || 0) > 0 || (item.rpe || 0) >= 7

                      const badge = isDanger
                        ? { label: 'Risc Alt', class: 'bg-rose-100 text-rose-800 border-rose-300' }
                        : isWarning
                        ? { label: 'Alerta', class: 'bg-amber-100 text-amber-800 border-amber-300' }
                        : { label: 'Òptim', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' }

                      return (
                        <tr key={idx} className="hover:bg-bg-hover/50 transition-colors">
                          <td className="py-3 px-3 font-bold text-text-primary whitespace-nowrap">
                            {item.atleta_nom}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.class}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-text-primary">
                            {item.score || '-'} / 25
                          </td>
                          <td className="py-3 px-3">{item.fatiga || '-'}</td>
                          <td className="py-3 px-3">{item.son || '-'}</td>
                          <td className="py-3 px-3">{item.dolor || '-'}</td>
                          <td className="py-3 px-3 font-semibold">{item.rpe || '-'} / 10</td>
                          <td className="py-3 px-3 text-text-muted">
                            {item.zones_dolor && item.zones_dolor.length > 0 ? (
                              <span className="text-rose-600 font-semibold">{item.zones_dolor.join(', ')}</span>
                            ) : (
                              'Cap'
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-text-muted text-xs">
                            {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString('ca-ES') : 'Pendent'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* ATHLETE VIEW: HOOPER & FOSTER WEEKLY CHECK-IN FORM           */
        /* ============================================================ */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Assessment Form */}
          <div className="lg:col-span-2 space-y-6">
            {feedbackError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
                <span>{feedbackError}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                <span className="font-semibold">Check-in de wellness desat correctament! L'entrenador podrà visualitzar el teu estat.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Hooper Scale Cards */}
              <div className="glass-card p-4 sm:p-6 space-y-5">
                <div className="border-b border-border pb-3">
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <Activity className="w-5 h-5 text-brand-500" />
                    Balanç de Recuperació (Escala Hooper 1 a 5)
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    1 = Molt baix / Pèssim, 5 = Molt alt / Òptim.
                  </p>
                </div>

                {/* 1. Fatiga General */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-primary flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" /> Nivell de Fatiga Acumulada
                    </span>
                    <span className="font-extrabold text-brand-600">{fatiga} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={fatiga}
                    onChange={(e) => setFatiga(Number(e.target.value))}
                    className="w-full accent-brand-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted">
                    <span>Molt descansat (1)</span>
                    <span>Moderat (3)</span>
                    <span>Extremadament cansat (5)</span>
                  </div>
                </div>

                {/* 2. Qualitat del Son */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-primary flex items-center gap-1.5">
                      <Moon className="w-4 h-4 text-indigo-500" /> Qualitat i Hores de Son
                    </span>
                    <span className="font-extrabold text-brand-600">{son} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={son}
                    onChange={(e) => setSon(Number(e.target.value))}
                    className="w-full accent-brand-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted">
                    <span>Insomni / Molt dolent (1)</span>
                    <span>Normal (3)</span>
                    <span>Profund i reparador (5)</span>
                  </div>
                </div>

                {/* 3. Dolor Muscular */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-primary flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-rose-500" /> Agulletes / Dolor Muscular General (DOMS)
                    </span>
                    <span className="font-extrabold text-brand-600">{dolor} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={dolor}
                    onChange={(e) => setDolor(Number(e.target.value))}
                    className="w-full accent-brand-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted">
                    <span>Gens de dolor (1)</span>
                    <span>Molèsties típiques (3)</span>
                    <span>Dolor agut / Dificultat per moure's (5)</span>
                  </div>
                </div>

                {/* 4. Estrès Psicològic */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-primary flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-orange-500" /> Nivell d'Estrès (Laboral, personal, acadèmic)
                    </span>
                    <span className="font-extrabold text-brand-600">{estres} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={estres}
                    onChange={(e) => setEstres(Number(e.target.value))}
                    className="w-full accent-brand-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted">
                    <span>Molt relaxat (1)</span>
                    <span>Moderat (3)</span>
                    <span>Molt angoixat / Alt estrès (5)</span>
                  </div>
                </div>

                {/* 5. Estat d'Ànim */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-primary flex items-center gap-1.5">
                      <Smile className="w-4 h-4 text-emerald-500" /> Estat d'Ànim i Motivació
                    </span>
                    <span className="font-extrabold text-brand-600">{humor} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={humor}
                    onChange={(e) => setHumor(Number(e.target.value))}
                    className="w-full accent-brand-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted">
                    <span>Desmotivat / Apatia (1)</span>
                    <span>Neutre (3)</span>
                    <span>Pletòric / Amb moltes ganes (5)</span>
                  </div>
                </div>
              </div>

              {/* RPE Borg Section */}
              <div className="glass-card p-4 sm:p-6 space-y-4">
                <div className="border-b border-border pb-3">
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <Flame className="w-5 h-5 text-brand-500" />
                    Esforç Global Percebut (RPE Borg 1 a 10)
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Quina duresa general han tingut els teus entrenaments aquesta darrera setmana?
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-primary">Percepció de l'Esforç (sRPE)</span>
                    <span className="text-base font-black text-brand-600">{rpe} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={rpe}
                    onChange={(e) => setRpe(Number(e.target.value))}
                    className="w-full accent-brand-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted">
                    <span>Molt suau (1-2)</span>
                    <span>Moderat (5-6)</span>
                    <span>Duresa extrema (9-10)</span>
                  </div>
                </div>
              </div>

              {/* Pain & Anatomical selector */}
              <div className="glass-card p-4 sm:p-6 space-y-4">
                <div className="border-b border-border pb-3">
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Zones de Molèstia o Dolor Localitzat
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Selecciona les àrees anatòmiques on notes sobrecàrrega o punxades.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {ZONES_MOLESTIA.map((zone) => {
                    const isSelected = selectedZones.includes(zone)
                    return (
                      <button
                        type="button"
                        key={zone}
                        onClick={() => toggleZone(zone)}
                        className={`text-xs font-semibold py-2 px-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm font-bold'
                            : 'bg-bg-surface border-border text-text-secondary hover:bg-bg-hover'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {zone}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Free notes */}
              <div className="glass-card p-4 sm:p-6 space-y-3">
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Comentaris o Sensacions per a l'Entrenador
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: He tingut insomni dijous pel viatge de feina, o noto la cintilla carregada en baixar desnivell..."
                  className="w-full bg-bg-surface border border-border rounded-xl p-3 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary text-sm py-3 px-8 font-bold flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Desant...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Desar Check-in de Benestar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Sidebar: Dynamic Recovery Traffic Light */}
          <div className="space-y-6">
            <div className="glass-card p-5 sm:p-6 space-y-5 sticky top-24">
              <div className="border-b border-border pb-3">
                <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-brand-500" />
                  Semàfor d'Adaptació
                </h4>
                <p className="text-xs text-text-muted mt-0.5">Càlcul en temps real del teu estat</p>
              </div>

              {/* Status Pill Card */}
              <div className={`p-4 rounded-2xl border flex flex-col items-center text-center gap-2 ${currentStatus.color}`}>
                <div className={`w-3.5 h-3.5 rounded-full ${currentStatus.dot} animate-pulse`}></div>
                <div className="text-base font-black tracking-tight">{currentStatus.label}</div>
                <div className="text-3xl font-black">{recoveryScore} <span className="text-xs font-normal opacity-70">/ 100</span></div>
              </div>

              <div className="text-xs text-text-secondary leading-relaxed bg-bg-hover/60 p-3.5 rounded-xl border border-border">
                <strong>Recomanació clínica:</strong> {currentStatus.recommendation}
              </div>

              <div className="space-y-2 pt-2 border-t border-border text-xs">
                <div className="flex justify-between text-text-muted">
                  <span>Índex Hooper:</span>
                  <span className="font-bold text-text-primary">{hooperScore} / 25</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Zones dolor:</span>
                  <span className="font-bold text-text-primary">{selectedZones.length} seleccionades</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>RPE Setmanal:</span>
                  <span className="font-bold text-text-primary">{rpe} / 10</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
