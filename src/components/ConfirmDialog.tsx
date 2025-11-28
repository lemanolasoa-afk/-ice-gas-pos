import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react'

interface Props {
  isOpen: boolean
  title: string
  message: string
  type?: 'warning' | 'danger' | 'info' | 'success'
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

const typeConfig = {
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    buttonBg: 'bg-gray-800 hover:bg-gray-700',
  },
  danger: {
    icon: XCircle,
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    buttonBg: 'bg-gray-800 hover:bg-gray-700',
  },
  info: {
    icon: Info,
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    buttonBg: 'bg-gray-800 hover:bg-gray-700',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    buttonBg: 'bg-gray-800 hover:bg-gray-700',
  },
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  type = 'warning',
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  onConfirm,
  onCancel,
  isLoading = false,
}: Props) {
  if (!isOpen) return null

  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl w-full max-w-sm animate-scale-in">
        <div className="p-6 text-center">
          <div className={`w-14 h-14 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Icon size={28} className={config.iconColor} />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
          <p className="text-gray-500 text-sm">{message}</p>
        </div>
        <div className="flex gap-3 p-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 border border-gray-200 rounded-lg font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-3 ${config.buttonBg} text-white rounded-lg font-medium transition-colors disabled:opacity-50`}
          >
            {isLoading ? 'กำลังดำเนินการ...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
