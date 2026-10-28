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
  Users
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
      showToast('Canvis guardats correctament!')
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
    showToast('Enllaç públic copiat!')
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading || !form) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm">Carregant formulari...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Toast */}
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

      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/entrenador/forms"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tornar a Formularis</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiat!' : 'Copiar Link'}</span>
          </button>

          <a
            href={`/forms/${form.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Previsualitzar</span>
          </a>

          <Link
            to={`/entrenador/forms/${form.id}/responses`}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-semibold transition"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Respostes ({form.responses_count || 0})</span>
          </Link>
        </div>
      </div>

      {/* Read Only Alert Banner if responses exist */}
      {isReadOnly && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400 mt-0.5">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-300">
                Estructura de preguntes bloquejada ({form.responses_count} respostes rebudes)
              </h4>
              <p className="text-xs text-amber-200/70 mt-1 max-w-xl">
                Com que aquest formulari ja té respostes guardades, les preguntes no es poden modificar ni esborrar per garantir la integritat de les dades. Si vols fer canvis a les preguntes, pots crear una nova versió clonada.
              </p>
            </div>
          </div>

          <button
            onClick={handleCloneAndEdit}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition whitespace-nowrap shadow-lg active:scale-95"
          >
            <CopyCheck className="w-4 h-4" />
            <span>Clonar i editar nova versió</span>
          </button>
        </div>
      )}

      {/* Form Settings Card */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 backdrop-blur-md">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <span>Configuració del Formulari</span>
        </h2>

        <form onSubmit={handleSaveHeader} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Títol *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Descripció de benvinguda
              </label>
              <textarea
                rows={3}
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Instruccions o detalls del formulari..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <input
                type="checkbox"
                id="actiu-check"
                checked={actiu}
                onChange={e => setActiu(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700 focus:ring-0"
              />
              <label htmlFor="actiu-check" className="text-xs cursor-pointer">
                <span className="font-semibold text-white block">Formulari Actiu</span>
                <span className="text-slate-400">Accepta noves respostes públiques.</span>
              </label>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <input
                type="checkbox"
                id="notify-check"
                checked={notify}
                onChange={e => setNotify(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700 focus:ring-0"
              />
              <label htmlFor="notify-check" className="text-xs cursor-pointer">
                <span className="font-semibold text-white block">Notificar Entrenadors</span>
                <span className="text-slate-400">Envia un email cada vegada que s'envia.</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingForm || !title.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-md active:scale-95"
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
            <h2 className="text-lg font-bold text-white tracking-tight">Preguntes del Formulari</h2>
            <p className="text-xs text-slate-400">
              Defineix els camps i preguntes personalitzades que haurà d'emplenar el candidat.
            </p>
          </div>

          <button
            onClick={openAddQuestion}
            disabled={isReadOnly}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Afegir Pregunta</span>
          </button>
        </div>

        {/* Questions List */}
        {(!form.questions || form.questions.length === 0) ? (
          <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
            <HelpCircle className="w-10 h-10 mx-auto text-slate-600" />
            <h4 className="text-sm font-semibold text-white">Cap pregunta afegida</h4>
            <p className="text-xs max-w-sm mx-auto">
              Afegeix la teva primera pregunta (text curt, text llarg, número, desplegable o sí/no).
            </p>
            <button
              onClick={openAddQuestion}
              disabled={isReadOnly}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Afegir pregunta</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {form.questions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0 mt-0.5">
                    {idx + 1}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white">{q.pregunta}</h4>
                      {q.obligatori ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">
                          Obligatori
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
                          Opcional
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="capitalize font-medium text-indigo-400">
                        {q.tipus === 'text' && 'Text curt'}
                        {q.tipus === 'textarea' && 'Text llarg (Paràgraf)'}
                        {q.tipus === 'number' && 'Número'}
                        {q.tipus === 'select' && 'Desplegable amb opcions'}
                        {q.tipus === 'boolean' && 'Sí / No (Booleà)'}
                      </span>

                      {q.tipus === 'select' && q.opcions && (
                        <span className="text-slate-500 truncate max-w-xs">
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
                      className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-800 rounded-lg transition"
                      title="Pujar"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleMoveQuestion(idx, 'down')}
                      disabled={idx === (form.questions?.length || 0) - 1}
                      className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-800 rounded-lg transition"
                      title="Baixar"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => openEditQuestion(q)}
                      className="px-2.5 py-1 text-xs text-indigo-400 hover:bg-indigo-500/10 rounded-lg font-medium transition"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingQuestion ? 'Editar Pregunta' : 'Afegir Nova Pregunta'}
              </h3>
              <button 
                onClick={() => setQuestionModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Enunciat de la Pregunta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Quants dies pots entrenar a la setmana?"
                  value={qPregunta}
                  onChange={e => setQPregunta(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tipus de Resposta *
                </label>
                <select
                  value={qTipus}
                  onChange={e => setQTipus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm"
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
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Opcions del Desplegable (separades per comes) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Matí, Tarda, Vespre, Flexible"
                    value={qOpcions}
                    onChange={e => setQOpcions(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Introdueix les opcions separades per comes, ex: "Trail, Asfalt, Pista, Ultratrail".
                  </p>
                </div>
              )}

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qObligatori}
                    onChange={e => setQObligatori(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded bg-slate-950 border-slate-800 focus:ring-0"
                  />
                  <div>
                    <span className="text-sm font-medium text-white">Pregunta Obligatòria</span>
                    <p className="text-xs text-slate-400">El candidat no podrà enviar el formulari sense respondre.</p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuestionModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={savingQuestion || !qPregunta.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  {savingQuestion && <Loader2 className="w-4 h-4 animate-spin" />}
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
