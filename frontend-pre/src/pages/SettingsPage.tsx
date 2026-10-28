import React, { useState, useEffect } from 'react'
import { 
  Settings, 
  Clock, 
  Bell, 
  Calendar, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2
} from 'lucide-react'
import { getCronSettings, updateCronSettings, type SystemSettings } from '../api/settings'

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    week_generator: { time: '00:00', days: [1], enabled: false },
    reminder_cron: { time: '06:00', days: [0], enabled: false }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const dayOptions = [
    { label: 'Dilluns', value: 1 },
    { label: 'Dimarts', value: 2 },
    { label: 'Dimecres', value: 3 },
    { label: 'Dijous', value: 4 },
    { label: 'Divendres', value: 5 },
    { label: 'Dissabte', value: 6 },
    { label: 'Diumenge', value: 0 }
  ]

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getCronSettings()
      setSettings(data)
    } catch (err) {
      console.error(err)
      showToast('Error carregant la configuració del sistema', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await updateCronSettings(settings)
      showToast(res.message || 'Configuració desada correctament')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Error desant la configuració', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (target: 'week_generator' | 'reminder_cron', dayVal: number) => {
    setSettings(prev => {
      const currentDays = prev[target].days || []
      const hasDay = currentDays.includes(dayVal)
      const nextDays = hasDay ? currentDays.filter(d => d !== dayVal) : [...currentDays, dayVal]
      return {
        ...prev,
        [target]: {
          ...prev[target],
          days: nextDays
        }
      }
    })
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div 
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 animate-fade-in ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">Configuració del Sistema</h1>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Automatitza la generació de setmanes i els recordatoris periòdics als atletes.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center justify-center gap-2 transition-all shrink-0 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar Canvis
        </button>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-3" />
          <p className="text-sm font-semibold">Carregant configuració...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card: Generador Automàtic de Setmanes */}
          <div className="glass-card p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-text-primary">Creació Automàtica de Setmanes</h3>
                  <p className="text-xs text-text-muted">Genera de forma recurrent les noves setmanes buides per a la planificació.</p>
                </div>
              </div>

              {/* Toggle */}
              <button
                type="button"
                onClick={() => setSettings(prev => ({
                  ...prev,
                  week_generator: { ...prev.week_generator, enabled: !prev.week_generator.enabled }
                }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.week_generator.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.week_generator.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${!settings.week_generator.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Hora d'execució
                </label>
                <input
                  type="time"
                  value={settings.week_generator.time}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    week_generator: { ...prev.week_generator, time: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">
                  Dies de la setmana
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {dayOptions.map(day => {
                    const active = (settings.week_generator.days || []).includes(day.value)
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay('week_generator', day.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          active
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-bg-base text-text-secondary border border-border hover:bg-bg-hover'
                        }`}
                      >
                        {day.label.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card: Recordatori Automàtic (Reminder Cron) */}
          <div className="glass-card p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-text-primary">Recordatoris Automàtics de Diumenge</h3>
                  <p className="text-xs text-text-muted">Envia alertes per correu als atletes que encara no han completat el calendari.</p>
                </div>
              </div>

              {/* Toggle */}
              <button
                type="button"
                onClick={() => setSettings(prev => ({
                  ...prev,
                  reminder_cron: { ...prev.reminder_cron, enabled: !prev.reminder_cron.enabled }
                }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.reminder_cron.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.reminder_cron.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${!settings.reminder_cron.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Hora d'execució
                </label>
                <input
                  type="time"
                  value={settings.reminder_cron.time}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    reminder_cron: { ...prev.reminder_cron, time: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">
                  Dies de la setmana
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {dayOptions.map(day => {
                    const active = (settings.reminder_cron.days || []).includes(day.value)
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay('reminder_cron', day.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          active
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-bg-base text-text-secondary border border-border hover:bg-bg-hover'
                        }`}
                      >
                        {day.label.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
