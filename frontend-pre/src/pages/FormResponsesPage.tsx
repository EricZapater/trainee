import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Search, 
  UserCheck, 
  Phone, 
  Mail, 
  MessageCircle, 
  Star, 
  Calendar, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Eye, 
  Check, 
  X,
  XCircle
} from 'lucide-react'
import { 
  getFormResponses, 
  getFormDetails, 
  updateResponseStatus, 
  updateFormResponseDetails, 
  assignFormResponse, 
  type FormResponseWithAnswers, 
  type FormWithQuestions 
} from '../api/forms'
import { useAuth } from '../context/AuthContext'

export const FormResponsesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [form, setForm] = useState<FormWithQuestions | null>(null)
  const [responses, setResponses] = useState<FormResponseWithAnswers[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendent' | 'contactat' | 'acceptat' | 'descartat'>('all')
  const [assignFilter, setAssignFilter] = useState<'all' | 'mine' | 'unassigned'>('all')

  // Selected response for modal
  const [selectedResponse, setSelectedResponse] = useState<FormResponseWithAnswers | null>(null)
  const [commentText, setCommentText] = useState('')
  const [savingComment, setSavingComment] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [formData, responsesData] = await Promise.all([
        getFormDetails(id),
        getFormResponses(id)
      ])
      setForm(formData)
      setResponses(responsesData)
    } catch {
      showToast('Error en carregar les respostes del formulari', 'error')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleStatusChange = async (responseId: string, newStatus: string) => {
    try {
      await updateResponseStatus(responseId, newStatus)
      setResponses(prev => prev.map(r => r.id === responseId ? { ...r, estat: newStatus as any } : r))
      if (selectedResponse?.id === responseId) {
        setSelectedResponse(prev => prev ? { ...prev, estat: newStatus as any } : null)
      }
      showToast('Estat actualitzat correctament')
    } catch {
      showToast('Error en actualitzar l\'estat', 'error')
    }
  }

  const handleToggleInteresting = async (r: FormResponseWithAnswers) => {
    const newVal = !r.is_interesting
    try {
      await updateFormResponseDetails(r.id, { is_interesting: newVal })
      setResponses(prev => prev.map(item => item.id === r.id ? { ...item, is_interesting: newVal } : item))
      if (selectedResponse?.id === r.id) {
        setSelectedResponse(prev => prev ? { ...prev, is_interesting: newVal } : null)
      }
    } catch {
      showToast('Error en marcar com a interessant', 'error')
    }
  }

  const handleAssign = async (r: FormResponseWithAnswers, assign: boolean) => {
    try {
      const res = await assignFormResponse(r.id, assign)
      setResponses(prev => prev.map(item => item.id === r.id ? {
        ...item,
        entrenador_id: res.entrenador_id,
        entrenador_nom: res.entrenador_nom
      } : item))
      if (selectedResponse?.id === r.id) {
        setSelectedResponse(prev => prev ? {
          ...prev,
          entrenador_id: res.entrenador_id,
          entrenador_nom: res.entrenador_nom
        } : null)
      }
      showToast(assign ? 'Formulari assignat a tu!' : 'Assignació eliminada')
    } catch {
      showToast('Error en canviar l\'assignació', 'error')
    }
  }

  const handleSaveComment = async () => {
    if (!selectedResponse) return
    setSavingComment(true)
    try {
      await updateFormResponseDetails(selectedResponse.id, { comentari: commentText.trim() || null })
      setResponses(prev => prev.map(item => item.id === selectedResponse.id ? { ...item, comentari: commentText.trim() || null } : item))
      setSelectedResponse(prev => prev ? { ...prev, comentari: commentText.trim() || null } : null)
      showToast('Observacions desades')
    } catch {
      showToast('Error en desar les observacions', 'error')
    } finally {
      setSavingComment(false)
    }
  }

  const openDetailModal = (r: FormResponseWithAnswers) => {
    setSelectedResponse(r)
    setCommentText(r.comentari || '')
  }

  // Filtered responses
  const filteredResponses = useMemo(() => {
    return responses.filter(r => {
      // Status filter
      if (statusFilter !== 'all' && r.estat !== statusFilter) return false

      // Assign filter
      if (assignFilter === 'mine') {
        if (r.entrenador_id !== user?.id) return false
      } else if (assignFilter === 'unassigned') {
        if (r.entrenador_id) return false
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = r.nom_candidat.toLowerCase().includes(q)
        const matchEmail = r.email_candidat.toLowerCase().includes(q)
        const matchPhone = (r.telefon_candidat || '').toLowerCase().includes(q)
        if (!matchName && !matchEmail && !matchPhone) return false
      }

      return true
    })
  }, [responses, statusFilter, assignFilter, search, user?.id])

  // Stat counts
  const stats = useMemo(() => {
    return {
      total: responses.length,
      pendent: responses.filter(r => r.estat === 'pendent').length,
      contactat: responses.filter(r => r.estat === 'contactat').length,
      acceptat: responses.filter(r => r.estat === 'acceptat').length,
      descartat: responses.filter(r => r.estat === 'descartat').length,
    }
  }, [responses])

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

      {/* Top Header */}
      <div className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/entrenador/forms"
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition mb-1 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tornar a Formularis</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            Respostes: {form?.titol || 'Formulari'}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Revisió de candidatures, estat del contacte i respostes dels aspirants.
          </p>
        </div>

        <Link
          to={`/entrenador/forms/${id}/edit`}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-bg-surface hover:bg-bg-hover text-text-primary border border-border rounded-xl text-xs font-bold transition shadow-sm self-start sm:self-auto"
        >
          <FileText className="w-4 h-4 text-brand-500" />
          <span>Editar Preguntes</span>
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'all' 
              ? 'bg-brand-50 border-brand-300 shadow-sm' 
              : 'glass-card hover:border-slate-300'
          }`}
        >
          <span className="text-xs uppercase tracking-wider font-semibold block text-text-muted">Tots</span>
          <span className="text-2xl font-black text-text-primary mt-1 block">{stats.total}</span>
        </button>

        <button
          onClick={() => setStatusFilter('pendent')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'pendent' 
              ? 'bg-amber-50 border-amber-300 shadow-sm' 
              : 'glass-card hover:border-slate-300'
          }`}
        >
          <span className="text-xs uppercase tracking-wider font-semibold block text-amber-700">Pendents</span>
          <span className="text-2xl font-black text-amber-700 mt-1 block">{stats.pendent}</span>
        </button>

        <button
          onClick={() => setStatusFilter('contactat')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'contactat' 
              ? 'bg-blue-50 border-blue-300 shadow-sm' 
              : 'glass-card hover:border-slate-300'
          }`}
        >
          <span className="text-xs uppercase tracking-wider font-semibold block text-blue-700">Contactats</span>
          <span className="text-2xl font-black text-blue-700 mt-1 block">{stats.contactat}</span>
        </button>

        <button
          onClick={() => setStatusFilter('acceptat')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'acceptat' 
              ? 'bg-emerald-50 border-emerald-300 shadow-sm' 
              : 'glass-card hover:border-slate-300'
          }`}
        >
          <span className="text-xs uppercase tracking-wider font-semibold block text-emerald-700">Acceptats</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">{stats.acceptat}</span>
        </button>

        <button
          onClick={() => setStatusFilter('descartat')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'descartat' 
              ? 'bg-rose-50 border-rose-300 shadow-sm' 
              : 'glass-card hover:border-slate-300'
          }`}
        >
          <span className="text-xs uppercase tracking-wider font-semibold block text-rose-700">Descartats</span>
          <span className="text-2xl font-black text-rose-700 mt-1 block">{stats.descartat}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cercar per nom, email o telèfon..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-bg-surface border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setAssignFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              assignFilter === 'all' ? 'bg-brand-500 text-white shadow-sm' : 'bg-bg-surface text-text-secondary border border-border hover:bg-bg-hover'
            }`}
          >
            Totes les respostes
          </button>
          <button
            onClick={() => setAssignFilter('mine')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              assignFilter === 'mine' ? 'bg-brand-500 text-white shadow-sm' : 'bg-bg-surface text-text-secondary border border-border hover:bg-bg-hover'
            }`}
          >
            Els meus formularis
          </button>
          <button
            onClick={() => setAssignFilter('unassigned')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              assignFilter === 'unassigned' ? 'bg-brand-500 text-white shadow-sm' : 'bg-bg-surface text-text-secondary border border-border hover:bg-bg-hover'
            }`}
          >
            Sense assignar
          </button>
        </div>
      </div>

      {/* Responses Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-text-muted text-sm font-medium">Carregant respostes...</p>
        </div>
      ) : filteredResponses.length === 0 ? (
        <div className="glass-card p-12 text-center text-text-muted space-y-2">
          <p className="text-base font-bold text-text-primary">No s'ha trobat cap resposta</p>
          <p className="text-xs">Prova de canviar els filtres o comprova l'enllaç del formulari.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted font-bold uppercase text-[11px] bg-bg-surface/50">
                  <th className="py-3 px-3 w-10 text-center">★</th>
                  <th className="py-3 px-4">Candidat / Atleta</th>
                  <th className="py-3 px-4">Contacte</th>
                  <th className="py-3 px-4">Data enviament</th>
                  <th className="py-3 px-4">Entrenador assignat</th>
                  <th className="py-3 px-4">Estat</th>
                  <th className="py-3 px-4 text-right">Accions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredResponses.map(r => (
                  <tr key={r.id} className="hover:bg-bg-hover/50 transition-colors">
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleInteresting(r)}
                        className={`p-1 rounded-md transition ${
                          r.is_interesting 
                            ? 'text-amber-500 hover:text-amber-600' 
                            : 'text-slate-300 hover:text-slate-500'
                        }`}
                        title="Marcar com a interessant"
                      >
                        <Star className={`w-4 h-4 ${r.is_interesting ? 'fill-current' : ''}`} />
                      </button>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-text-primary">{r.nom_candidat}</div>
                      {r.comentari && (
                        <div className="text-[11px] text-brand-600 italic mt-0.5 line-clamp-1">
                          Nota: {r.comentari}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <a 
                          href={`mailto:${r.email_candidat}`} 
                          className="text-text-secondary hover:text-brand-600 transition flex items-center gap-1.5"
                        >
                          <Mail className="w-3.5 h-3.5 text-text-muted" />
                          <span>{r.email_candidat}</span>
                        </a>
                        {r.telefon_candidat && (
                          <div className="flex items-center gap-2">
                            <a 
                              href={`tel:${r.telefon_candidat}`} 
                              className="text-text-secondary hover:text-brand-600 transition flex items-center gap-1.5"
                            >
                              <Phone className="w-3.5 h-3.5 text-text-muted" />
                              <span>{r.telefon_candidat}</span>
                            </a>
                            <a
                              href={`https://wa.me/${r.telefon_candidat.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700"
                              title="Obrir WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-xs text-text-muted whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-text-muted" />
                        <span>{new Date(r.created_at).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      {r.entrenador_nom ? (
                        <span className="inline-flex items-center gap-1 text-text-primary font-bold">
                          <UserCheck className="w-3.5 h-3.5 text-brand-500" />
                          <span>{r.entrenador_nom}</span>
                        </span>
                      ) : (
                        <span className="text-text-muted italic">Sense assignar</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <select
                        value={r.estat}
                        onChange={e => handleStatusChange(r.id, e.target.value)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                          r.estat === 'pendent' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                          r.estat === 'contactat' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                          r.estat === 'acceptat' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                          'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        <option value="pendent">Pendent</option>
                        <option value="contactat">Contactat</option>
                        <option value="acceptat">Acceptat</option>
                        <option value="descartat">Descartat</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.entrenador_id === user?.id ? (
                          <button
                            onClick={() => handleAssign(r, false)}
                            className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition font-semibold"
                          >
                            Desassignar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAssign(r, true)}
                            className="px-2.5 py-1 text-xs text-brand-600 hover:bg-brand-50 rounded-lg transition font-semibold"
                          >
                            Assignar-me
                          </button>
                        )}

                        <button
                          onClick={() => openDetailModal(r)}
                          className="btn-primary flex items-center gap-1 text-xs py-1 px-3 font-bold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Veure</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-card bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-text-primary">{selectedResponse.nom_candidat}</h3>
                  <button
                    onClick={() => handleToggleInteresting(selectedResponse)}
                    className={`p-1 rounded-md transition ${
                      selectedResponse.is_interesting 
                        ? 'text-amber-500 hover:text-amber-600' 
                        : 'text-slate-300 hover:text-slate-500'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${selectedResponse.is_interesting ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted mt-0.5">
                  <span>Enviat: {new Date(selectedResponse.created_at).toLocaleString('ca-ES')}</span>
                  <span>•</span>
                  <span>Assignat: {selectedResponse.entrenador_nom || 'Sense assignar'}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedResponse(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 divide-y divide-border">
              {/* Contact info bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-text-muted uppercase font-bold">Contacte</span>
                  <div className="flex items-center gap-3 text-xs">
                    <a href={`mailto:${selectedResponse.email_candidat}`} className="text-brand-600 font-semibold hover:underline flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{selectedResponse.email_candidat}</span>
                    </a>
                    {selectedResponse.telefon_candidat && (
                      <a href={`tel:${selectedResponse.telefon_candidat}`} className="text-text-secondary font-semibold hover:underline flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{selectedResponse.telefon_candidat}</span>
                      </a>
                    )}
                  </div>
                </div>

                {selectedResponse.telefon_candidat && (
                  <a
                    href={`https://wa.me/${selectedResponse.telefon_candidat.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>

              {/* Questions & Answers */}
              <div className="pt-4 space-y-3">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Respostes del Qüestionari
                </h4>

                {form?.questions?.map((q, idx) => {
                  const ans = selectedResponse.answers?.find(a => a.question_id === q.id)
                  return (
                    <div key={q.id} className="p-3.5 rounded-xl bg-bg-surface border border-border space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-brand-600">P{idx + 1}.</span>
                        <span className="text-xs font-bold text-text-primary">{q.pregunta}</span>
                      </div>

                      <div className="pl-4 text-xs font-medium text-text-secondary">
                        {ans?.valor ? (
                          q.tipus === 'boolean' ? (
                            ans.valor === 'true' || ans.valor === '1' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                <Check className="w-3.5 h-3.5" /> Sí
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                                <XCircle className="w-3.5 h-3.5" /> No
                              </span>
                            )
                          ) : (
                            <span className="whitespace-pre-line text-text-primary">{ans.valor}</span>
                          )
                        ) : (
                          <span className="text-text-muted italic text-[11px]">Sense resposta</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Coach Observations */}
              <div className="pt-4 space-y-2">
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Anotacions internes de l'entrenador
                </label>
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Notes privades sobre el perfil, disponibilitat, trucada..."
                  className="w-full bg-bg-surface border border-border rounded-xl px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-xs"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveComment}
                    disabled={savingComment}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-surface hover:bg-bg-hover text-text-primary border border-border rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    {savingComment && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Desar observacions</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-bg-surface border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted font-medium">Estat:</span>
                <select
                  value={selectedResponse.estat}
                  onChange={e => handleStatusChange(selectedResponse.id, e.target.value)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl border border-border bg-bg-surface text-text-primary focus:outline-none"
                >
                  <option value="pendent">Pendent</option>
                  <option value="contactat">Contactat</option>
                  <option value="acceptat">Acceptat</option>
                  <option value="descartat">Descartat</option>
                </select>
              </div>

              <button
                onClick={() => setSelectedResponse(null)}
                className="px-4 py-2 bg-bg-hover hover:bg-slate-200 text-text-primary rounded-xl text-xs font-bold transition border border-border"
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
