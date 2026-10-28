import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { 
  CheckCircle2, 
  Send, 
  Loader2, 
  AlertCircle, 
  Sparkles
} from 'lucide-react'
import { getPublicForm, submitFormResponse, type FormWithQuestions } from '../api/forms'
import { useAuth } from '../context/AuthContext'

export const PublicFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [form, setForm] = useState<FormWithQuestions | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // Candidate contact details
  const [candidatNom, setCandidatNom] = useState('')
  const [candidatEmail, setCandidatEmail] = useState('')
  const [candidatTelefon, setCandidatTelefon] = useState('')

  // Answers map: { [questionId]: string | boolean }
  const [answers, setAnswers] = useState<Record<string, any>>({})

  // Form submission state
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (user) {
      setCandidatNom(`${user.nom || ''} ${user.cognoms || ''}`.trim())
      setCandidatEmail(user.email || '')
    }
  }, [user])

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      try {
        const data = await getPublicForm(id)
        setForm(data)

        // Initialize empty answers
        const initialAnswers: Record<string, any> = {}
        data.questions.forEach(q => {
          if (q.tipus === 'boolean') {
            initialAnswers[q.id] = false
          } else {
            initialAnswers[q.id] = ''
          }
        })
        setAnswers(initialAnswers)
      } catch (err: any) {
        setErrorMsg(err.response?.data?.error || 'Aquest formulari no està disponible o ha finalitzat el període d\'inscripció.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleAnswerChange = (questionId: string, val: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: val }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !id) return

    // Validation
    if (!candidatNom.trim() || !candidatEmail.trim()) {
      setSubmitError('Si us plau, omple el teu nom i el correu electrònic.')
      return
    }

    // Check required questions
    for (const q of form.questions) {
      if (q.obligatori) {
        const val = answers[q.id]
        if (val === undefined || val === null || val === '') {
          setSubmitError(`La pregunta "${q.pregunta}" és obligatòria.`)
          return
        }
      }
    }

    setSubmitting(true)
    setSubmitError('')

    try {
      const answersPayload = form.questions.map(q => ({
        question_id: q.id,
        valor: answers[q.id] !== undefined ? String(answers[q.id]) : null
      }))

      await submitFormResponse(id, {
        nom_candidat: candidatNom.trim(),
        email_candidat: candidatEmail.trim(),
        telefon_candidat: candidatTelefon.trim() || undefined,
        answers: answersPayload
      })

      setSubmitted(true)
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || 'S\'ha produït un error en enviar les teves respostes. Torna-ho a provar.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 text-text-muted">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
        <p className="text-sm font-medium">Carregant formulari...</p>
      </div>
    )
  }

  if (errorMsg || !form) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full glass-card p-8 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">Formulari No Disponible</h2>
          <p className="text-sm text-text-muted">{errorMsg}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6">
        <div className="max-w-lg w-full glass-card p-8 text-center space-y-5 shadow-2xl animate-scale-up">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">Formulari Enviat!</h2>
            <p className="text-text-secondary text-sm">
              Gràcies pel teu temps, <strong>{candidatNom}</strong>. Hem registrat les teves respostes correctament.
            </p>
          </div>

          <p className="text-xs text-text-muted bg-bg-hover/80 p-4 rounded-2xl border border-border">
            L'equip tècnic de TrainEE revisarà la teva sol·licitud i es posarà en contacte amb tu al correu <strong>{candidatEmail}</strong> el més aviat possible.
          </p>

          <div className="pt-2">
            <a
              href="/"
              className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold"
            >
              <span>Tornar a TrainEE</span>
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-200 rounded-full text-xs font-bold text-brand-600 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TrainEE • Formulari Oficial</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">{form.titol}</h1>
          {form.descripcio && (
            <p className="text-xs sm:text-sm text-text-muted max-w-xl mx-auto whitespace-pre-line leading-relaxed">
              {form.descripcio}
            </p>
          )}
        </div>

        {/* Error Alert */}
        {submitError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span className="font-semibold">{submitError}</span>
          </div>
        )}

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 space-y-8 shadow-xl">
          {/* Section 1: Candidate Contact */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-border pb-2">
              Dades de Contacte
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                  Nom i Cognoms *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Marc Soler i Puig"
                  value={candidatNom}
                  onChange={e => setCandidatNom(e.target.value)}
                  className="w-full bg-bg-surface border border-border rounded-xl px-4 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                  Correu Electrònic *
                </label>
                <input
                  type="email"
                  required
                  placeholder="nom@exemple.cat"
                  value={candidatEmail}
                  onChange={e => setCandidatEmail(e.target.value)}
                  className="w-full bg-bg-surface border border-border rounded-xl px-4 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                  Telèfon (opcional)
                </label>
                <input
                  type="tel"
                  placeholder="+34 600 000 000"
                  value={candidatTelefon}
                  onChange={e => setCandidatTelefon(e.target.value)}
                  className="w-full bg-bg-surface border border-border rounded-xl px-4 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-sm font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Dynamic Questions */}
          <div className="space-y-6 pt-2">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-border pb-2">
              Preguntes del Formulari
            </h3>

            {form.questions.map((q, idx) => {
              const opts = q.tipus === 'select' && q.opcions ? q.opcions.split(',').map(s => s.trim()).filter(Boolean) : []
              return (
                <div key={q.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <label className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                      <span className="text-xs text-brand-500 font-bold">{idx + 1}.</span>
                      <span>{q.pregunta}</span>
                      {q.obligatori && <span className="text-rose-500 text-xs">*</span>}
                    </label>
                  </div>

                  {/* Render based on question type */}
                  {q.tipus === 'text' && (
                    <input
                      type="text"
                      required={q.obligatori}
                      value={answers[q.id] || ''}
                      onChange={e => handleAnswerChange(q.id, e.target.value)}
                      placeholder="La teva resposta..."
                      className="w-full bg-bg-surface border border-border rounded-xl px-4 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-sm"
                    />
                  )}

                  {q.tipus === 'textarea' && (
                    <textarea
                      rows={3}
                      required={q.obligatori}
                      value={answers[q.id] || ''}
                      onChange={e => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Escriu la teva resposta aquí..."
                      className="w-full bg-bg-surface border border-border rounded-xl px-4 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-sm"
                    />
                  )}

                  {q.tipus === 'number' && (
                    <input
                      type="number"
                      required={q.obligatori}
                      value={answers[q.id] || ''}
                      onChange={e => handleAnswerChange(q.id, e.target.value)}
                      placeholder="0"
                      className="w-full bg-bg-surface border border-border rounded-xl px-4 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-sm"
                    />
                  )}

                  {q.tipus === 'select' && (
                    <select
                      required={q.obligatori}
                      value={answers[q.id] || ''}
                      onChange={e => handleAnswerChange(q.id, e.target.value)}
                      className="w-full bg-bg-surface border border-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-brand-500 text-sm font-semibold"
                    >
                      <option value="">Selecciona una opció...</option>
                      {opts.map((opt, i) => (
                        <option key={i} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {q.tipus === 'boolean' && (
                    <div className="flex items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(q.id, true)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                          answers[q.id] === true 
                            ? 'bg-brand-500 border-brand-500 text-white shadow-sm' 
                            : 'bg-bg-surface border-border text-text-secondary hover:bg-bg-hover'
                        }`}
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(q.id, false)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                          answers[q.id] === false 
                            ? 'bg-slate-700 border-slate-700 text-white shadow-sm' 
                            : 'bg-bg-surface border-border text-text-secondary hover:bg-bg-hover'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-border">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 px-6 text-sm font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Enviant respostes...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Formulari</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-xs text-text-muted">
          <p>© {new Date().getFullYear()} TrainEE • Plataforma Integral d'Entrenament</p>
        </div>
      </div>
    </div>
  )
}
