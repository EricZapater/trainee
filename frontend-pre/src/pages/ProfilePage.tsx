import React, { useState, useEffect } from 'react'
import { 
  Mail, 
  FileText, 
  Download, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Lock, 
  Loader2,
  Sparkles
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { 
  getMyFiscalProfile, 
  updateMyFiscalProfile, 
  listMyFactures, 
  type FinClient, 
  type FinFacturaVenda 
} from '../api/finances'
import api from '../api/client'

export const ProfilePage: React.FC = () => {
  const { user } = useAuth()
  
  const [fiscalData, setFiscalData] = useState<Partial<FinClient>>({
    nom_fiscal: '',
    tipus_id_fiscal: 'NIF',
    nif_cif: '',
    adreca: '',
    cp: '',
    poblacio: '',
    provincia: '',
    pais: 'Espanya',
    email: '',
    telefon: '',
    notes: ''
  })
  const [invoices, setInvoices] = useState<FinFacturaVenda[]>([])
  const [loading, setLoading] = useState(true)
  const [savingFiscal, setSavingFiscal] = useState(false)
  const [fiscalSuccess, setFiscalSuccess] = useState(false)
  const [fiscalError, setFiscalError] = useState<string | null>(null)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [fData, invList] = await Promise.all([
        getMyFiscalProfile().catch(() => null),
        listMyFactures().catch(() => [])
      ])

      if (fData) {
        setFiscalData({
          nom_fiscal: fData.nom_fiscal || `${user?.nom || ''} ${user?.cognoms || ''}`.trim(),
          tipus_id_fiscal: fData.tipus_id_fiscal || 'NIF',
          nif_cif: fData.nif_cif || '',
          adreca: fData.adreca || '',
          cp: fData.cp || '',
          poblacio: fData.poblacio || '',
          provincia: fData.provincia || '',
          pais: fData.pais || 'Espanya',
          email: fData.email || user?.email || '',
          telefon: fData.telefon || '',
          notes: fData.notes || ''
        })
      } else {
        setFiscalData(prev => ({
          ...prev,
          nom_fiscal: `${user?.nom || ''} ${user?.cognoms || ''}`.trim(),
          email: user?.email || ''
        }))
      }

      setInvoices(invList || [])
    } catch (err) {
      console.error('Error carregant dades del perfil:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveFiscal = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingFiscal(true)
    setFiscalSuccess(false)
    setFiscalError(null)

    try {
      await updateMyFiscalProfile(fiscalData)
      setFiscalSuccess(true)
      setTimeout(() => setFiscalSuccess(false), 4000)
    } catch (err: any) {
      setFiscalError(err.response?.data?.error || 'Error desant les dades fiscals')
    } finally {
      setSavingFiscal(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordError('Les contrasenyes no coincideixen')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('La nova contrasenya ha de tenir com a mínim 6 caràcters')
      return
    }

    setSavingPassword(true)
    setPasswordSuccess(false)
    setPasswordError(null)

    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      })
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 4000)
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Error canviant la contrasenya')
    } finally {
      setSavingPassword(false)
    }
  }

  const downloadPdf = async (facturaId: string, invoiceNum: string) => {
    try {
      const res = await api.get(`/finances/factures/${facturaId}/pdf`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `factura_${invoiceNum || facturaId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert('Error descarregant el PDF de la factura.')
    }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white font-extrabold text-2xl flex items-center justify-center shadow-md">
            {user?.nom?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-text-primary">
                {user?.nom} {user?.cognoms}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold capitalize bg-brand-50 text-brand-700 border border-brand-200">
                {user?.rol}
              </span>
              {user?.es_administracio && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Administració
                </span>
              )}
            </div>
            <p className="text-sm text-text-secondary mt-0.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-text-muted" /> {user?.email}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Fiscal Data & Security */}
        <div className="lg:col-span-1 space-y-6">
          {/* Fiscal Profile Form */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-2.5 mb-4">
              <Building2 className="w-5 h-5 text-brand-600" />
              <h2 className="text-base font-bold text-text-primary">Dades de Facturació</h2>
            </div>
            <p className="text-xs text-text-secondary mb-5">
              Aquestes dades apareixeran a les teves factures legals i rebuts fiscals.
            </p>

            {fiscalSuccess && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Dades de facturació desades correctament!</span>
              </div>
            )}
            {fiscalError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{fiscalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveFiscal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Nom Fiscal / Raó Social *
                </label>
                <input
                  type="text"
                  required
                  value={fiscalData.nom_fiscal || ''}
                  onChange={e => setFiscalData(prev => ({ ...prev, nom_fiscal: e.target.value }))}
                  placeholder="ex: Joan Garcia Pérez o Empresa SL"
                  className="w-full text-xs input"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Tipus ID
                  </label>
                  <select
                    value={fiscalData.tipus_id_fiscal || 'NIF'}
                    onChange={e => setFiscalData(prev => ({ ...prev, tipus_id_fiscal: e.target.value }))}
                    className="w-full text-xs input"
                  >
                    <option value="NIF">NIF/DNI</option>
                    <option value="CIF">CIF</option>
                    <option value="NIE">NIE</option>
                    <option value="Passaport">Passaport</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    NIF / CIF / Document *
                  </label>
                  <input
                    type="text"
                    required
                    value={fiscalData.nif_cif || ''}
                    onChange={e => setFiscalData(prev => ({ ...prev, nif_cif: e.target.value }))}
                    placeholder="12345678X"
                    className="w-full text-xs input uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Adreça fiscal
                </label>
                <input
                  type="text"
                  value={fiscalData.adreca || ''}
                  onChange={e => setFiscalData(prev => ({ ...prev, adreca: e.target.value }))}
                  placeholder="Carrer, Número, Pis"
                  className="w-full text-xs input"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Codi Postal
                  </label>
                  <input
                    type="text"
                    value={fiscalData.cp || ''}
                    onChange={e => setFiscalData(prev => ({ ...prev, cp: e.target.value }))}
                    placeholder="08001"
                    className="w-full text-xs input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Població
                  </label>
                  <input
                    type="text"
                    value={fiscalData.poblacio || ''}
                    onChange={e => setFiscalData(prev => ({ ...prev, poblacio: e.target.value }))}
                    placeholder="Barcelona"
                    className="w-full text-xs input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Província
                  </label>
                  <input
                    type="text"
                    value={fiscalData.provincia || ''}
                    onChange={e => setFiscalData(prev => ({ ...prev, provincia: e.target.value }))}
                    placeholder="Barcelona"
                    className="w-full text-xs input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    País
                  </label>
                  <input
                    type="text"
                    value={fiscalData.pais || 'Espanya'}
                    onChange={e => setFiscalData(prev => ({ ...prev, pais: e.target.value }))}
                    placeholder="Espanya"
                    className="w-full text-xs input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Email de Facturació
                  </label>
                  <input
                    type="email"
                    value={fiscalData.email || ''}
                    onChange={e => setFiscalData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="factures@domini.com"
                    className="w-full text-xs input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Telèfon
                  </label>
                  <input
                    type="tel"
                    value={fiscalData.telefon || ''}
                    onChange={e => setFiscalData(prev => ({ ...prev, telefon: e.target.value }))}
                    placeholder="+34 600..."
                    className="w-full text-xs input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingFiscal}
                className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2 mt-4"
              >
                {savingFiscal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Desar Dades Fiscals</span>
              </button>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-2.5 mb-4">
              <Lock className="w-5 h-5 text-brand-600" />
              <h2 className="text-base font-bold text-text-primary">Seguretat & Contrasenya</h2>
            </div>

            {passwordSuccess && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Contrasenya canviada correctament!</span>
              </div>
            )}
            {passwordError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Contrasenya actual
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full text-xs input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Nova contrasenya
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full text-xs input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Confirmar nova contrasenya
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full text-xs input"
                />
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="w-full btn-secondary py-2 text-xs font-bold flex items-center justify-center gap-2 mt-2"
              >
                {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>Actualitzar Contrasenya</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Invoices History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-brand-600" />
                <h2 className="text-base font-bold text-text-primary">Històric de Facturació</h2>
              </div>
              <span className="text-xs font-bold text-text-secondary bg-bg-surface px-2.5 py-1 rounded-lg border border-border">
                {invoices.length} {invoices.length === 1 ? 'factura' : 'factures'}
              </span>
            </div>
            <p className="text-xs text-text-secondary mb-5">
              Consulta totes les factures emeses, rebuts de subscripcions i entrenaments, i descarrega el PDF oficial.
            </p>

            {loading ? (
              <div className="p-12 text-center text-text-muted">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-500" />
                <p className="text-xs">Carregant el teu històric de factures...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-10 text-center rounded-2xl border-2 border-dashed border-border bg-bg-surface/50">
                <FileText className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold text-text-primary">Encara no tens cap factura emesa</p>
                <p className="text-xs text-text-secondary mt-1">
                  Quan es generin factures de les teves quotes o activitats, les trobaràs disponibles aquí per descarregar en PDF.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bg-surface/60 text-text-muted uppercase text-[10px] font-bold border-b border-border">
                    <tr>
                      <th className="p-3">Factura</th>
                      <th className="p-3">Data</th>
                      <th className="p-3">Concepte</th>
                      <th className="p-3">Unitat Negoci</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3 text-center">Estat Pagament</th>
                      <th className="p-3 text-right">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoices.map(inv => {
                      const isPaid = inv.estat_cobrament === 'pagada'
                      const isOverdue = inv.estat_cobrament === 'impagada'
                      return (
                        <tr key={inv.id} className="hover:bg-bg-surface/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-brand-600">
                            {inv.numero_complet || `F-${inv.numero_seq}`}
                          </td>
                          <td className="p-3 text-text-secondary whitespace-nowrap">
                            {inv.data_emissio}
                          </td>
                          <td className="p-3 font-medium text-text-primary">
                            {inv.concepte || inv.descripcio_detall || 'Entrenament / Quota de servei'}
                          </td>
                          <td className="p-3 text-text-muted text-[11px]">
                            {inv.unitat_negoci_nom || '—'}
                          </td>
                          <td className="p-3 text-right font-bold text-text-primary whitespace-nowrap">
                            {inv.total_factura.toFixed(2)} €
                          </td>
                          <td className="p-3 text-center">
                            {isPaid ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Pagada
                              </span>
                            ) : isOverdue ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                Impagada
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Pendent
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => downloadPdf(inv.id, inv.numero_complet || '')}
                              className="p-1.5 rounded-lg text-brand-600 hover:text-brand-800 hover:bg-brand-50 transition-colors"
                              title="Descarregar PDF oficial"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
