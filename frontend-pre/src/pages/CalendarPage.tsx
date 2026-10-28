import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  Bookmark, 
  Settings, 
  Clock, 
  AlertCircle,
  HeartPulse,
  Sparkles
} from 'lucide-react'
import { 
  getOpenWeeks, 
  getActivitats, 
  getMySubmission, 
  saveSubmission, 
  getWeekTemplates, 
  createWeekTemplate, 
  deleteWeekTemplate 
} from '../api/calendar'
import type { Week, Activitat, SlotEntry, WeekTemplate } from '../types'

const DIES_SETMANA = [
  'Dilluns',
  'Dimarts',
  'Dimecres',
  'Dijous',
  'Divendres',
  'Dissabte',
  'Diumenge'
]

const DURADES_OPTIONS = [
  { label: '1h', value: 1.0 },
  { label: '1.5h', value: 1.5 },
  { label: '2h', value: 2.0 },
  { label: '2.5h', value: 2.5 },
  { label: '3h', value: 3.0 },
  { label: '>3h', value: 4.0 },
]

export const CalendarPage: React.FC = () => {
  const [weeks, setWeeks] = useState<Week[]>([])
  const [currentWeekStart, setCurrentWeekStart] = useState<string>('')
  const [activitats, setActivitats] = useState<Activitat[]>([])
  const [templates, setTemplates] = useState<WeekTemplate[]>([])
  const [slotsByDay, setSlotsByDay] = useState<{ [day: number]: SlotEntry[] }>({
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
  })
  const [horesPerDia, setHoresPerDia] = useState<{ [day: number]: number }>({
    0: 1.0, 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0
  })
  const [notesSetmana, setNotesSetmana] = useState<string>('')
  const [submissionEstat, setSubmissionEstat] = useState<string>('esborrany')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Mobile Accordion state: all days open by default
  const [expandedDays, setExpandedDays] = useState<{ [key: number]: boolean }>({
    0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true
  })

  // Selected Activity from Palette (for click-to-add on mobile/desktop)
  const [selectedActivity, setSelectedActivity] = useState<Activitat | null>(null)

  // Template Modals
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false)
  const [showManageTemplatesModal, setShowManageTemplatesModal] = useState(false)
  const [newTemplateNom, setNewTemplateNom] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (currentWeekStart) {
      loadSubmissionForWeek(currentWeekStart)
    }
  }, [currentWeekStart])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      const [weeksData, activitatsData, templatesData] = await Promise.all([
        getOpenWeeks(),
        getActivitats(),
        getWeekTemplates()
      ])
      setWeeks(weeksData)
      setActivitats(activitatsData.filter(a => a.activa))
      setTemplates(templatesData)

      if (activitatsData.length > 0) {
        setSelectedActivity(activitatsData[0])
      }

      if (weeksData.length > 0) {
        // Default to first open week or first available
        const openWeek = weeksData.find(w => w.estat === 'oberta') || weeksData[0]
        setCurrentWeekStart(openWeek.week_start)
      } else {
        // Fallback: calculate current week monday
        const d = new Date()
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(d.setDate(diff)).toISOString().split('T')[0]
        setCurrentWeekStart(monday)
      }
    } catch (err) {
      console.error('Error loading calendar data:', err)
      showNotification('error', 'Error carregant dades del calendari.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadSubmissionForWeek = async (weekStart: string) => {
    try {
      const sub = await getMySubmission(weekStart)
      setNotesSetmana(sub.notes_setmana || '')
      setSubmissionEstat(sub.estat || 'esborrany')

      const newSlots: { [day: number]: SlotEntry[] } = {
        0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
      }
      const newHores: { [day: number]: number } = {
        0: 1.0, 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0
      }

      if (sub.slots && sub.slots.length > 0) {
        sub.slots.forEach(slot => {
          if (newSlots[slot.dia]) {
            newSlots[slot.dia].push(slot)
            if (slot.durada_hores) {
              newHores[slot.dia] = slot.durada_hores
            }
          }
        })
      }

      setSlotsByDay(newSlots)
      setHoresPerDia(newHores)
    } catch (err) {
      console.error('Error loading submission:', err)
    }
  }

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text })
    setTimeout(() => setFeedbackMsg(null), 4000)
  }

  const currentWeek = weeks.find(w => w.week_start === currentWeekStart)
  const isWeekOpen = currentWeek ? currentWeek.estat === 'oberta' : true

  const formatDate = (baseDateStr: string, offsetDays: number = 0) => {
    if (!baseDateStr) return ''
    const d = new Date(baseDateStr + 'T00:00:00')
    d.setDate(d.getDate() + offsetDays)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
  }

  const toggleDayAccordion = (dia: number) => {
    setExpandedDays(prev => ({ ...prev, [dia]: !prev[dia] }))
  }

  const handleAddActivityToDay = (dia: number, act?: Activitat) => {
    if (!isWeekOpen) return
    const targetActivity = act || selectedActivity
    if (!targetActivity) return

    const newSlot: SlotEntry = {
      dia,
      ordre: slotsByDay[dia].length,
      activitat_id: targetActivity.id,
      activitat_nom: targetActivity.nom,
      activitat_icona: targetActivity.icona,
      activitat_color: targetActivity.color,
      durada_hores: horesPerDia[dia] || 1.0,
      notes: ''
    }

    setSlotsByDay(prev => ({
      ...prev,
      [dia]: [...prev[dia], newSlot]
    }))
  }

  const handleRemoveSlot = (dia: number, index: number) => {
    if (!isWeekOpen) return
    setSlotsByDay(prev => ({
      ...prev,
      [dia]: prev[dia].filter((_, i) => i !== index)
    }))
  }

  const handleUpdateSlotNotes = (dia: number, index: number, notes: string) => {
    if (!isWeekOpen) return
    setSlotsByDay(prev => ({
      ...prev,
      [dia]: prev[dia].map((slot, i) => i === index ? { ...slot, notes } : slot)
    }))
  }

  const handleSetHoresDia = (dia: number, hores: number) => {
    if (!isWeekOpen) return
    setHoresPerDia(prev => ({ ...prev, [dia]: hores }))
    setSlotsByDay(prev => ({
      ...prev,
      [dia]: prev[dia].map(slot => ({ ...slot, durada_hores: hores }))
    }))
  }

  const handleCopyDayToAll = (sourceDia: number) => {
    if (!isWeekOpen) return
    const sourceSlots = slotsByDay[sourceDia]
    const sourceHores = horesPerDia[sourceDia]

    const updatedSlots = { ...slotsByDay }
    const updatedHores = { ...horesPerDia }

    for (let d = 0; d < 7; d++) {
      if (d !== sourceDia) {
        updatedHores[d] = sourceHores
        updatedSlots[d] = sourceSlots.map(s => ({
          ...s,
          dia: d,
          durada_hores: sourceHores
        }))
      }
    }

    setSlotsByDay(updatedSlots)
    setHoresPerDia(updatedHores)
    showNotification('success', `S'han copiat les hores i activitats de ${DIES_SETMANA[sourceDia]} a tota la setmana.`)
  }

  const handleSave = async (completada: boolean = false) => {
    setIsSaving(true)
    const estat = completada ? 'completada' : 'esborrany'

    const allSlots: SlotEntry[] = []
    Object.keys(slotsByDay).forEach(diaKey => {
      const d = parseInt(diaKey)
      slotsByDay[d].forEach((slot, idx) => {
        allSlots.push({
          ...slot,
          dia: d,
          ordre: idx,
          durada_hores: horesPerDia[d] || slot.durada_hores || 1.0
        })
      })
    })

    try {
      await saveSubmission({
        week_start: currentWeekStart,
        notes_setmana: notesSetmana,
        estat,
        slots: allSlots
      })
      setSubmissionEstat(estat)
      showNotification('success', completada ? 'Disponibilitat completada i enviada a l’entrenador!' : 'Esborrany desat correctament.')
    } catch (err) {
      console.error('Error saving submission:', err)
      showNotification('error', 'Error en guardar la disponibilitat.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleApplyTemplate = () => {
    if (!selectedTemplateId) return
    const t = templates.find(temp => temp.id === selectedTemplateId)
    if (!t) return

    const newSlots: { [day: number]: SlotEntry[] } = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    }
    const newHores: { [day: number]: number } = {
      0: 1.0, 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0
    }

    t.slots.forEach(ts => {
      const act = activitats.find(a => a.id === ts.activitat_id)
      if (newSlots[ts.dia]) {
        newSlots[ts.dia].push({
          dia: ts.dia,
          ordre: ts.ordre,
          activitat_id: ts.activitat_id,
          durada_hores: ts.durada_hores,
          notes: ts.notes || '',
          activitat_nom: act?.nom || 'Activitat',
          activitat_icona: act?.icona || 'ti ti-activity',
          activitat_color: act?.color || '#e3001b'
        })
        newHores[ts.dia] = ts.durada_hores
      }
    })

    setSlotsByDay(newSlots)
    setHoresPerDia(newHores)
    showNotification('success', `Plantilla "${t.nom}" aplicada amb èxit!`)
    setSelectedTemplateId('')
  }

  const handleSaveTemplate = async () => {
    if (!newTemplateNom.trim()) return
    const templateSlots: WeekTemplate['slots'] = []
    Object.keys(slotsByDay).forEach(diaKey => {
      const d = parseInt(diaKey)
      slotsByDay[d].forEach((s, idx) => {
        templateSlots.push({
          dia: d,
          ordre: idx,
          activitat_id: s.activitat_id,
          durada_hores: horesPerDia[d] || s.durada_hores || 1.0,
          notes: s.notes
        })
      })
    })

    try {
      const created = await createWeekTemplate(newTemplateNom.trim(), templateSlots)
      setTemplates(prev => [...prev, created])
      setNewTemplateNom('')
      setShowSaveTemplateModal(false)
      showNotification('success', 'Plantilla desada correctament!')
    } catch (err) {
      console.error('Error saving template:', err)
      showNotification('error', 'Error desant la plantilla.')
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteWeekTemplate(id)
      setTemplates(prev => prev.filter(t => t.id !== id))
      showNotification('success', 'Plantilla eliminada.')
    } catch (err) {
      console.error('Error deleting template:', err)
      showNotification('error', 'No s\'ha pogut eliminar la plantilla.')
    }
  }

  // Calculate total hours
  const totalHores = Object.keys(slotsByDay).reduce((acc, diaKey) => {
    const d = parseInt(diaKey)
    return acc + (slotsByDay[d].length > 0 ? (horesPerDia[d] || 0) : 0)
  }, 0)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-text-muted font-medium">Carregant el teu calendari...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {feedbackMsg && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 border animate-fade-in ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span className="text-sm font-semibold">{feedbackMsg.text}</span>
        </div>
      )}

      {/* Wellness Reminder Banner */}
      <div className="glass-card p-4 bg-gradient-to-r from-emerald-500/10 via-brand-500/5 to-transparent border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm sm:text-base text-text-primary">Check-in Setmanal de Wellness</h4>
            <p className="text-xs text-text-muted">No oblidis enviar el teu protocol de fatiga i zones de dolor d'aquesta setmana.</p>
          </div>
        </div>
        <Link 
          to="/wellness" 
          className="btn-primary text-xs sm:text-sm py-2 px-3.5 shrink-0 flex items-center gap-1.5 self-end sm:self-center"
        >
          <Sparkles className="w-4 h-4" /> Fer Check-in
        </Link>
      </div>

      {/* Header & Week Navigation */}
      <div className="glass-card p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-between md:justify-start">
          <button 
            onClick={() => {
              const idx = weeks.findIndex(w => w.week_start === currentWeekStart)
              if (idx > 0) setCurrentWeekStart(weeks[idx - 1].week_start)
            }}
            disabled={weeks.findIndex(w => w.week_start === currentWeekStart) <= 0}
            className="p-2 rounded-xl bg-white/60 hover:bg-white text-text-primary border border-border-light shadow-sm disabled:opacity-40 transition-colors"
            title="Setmana anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h2 className="text-base sm:text-xl font-bold text-text-primary flex items-center justify-center gap-2">
              <CalendarIcon className="w-5 h-5 text-brand-500" />
              Setmana {formatDate(currentWeekStart)} - {formatDate(currentWeekStart, 6)}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isWeekOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
              }`}>
                Setmana {currentWeek?.estat || 'Oberta'}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                submissionEstat === 'completada' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {submissionEstat === 'completada' ? 'Enviada' : 'Esborrany'}
              </span>
              <span className="text-xs text-text-muted font-medium">
                Total: <strong className="text-brand-600">{totalHores}h</strong>
              </span>
            </div>
          </div>

          <button 
            onClick={() => {
              const idx = weeks.findIndex(w => w.week_start === currentWeekStart)
              if (idx >= 0 && idx < weeks.length - 1) setCurrentWeekStart(weeks[idx + 1].week_start)
            }}
            disabled={weeks.findIndex(w => w.week_start === currentWeekStart) >= weeks.length - 1}
            className="p-2 rounded-xl bg-white/60 hover:bg-white text-text-primary border border-border-light shadow-sm disabled:opacity-40 transition-colors"
            title="Setmana següent"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Templates Bar */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap justify-end">
          {templates.length > 0 && (
            <select
              value={selectedTemplateId}
              onChange={(e) => {
                setSelectedTemplateId(e.target.value)
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/80 border border-border-light text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="">Aplica una plantilla...</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.nom}</option>
              ))}
            </select>
          )}

          {selectedTemplateId && (
            <button
              onClick={handleApplyTemplate}
              className="btn-primary text-xs py-1.5 px-3"
            >
              Aplicar
            </button>
          )}

          <button
            onClick={() => setShowSaveTemplateModal(true)}
            className="p-2 rounded-xl bg-white/60 hover:bg-white text-text-secondary hover:text-brand-600 border border-border-light shadow-sm text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Desar com a plantilla"
          >
            <Bookmark className="w-4 h-4" />
            <span className="hidden sm:inline">Desar plantilla</span>
          </button>

          {templates.length > 0 && (
            <button
              onClick={() => setShowManageTemplatesModal(true)}
              className="p-2 rounded-xl bg-white/60 hover:bg-white text-text-secondary hover:text-text-primary border border-border-light shadow-sm text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Gestionar plantilles"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Activity Palette (Sticky / Interactive Selection) */}
      <div className="glass-card p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-brand-500" /> Paleta d'Activitats
          </span>
          <span className="text-[11px] text-text-muted">
            Tria una activitat i afegeix-la al dia desitjat
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {activitats.map(act => {
            const isSelected = selectedActivity?.id === act.id
            return (
              <button
                key={act.id}
                onClick={() => setSelectedActivity(act)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all shadow-sm border ${
                  isSelected 
                    ? 'border-brand-500 ring-2 ring-brand-500/30 scale-105' 
                    : 'border-border-light hover:border-slate-300 bg-white/70'
                }`}
                style={{
                  backgroundColor: isSelected ? `${act.color}15` : undefined,
                  color: act.color || '#1e293b'
                }}
              >
                <span 
                  className="w-3 h-3 rounded-full shrink-0" 
                  style={{ backgroundColor: act.color || '#e3001b' }}
                />
                {act.nom}
              </button>
            )
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* DESKTOP CALENDAR VIEW (>= 768px: 7 Column Grid) */}
      {/* ============================================================ */}
      <div className="hidden md:grid grid-cols-7 gap-3">
        {DIES_SETMANA.map((nomDia, diaIndex) => {
          const slots = slotsByDay[diaIndex] || []
          const hores = horesPerDia[diaIndex] || 1.0

          return (
            <div 
              key={nomDia}
              className="glass-card p-3 flex flex-col justify-between min-h-[380px] border border-border-light/60 hover:border-brand-500/40 transition-all group"
            >
              {/* Day Header */}
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-border-light">
                  <div>
                    <span className="font-bold text-sm text-text-primary">{nomDia.substring(0, 3)}</span>
                    <span className="text-[11px] text-text-muted ml-1.5">{formatDate(currentWeekStart, diaIndex)}</span>
                  </div>
                  <button 
                    onClick={() => handleCopyDayToAll(diaIndex)}
                    title={`Copiar ${nomDia} a tota la setmana`}
                    className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-brand-600 transition-opacity"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Duration selector */}
                <div className="flex items-center justify-between mt-2 mb-3 bg-bg-surface/60 px-2 py-1 rounded-lg border border-border-light text-xs">
                  <span className="text-text-muted flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3" /> Durada:
                  </span>
                  <select
                    value={hores}
                    onChange={(e) => handleSetHoresDia(diaIndex, parseFloat(e.target.value))}
                    disabled={!isWeekOpen}
                    className="bg-transparent font-bold text-text-primary focus:outline-none cursor-pointer"
                  >
                    {DURADES_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Slots List */}
                <div className="space-y-2">
                  {slots.map((slot, sIdx) => (
                    <div 
                      key={sIdx}
                      className="p-2 rounded-xl bg-white shadow-sm border border-border-light text-xs space-y-1 relative group/slot animate-scale-up"
                    >
                      <div className="flex items-center justify-between">
                        <span 
                          className="font-bold flex items-center gap-1.5"
                          style={{ color: slot.activitat_color || '#1e293b' }}
                        >
                          <span 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: slot.activitat_color || '#e3001b' }}
                          />
                          {slot.activitat_nom || 'Activitat'}
                        </span>
                        {isWeekOpen && (
                          <button 
                            onClick={() => handleRemoveSlot(diaIndex, sIdx)}
                            className="text-text-muted hover:text-rose-600 transition-colors"
                            title="Eliminar franja"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        placeholder="Notes franja..."
                        value={slot.notes || ''}
                        onChange={(e) => handleUpdateSlotNotes(diaIndex, sIdx, e.target.value)}
                        disabled={!isWeekOpen}
                        className="w-full text-[11px] bg-bg-surface/50 border border-transparent focus:border-border-light focus:bg-white rounded px-1.5 py-0.5 outline-none transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Button */}
              {isWeekOpen && (
                <button
                  onClick={() => handleAddActivityToDay(diaIndex)}
                  className="mt-3 w-full py-2 border-2 border-dashed border-border-light hover:border-brand-500/50 hover:bg-brand-50/20 text-text-muted hover:text-brand-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Afegir
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* ============================================================ */}
      {/* MOBILE CALENDAR VIEW (< 768px: Touch Accordion Cards) */}
      {/* ============================================================ */}
      <div className="block md:hidden space-y-3">
        {DIES_SETMANA.map((nomDia, diaIndex) => {
          const slots = slotsByDay[diaIndex] || []
          const hores = horesPerDia[diaIndex] || 1.0
          const isOpen = expandedDays[diaIndex]

          return (
            <div 
              key={nomDia}
              className="glass-card overflow-hidden border border-border-light"
            >
              {/* Accordion Bar */}
              <div 
                onClick={() => toggleDayAccordion(diaIndex)}
                className="p-3.5 flex items-center justify-between cursor-pointer select-none bg-white/40 active:bg-white/80"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-sm text-text-primary">{nomDia}</span>
                  <span className="text-xs text-text-muted">{formatDate(currentWeekStart, diaIndex)}</span>
                  {slots.length > 0 && (
                    <span className="bg-brand-100 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {slots.length} {slots.length === 1 ? 'activitat' : 'activitats'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={hores}
                    onChange={(e) => handleSetHoresDia(diaIndex, parseFloat(e.target.value))}
                    disabled={!isWeekOpen}
                    className="text-xs font-bold px-2 py-1 rounded-lg bg-white border border-border-light text-text-primary shadow-sm"
                  >
                    {DURADES_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleCopyDayToAll(diaIndex)}
                    title="Copiar dia"
                    className="p-1.5 rounded-lg bg-white border border-border-light text-text-muted hover:text-brand-600 shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Accordion Content */}
              {isOpen && (
                <div className="p-3.5 pt-1 space-y-2.5 bg-bg-surface/30 border-t border-border-light/60">
                  {slots.length === 0 ? (
                    <p className="text-xs text-text-muted italic py-1">Cap activitat afegida per aquest dia.</p>
                  ) : (
                    slots.map((slot, sIdx) => (
                      <div 
                        key={sIdx}
                        className="p-2.5 rounded-xl bg-white shadow-sm border border-border-light flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span 
                            className="font-bold text-xs flex items-center gap-2"
                            style={{ color: slot.activitat_color || '#1e293b' }}
                          >
                            <span 
                              className="w-2.5 h-2.5 rounded-full" 
                              style={{ backgroundColor: slot.activitat_color || '#e3001b' }}
                            />
                            {slot.activitat_nom}
                          </span>
                          {isWeekOpen && (
                            <button 
                              onClick={() => handleRemoveSlot(diaIndex, sIdx)}
                              className="text-text-muted hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          placeholder="Afegeix notes de la franja (ex: rodatge suau)..."
                          value={slot.notes || ''}
                          onChange={(e) => handleUpdateSlotNotes(diaIndex, sIdx, e.target.value)}
                          disabled={!isWeekOpen}
                          className="w-full text-xs bg-bg-surface/60 border border-border-light rounded-lg px-2.5 py-1.5 focus:bg-white outline-none"
                        />
                      </div>
                    ))
                  )}

                  {isWeekOpen && (
                    <button
                      onClick={() => handleAddActivityToDay(diaIndex)}
                      className="w-full py-2.5 bg-white border border-border-light hover:border-brand-500 rounded-xl text-xs font-bold text-brand-600 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform"
                    >
                      <Plus className="w-4 h-4" />
                      Afegir {selectedActivity ? selectedActivity.nom : 'Activitat'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Week Notes */}
      <div className="glass-card p-4 sm:p-6 space-y-2">
        <label className="block text-sm font-bold text-text-primary">
          Notes generals de la setmana per a l'entrenador
        </label>
        <textarea
          rows={3}
          value={notesSetmana}
          onChange={(e) => setNotesSetmana(e.target.value)}
          disabled={!isWeekOpen}
          placeholder="Ex: Aquesta setmana tindré menys temps el dijous per feina, el cap de setmana puc fer tirada llarga..."
          className="w-full text-sm p-3 rounded-xl bg-white/70 border border-border-light focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {/* Action Buttons */}
      {isWeekOpen && (
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-border-light bg-white text-text-primary hover:bg-bg-hover text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Desar com a Esborrany
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="w-full sm:w-auto btn-primary text-sm py-2.5 px-6 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" /> Completar Disponibilitat
          </button>
        </div>
      )}

      {/* Modal: Save Template */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 animate-scale-up">
            <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-brand-500" /> Desar com a Plantilla
            </h3>
            <p className="text-xs text-text-muted">
              Posa un nom a aquesta disposició setmanal per poder-la aplicar fàcilment qualsevol altra setmana.
            </p>
            <input
              type="text"
              placeholder="Ex: Setmana estàndard, Setmana de càrrega..."
              value={newTemplateNom}
              onChange={(e) => setNewTemplateNom(e.target.value)}
              className="w-full text-sm p-3 rounded-xl border border-border-light focus:ring-2 focus:ring-brand-500/30 outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary rounded-xl"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!newTemplateNom.trim()}
                className="btn-primary text-xs py-2 px-4 disabled:opacity-50"
              >
                Desar Plantilla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manage Templates */}
      {showManageTemplatesModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 animate-scale-up">
            <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand-500" /> Les meves Plantilles
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {templates.map(t => (
                <div key={t.id} className="p-3 rounded-xl bg-bg-surface flex items-center justify-between border border-border-light">
                  <span className="text-sm font-semibold text-text-primary">{t.nom}</span>
                  <button
                    onClick={() => handleDeleteTemplate(t.id)}
                    className="text-text-muted hover:text-rose-600 p-1"
                    title="Eliminar plantilla"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowManageTemplatesModal(false)}
                className="btn-primary text-xs py-2 px-4"
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
