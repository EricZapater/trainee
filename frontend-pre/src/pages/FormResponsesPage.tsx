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
  X
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
      showToast('Observacions guardades')
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

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <Link
            to="/entrenador/forms"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tornar a Formularis</span>
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Respostes de {form?.titol || 'Formulari'}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Revisió de candidatures, estat del contacte i respostes dels aspirants.
          </p>
        </div>

        <Link
          to={`/entrenador/forms/${id}/edit`}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition self-start sm:self-auto"
        >
          <FileText className="w-4 h-4 text-indigo-400" />
          <span>Editar Preguntes</span>
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'all' 
              ? 'bg-indigo-600/10 border-indigo-500/40 text-white' 
              : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <span className="text-xs uppercase tracking-wider font-semibold block text-slate-400">Tots</span>
          <span className="text-2xl font-black text-white mt-1 block">{stats.total}</span>
        </button>

        <button
          onClick={() => setStatusFilter('pendent')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'pendent' 
              ? 'bg-amber-500/10 border-amber-500/40 text-white' 
              : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <span className="text-xs uppercase tracking-wider font-semibold block text-amber-400">Pendents</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">{stats.pendent}</span>
        </button>

        <button
          onClick={() => setStatusFilter('contactat')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'contactat' 
              ? 'bg-blue-500/10 border-blue-500/40 text-white' 
              : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <span className="text-xs uppercase tracking-wider font-semibold block text-blue-400">Contactats</span>
          <span className="text-2xl font-black text-blue-400 mt-1 block">{stats.contactat}</span>
        </button>

        <button
          onClick={() => setStatusFilter('acceptat')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'acceptat' 
              ? 'bg-emerald-500/10 border-emerald-500/40 text-white' 
              : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <span className="text-xs uppercase tracking-wider font-semibold block text-emerald-400">Acceptats</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">{stats.acceptat}</span>
        </button>

        <button
          onClick={() => setStatusFilter('descartat')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'descartat' 
              ? 'bg-rose-500/10 border-rose-500/40 text-white' 
              : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <span className="text-xs uppercase tracking-wider font-semibold block text-rose-400">Descartats</span>
          <span className="text-2xl font-black text-rose-400 mt-1 block">{stats.descartat}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cercar per nom, email o telèfon..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setAssignFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              assignFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Totes les respostes
          </button>
          <button
            onClick={() => setAssignFilter('mine')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              assignFilter === 'mine' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Els meus formularis
          </button>
          <button
            onClick={() => setAssignFilter('unassigned')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              assignFilter === 'unassigned' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Sense assignar
          </button>
        </div>
      </div>

      {/* Responses Table / Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm">Carregant llista de respostes...</p>
        </div>
      ) : filteredResponses.length === 0 ? (
        <div className="p-16 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 space-y-2">
          <p className="text-base font-medium text-white">No s'ha trobat cap resposta</p>
          <p className="text-xs">Prova de canviar els filtres o comprova l'enllaç públic del formulari.</p>
        </div>
      ) : (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">★</th>
                  <th className="py-3.5 px-4">Candidat / Atleta</th>
                  <th className="py-3.5 px-4">Contacte</th>
                  <th className="py-3.5 px-4">Data enviament</th>
                  <th className="py-3.5 px-4">Entrenador assignat</th>
                  <th className="py-3.5 px-4">Estat</th>
                  <th className="py-3.5 px-4 text-right">Accions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-normal">
                {filteredResponses.map(r => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleInteresting(r)}
                        className={`p-1 rounded-md transition ${
                          r.is_interesting 
                            ? 'text-amber-400 hover:text-amber-300' 
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title="Marcar com a interessant"
                      >
                        <Star className={`w-4 h-4 ${r.is_interesting ? 'fill-current' : ''}`} />
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{r.nom_candidat}</div>
                      {r.comentari && (
                        <div className="text-[11px] text-indigo-400 italic mt-0.5 line-clamp-1">
                          Nota: {r.comentari}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 text-xs">
                        <a 
                          href={`mailto:${r.email_candidat}`} 
                          className="text-slate-300 hover:text-indigo-400 transition flex items-center gap-1.5"
                        >
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span>{r.email_candidat}</span>
                        </a>
                        {r.telefon_candidat && (
                          <div className="flex items-center gap-2">
                            <a 
                              href={`tel:${r.telefon_candidat}`} 
                              className="text-slate-300 hover:text-indigo-400 transition flex items-center gap-1.5"
                            >
                              <Phone className="w-3.5 h-3.5 text-slate-500" />
                              <span>{r.telefon_candidat}</span>
                            </a>
                            <a
                              href={`https://wa.me/${r.telefon_candidat.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:text-emerald-300"
                              title="Obrir WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{new Date(r.created_at).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                      {r.entrenador_nom ? (
                        <span className="inline-flex items-center gap-1 text-indigo-300 font-medium">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{r.entrenador_nom}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Sense assignar</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={r.estat}
                        onChange={e => handleStatusChange(r.id, e.target.value)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                          r.estat === 'pendent' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                          r.estat === 'contactat' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                          r.estat === 'acceptat' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                          'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        <option value="pendent" className="bg-slate-900 text-amber-400">Pendent</option>
                        <option value="contactat" className="bg-slate-900 text-blue-400">Contactat</option>
                        <option value="acceptat" className="bg-slate-900 text-emerald-400">Acceptat</option>
                        <option value="descartat" className="bg-slate-900 text-rose-400">Descartat</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {r.entrenador_id === user?.id ? (
                          <button
                            onClick={() => handleAssign(r, false)}
                            className="px-2.5 py-1 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                          >
                            Desassignar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAssign(r, true)}
                            className="px-2.5 py-1 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition"
                          >
                            Assignar-me
                          </button>
                        )}

                        <button
                          onClick={() => openDetailModal(r)}
                          className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">{selectedResponse.nom_candidat}</h3>
                  <button
                    onClick={() => handleToggleInteresting(selectedResponse)}
                    className={`p-1 rounded-md transition ${
                      selectedResponse.is_interesting 
                        ? 'text-amber-400 hover:text-amber-300' 
                        : 'text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    <Star className={`w-5 h-5 ${selectedResponse.is_interesting ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>Enviat: {new Date(selectedResponse.created_at).toLocaleString('ca-ES')}</span>
                  <span>•</span>
                  <span>Assignat: {selectedResponse.entrenador_nom || 'Sense assignar'}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedResponse(null)}
                className="text-slate-400 hover:text-white font-bold text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 divide-y divide-slate-800/80">
              {/* Contact info bar */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Dades de contacte</span>
                  <div className="flex items-center gap-4 text-sm">
                    <a href={`mailto:${selectedResponse.email_candidat}`} className="text-indigo-400 hover:underline flex items-center gap-1.5">
                      <Mail className="w-4 h-4" />
                      <span>{selectedResponse.email_candidat}</span>
                    </a>
                    {selectedResponse.telefon_candidat && (
                      <a href={`tel:${selectedResponse.telefon_candidat}`} className="text-slate-300 hover:underline flex items-center gap-1.5">
                        <Phone className="w-4 h-4" />
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
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>

              {/* Questions & Answers */}
              <div className="pt-6 space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Respostes del Qüestionari
                </h4>

                {form?.questions?.map((q, idx) => {
                  const ans = selectedResponse.answers?.find(a => a.question_id === q.id)
                  return (
                    <div key={q.id} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-400">P{idx + 1}.</span>
                        <span className="text-xs font-semibold text-slate-300">{q.pregunta}</span>
                      </div>

                      <div className="pl-5 text-sm font-medium text-white">
                        {ans?.valor ? (
                          q.tipus === 'boolean' ? (
                            ans.valor === 'true' || ans.valor === '1' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400">
                                <Check className="w-4 h-4" /> Sí
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-400">
                                <X className="w-4 h-4" /> No
                              </span>
                            )
                          ) : (
                            <span className="whitespace-pre-line">{ans.valor}</span>
                          )
                        ) : (
                          <span className="text-slate-500 italic text-xs">Sense resposta</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Coach Observations */}
              <div className="pt-6 space-y-3">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Anotacions internes de l'entrenador
                </label>
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Notes sobre la trucada, perfil esportiu, disponibilitat..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveComment}
                    disabled={savingComment}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
                  >
                    {savingComment && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Desar observacions</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Estat:</span>
                <select
                  value={selectedResponse.estat}
                  onChange={e => handleStatusChange(selectedResponse.id, e.target.value)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none"
                >
                  <option value="pendent">Pendent</option>
                  <option value="contactat">Contactat</option>
                  <option value="acceptat">Acceptat</option>
                  <option value="descartat">Descartat</option>
                </select>
              </div>

              <button
                onClick={() => setSelectedResponse(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
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
