import React, { useState, useEffect, useMemo } from 'react'
import { 
  Terminal, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Loader2, 
  Clock, 
  X 
} from 'lucide-react'
import { getSystemLogs, type SystemLog } from '../api/logs'

export const SystemLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')

  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await getSystemLogs(200, 0)
      setLogs(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q || 
        l.accio.toLowerCase().includes(q) || 
        l.missatge.toLowerCase().includes(q) || 
        (l.detalls && l.detalls.toLowerCase().includes(q))

      if (!matchesSearch) return false

      if (levelFilter !== 'all') {
        if (l.nivell.toLowerCase() !== levelFilter.toLowerCase()) return false
      }

      return true
    })
  }, [logs, searchQuery, levelFilter])

  const getLevelBadge = (level: string) => {
    const l = level.toLowerCase()
    if (l === 'error') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-rose-600" /> ERROR
        </span>
      )
    }
    if (l === 'warn' || l === 'warning') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-600" /> WARN
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
        <Info className="w-3 h-3 text-blue-500" /> INFO
      </span>
    )
  }

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-slate-100 flex items-center justify-center font-bold">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">Registre d'Auditoria del Sistema</h1>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Logs d'accions clau, generació de tasques cron, accessos i esdeveniments tècnics.
            </p>
          </div>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-bg-surface hover:bg-bg-hover text-text-primary border border-border shadow-sm flex items-center justify-center gap-2 transition-all shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Recarregar Logs
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cercar per acció, missatge o detalls..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-bg-surface border border-border rounded-xl text-xs sm:text-sm focus:outline-none"
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="font-bold text-text-muted">Nivell:</span>
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-bg-surface border border-border rounded-lg text-xs font-semibold focus:outline-none"
          >
            <option value="all">Tots els nivells</option>
            <option value="info">INFO</option>
            <option value="warn">WARN</option>
            <option value="error">ERROR</option>
          </select>
        </div>
      </div>

      {/* Logs Table / List */}
      {loading ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-3" />
          <p className="text-sm font-semibold">Carregant registre de logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-card p-12 text-center text-text-muted">
          <Terminal className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
          <h3 className="text-base font-bold text-text-primary">Cap registre trobat</h3>
          <p className="text-xs text-text-muted mt-1">
            {searchQuery ? 'No hi ha logs que coincideixin amb la cerca.' : 'El sistema no té registres recents d\'auditoria.'}
          </p>
        </div>
      ) : (
        <div className="glass-card divide-y divide-border overflow-hidden">
          {filteredLogs.map(log => (
            <div key={log.id} className="p-3.5 sm:p-4 space-y-1.5 hover:bg-bg-hover/40 transition-colors text-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {getLevelBadge(log.nivell)}
                  <span className="font-black text-text-primary uppercase tracking-wider text-[11px]">
                    {log.accio}
                  </span>
                </div>

                <span className="text-[11px] text-text-muted flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3" />
                  {new Date(log.created_at).toLocaleString('ca-ES')}
                </span>
              </div>

              <p className="text-text-primary font-medium">{log.missatge}</p>

              {log.detalls && (
                <pre className="text-[11px] bg-slate-900 text-emerald-400 p-2.5 rounded-lg overflow-x-auto font-mono">
                  {log.detalls}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
