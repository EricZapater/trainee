import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FileText, 
  Plus, 
  Copy, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Users, 
  Edit3, 
  CopyCheck, 
  Check,
  X
} from 'lucide-react'
import { 
  listForms, 
  createForm, 
  deleteForm, 
  cloneForm, 
  type FormWithQuestions 
} from '../api/forms'

export const FormsManagerPage: React.FC = () => {
  const navigate = useNavigate()
  const [forms, setForms] = useState<FormWithQuestions[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Create form modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newActiu, setNewActiu] = useState(true)
  const [newNotify, setNewNotify] = useState(true)
  const [creating, setCreating] = useState(false)

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadForms = async () => {
    setLoading(true)
    try {
      const data = await listForms()
      setForms(data)
    } catch {
      showToast('Error en carregar els formularis', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadForms()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    setCreating(true)
    try {
      const created = await createForm(newTitle.trim(), newDesc.trim() || null, newActiu, [], newNotify)
      showToast('Formulari creat correctament! Redirigint al constructor...')
      setCreateModalOpen(false)
      setNewTitle('')
      setNewDesc('')
      navigate(`/entrenador/forms/${created.id}/edit`)
    } catch {
      showToast('No s\'ha pogut crear el formulari', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Segur que vols eliminar el formulari "${title}"? Aquesta acció no es pot desfer.`)) return
    try {
      await deleteForm(id)
      showToast('Formulari eliminat correctament')
      setForms(prev => prev.filter(f => f.id !== id))
    } catch {
      showToast('Error en eliminar el formulari', 'error')
    }
  }

  const handleClone = async (id: string) => {
    try {
      const res = await cloneForm(id)
      showToast('Formulari duplicat amb èxit!')
      await loadForms()
      navigate(`/entrenador/forms/${res.id}/edit`)
    } catch {
      showToast('Error en duplicar el formulari', 'error')
    }
  }

  const handleCopyLink = (form: FormWithQuestions) => {
    const publicUrl = `${window.location.origin}/forms/${form.id}`
    navigator.clipboard.writeText(publicUrl)
    setCopiedId(form.id)
    showToast('Enllaç públic copiat al porta-retalls!')
    setTimeout(() => setCopiedId(null), 2500)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 border animate-fade-in ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">Formularis Dinàmics & Captació</h1>
          </div>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Crea qüestionaris d'alta, enquestes d'admissió i gestiona les candidatures dels aspirants.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="btn-primary text-sm py-2.5 px-4 w-full sm:w-auto flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Nou Formulari</span>
        </button>
      </div>

      {/* Forms Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-text-muted text-sm font-medium">Carregant formularis...</p>
        </div>
      ) : forms.length === 0 ? (
        <div className="glass-card p-12 text-center text-text-muted space-y-3">
          <FileText className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-text-primary">Encara no hi ha cap formulari creat</h3>
          <p className="text-xs max-w-sm mx-auto">
            Crea el teu primer qüestionari per compartir-lo amb nous atletes o recopilar dades de l'equip.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-4 font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>Crear primer formulari</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {forms.map(form => (
            <div 
              key={form.id} 
              className="glass-card p-5 flex flex-col justify-between hover:border-brand-300 transition-all shadow-sm hover:shadow-md group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    form.actiu 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}>
                    {form.actiu ? 'Actiu' : 'Esborrany'}
                  </span>
                  
                  <span className="text-[11px] text-text-muted font-medium">
                    {new Date(form.created_at).toLocaleDateString('ca-ES')}
                  </span>
                </div>

                <h3 className="text-base font-bold text-text-primary group-hover:text-brand-600 transition-colors line-clamp-1">
                  {form.titol}
                </h3>
                
                <p className="text-xs text-text-secondary mt-1 line-clamp-2 min-h-[2rem]">
                  {form.descripcio || 'Sense descripció.'}
                </p>

                <div className="mt-4 flex items-center gap-4 text-xs text-text-secondary py-2 px-3 bg-bg-hover/70 rounded-xl border border-border">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-brand-500" />
                    <span><strong>{form.questions?.length || 0}</strong> preguntes</span>
                  </div>
                  <div className="w-px h-3 bg-border" />
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span><strong>{form.responses_count || 0}</strong> respostes</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3.5 border-t border-border flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => navigate(`/entrenador/forms/${form.id}/edit`)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl text-xs font-bold transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Constructor</span>
                  </button>

                  <button
                    onClick={() => navigate(`/entrenador/forms/${form.id}/responses`)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-bg-surface hover:bg-bg-hover text-text-primary border border-border rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <Users className="w-3.5 h-3.5 text-text-muted" />
                    <span>Respostes ({form.responses_count || 0})</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-1 pt-1">
                  <button
                    onClick={() => handleCopyLink(form)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-hover transition"
                    title="Copiar enllaç públic"
                  >
                    {copiedId === form.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copiat!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-text-muted" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`/forms/${form.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-text-muted hover:text-brand-600 hover:bg-bg-hover rounded-lg transition"
                    title="Previsualitzar vista pública"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => handleClone(form.id)}
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition"
                    title="Duplicar formulari"
                  >
                    <CopyCheck className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(form.id, form.titol)}
                    className="p-1.5 text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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

      {/* Create Form Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card bg-white p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-500" />
                <span>Crear Nou Formulari</span>
              </h3>
              <button 
                onClick={() => setCreateModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Títol del Formulari *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Formulari d'Ingrés Temporada 2026/27"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-bg-surface border border-border rounded-xl px-3.5 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Descripció o Benvinguda (opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Explica als candidats el propòsit d'aquest qüestionari..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full bg-bg-surface border border-border rounded-xl px-3.5 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-sm"
                />
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newActiu}
                    onChange={e => setNewActiu(e.target.checked)}
                    className="w-4 h-4 text-brand-500 rounded border-border focus:ring-0"
                  />
                  <div>
                    <span className="text-sm font-bold text-text-primary">Publicar immediatament (Actiu)</span>
                    <p className="text-xs text-text-muted">Si està desmarcat es desarà com a esborrany.</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newNotify}
                    onChange={e => setNewNotify(e.target.checked)}
                    className="w-4 h-4 text-brand-500 rounded border-border focus:ring-0"
                  />
                  <div>
                    <span className="text-sm font-bold text-text-primary">Notificar entrenadors per correu</span>
                    <p className="text-xs text-text-muted">Envia un avís a l'equip tècnic a cada nova inscripció.</p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-hover rounded-xl border border-border transition"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Continuar al Constructor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
