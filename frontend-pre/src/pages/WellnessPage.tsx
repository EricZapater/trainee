import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
  Calendar,
  ArrowRight
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
  const { isEntrenador } = useAuth()

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
  }, [isEntrenador])

  useEffect(() => {
    if (currentWeekStart && !isEntrenador) {
      loadMyWellness(currentWeekStart)
    } else if (currentWeekStart && isEntrenador) {
      loadCoachData(currentWeekStart)
    }
  }, [currentWeekStart])

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
            {isEntrenador ? 'Panell de Wellness i Prevenció' : 'El meu Estat de Benestar i Recuperació'}
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Protocol científic Hooper & Foster per monitorar la fatiga i prevenir sobreentrenament.
          </p>
        </div>

        {/* Week Selector */}
        {weeks.length > 0 && (
          <div className="flex items-center gap-2 bg-white/70 px-3 py-1.5 rounded-xl border border-border-light shadow-sm">
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

      {isEntrenador ? (
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
                    <tr className="border-b border-border-light text-text-muted font-bold uppercase text-[11px]">
                      <th className="py-3 px-3">Atleta</th>
                      <th className="py-3 px-3">Estat</th>
                      <th className="py-3 px-3">Score</th>
                      <th className="py-3 px-3">RPE</th>
                      <th className="py-3 px-3">Zones de Dolor</th>
                      <th className="py-3 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {athletesWellness.map(ath => {
                      const alertColor = 
                        ath.alerta === 'vermell' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        ath.alerta === 'groc' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        ath.alerta === 'verd' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        'bg-slate-100 text-slate-600 border-slate-300'

                      return (
                        <tr key={ath.atleta_id} className="hover:bg-bg-hover/50 transition-colors">
                          <td className="py-3 px-3 font-bold text-text-primary">
                            {ath.nom} {ath.cognoms}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase ${alertColor}`}>
                              {ath.alerta || 'Pendent'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold">
                            {ath.score ? `${ath.score}/25` : '-'}
                          </td>
                          <td className="py-3 px-3 font-semibold">
                            {ath.rpe_setmanal ? `${ath.rpe_setmanal}/10` : '-'}
                          </td>
                          <td className="py-3 px-3">
                            {ath.zones_dolor && ath.zones_dolor.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {ath.zones_dolor.map((z: string, i: number) => (
                                  <span key={i} className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                    {z}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-text-muted text-xs">Cap molèstia</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-text-muted italic max-w-xs truncate">
                            {ath.notes || '-'}
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
        /* ATHLETE VIEW: INTERACTIVE FORM & VISUAL SCORE               */
        /* ============================================================ */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="glass-card p-4 sm:p-6 space-y-6">
              {saveSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-scale-up">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs sm:text-sm font-semibold">
                    El teu check-in de Wellness s'ha guardat amb èxit! El teu entrenador ja el pot consultar.
                  </div>
                </div>
              )}

              {feedbackError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div className="text-xs sm:text-sm font-semibold">{feedbackError}</div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-base font-bold text-text-primary border-b border-border-light pb-2">
                  1. Escala Hooper (Estat Psicofísic 1-5)
                </h3>

                {/* Qualitat del son */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="font-semibold text-text-primary flex items-center gap-1.5">
                      <Moon className="w-4 h-4 text-indigo-500" /> Qualitat del son
                    </span>
                    <span className="font-bold text-brand-600">{son} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={son}
                    onChange={(e) => setSon(parseInt(e.target.value))}
                    className="w-full accent-brand-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted">
                    <span>Molt dolent (1)</span>
                    <span>Excel·lent i reparador (5)</span>
                  </div>
                </div>

                {/* Nivell de Fatiga */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="font-semibold text-text-primary flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" /> Sensació de fatiga acumulada
                    </span>
                    <span className="font-bold text-brand-600">{fatiga} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={fatiga}
                    onChange={(e) => setFatiga(parseInt(e.target.value))}
                    className="w-full accent-brand-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted">
                    <span>Frescor total (1)</span>
                    <span>Esgotament extrem (5)</span>
                  </div>
                </div>

                {/* Dolor / Pesadesa muscular */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="font-semibold text-text-primary flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-rose-500" /> Dolor o pesadesa muscular (DOMS)
                    </span>
                    <span className="font-bold text-brand-600">{dolor} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={dolor}
                    onChange={(e) => setDolor(parseInt(e.target.value))}
                    className="w-full accent-brand-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted">
                    <span>Cap dolor (1)</span>
                    <span>Agulletes / dolor molt intens (5)</span>
                  </div>
                </div>

                {/* Estrès general */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="font-semibold text-text-primary flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-500" /> Estrès diari (laboral / personal)
                    </span>
                    <span className="font-bold text-brand-600">{estres} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={estres}
                    onChange={(e) => setEstres(parseInt(e.target.value))}
                    className="w-full accent-brand-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted">
                    <span>Molt relaxat (1)</span>
                    <span>Molt estressat (5)</span>
                  </div>
                </div>

                {/* Estat d'ànim */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="font-semibold text-text-primary flex items-center gap-1.5">
                      <Smile className="w-4 h-4 text-emerald-500" /> Estat d'ànim i motivació
                    </span>
                    <span className="font-bold text-brand-600">{humor} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={humor}
                    onChange={(e) => setHumor(parseInt(e.target.value))}
                    className="w-full accent-brand-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted">
                    <span>Desmotivat / trist (1)</span>
                    <span>Amb moltes ganes i energia (5)</span>
                  </div>
                </div>
              </div>

              {/* RPE Setmanal (Borg 1-10) */}
              <div className="space-y-3 pt-2 border-t border-border-light">
                <h3 className="text-base font-bold text-text-primary">
                  2. RPE Global de la Setmana (Escala Borg 1-10)
                </h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-text-muted">Duresa percebuda de la suma dels teus entrenaments:</span>
                    <span className="font-extrabold text-base text-brand-600">{rpe} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={rpe}
                    onChange={(e) => setRpe(parseInt(e.target.value))}
                    className="w-full accent-brand-500 cursor-pointer h-2.5 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted font-medium">
                    <span>Molt suau (1)</span>
                    <span>Moderat (5)</span>
                    <span>Esforç màxim (10)</span>
                  </div>
                </div>
              </div>

              {/* Zones de Dolor (Mapa Tàctil) */}
              <div className="space-y-3 pt-2 border-t border-border-light">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-text-primary">
                    3. Zones amb molèstia o dolor localitzat
                  </h3>
                  <span className="text-xs text-text-muted">Tria si en tens alguna:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ZONES_MOLESTIA.map(zone => {
                    const isSelected = selectedZones.includes(zone)
                    return (
                      <button
                        type="button"
                        key={zone}
                        onClick={() => toggleZone(zone)}
                        className={`p-2.5 rounded-xl text-xs font-semibold text-left transition-all border ${
                          isSelected
                            ? 'bg-rose-50 border-rose-300 text-rose-800 ring-2 ring-rose-500/20'
                            : 'bg-white/60 border-border-light text-text-secondary hover:bg-white'
                        }`}
                      >
                        {zone}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Comentaris de recuperació */}
              <div className="space-y-2 pt-2 border-t border-border-light">
                <label className="block text-sm font-bold text-text-primary">
                  Notes de recuperació o incidències per a l'entrenador
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Dissabte vaig notar el quàdriceps dret carregat a la baixada, però amb estiraments va millorar..."
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-border-light focus:ring-2 focus:ring-brand-500/20 outline-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary text-sm py-3 px-6 shadow-md flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Guardant...' : 'Desar Check-in de Wellness'}
                </button>
              </div>
            </form>
          </div>

          {/* Live Recovery Score Sidebar */}
          <div className="space-y-4">
            <div className="glass-card p-5 sm:p-6 space-y-4 border border-border-light">
              <h3 className="font-bold text-base text-text-primary">Estat Calculat</h3>
              
              <div className="text-center py-4 space-y-2">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-brand-500/20 bg-brand-50/50">
                  <span className="text-3xl font-extrabold text-brand-600">{recoveryScore}%</span>
                </div>
                <div className="text-xs text-text-muted font-semibold">Índex de Recuperació Global</div>
              </div>

              <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${currentStatus.color}`}>
                <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${currentStatus.dot}`} />
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wide">{currentStatus.label}</h4>
                  <p className="text-[11px] mt-1 leading-relaxed opacity-90">{currentStatus.recommendation}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-border-light space-y-2 text-xs text-text-muted">
                <div className="flex justify-between">
                  <span>Puntuació Hooper (5-25):</span>
                  <span className="font-bold text-text-primary">{hooperScore} / 25</span>
                </div>
                <div className="flex justify-between">
                  <span>Esforç RPE Borg:</span>
                  <span className="font-bold text-text-primary">{rpe} / 10</span>
                </div>
                <div className="flex justify-between">
                  <span>Zones dolor marcades:</span>
                  <span className="font-bold text-text-primary">{selectedZones.length}</span>
                </div>
              </div>

              <Link
                to="/calendar"
                className="w-full py-2.5 px-3 rounded-xl bg-white border border-border-light hover:border-brand-500/40 text-text-primary text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                Tornar al Calendari Setmanal <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
