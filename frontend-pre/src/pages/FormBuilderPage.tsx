import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink, 
  Copy, 
  Check, 
  Lock, 
  CopyCheck, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  Users,
  Settings,
  FileQuestion,
  X
} from 'lucide-react'
import { 
  getFormDetails, 
  updateForm, 
  cloneForm, 
  addFormQuestion, 
  updateFormQuestion, 
  deleteFormQuestion, 
  reorderFormQuestions, 
  type FormWithQuestions, 
  type FormQuestion 
} from '../api/forms'

export const FormBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormWithQuestions | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingForm, setSavingForm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [copied, setCopied] = useState(false)

  // Edit form header states
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [actiu, setActiu] = useState(true)
  const [notify, setNotify] = useState(true)

  // Question modal states
  const [questionModalOpen, setQuestionModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<FormQuestion | null>(null)
  const [qPregunta, setQPregunta] = useState('')
  const [qTipus, setQTipus] = useState<'text' | 'textarea' | 'number' | 'select' | 'boolean'>('text')
  const [qOpcions, setQOpcions] = useState('')
  const [qObligatori, setQObligatori] = useState(true)
  const [savingQuestion, setSavingQuestion] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadForm = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await getFormDetails(id)
      setForm(data)
      setTitle(data.titol)
      setDesc(data.descripcio || '')
      setActiu(data.actiu)
      setNotify(data.notificar_entrenadors)
    } catch {
      showToast('Error en carregar el formulari', 'error')
      navigate('/entrenador/forms')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    loadForm()
  }, [loadForm])

  const isReadOnly = (form?.responses_count || 0) > 0

  const handleSaveHeader = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !title.trim()) return

    setSavingForm(true)
    try {
      await updateForm(form.id, {
        titol: title.trim(),
        descripcio: desc.trim() || null,
        actiu,
        notificar_entrenadors: notify,
        imatges: form.imatges || []
      })
      showToast('Configuració desada correctament!')
      setForm(prev => prev ? { ...prev, titol: title.trim(), descripcio: desc.trim() || null, actiu, notificar_entrenadors: notify } : null)
    } catch {
      showToast('Error en actualitzar el formulari', 'error')
    } finally {
      setSavingForm(false)
    }
  }

  const handleCloneAndEdit = async () => {
    if (!form) return
    try {
      const res = await cloneForm(form.id)
      showToast('Nova versió creada correctament! Redirigint...')
      navigate(`/entrenador/forms/${res.id}/edit`)
    } catch {
      showToast('Error en clonar el formulari', 'error')
    }
  }

  const openAddQuestion = () => {
    if (isReadOnly) return
    setEditingQuestion(null)
    setQPregunta('')
    setQTipus('text')
    setQOpcions('')
    setQObligatori(true)
    setQuestionModalOpen(true)
  }

  const openEditQuestion = (q: FormQuestion) => {
    if (isReadOnly) return
    setEditingQuestion(q)
    setQPregunta(q.pregunta)
    setQTipus(q.tipus)
    setQOpcions(q.opcions || '')
    setQObligatori(q.obligatori)
    setQuestionModalOpen(true)
  }

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !qPregunta.trim()) return

    setSavingQuestion(true)
    try {
      if (editingQuestion) {
        // Update question
        await updateFormQuestion(form.id, editingQuestion.id, {
          pregunta: qPregunta.trim(),
          tipus: qTipus,
          opcions: qTipus === 'select' ? qOpcions.trim() : null,
          obligatori: qObligatori,
          ordre: editingQuestion.ordre,
          imatges: editingQuestion.imatges || []
        })
        showToast('Pregunta actualitzada')
      } else {
        // Add new question
        const newOrdre = (form.questions?.length || 0) + 1
        await addFormQuestion(form.id, {
          pregunta: qPregunta.trim(),
          tipus: qTipus,
          opcions: qTipus === 'select' ? qOpcions.trim() : null,
          obligatori: qObligatori,
          ordre: newOrdre,
          imatges: []
        })
        showToast('Nova pregunta afegida')
      }
      setQuestionModalOpen(false)
      await loadForm()
    } catch {
      showToast('Error en desar la pregunta', 'error')
    } finally {
      setSavingQuestion(false)
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (isReadOnly || !form) return
    if (!window.confirm('Segur que vols eliminar aquesta pregunta?')) return

    try {
      await deleteFormQuestion(form.id, questionId)
      showToast('Pregunta eliminada')
      await loadForm()
    } catch {
      showToast('Error en eliminar la pregunta', 'error')
    }
  }

  const handleMoveQuestion = async (index: number, direction: 'up' | 'down') => {
    if (isReadOnly || !form || !form.questions) return
    const questions = [...form.questions]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= questions.length) return

    // Swap
    const temp = questions[index]
    questions[index] = questions[targetIndex]
    questions[targetIndex] = temp

    // Update orders
    const updates = questions.map((q, idx) => ({ id: q.id, ordre: idx + 1 }))
    try {
      await reorderFormQuestions(form.id, updates)
      await loadForm()
    } catch {
      showToast('Error en reordenar les preguntes', 'error')
    }
  }

  const handleCopyLink = () => {
    if (!form) return
    const publicUrl = `${window.location.origin}/forms/${form.id}`
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    showToast('Enllaç públic copiat al porta-retalls!')
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading || !form) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        <p className="text-text-muted text-sm font-medium">Carregant formulari...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
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

      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/entrenador/forms"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tornar a Formularis</span>
        </Link>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 bg-bg-surface hover:bg-bg-hover text-text-primary border border-border rounded-xl text-xs font-semibold shadow-sm transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-text-muted" />}
            <span>{copied ? 'Copiat!' : 'Copiar Link'}</span>
          </button>

          <a
            href={`/forms/${form.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-bg-surface hover:bg-bg-hover text-text-primary border border-border rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
            <span>Previsualitzar</span>
          </a>

          <Link
            to={`/entrenador/forms/${form.id}/responses`}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Respostes ({form.responses_count || 0})</span>
          </Link>
        </div>
      </div>

      {/* Read Only Alert Banner if responses exist */}
      {isReadOnly && (
        <div className="glass-card bg-amber-50/90 border border-amber-300 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Estructura de preguntes protegida ({form.responses_count} respostes rebudes)
              </h4>
              <p className="text-xs text-amber-800/80 mt-1 max-w-xl">
                Com que aquest formulari ja té respostes guardades, les preguntes estan bloquejades per preservar la integritat de les dades històriques. Si necessites afegir o canviar preguntes, clona el formulari per crear una nova versió.
              </p>
            </div>
          </div>

          <button
            onClick={handleCloneAndEdit}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition whitespace-nowrap shadow-sm active:scale-95"
          >
            <CopyCheck className="w-4 h-4" />
            <span>Clonar i editar nova versió</span>
          </button>
        </div>
      )}

      {/* Form Settings Card */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Settings className="w-4 h-4 text-brand-500" />
            <span>Configuració del Formulari</span>
          </h2>
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
            actiu ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-700 border border-slate-300'
          }`}>
            {actiu ? 'Actiu' : 'Esborrany'}
          </span>
        </div>

        <form onSubmit={handleSaveHeader} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                Títol del Formulari *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded-xl px-4 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-sm font-semibold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                Descripció o Missatge de Benvinguda
              </label>
              <textarea
                rows={3}
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Explica als candidats el propòsit d'aquest qüestionari..."
                className="w-full bg-bg-surface border border-border rounded-xl px-4 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-sm"
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-bg-hover/60 rounded-xl border border-border">
              <input
                type="checkbox"
                id="actiu-check"
                checked={actiu}
                onChange={e => setActiu(e.target.checked)}
                className="w-4 h-4 text-brand-500 rounded border-border focus:ring-0"
              />
              <label htmlFor="actiu-check" className="text-xs cursor-pointer select-none">
                <span className="font-bold text-text-primary block">Formulari Actiu</span>
                <span className="text-text-muted">Accepta noves respostes públiques immediatament.</span>
              </label>
            </div>

            <div className="flex items-center gap-3 p-3 bg-bg-hover/60 rounded-xl border border-border">
              <input
                type="checkbox"
                id="notify-check"
                checked={notify}
                onChange={e => setNotify(e.target.checked)}
                className="w-4 h-4 text-brand-500 rounded border-border focus:ring-0"
              />
              <label htmlFor="notify-check" className="text-xs cursor-pointer select-none">
                <span className="font-bold text-text-primary block">Notificar Entrenadors</span>
                <span className="text-text-muted">Envia un avís per correu a cada nova inscripció.</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingForm || !title.trim()}
              className="btn-primary flex items-center gap-2 text-xs py-2 px-5 font-bold disabled:opacity-50"
            >
              {savingForm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Desar Configuració</span>
            </button>
          </div>
        </form>
      </div>

      {/* Questions Builder Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-brand-500" />
              <span>Preguntes del Formulari ({form.questions?.length || 0})</span>
            </h2>
            <p className="text-xs text-text-muted">
              Defineix els camps que han d'emplenar els atletes o aspirants.
            </p>
          </div>

          <button
            onClick={openAddQuestion}
            disabled={isReadOnly}
            className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Afegir Pregunta</span>
          </button>
        </div>

        {/* Questions List */}
        {(!form.questions || form.questions.length === 0) ? (
          <div className="glass-card p-12 text-center text-text-muted space-y-3">
            <HelpCircle className="w-10 h-10 mx-auto text-slate-300" />
            <h4 className="text-sm font-bold text-text-primary">Cap pregunta afegida</h4>
            <p className="text-xs max-w-sm mx-auto">
              Afegeix la teva primera pregunta al qüestionari (text curt, paràgraf, número, desplegable o sí/no).
            </p>
            <button
              onClick={openAddQuestion}
              disabled={isReadOnly}
              className="btn-primary inline-flex items-center gap-1.5 text-xs py-1.5 px-3.5 font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Afegir pregunta</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {form.questions.map((q, idx) => (
              <div
                key={q.id}
                className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand-200 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-bg-hover flex items-center justify-center text-xs font-bold text-text-secondary shrink-0 mt-0.5 border border-border">
                    {idx + 1}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-text-primary">{q.pregunta}</h4>
                      {q.obligatori ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                          Obligatori
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                          Opcional
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span className="font-semibold text-brand-600">
                        {q.tipus === 'text' && 'Text curt'}
                        {q.tipus === 'textarea' && 'Text llarg (Paràgraf)'}
                        {q.tipus === 'number' && 'Número'}
                        {q.tipus === 'select' && 'Desplegable amb opcions'}
                        {q.tipus === 'boolean' && 'Sí / No (Booleà)'}
                      </span>

                      {q.tipus === 'select' && q.opcions && (
                        <span className="text-text-muted truncate max-w-xs">
                          Opcions: {q.opcions}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions & Reordering */}
                {!isReadOnly && (
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleMoveQuestion(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition disabled:opacity-20"
                      title="Pujar pregunta"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleMoveQuestion(idx, 'down')}
                      disabled={idx === (form.questions?.length || 0) - 1}
                      className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition disabled:opacity-20"
                      title="Baixar pregunta"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => openEditQuestion(q)}
                      className="px-2.5 py-1 text-xs text-brand-600 hover:bg-brand-50 rounded-lg font-bold transition"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Eliminar pregunta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Question Modal */}
      {questionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card bg-white p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-text-primary">
                {editingQuestion ? 'Editar Pregunta' : 'Afegir Nova Pregunta'}
              </h3>
              <button 
                onClick={() => setQuestionModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Enunciat de la Pregunta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Quants dies pots entrenar a la setmana?"
                  value={qPregunta}
                  onChange={e => setQPregunta(e.target.value)}
                  className="w-full bg-bg-surface border border-border rounded-xl px-3.5 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Tipus de Resposta *
                </label>
                <select
                  value={qTipus}
                  onChange={e => setQTipus(e.target.value as any)}
                  className="w-full bg-bg-surface border border-border rounded-xl px-3.5 py-2 text-text-primary focus:outline-none focus:border-brand-500 text-sm font-semibold"
                >
                  <option value="text">Text curt (una línia)</option>
                  <option value="textarea">Text llarg (paràgraf)</option>
                  <option value="number">Número (enter o decimal)</option>
                  <option value="select">Desplegable (llista d'opcions)</option>
                  <option value="boolean">Sí / No (Casella de verificació)</option>
                </select>
              </div>

              {qTipus === 'select' && (
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Opcions del Desplegable (separades per comes) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Matí, Tarda, Vespre, Flexible"
                    value={qOpcions}
                    onChange={e => setQOpcions(e.target.value)}
                    className="w-full bg-bg-surface border border-border rounded-xl px-3.5 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-sm"
                  />
                  <p className="text-[11px] text-text-muted mt-1">
                    Escriu les opcions separades per comes, ex: "Trail, Asfalt, Pista, Ultratrail".
                  </p>
                </div>
              )}

              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={qObligatori}
                    onChange={e => setQObligatori(e.target.checked)}
                    className="w-4 h-4 text-brand-500 rounded border-border focus:ring-0"
                  />
                  <div>
                    <span className="text-sm font-bold text-text-primary">Pregunta Obligatòria</span>
                    <p className="text-xs text-text-muted">El candidat no podrà enviar el formulari sense respondre-la.</p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setQuestionModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-hover rounded-xl border border-border transition"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={savingQuestion || !qPregunta.trim()}
                  className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingQuestion && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingQuestion ? 'Actualitzar' : 'Afegir'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
