import React from 'react'
import { 
  HeartPulse, 
  X, 
  Zap, 
  Moon, 
  Flame, 
  AlertTriangle, 
  Smile, 
  Activity, 
  Calendar, 
  Clock, 
  CheckCircle2,
  ShieldAlert,
  Info
} from 'lucide-react'
import type { AthleteWellnessDetail } from '../api/entrenador'

interface WellnessDetailModalProps {
  isOpen: boolean
  onClose: () => void
  atletaNom: string
  weekStart: string
  wellness?: AthleteWellnessDetail | null
}

export const WellnessDetailModal: React.FC<WellnessDetailModalProps> = ({
  isOpen,
  onClose,
  atletaNom,
  weekStart,
  wellness
}) => {
  if (!isOpen) return null

  const hasRespost = wellness?.ha_respost || (wellness && wellness.alerta !== 'pendent' && wellness.fatiga !== undefined)

  // Calculations
  const fatiga = wellness?.fatiga ?? 0
  const son = wellness?.son_qualitat ?? 0
  const dolor = wellness?.dolor_muscular ?? 0
  const estres = wellness?.estres ?? 0
  const humor = wellness?.humor ?? 0
  const rpe = wellness?.rpe_setmanal ?? 0
  const zones = wellness?.zones_dolor ?? []
  const notes = wellness?.notes ?? ''

  // Hooper Score: sum from 5 to 25
  const hooperScore = hasRespost 
    ? (wellness?.score ?? (fatiga + (6 - son) + dolor + estres + (6 - humor)))
    : null

  // Normalized 0-100 score where 100 is best recovery
  const recoveryScore = hooperScore !== null
    ? Math.max(0, Math.min(100, Math.round(((25 - hooperScore) / 20) * 100)))
    : null

  const getStatusBadge = () => {
    if (!hasRespost) {
      return {
        label: 'Pendent de resposta',
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        dot: 'bg-slate-400',
        recommendation: "L'atleta encara no ha enviat el formulari de wellness per a aquesta setmana."
      }
    }

    if (wellness?.alerta === 'vermell' || (recoveryScore !== null && recoveryScore < 45) || dolor >= 4 || zones.length >= 2 || rpe >= 9) {
      return {
        label: 'Risc Alt / Alerta Crítica',
        bg: 'bg-rose-50 text-rose-700 border-rose-300',
        dot: 'bg-rose-500 animate-pulse',
        recommendation: 'Es recomana reduir càrrega o intensitat, vigilar de prop les zones afectades i contactar amb l’atleta abans de sessions exigents.'
      }
    }

    if (wellness?.alerta === 'groc' || (recoveryScore !== null && recoveryScore < 70) || dolor >= 3 || zones.length > 0 || rpe >= 7) {
      return {
        label: 'Alerta / Fatiga Moderada',
        bg: 'bg-amber-50 text-amber-700 border-amber-300',
        dot: 'bg-amber-500',
        recommendation: 'Càrrega assimilable però amb signes de fatiga acumulada. Prioritzar descans, son i mobilitat activa.'
      }
    }

    return {
      label: 'Recuperació Òptima',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      dot: 'bg-emerald-500',
      recommendation: 'Molt bona adaptació a l’entrenament. L’atleta està en condicions idònies per seguir la planificació establerta.'
    }
  }

  const status = getStatusBadge()

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    try {
      const d = new Date(dateStr)
      return `${d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} a les ${d.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })}`
    } catch {
      return dateStr
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div 
        className="bg-bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-start justify-between bg-white/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shadow-sm shrink-0">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-text-primary">
                  {atletaNom}
                </h3>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${status.bg}`}>
                  <span className={`w-2 h-2 rounded-full ${status.dot}`}></span>
                  {status.label}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Setmana {weekStart}
                </span>
                {wellness?.submitted_at && (
                  <span className="flex items-center gap-1 text-[11px]">
                    <Clock className="w-3.5 h-3.5" /> Enviat el {formatDate(wellness.submitted_at)}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-xl hover:bg-bg-hover transition-colors"
            title="Tancar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {!hasRespost ? (
            <div className="p-8 text-center space-y-3 bg-bg-hover/40 rounded-2xl border border-dashed border-border">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-text-primary">Check-in Setmanal Pendent</h4>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Aquest atleta encara no ha enviat les dades de recuperació i estat de fatiga Hooper & Foster per a la setmana del {weekStart}.
              </p>
            </div>
          ) : (
            <>
              {/* Score summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Recuperació Global */}
                <div className="p-3.5 rounded-xl border border-border bg-bg-surface flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-brand-500" /> Índex Recuperació
                  </span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-text-primary">
                      {recoveryScore ?? '-'}%
                    </span>
                    <span className="text-[10px] text-text-muted">/ 100</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        (recoveryScore ?? 0) >= 70 ? 'bg-emerald-500' :
                        (recoveryScore ?? 0) >= 45 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${recoveryScore ?? 0}%` }}
                    />
                  </div>
                </div>

                {/* Índex Hooper */}
                <div className="p-3.5 rounded-xl border border-border bg-bg-surface flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-indigo-500" /> Càrrega Hooper
                  </span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-text-primary">
                      {hooperScore ?? '-'}
                    </span>
                    <span className="text-[10px] text-text-muted">/ 25 pts</span>
                  </div>
                  <p className="text-[10px] text-text-muted mt-2">
                    {hooperScore && hooperScore <= 12 ? 'Bona assimilació' : hooperScore && hooperScore <= 18 ? 'Fatiga moderada' : 'Fatiga elevada'}
                  </p>
                </div>

                {/* RPE Setmanal */}
                <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl border border-border bg-bg-surface flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-500" /> RPE Setmanal Borg
                  </span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-text-primary">
                      {rpe}
                    </span>
                    <span className="text-[10px] text-text-muted">/ 10</span>
                  </div>
                  <p className="text-[10px] text-text-muted mt-2">
                    {rpe <= 4 ? 'Esforç suau' : rpe <= 7 ? 'Duresa mitjana' : 'Molt exigent / màxim'}
                  </p>
                </div>
              </div>

              {/* Hooper breakdown grid (5 items) */}
              <div>
                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-brand-500" /> Desglossament Escala Hooper & Foster (1 a 5)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 1. Fatiga */}
                  <div className="p-3 rounded-xl border border-border bg-bg-hover/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-primary">Fatiga General</div>
                        <div className="text-[10px] text-text-muted">
                          {fatiga <= 2 ? 'Molt descansat' : fatiga === 3 ? 'Fatiga normal' : 'Extremadament cansat'}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-black text-text-primary px-2.5 py-1 rounded-lg bg-white border border-border shadow-xs">
                      {fatiga} <span className="text-[10px] text-text-muted font-normal">/ 5</span>
                    </span>
                  </div>

                  {/* 2. Qualitat del Son */}
                  <div className="p-3 rounded-xl border border-border bg-bg-hover/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Moon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-primary">Qualitat del Son</div>
                        <div className="text-[10px] text-text-muted">
                          {son >= 4 ? 'Profund i reparador' : son === 3 ? 'Normal' : 'Insomni o deficient'}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-black text-text-primary px-2.5 py-1 rounded-lg bg-white border border-border shadow-xs">
                      {son} <span className="text-[10px] text-text-muted font-normal">/ 5</span>
                    </span>
                  </div>

                  {/* 3. Dolor Muscular */}
                  <div className="p-3 rounded-xl border border-border bg-bg-hover/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-primary">Dolor Muscular / DOMS</div>
                        <div className="text-[10px] text-text-muted">
                          {dolor <= 2 ? 'Sense dolor' : dolor === 3 ? 'Agulletes tolerables' : 'Dolor agut / limitant'}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-black text-text-primary px-2.5 py-1 rounded-lg bg-white border border-border shadow-xs">
                      {dolor} <span className="text-[10px] text-text-muted font-normal">/ 5</span>
                    </span>
                  </div>

                  {/* 4. Estrès */}
                  <div className="p-3 rounded-xl border border-border bg-bg-hover/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-primary">Nivell d'Estrès</div>
                        <div className="text-[10px] text-text-muted">
                          {estres <= 2 ? 'Molt relaxat' : estres === 3 ? 'Estrès moderat' : 'Molt angoixat / Alt estrès'}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-black text-text-primary px-2.5 py-1 rounded-lg bg-white border border-border shadow-xs">
                      {estres} <span className="text-[10px] text-text-muted font-normal">/ 5</span>
                    </span>
                  </div>

                  {/* 5. Humor / Motivació */}
                  <div className="sm:col-span-2 p-3 rounded-xl border border-border bg-bg-hover/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Smile className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-primary">Estat d'Ànim i Motivació</div>
                        <div className="text-[10px] text-text-muted">
                          {humor >= 4 ? 'Pletòric / Amb moltes ganes' : humor === 3 ? 'Neutre' : 'Apatia o desmotivat'}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-black text-text-primary px-2.5 py-1 rounded-lg bg-white border border-border shadow-xs">
                      {humor} <span className="text-[10px] text-text-muted font-normal">/ 5</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Zones de molèstia */}
              <div className="p-4 rounded-xl border border-border bg-bg-surface space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-500" /> Zones Anatòmiques amb Molèstia
                  </span>
                  <span className="text-[11px] font-semibold text-text-muted">
                    {zones.length === 0 ? 'Cap zona indicada' : `${zones.length} zones`}
                  </span>
                </div>

                {zones.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {zones.map((zone, idx) => (
                      <span 
                        key={idx}
                        className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 shadow-2xs"
                      >
                        ⚠️ {zone}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted italic">
                    L'atleta no ha reportat punts ni zones anatòmiques doloroses.
                  </p>
                )}
              </div>

              {/* Notes i comentaris de l'atleta */}
              <div className="p-4 rounded-xl border border-border bg-bg-surface space-y-2">
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider block">
                  Comentaris i Sensacions de l'Atleta
                </span>
                {notes ? (
                  <div className="text-xs text-text-secondary bg-bg-hover/60 p-3 rounded-xl border border-border italic whitespace-pre-wrap leading-relaxed">
                    "{notes}"
                  </div>
                ) : (
                  <p className="text-xs text-text-muted italic">
                    Sense comentaris addicionals.
                  </p>
                )}
              </div>

              {/* Recomanació clínica per a l'entrenador */}
              <div className="p-4 rounded-xl bg-brand-50/60 border border-brand-200 text-xs text-brand-900 leading-relaxed space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-brand-800">
                  <CheckCircle2 className="w-4 h-4 text-brand-600" /> Suggeriment d'adaptació
                </span>
                <p>{status.recommendation}</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end bg-white/70">
          <button
            onClick={onClose}
            className="btn-primary text-xs font-bold py-2.5 px-6 shadow-sm"
          >
            Tancar Detall
          </button>
        </div>
      </div>
    </div>
  )
}
