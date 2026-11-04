import React from 'react'
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X } from 'lucide-react'

export interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  loading?: boolean
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancel·lar',
  variant = 'warning',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!isOpen) return null

  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-100 text-rose-600',
      btn: 'bg-rose-600 hover:bg-rose-700 text-white',
      icon: AlertCircle,
    },
    warning: {
      iconBg: 'bg-amber-100 text-amber-600',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white',
      icon: AlertTriangle,
    },
    info: {
      iconBg: 'bg-sky-100 text-sky-600',
      btn: 'bg-sky-600 hover:bg-sky-700 text-white',
      icon: Info,
    },
    success: {
      iconBg: 'bg-emerald-100 text-emerald-600',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      icon: CheckCircle2,
    },
  }[variant]

  const IconComponent = variantStyles.icon

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${variantStyles.iconBg}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-slate-900">{title}</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end gap-2 text-xs">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-4 py-2 font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 ${variantStyles.btn}`}
          >
            {loading ? 'Processant...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
