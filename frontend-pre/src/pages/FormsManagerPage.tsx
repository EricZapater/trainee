import React, { useState, useEffect } from 'react'
import { 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  X, 
  Check, 
  MessageSquare
} from 'lucide-react'
import { getForms, createForm, deleteForm, updateForm, type FormWithQuestions } from '../api/forms'

export const FormsManagerPage: React.FC = () => {
  const [forms, setForms] = useState<FormWithQuestions[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getForms()
      setForms(data || [])
    } catch (err) {
      console.error(err)
      showToast('Error carregant els formularis', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) return

    setSubmitting(true)
    try {
      await createForm({
        titol: formTitle.trim(),
        descripcio: formDesc.trim() || null,
        actiu: true,
        notificar_entrenadors: true
      })
      showToast('Formulari creat correctament!')
      setCreateModalOpen(false)
      setFormTitle('')
      setFormDesc('')
      loadData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Error creant formulari', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (form: FormWithQuestions) => {
    try {
      await updateForm(form.id, { actiu: !form.actiu })
      setForms(prev => prev.map(f => f.id === form.id ? { ...f, actiu: !f.actiu } : f))
      showToast(form.actiu ? 'Formulari desactivat' : 'Formulari activat')
    } catch (err) {
      showToast('Error actualitzant estat del formulari', 'error')
    }
  }

  const handleDelete = async (form: FormWithQuestions) => {
    if (!window.confirm(`Segur que vols eliminar el formulari "${form.titol}"?`)) return
    try {
      await deleteForm(form.id)
      showToast('Formulari eliminat')
      loadData()
    } catch (err) {
      showToast('Error eliminant el formulari', 'error')
    }
  }

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
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">Formularis i Enquestes Dinàmiques</h1>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Qüestionaris d'ingrés, enquestes d'objectius anuals i valoració d'atletes.
            </p>
          </div>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center justify-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nou Formulari
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-3" />
          <p className="text-sm font-semibold">Carregant formularis...</p>
        </div>
      ) : forms.length === 0 ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
          <h3 className="text-base font-bold text-text-primary">Cap formulari disponible</h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            Crea qüestionaris personalitzats per recollir informació dels teus esportistes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map(form => (
            <div 
              key={form.id} 
              className={`glass-card p-5 flex flex-col justify-between space-y-4 hover:border-brand-400 transition-all ${
                !form.actiu ? 'opacity-70 bg-bg-base/50' : ''
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-text-primary leading-tight">{form.titol}</h3>
                  <button
                    onClick={() => handleToggleActive(form)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      form.actiu ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {form.actiu ? 'Actiu' : 'Pausat'}
                  </button>
                </div>

                {form.descripcio && (
                  <p className="text-xs text-text-secondary line-clamp-3">
                    {form.descripcio}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-text-muted pt-1">
                  <span className="flex items-center gap-1 font-semibold text-text-secondary">
                    <MessageSquare className="w-3.5 h-3.5 text-brand-500" />
                    {form.responses_count || 0} respostes
                  </span>
                  <span>•</span>
                  <span>{form.questions?.length || 0} preguntes</span>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between gap-2 text-xs">
                <span className="text-[11px] text-text-muted">
                  {new Date(form.created_at).toLocaleDateString('ca-ES')}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(form)}
                    className="p-1.5 text-text-muted hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Eliminar formulari"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear Formulari */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card bg-bg-surface w-full max-w-md p-6 rounded-2xl shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-brand-500" />
                Crear Nou Formulari
              </h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-text-muted hover:text-text-primary p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Títol del formulari <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Qüestionari d'alta d'atleta nou"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Descripció o instruccions
                </label>
                <textarea
                  rows={3}
                  placeholder="Explica als atletes l'objectiu del qüestionari..."
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formTitle.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Crear Formulari
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
