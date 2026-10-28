import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  Bug, 
  Lightbulb, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  X, 
  User, 
  Clock, 
  MessageSquare, 
  ShieldCheck,
  Send
} from 'lucide-react'
import { 
  getFeedbackTickets, 
  createFeedbackTicket, 
  updateFeedbackTicket, 
  type FeedbackTicket 
} from '../api/feedback'

export const FeedbackTicketsPage: React.FC = () => {
  const { isEntrenador, isAdmin } = useAuth()
  const isModerator = isEntrenador || isAdmin

  const [tickets, setTickets] = useState<FeedbackTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [newType, setNewType] = useState<'bug' | 'petició'>('bug')
  const [newResum, setNewResum] = useState('')
  const [newDescripcio, setNewDescripcio] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  // Detail & Management Drawer
  const [selectedTicket, setSelectedTicket] = useState<FeedbackTicket | null>(null)
  const [manageStatus, setManageStatus] = useState<string>('')
  const [manageResponse, setManageResponse] = useState<string>('')
  const [manageFiles, setManageFiles] = useState<File[]>([])
  const [manageLoading, setManageLoading] = useState(false)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getFeedbackTickets()
      setTickets(data || [])
    } catch (err) {
      console.error(err)
      showToast('Error carregant els tiquets de feedback', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q || 
        t.resum.toLowerCase().includes(q) || 
        t.descripcio.toLowerCase().includes(q) || 
        (t.informador_nom && t.informador_nom.toLowerCase().includes(q))

      if (!matchesSearch) return false

      if (statusFilter !== 'all' && t.estat !== statusFilter) {
        return false
      }

      if (typeFilter !== 'all' && t.tipus !== typeFilter) {
        return false
      }

      return true
    })
  }, [tickets, searchQuery, statusFilter, typeFilter])

  // Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newResum.trim() || !newDescripcio.trim()) {
      showToast('El resum i la descripció són obligatoris', 'error')
      return
    }

    setCreateLoading(true)
    try {
      const formData = new FormData()
      formData.append('tipus', newType)
      formData.append('resum', newResum.trim())
      formData.append('descripcio', newDescripcio.trim())
      selectedFiles.forEach(file => {
        formData.append('imatges', file)
      })

      await createFeedbackTicket(formData)
      showToast('Tiquet de feedback enviat correctament')
      setCreateModalOpen(false)
      setNewResum('')
      setNewDescripcio('')
      setSelectedFiles([])
      loadData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Error enviant el tiquet', 'error')
    } finally {
      setCreateLoading(false)
    }
  }

  // Open detail
  const openTicketDetail = (ticket: FeedbackTicket) => {
    setSelectedTicket(ticket)
    setManageStatus(ticket.estat)
    setManageResponse(ticket.resposta || '')
    setManageFiles([])
  }

  // Update Ticket (Moderator/Admin)
  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicket) return

    setManageLoading(true)
    try {
      const formData = new FormData()
      formData.append('estat', manageStatus)
      formData.append('resposta', manageResponse.trim())
      manageFiles.forEach(file => {
        formData.append('imatges', file)
      })

      await updateFeedbackTicket(selectedTicket.id, formData)
      showToast('Tiquet actualitzat amb èxit')
      setSelectedTicket(null)
      loadData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Error actualitzant el tiquet', 'error')
    } finally {
      setManageLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendent':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Pendent</span>
      case 'en curs':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">En curs</span>
      case 'desplegat':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">Desplegat</span>
      case 'descartat':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">Descartat</span>
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-bg-surface text-text-muted">{status}</span>
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
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Bug className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">Bústia de Millores i Incidències</h1>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Notifica errades, suggereix noves funcionalitats i segueix l'estat de resolució de l'equip tècnic.
            </p>
          </div>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center justify-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nova Petició / Reportar Bug
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cercar peticions per títol, descripció o autor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Selectors */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto text-xs">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-bg-surface border border-border rounded-lg text-xs font-semibold focus:outline-none"
            >
              <option value="all">Tots els tipus</option>
              <option value="bug">🐛 Només Bugs</option>
              <option value="petició">💡 Només Peticions</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-bg-surface border border-border rounded-lg text-xs font-semibold focus:outline-none"
            >
              <option value="all">Tots els estats</option>
              <option value="pendent">Pendent</option>
              <option value="en curs">En curs</option>
              <option value="desplegat">Desplegat</option>
              <option value="descartat">Descartat</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-3" />
          <p className="text-sm font-semibold">Carregant tiquets de feedback...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Bug className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
          <h3 className="text-base font-bold text-text-primary">Cap tiquet trobat</h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Cap petició coincideix amb els filtres aplicats.'
              : 'Tot funciona de meravella! No hi ha incidències obertes.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTickets.map(ticket => (
            <div
              key={ticket.id}
              onClick={() => openTicketDetail(ticket)}
              className="glass-card p-4 sm:p-5 flex flex-col justify-between space-y-3 cursor-pointer hover:border-brand-400 hover:shadow-md transition-all group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {ticket.tipus === 'bug' ? (
                      <span className="shrink-0 p-1.5 rounded-lg bg-rose-50 text-rose-600">
                        <Bug className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="shrink-0 p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                        <Lightbulb className="w-4 h-4" />
                      </span>
                    )}
                    <h3 className="font-bold text-base text-text-primary group-hover:text-brand-600 transition-colors truncate">
                      {ticket.resum}
                    </h3>
                  </div>
                  {getStatusBadge(ticket.estat)}
                </div>

                <p className="text-xs text-text-secondary line-clamp-2">
                  {ticket.descripcio}
                </p>

                {ticket.resposta && (
                  <div className="p-2.5 rounded-xl bg-brand-50/50 border border-brand-100 text-xs text-brand-900 flex items-start gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                    <p className="line-clamp-2 font-medium">
                      <strong>Resposta:</strong> {ticket.resposta}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-text-secondary" />
                  {ticket.informador_nom || 'Anònim'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(ticket.created_at).toLocaleDateString('ca-ES')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer / Detail & Response Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card bg-bg-surface w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-2xl border border-border space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {selectedTicket.tipus === 'bug' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">BUG</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">PETICIÓ</span>
                  )}
                  {getStatusBadge(selectedTicket.estat)}
                </div>
                <h2 className="text-lg font-black text-text-primary leading-tight">
                  {selectedTicket.resum}
                </h2>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span>Reportat per: <strong>{selectedTicket.informador_nom || 'Usuari'}</strong></span>
                  <span>•</span>
                  <span>{new Date(selectedTicket.created_at).toLocaleString('ca-ES')}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase">Descripció</label>
              <div className="p-3.5 rounded-xl bg-bg-base/80 border border-border text-sm text-text-primary leading-relaxed whitespace-pre-line">
                {selectedTicket.descripcio}
              </div>
            </div>

            {/* Attached Images */}
            {selectedTicket.imatges && selectedTicket.imatges.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase">Captures adjuntes</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedTicket.imatges.map((img, idx) => (
                    <a key={idx} href={img} target="_blank" rel="noopener noreferrer">
                      <img
                        src={img}
                        alt={`Captura ${idx + 1}`}
                        className="h-32 w-auto rounded-xl object-cover border border-border shadow-sm hover:scale-105 transition-transform"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Response (for athlete view) */}
            {!isModerator && selectedTicket.resposta && (
              <div className="p-4 rounded-xl bg-brand-50/60 border border-brand-200 space-y-1">
                <p className="text-xs font-bold text-brand-900 uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  Resposta de l'Equip Tècnic:
                </p>
                <p className="text-sm text-brand-950 whitespace-pre-line leading-relaxed">
                  {selectedTicket.resposta}
                </p>
              </div>
            )}

            {/* Moderator Management Form */}
            {isModerator && (
              <form onSubmit={handleUpdateTicket} className="pt-3 border-t border-border space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-500" />
                  <span className="text-xs font-bold text-text-primary uppercase">
                    Gestió de l'Estat i Resposta (Moderador)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                      Estat del Tiquet
                    </label>
                    <select
                      value={manageStatus}
                      onChange={e => setManageStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none"
                    >
                      <option value="pendent">Pendent</option>
                      <option value="en curs">En curs</option>
                      <option value="desplegat">Desplegat (Resolt)</option>
                      <option value="descartat">Descartat</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                    Resposta oficial a l'atleta
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Explica la resolució o detalla quan estarà disponible..."
                    value={manageResponse}
                    onChange={e => setManageResponse(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold text-text-secondary hover:bg-bg-hover transition-colors"
                  >
                    Tancar
                  </button>
                  <button
                    type="submit"
                    disabled={manageLoading}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {manageLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Guardar Resolució
                  </button>
                </div>
              </form>
            )}

            {!isModerator && (
              <div className="pt-3 border-t border-border flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  Tancar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Nova Petició / Reportar Bug */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card bg-bg-surface w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                <Bug className="w-4 h-4 text-brand-500" />
                Nova Incidència o Suggeriment
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-1">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Tipus de petició
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType('bug')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                      newType === 'bug'
                        ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm'
                        : 'bg-bg-base border-border text-text-secondary'
                    }`}
                  >
                    <Bug className="w-4 h-4 text-rose-500" />
                    Bug / Incidència
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('petició')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                      newType === 'petició'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                        : 'bg-bg-base border-border text-text-secondary'
                    }`}
                  >
                    <Lightbulb className="w-4 h-4 text-emerald-500" />
                    Nova Proposta / Millora
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Resum breu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={newType === 'bug' ? "Ex: Error en desar el calendari del dimarts" : "Ex: M'agradaria veure un gràfic de quilòmetres totals"}
                  value={newResum}
                  onChange={e => setNewResum(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Explicació detallada <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detalla els passos per reproduir l'error o explica com t'agradaria que fos la funcionalitat..."
                  value={newDescripcio}
                  onChange={e => setNewDescripcio(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                />
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Captures de pantalla (Opcional)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={e => e.target.files && setSelectedFiles(Array.from(e.target.files))}
                  className="w-full text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-50 file:text-brand-600 hover:file:bg-brand-100"
                />
              </div>

              {/* Actions */}
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
                  disabled={createLoading || !newResum.trim() || !newDescripcio.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {createLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Enviar Petició
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
