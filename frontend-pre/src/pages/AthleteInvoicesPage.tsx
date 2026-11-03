import React, { useState, useEffect } from 'react'
import { 
  FileText, 
  Download, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  Building2,
  ExternalLink
} from 'lucide-react'
import { listMyFactures, type FinFacturaVenda } from '../api/finances'

export const AthleteInvoicesPage: React.FC = () => {
  const [factures, setFactures] = useState<FinFacturaVenda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listMyFactures()
      setFactures(data)
    } catch (err: any) {
      console.error('Error carregant factures:', err)
      setError(err.response?.data?.error || 'No s\'han pogut carregar les teves factures.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (estatCob: string) => {
    switch (estatCob) {
      case 'pagada':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" /> Pagada
          </span>
        )
      case 'impagada':
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
            <AlertCircle className="w-3.5 h-3.5" /> Impagada
          </span>
        )
      default:
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
            <Clock className="w-3.5 h-3.5" /> Pendent de pagament
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
            Perfil d'Atleta
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2.5 mt-1">
            <FileText className="w-6 h-6 text-brand-500" />
            Les meves Factures
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Consulta i descarrega els justificants fiscals dels teus entrenaments i estades esportives.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
          <Building2 className="w-4 h-4 text-slate-500" />
          <span>{factures.length} factures emeses</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-text-muted text-sm font-medium">Carregant l'historial de facturació...</p>
        </div>
      ) : factures.length === 0 ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-sm">Encara no tens cap factura emesa al teu nom.</p>
          <p className="text-xs mt-1 text-slate-400">Quan l'administració emeti el rebut mensual o del camp, el veuràs reflectit aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {factures.map(f => {
            const numFact = f.numero_complet || `F-${f.id.substring(0, 8)}`
            const pdfUrl = `/api/finances/factures/${f.id}/pdf`
            return (
              <div key={f.id} className="glass-card p-5 border border-border-light hover:border-brand-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{f.unitat_negoci_nom}</div>
                      <h3 className="font-bold text-base text-text-primary mt-0.5">{numFact}</h3>
                    </div>
                    {getStatusBadge(f.estat_cobrament)}
                  </div>

                  <p className="text-sm font-semibold text-slate-800 line-clamp-2 mb-3">
                    {f.concepte}
                  </p>

                  <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs text-slate-600 mb-4 border border-slate-100">
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1 text-slate-400"><Calendar className="w-3.5 h-3.5" /> Data emissió:</span>
                      <span className="font-semibold text-slate-700">{f.data_emissio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Període:</span>
                      <span className="font-medium text-slate-700">{f.periode_inici} a {f.periode_fi}</span>
                    </div>
                    {f.estat_cobrament === 'pagada' && f.data_conciliacio && (
                      <div className="flex justify-between text-emerald-700 font-semibold pt-1 border-t border-slate-200/60">
                        <span>Cobrament validat:</span>
                        <span>{f.data_conciliacio}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-border-light flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Total a pagar</div>
                    <div className="text-lg font-black text-brand-600 leading-tight">
                      {f.total_factura.toFixed(2)} €
                    </div>
                  </div>

                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Veure / Imprimir</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
