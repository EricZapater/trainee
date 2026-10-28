import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  Megaphone, 
  Plus, 
  Search, 
  Tag as TagIcon, 
  ExternalLink, 
  Mail, 
  Phone, 
  User, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  X, 
  Check, 
  Image as ImageIcon,
  EyeOff
} from 'lucide-react'
import { 
  getAnuncis, 
  createAnunci, 
  updateAnunciStatus, 
  updateAnunciEstat, 
  getAnunciTags, 
  uploadAnunciImages, 
  type Anunci 
} from '../api/anuncis'

export const AnuncisPage: React.FC = () => {
  const { user, isEntrenador, isAdmin } = useAuth()
  const isModerator = isEntrenador || isAdmin

  const [anuncis, setAnuncis] = useState<Anunci[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [filterEstat, setFilterEstat] = useState<string>('all')

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [formData, setFormData] = useState({
    titol: '',
    descripcio: '',
    contacte: '',
    enllac: '',
    tags: [] as string[]
  })
  const [newTagInput, setNewTagInput] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  // Detail Drawer / Modal
  const [selectedAnunci, setSelectedAnunci] = useState<Anunci | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [anuncisData, tagsData] = await Promise.all([
        getAnuncis(),
        getAnunciTags()
      ])
      setAnuncis(anuncisData || [])
      setAllTags(tagsData || [])
    } catch (err) {
      console.error(err)
      showToast('Error carregant el tauler d\'anuncis', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Validation
  const isValidEmailOrPhone = (val: string) => {
    const v = val.trim()
    if (!v) return false
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (emailRegex.test(v)) return true
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{5,20}$/
    if (phoneRegex.test(v)) {
      const digits = v.replace(/\D/g, '').length
      if (digits >= 6 && digits <= 16) return true
    }
    return false
  }

  const isEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())

  // Filtered Anuncis
  const filteredAnuncis = useMemo(() => {
    return anuncis.filter(a => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q || 
        a.titol.toLowerCase().includes(q) || 
        a.descripcio.toLowerCase().includes(q) || 
        (a.autor_nom && a.autor_nom.toLowerCase().includes(q))

      if (!matchesSearch) return false

      if (selectedTag && (!a.tags || !a.tags.includes(selectedTag))) {
        return false
      }

      if (filterEstat !== 'all') {
        if (filterEstat === 'actiu') return a.actiu && a.estat !== 'pendent' && a.estat !== 'rebutjat'
        if (filterEstat === 'pendent') return a.estat === 'pendent'
        if (filterEstat === 'inactiu') return !a.actiu
      }

      return true
    })
  }, [anuncis, searchQuery, selectedTag, filterEstat])

  // Handle Image Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      const validFiles = files.filter(f => f.size <= 1048576) // 1MB limit
      if (validFiles.length < files.length) {
        showToast('S\'han descartat fitxers superiors a 1MB', 'error')
      }
      setSelectedFiles(validFiles)
    }
  }

  // Tag helpers for Create Form
  const addTag = (tag: string) => {
    const clean = tag.trim().toLowerCase()
    if (clean && !formData.tags.includes(clean)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, clean] }))
    }
    setNewTagInput('')
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
  }

  // Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.titol.trim() || !formData.descripcio.trim() || !formData.contacte.trim()) {
      showToast('El títol, la descripció i el contacte són obligatoris', 'error')
      return
    }

    if (!isValidEmailOrPhone(formData.contacte)) {
      showToast('El contacte ha de ser un email o telèfon vàlid', 'error')
      return
    }

    setCreateLoading(true)
    try {
      let imageUrls: string[] = []
      if (selectedFiles.length > 0) {
        imageUrls = await uploadAnunciImages(selectedFiles)
      }

      await createAnunci({
        titol: formData.titol.trim(),
        descripcio: formData.descripcio.trim(),
        contacte: formData.contacte.trim(),
        enllac: formData.enllac.trim() || undefined,
        tags: formData.tags,
        imatges: imageUrls,
        actiu: true
      })

      showToast('Anunci publicat correctament')
      setCreateModalOpen(false)
      setFormData({ titol: '', descripcio: '', contacte: '', enllac: '', tags: [] })
      setSelectedFiles([])
      loadData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Error creant l\'anunci', 'error')
    } finally {
      setCreateLoading(false)
    }
  }

  // Deactivate
  const handleDeactivate = async (anunci: Anunci) => {
    setActionLoading(true)
    try {
      await updateAnunciStatus(anunci.id, false)
      showToast('L\'anunci s\'ha desactivat')
      setSelectedAnunci(null)
      loadData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Error desactivant l\'anunci', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Approve / Reject
  const handleModeration = async (anunci: Anunci, nouEstat: 'aprovat' | 'rebutjat') => {
    setActionLoading(true)
    try {
      await updateAnunciEstat(anunci.id, nouEstat)
      showToast(nouEstat === 'aprovat' ? 'Anunci aprovat correctament' : 'Anunci rebutjat')
      setSelectedAnunci(null)
      loadData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Error actualitzant l\'estat de l\'anunci', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const canDeactivate = (a: Anunci) => {
    if (isModerator) return true
    return a.autor_id === user?.id
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
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">Tauler d'Anuncis</h1>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Material d'ocasió, dorsals, esdeveniments i comunicats oficials de la comunitat.
            </p>
          </div>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center justify-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Publicar Anunci
        </button>
      </div>

      {/* Search & Tag Filter Bar */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cercar anuncis per títol, text o autor..."
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

          {/* Status filter if moderator */}
          {isModerator && (
            <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
              <span className="text-text-muted font-semibold">Estat:</span>
              <select
                value={filterEstat}
                onChange={e => setFilterEstat(e.target.value)}
                className="px-2.5 py-1.5 bg-bg-surface border border-border rounded-lg text-xs font-semibold focus:outline-none"
              >
                <option value="all">Tots</option>
                <option value="actiu">Actius</option>
                <option value="pendent">Pendents d'aprovació</option>
                <option value="inactiu">Inactius</option>
              </select>
            </div>
          )}
        </div>

        {/* Tag pills */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border">
            <span className="text-[11px] font-bold text-text-muted uppercase flex items-center gap-1 mr-1">
              <TagIcon className="w-3 h-3" />
              Categories:
            </span>
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-colors ${
                selectedTag === null
                  ? 'bg-brand-500 text-white'
                  : 'bg-bg-surface hover:bg-bg-hover text-text-secondary border border-border'
              }`}
            >
              Totes
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedTag === tag
                    ? 'bg-brand-500 text-white'
                    : 'bg-bg-surface hover:bg-bg-hover text-text-secondary border border-border'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid of Announcements */}
      {loading ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-3" />
          <p className="text-sm font-semibold">Carregant anuncis...</p>
        </div>
      ) : filteredAnuncis.length === 0 ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Megaphone className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
          <h3 className="text-base font-bold text-text-primary">Cap anunci disponible</h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            {searchQuery || selectedTag 
              ? 'No hi ha cap anunci que coincideixi amb els filtres actuals.' 
              : 'Sigues el primer a publicar un anunci per als companys del club!'}
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="mt-4 px-3.5 py-1.5 rounded-xl text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Publicar nou anunci
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAnuncis.map(anunci => (
            <div
              key={anunci.id}
              onClick={() => setSelectedAnunci(anunci)}
              className="glass-card p-4 sm:p-5 flex flex-col justify-between space-y-3 cursor-pointer hover:border-brand-400 hover:shadow-md transition-all group relative overflow-hidden"
            >
              {/* Image banner preview if available */}
              {anunci.imatges && anunci.imatges.length > 0 && (
                <div className="h-36 -mx-4 sm:-mx-5 -mt-4 sm:-mt-5 mb-1 overflow-hidden bg-bg-surface relative">
                  <img
                    src={anunci.imatges[0]}
                    alt={anunci.titol}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {anunci.imatges.length > 1 && (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-black flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      +{anunci.imatges.length - 1}
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {/* Title & Badges */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-text-primary group-hover:text-brand-600 transition-colors line-clamp-2">
                    {anunci.titol}
                  </h3>
                  {anunci.estat === 'pendent' && (
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                      Pendent
                    </span>
                  )}
                  {anunci.estat === 'rebutjat' && (
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                      Rebutjat
                    </span>
                  )}
                </div>

                {/* Author & Date */}
                <div className="flex items-center gap-3 text-[11px] text-text-muted">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-text-secondary" />
                    {anunci.autor_nom || 'Usuari'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-text-muted" />
                    {new Date(anunci.created_at).toLocaleDateString('ca-ES')}
                  </span>
                </div>

                {/* Description Snippet */}
                <p className="text-xs text-text-secondary line-clamp-3">
                  {anunci.descripcio}
                </p>

                {/* Tags */}
                {anunci.tags && anunci.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {anunci.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-bg-surface text-text-muted text-[10px] font-medium border border-border"
                      >
                        #{tag}
                      </span>
                    ))}
                    {anunci.tags.length > 3 && (
                      <span className="text-[10px] text-text-muted self-center">
                        +{anunci.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom footer: contact link preview */}
              <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-brand-600 font-bold">
                <span>Veure detalls i contacte</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer / Detail Modal for selected announcement */}
      {selectedAnunci && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card bg-bg-surface w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-2xl border border-border space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                  Detalls de l'Anunci
                </span>
                <h2 className="text-lg sm:text-xl font-black text-text-primary mt-0.5">
                  {selectedAnunci.titol}
                </h2>
                <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                  <span>Publicat per <strong>{selectedAnunci.autor_nom}</strong></span>
                  <span>•</span>
                  <span>{new Date(selectedAnunci.created_at).toLocaleDateString('ca-ES')}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAnunci(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Images Gallery */}
            {selectedAnunci.imatges && selectedAnunci.imatges.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {selectedAnunci.imatges.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`${selectedAnunci.titol} - ${idx + 1}`}
                    className="h-44 w-auto rounded-xl object-cover border border-border shrink-0 shadow-sm"
                  />
                ))}
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase">Descripció</label>
              <div className="p-3.5 rounded-xl bg-bg-base/80 border border-border text-sm text-text-primary leading-relaxed whitespace-pre-line">
                {selectedAnunci.descripcio}
              </div>
            </div>

            {/* Contact Box */}
            {selectedAnunci.contacte && (
              <div className="p-3.5 rounded-xl bg-brand-50/60 border border-brand-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {isEmail(selectedAnunci.contacte) ? (
                    <Mail className="w-4 h-4 text-brand-600 shrink-0" />
                  ) : (
                    <Phone className="w-4 h-4 text-brand-600 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-brand-900 uppercase">Dades de contacte</p>
                    <p className="text-xs sm:text-sm font-black text-brand-700 truncate">{selectedAnunci.contacte}</p>
                  </div>
                </div>

                <a
                  href={isEmail(selectedAnunci.contacte) ? `mailto:${selectedAnunci.contacte}` : `tel:${selectedAnunci.contacte}`}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm shrink-0 transition-colors"
                >
                  {isEmail(selectedAnunci.contacte) ? 'Enviar Correu' : 'Trucar'}
                </a>
              </div>
            )}

            {/* External Link */}
            {selectedAnunci.enllac && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-bg-base border border-border text-xs">
                <span className="text-text-secondary font-medium truncate">Enllaç addicional d'interès</span>
                <a
                  href={selectedAnunci.enllac}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 text-xs font-bold text-brand-600 hover:bg-brand-50 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Obrir web
                </a>
              </div>
            )}

            {/* Tags */}
            {selectedAnunci.tags && selectedAnunci.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedAnunci.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg bg-bg-surface text-text-secondary text-xs font-medium border border-border"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Admin Moderation or Deactivation Actions */}
            <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isModerator && selectedAnunci.estat === 'pendent' && (
                  <>
                    <button
                      onClick={() => handleModeration(selectedAnunci, 'aprovat')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Aprovar
                    </button>
                    <button
                      onClick={() => handleModeration(selectedAnunci, 'rebutjat')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Rebutjar
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {canDeactivate(selectedAnunci) && selectedAnunci.actiu && (
                  <button
                    onClick={() => handleDeactivate(selectedAnunci)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1"
                  >
                    <EyeOff className="w-3.5 h-3.5" /> Desactivar Anunci
                  </button>
                )}
                <button
                  onClick={() => setSelectedAnunci(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  Tancar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Publicar Nou Anunci */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card bg-bg-surface w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-brand-500" />
                Publicar Nou Anunci
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Títol de l'anunci <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Casc de ciclisme aero o Dorsal Marató"
                  value={formData.titol}
                  onChange={e => setFormData(prev => ({ ...prev, titol: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Forma de contacte <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Email (nom@correu.com) o Telèfon (+34 600...)"
                  value={formData.contacte}
                  onChange={e => setFormData(prev => ({ ...prev, contacte: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Descripció detallada <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explica l'estat del material, preu, talla o motiu de la publicació..."
                  value={formData.descripcio}
                  onChange={e => setFormData(prev => ({ ...prev, descripcio: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Enllaç extern (Opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.enllac}
                  onChange={e => setFormData(prev => ({ ...prev, enllac: e.target.value }))}
                  className="w-full px-3 py-2 bg-bg-base border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              {/* Tags Selector */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Etiquetes / Categories
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Escriu una etiqueta i prem Afegir..."
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag(newTagInput)
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-bg-base border border-border rounded-xl text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => addTag(newTagInput)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-bg-surface hover:bg-bg-hover border border-border"
                  >
                    Afegir
                  </button>
                </div>

                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {formData.tags.map(t => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200 flex items-center gap-1"
                      >
                        #{t}
                        <button type="button" onClick={() => removeTag(t)}>
                          <X className="w-3 h-3 hover:text-rose-600" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Images File Input */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Imatges (Màxim 1MB per imatge)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-50 file:text-brand-600 hover:file:bg-brand-100"
                />
                {selectedFiles.length > 0 && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    {selectedFiles.length} {selectedFiles.length === 1 ? 'fitxer seleccionat' : 'fitxers seleccionats'}
                  </p>
                )}
              </div>

              {/* Footer */}
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
                  disabled={createLoading || !formData.titol.trim() || !formData.descripcio.trim() || !formData.contacte.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {createLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Publicar Anunci
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
