import React, { useState, useEffect } from 'react'
import api from '../api/client'
import { 
  Activity, 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  X, 
  Check,
  Palette
} from 'lucide-react'
import type { Activitat } from '../types'

export const ActivitatsManagerPage: React.FC = () => {
  const [activitats, setActivitats] = useState<Activitat[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAct, setEditingAct] = useState<Activitat | null>(null)
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState('#e3001b')
  const [formIcon, setFormIcon] = useState('ti-run')
  const [submitting, setSubmitting] = useState(false)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.get<Activitat[]>('/entrenador/activitats')
      setActivitats(res.data || [])
    } catch (err) {
      console.error(err)
      showToast('Error carregant les activitats', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openCreateModal = () => {
    setEditingAct(null)
    setFormName('')
    setFormColor('#e3001b')
    setFormIcon('ti-run')
    setModalOpen(true)
  }

  const openEditModal = (act: Activitat) => {
    setEditingAct(act)
    setFormName(act.nom)
    setFormColor(act.color || '#e3001b')
    setFormIcon(act.icona || 'ti-run')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return

    setSubmitting(true)
    try {
      if (editingAct) {
        await api.patch(`/entrenador/activitats/${editingAct.id}`, {
          nom: formName.trim(),
          color: formColor,
          icona: formIcon
        })
        showToast('Activitat actualitzada')
      } else {
        await api.post('/entrenador/activitats', {
          nom: formName.trim(),
          color: formColor,
          icona: formIcon
        })
        showToast('Activitat creada correctament')
      }
      setModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Error desant l\'activitat', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (act: Activitat) => {
    const nextState = !act.activa
    try {
      await api.patch(`/entrenador/activitats/${act.id}`, { activa: nextState })
      setActivitats(prev => prev.map(a => a.id === act.id ? { ...a, activa: nextState } : a))
      showToast(nextState ? 'Activitat habilitada' : 'Activitat deshabilitada')
    } catch (err) {
      showToast('Error canviant l\'estat de l\'activitat', 'error')
    }
  }

  const handleDelete = async (act: Activitat) => {
    if (!window.confirm(`Segur que vols eliminar l'activitat "${act.nom}"?`)) return
    try {
      await api.delete(`/entrenador/activitats/${act.id}`)
      showToast('Activitat eliminada')
      loadData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'No s\'ha pogut eliminar l\'activitat', 'error')
    }
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= activitats.length) return

    const newItems = [...activitats]
    const temp = newItems[index]
    newItems[index] = newItems[targetIndex]
    newItems[targetIndex] = temp

    setActivitats(newItems)

    try {
      const payload = newItems.map((item, idx) => ({ id: item.id, ordre: idx }))
      await api.patch('/entrenador/activitats/reorder', payload)
    } catch (err) {
      showToast('Error reordenant activitats', 'error')
      loadData()
    }
  }

  const presetColors = ['#e3001b', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b']

  return (
    <div className="space-y-6 pb-12">
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
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">Gestor d'Activitats i Esports</h1>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Configura el catàleg de disciplines disponibles per al calendari setmanal dels atletes.
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center justify-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nova Activitat
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-3" />
          <p className="text-sm font-semibold">Carregant activitats...</p>
        </div>
      ) : activitats.length === 0 ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Activity className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
          <h3 className="text-base font-bold text-text-primary">Cap activitat configurada</h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            Crea la teva primera activitat com Còrrer, Ciclisme, Natació, Gimnàs, etc.
          </p>
        </div>
      ) : (
        <div className="glass-card divide-y divide-border overflow-hidden">
          {activitats.map((act, index) => (
            <div 
              key={act.id} 
              className={`p-4 flex items-center justify-between gap-3 transition-colors ${
                !act.activa ? 'bg-bg-base/40 opacity-70' : 'hover:bg-bg-hover/60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-sm"
                  style={{ backgroundColor: act.color || '#e3001b' }}
                >
                  <Activity className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">{act.nom}</p>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span 
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: act.color || '#e3001b' }}
                    />
                    <span>{act.color}</span>
                    <span>•</span>
                    <span className={act.activa ? 'text-emerald-600 font-semibold' : 'text-text-muted'}>
                      {act.activa ? 'Activa' : 'Desactivada'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  disabled={index === 0}
                  onClick={() => handleMove(index, 'up')}
                  className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30 rounded-lg hover:bg-bg-hover"
                  title="Pujar ordre"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  disabled={index === activitats.length - 1}
                  onClick={() => handleMove(index, 'down')}
                  className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30 rounded-lg hover:bg-bg-hover"
                  title="Baixar ordre"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleToggleActive(act)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                    act.activa 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {act.activa ? 'Activa' : 'Inactiva'}
                </button>

                <button
                  onClick={() => openEditModal(act)}
                  className="p-1.5 text-text-secondary hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  title="Editar"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(act)}
                  className="p-1.5 text-text-secondary hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar Activitat */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card bg-bg-surface w-full max-w-md p-6 rounded-2xl shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                <Palette className="w-4 h-4 text-brand-500" />
                {editingAct ? 'Editar Activitat' : 'Nova Activitat'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Nom de la disciplina <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Trail Running o Ciclisme de Carretera"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Color d'identificació
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formColor}
                    onChange={e => setFormColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-border p-1 bg-bg-base"
                  />
                  <input
                    type="text"
                    value={formColor}
                    onChange={e => setFormColor(e.target.value)}
                    className="flex-1 px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none uppercase"
                  />
                </div>
                {/* Preset color chips */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {presetColors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                        formColor.toLowerCase() === c.toLowerCase() ? 'border-text-primary scale-110' : 'border-white'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formName.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {editingAct ? 'Guardar Canvis' : 'Crear Activitat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
