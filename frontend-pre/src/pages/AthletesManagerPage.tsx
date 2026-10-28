import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Users, 
  Search, 
  Edit3, 
  History, 
  ArrowLeftRight, 
  FileText, 
  X, 
  Check, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  RefreshCw,
  UserCheck,
  UserX
} from 'lucide-react'
import { 
  getAtletes, 
  toggleAtletaStatus, 
  getAtletaStatusHistory, 
  getEntrenadorsList, 
  reassignAtleta, 
  updateAtletaDetails 
} from '../api/entrenador'
import type { UserStatusHistory } from '../types'

interface AtletaItem {
  id: string
  nom: string
  cognoms: string
  email: string
  actiu: boolean
}

export const AthletesManagerPage: React.FC = () => {
  const navigate = useNavigate()
  const [atletes, setAtletes] = useState<AtletaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Edit details modal state
  const [editingAtleta, setEditingAtleta] = useState<AtletaItem | null>(null)
  const [editForm, setEditForm] = useState({ nom: '', cognoms: '' })
  const [savingDetails, setSavingDetails] = useState(false)

  // History modal state
  const [historyAtleta, setHistoryAtleta] = useState<AtletaItem | null>(null)
  const [historyList, setHistoryList] = useState<UserStatusHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Reassign modal state
  const [reassignAtletaItem, setReassignAtletaItem] = useState<AtletaItem | null>(null)
  const [entrenadorsList, setEntrenadorsList] = useState<{ id: string; nom: string }[]>([])
  const [selectedEntrenadorId, setSelectedEntrenadorId] = useState('')
  const [reassigning, setReassigning] = useState(false)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAtletes()
      setAtletes(data || [])
    } catch (err: any) {
      console.error(err)
      setError('No s\'ha pogut carregar la llista d\'atletes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtered athletes
  const filteredAtletes = useMemo(() => {
    return atletes.filter(a => {
      const fullName = `${a.nom || ''} ${a.cognoms || ''}`.toLowerCase()
      const email = (a.email || '').toLowerCase()
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q || fullName.includes(q) || email.includes(q)

      if (!matchesSearch) return false
      if (statusFilter === 'active') return a.actiu
      if (statusFilter === 'inactive') return !a.actiu
      return true
    })
  }, [atletes, searchQuery, statusFilter])

  // Count metrics
  const activeCount = useMemo(() => atletes.filter(a => a.actiu).length, [atletes])
  const inactiveCount = useMemo(() => atletes.filter(a => !a.actiu).length, [atletes])

  // Status toggle
  const handleToggleStatus = async (atleta: AtletaItem) => {
    const nextStatus = !atleta.actiu
    // Optimistic update
    setAtletes(prev => prev.map(a => a.id === atleta.id ? { ...a, actiu: nextStatus } : a))
    try {
      await toggleAtletaStatus(atleta.id, nextStatus)
      showToast(nextStatus ? `Atleta ${atleta.nom} activat` : `Atleta ${atleta.nom} desactivat`)
    } catch (err: any) {
      // Revert on error
      setAtletes(prev => prev.map(a => a.id === atleta.id ? { ...a, actiu: atleta.actiu } : a))
      showToast(err.response?.data?.error || 'Error actualitzant l\'estat', 'error')
    }
  }

  // Open edit modal
  const openEditModal = (atleta: AtletaItem) => {
    setEditingAtleta(atleta)
    setEditForm({ nom: atleta.nom || '', cognoms: atleta.cognoms || '' })
  }

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAtleta || !editForm.nom.trim()) return

    setSavingDetails(true)
    try {
      await updateAtletaDetails(editingAtleta.id, {
        nom: editForm.nom.trim(),
        cognoms: editForm.cognoms.trim()
      })
      showToast('Dades de l\'atleta actualitzades correctament')
      setEditingAtleta(null)
      loadData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Error desant les dades', 'error')
    } finally {
      setSavingDetails(false)
    }
  }

  // Open history modal
  const openHistoryModal = async (atleta: AtletaItem) => {
    setHistoryAtleta(atleta)
    setHistoryLoading(true)
    try {
      const data = await getAtletaStatusHistory(atleta.id)
      setHistoryList(data || [])
    } catch (err) {
      showToast('Error carregant l\'historial de l\'atleta', 'error')
      setHistoryAtleta(null)
    } finally {
      setHistoryLoading(false)
    }
  }

  // Open reassign modal
  const openReassignModal = async (atleta: AtletaItem) => {
    setReassignAtletaItem(atleta)
    setSelectedEntrenadorId('')
    try {
      if (entrenadorsList.length === 0) {
        const coaches = await getEntrenadorsList()
        setEntrenadorsList(coaches || [])
      }
    } catch (err) {
      showToast('Error carregant la llista d\'entrenadors', 'error')
    }
  }

  const handleConfirmReassign = async () => {
    if (!reassignAtletaItem || !selectedEntrenadorId) return
    setReassigning(true)
    try {
      await reassignAtleta(reassignAtletaItem.id, selectedEntrenadorId)
      showToast(`Atleta traspassat correctament`)
      setReassignAtletaItem(null)
      loadData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Error reassignant l\'atleta', 'error')
    } finally {
      setReassigning(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast message */}
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

      {/* Header & Stats */}
      <div className="glass-card p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">Gestió d'Atletes</h1>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                Supervisa el teu equip, activa o desactiva accessos i consulta l'historial d'activitat.
              </p>
            </div>
          </div>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2 bg-bg-surface/60 p-1.5 rounded-xl border border-border self-start md:self-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Tots ({atletes.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Actius ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'inactive'
                ? 'bg-slate-600 text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            Inactius ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="glass-card p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cercar per nom, cognoms o correu..."
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

        <button
          onClick={loadData}
          disabled={loading}
          className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-border flex items-center justify-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualitzar
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-3" />
          <p className="text-sm font-semibold">Carregant el llistat d'atletes...</p>
        </div>
      ) : filteredAtletes.length === 0 ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Users className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
          <h3 className="text-base font-bold text-text-primary">No s'ha trobat cap atleta</h3>
          <p className="text-xs text-text-muted mt-1">
            {searchQuery ? 'Cap resultat coincideix amb la cerca actual.' : 'No tens cap atleta assignat en aquest estat.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile View: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredAtletes.map(atleta => (
              <div 
                key={atleta.id} 
                className={`glass-card p-4 space-y-3 transition-all ${
                  atleta.actiu ? 'border-border' : 'border-slate-200/60 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      atleta.actiu ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {atleta.nom?.charAt(0) || 'A'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-text-primary truncate">
                        {atleta.nom} {atleta.cognoms}
                      </p>
                      <p className="text-xs text-text-muted truncate">{atleta.email}</p>
                    </div>
                  </div>

                  {/* Status Toggle Button */}
                  <button
                    onClick={() => handleToggleStatus(atleta)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-colors ${
                      atleta.actiu 
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {atleta.actiu ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Actiu
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Inactiu
                      </>
                    )}
                  </button>
                </div>

                {/* Actions row */}
                <div className="pt-2 border-t border-border flex items-center justify-between gap-1 text-xs">
                  <button
                    onClick={() => openEditModal(atleta)}
                    className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg flex items-center gap-1 font-medium transition-colors"
                    title="Editar nom i cognoms"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => openHistoryModal(atleta)}
                    className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg flex items-center gap-1 font-medium transition-colors"
                    title="Historial d'activació"
                  >
                    <History className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Historial</span>
                  </button>
                  <button
                    onClick={() => openReassignModal(atleta)}
                    className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg flex items-center gap-1 font-medium transition-colors"
                    title="Reassignar entrenador"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-amber-500" />
                    <span>Reassignar</span>
                  </button>
                  <button
                    onClick={() => navigate(`/informe?atletaId=${atleta.id}`)}
                    className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg flex items-center gap-1 font-bold transition-colors ml-auto"
                    title="Veure informe de sessions"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Informe</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View: Clean Table */}
          <div className="hidden md:block glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-bg-surface/80 border-b border-border text-xs font-bold text-text-secondary uppercase tracking-wider">
                    <th className="py-3.5 px-4">Atleta</th>
                    <th className="py-3.5 px-4">Correu Electrònic</th>
                    <th className="py-3.5 px-4 text-center">Estat</th>
                    <th className="py-3.5 px-4 text-right">Accions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAtletes.map(atleta => (
                    <tr 
                      key={atleta.id} 
                      className={`hover:bg-bg-hover/60 transition-colors ${
                        !atleta.actiu ? 'bg-slate-50/40 text-slate-500' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            atleta.actiu ? 'bg-brand-50 text-brand-600 border border-brand-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {atleta.nom?.charAt(0) || 'A'}
                          </div>
                          <div>
                            <p className="font-bold text-text-primary leading-tight">
                              {atleta.nom} {atleta.cognoms}
                            </p>
                            <span className="text-xs text-text-muted">ID: {atleta.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-text-secondary text-xs">
                        {atleta.email}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleToggleStatus(atleta)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              atleta.actiu ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                atleta.actiu ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            atleta.actiu ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {atleta.actiu ? 'Actiu' : 'Inactiu'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(atleta)}
                            className="p-1.5 text-text-secondary hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar nom i cognoms"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openHistoryModal(atleta)}
                            className="p-1.5 text-text-secondary hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Historial de canvis d'estat"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openReassignModal(atleta)}
                            className="p-1.5 text-text-secondary hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Reassignar a un altre entrenador"
                          >
                            <ArrowLeftRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/informe?atletaId=${atleta.id}`)}
                            className="px-2.5 py-1 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors flex items-center gap-1"
                            title="Consultar informe d'hores i sessions"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Informe</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal: Edit Athlete Name & Surnames */}
      {editingAtleta && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card bg-bg-surface w-full max-w-md p-6 rounded-2xl shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-brand-500" />
                Editar Dades de l'Atleta
              </h3>
              <button
                onClick={() => setEditingAtleta(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDetails} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Nom <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nom}
                  onChange={e => setEditForm(prev => ({ ...prev, nom: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  placeholder="Ex: Joan"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Cognoms
                </label>
                <input
                  type="text"
                  value={editForm.cognoms}
                  onChange={e => setEditForm(prev => ({ ...prev, cognoms: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  placeholder="Ex: Garcia Puig"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAtleta(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  disabled={savingDetails || !editForm.nom.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {savingDetails ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Guardar canvis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Status History */}
      {historyAtleta && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card bg-bg-surface w-full max-w-lg p-6 rounded-2xl shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-500" />
                  Historial d'activitat
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Atleta: <strong>{historyAtleta.nom} {historyAtleta.cognoms}</strong>
                </p>
              </div>
              <button
                onClick={() => setHistoryAtleta(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 py-1 pr-1">
              {historyLoading ? (
                <div className="py-8 text-center text-text-muted">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500 mb-2" />
                  <p className="text-xs">Carregant registre d'historial...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-8 text-center text-text-muted text-xs">
                  No s'ha registrat cap canvi d'estat per a aquest atleta.
                </div>
              ) : (
                historyList.map(item => (
                  <div 
                    key={item.id} 
                    className="p-3 rounded-xl bg-bg-base/80 border border-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {item.accio === 'activate' ? (
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                          <XCircle className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-text-primary">
                          {item.accio === 'activate' ? 'Atleta activat' : 'Atleta desactivat'}
                        </p>
                        {item.changed_by && (
                          <p className="text-[11px] text-text-muted">Per: {item.changed_by}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-text-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.created_at).toLocaleString('ca-ES')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <button
                onClick={() => setHistoryAtleta(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:bg-bg-hover transition-colors"
              >
                Tancar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reassign Coach */}
      {reassignAtletaItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card bg-bg-surface w-full max-w-md p-6 rounded-2xl shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-amber-500" />
                Reassignar Atleta
              </h3>
              <button
                onClick={() => setReassignAtletaItem(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                En traspassar a <strong>{reassignAtletaItem.nom} {reassignAtletaItem.cognoms}</strong>, 
                l'atleta passarà a estar sota la gestió exclusiva del nou entrenador seleccionat.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-text-secondary uppercase">
                Nou Entrenador
              </label>
              <select
                value={selectedEntrenadorId}
                onChange={e => setSelectedEntrenadorId(e.target.value)}
                className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="">Selecciona un entrenador...</option>
                {entrenadorsList.map(coach => (
                  <option key={coach.id} value={coach.id}>
                    {coach.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <button
                onClick={() => setReassignAtletaItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:bg-bg-hover transition-colors"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleConfirmReassign}
                disabled={reassigning || !selectedEntrenadorId}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {reassigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeftRight className="w-3.5 h-3.5" />}
                Confirmar Reassignació
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
