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
  Check
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Alert */}
      {toast && (
        <div className={`p-4 rounded-xl text-sm flex items-center justify-between shadow-lg transition-all border ${
          toast.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100 font-bold">&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Formularis Dinàmics & Captació</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Crea qüestionaris personalitzats d'alta, enquestes d'admissió i gestiona les candidatures dels nous atletes.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition shadow-lg shadow-indigo-600/20 active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Nou Formulari</span>
        </button>
      </div>

      {/* Forms Grid / List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm">Carregant formularis dinàmics...</p>
        </div>
      ) : forms.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 space-y-4">
          <FileText className="w-12 h-12 mx-auto text-slate-600" />
          <h3 className="text-lg font-semibold text-white">Encara no hi ha cap formulari</h3>
          <p className="text-sm max-w-md mx-auto">
            Crea el teu primer formulari dinàmic per compartir-lo amb nous aspirants o recopilar dades específiques del teu equip.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition"
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
              className="bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-slate-700/80 transition-all p-5 flex flex-col justify-between group shadow-sm hover:shadow-indigo-500/5"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                    form.actiu 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {form.actiu ? 'Actiu & Públic' : 'Inactiu / Esborrany'}
                  </span>
                  
                  <span className="text-xs text-slate-400">
                    {new Date(form.created_at).toLocaleDateString('ca-ES')}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                  {form.titol}
                </h3>
                
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 min-h-[2rem]">
                  {form.descripcio || 'Sense descripció addicional.'}
                </p>

                <div className="mt-4 flex items-center gap-4 text-xs text-slate-300 py-2 px-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span><strong>{form.questions?.length || 0}</strong> preguntes</span>
                  </div>
                  <div className="w-px h-3 bg-slate-700" />
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span><strong>{form.responses_count || 0}</strong> respostes</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => navigate(`/entrenador/forms/${form.id}/edit`)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 rounded-xl text-xs font-semibold transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Constructor</span>
                  </button>

                  <button
                    onClick={() => navigate(`/entrenador/forms/${form.id}/responses`)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Respostes ({form.responses_count || 0})</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => handleCopyLink(form)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
                    title="Copiar enllaç públic"
                  >
                    {copiedId === form.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiat!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`/forms/${form.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                    title="Obrir vista pública"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => handleClone(form.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                    title="Duplicar formulari"
                  >
                    <CopyCheck className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(form.id, form.titol)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span>Crear Nou Formulari Dinàmic</span>
              </h3>
              <button 
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Títol del Formulari *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Formulari d'Ingrés Temporada 2026/27"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Descripció o Benvinguda (opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Explica breument als atletes el propòsit d'aquest qüestionari..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newActiu}
                    onChange={e => setNewActiu(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded bg-slate-950 border-slate-800 focus:ring-0"
                  />
                  <div>
                    <span className="text-sm font-medium text-white">Publicar immediatament (Actiu)</span>
                    <p className="text-xs text-slate-400">Si està desmarcat es desarà com a esborrany privat.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newNotify}
                    onChange={e => setNewNotify(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded bg-slate-950 border-slate-800 focus:ring-0"
                  />
                  <div>
                    <span className="text-sm font-medium text-white">Notificar entrenadors per correu</span>
                    <p className="text-xs text-slate-400">Envia un avís a l'equip tècnic en rebre cada nova resposta.</p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition flex items-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
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
