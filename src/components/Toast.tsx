import { useEffect, useState, createContext, useContext, useCallback, ReactNode } from 'react'
import { CheckCircle, AlertCircle, Info, Wifi, WifiOff, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'sync' | 'offline'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void
  hideToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((type: ToastType, message: string, duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setToasts((prev) => [...prev, { id, type, message, duration }])
  }, [])

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </ToastContext.Provider>
  )
}


interface ToastContainerProps {
  toasts: Toast[]
  onHide: (id: string) => void
}

function ToastContainer({ toasts, onHide }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onHide={onHide} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onHide: (id: string) => void
}

function ToastItem({ toast, onHide }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true)
        setTimeout(() => onHide(toast.id), 300)
      }, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onHide])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => onHide(toast.id), 300)
  }

  const config = {
    success: {
      bg: 'bg-gray-800',
      icon: CheckCircle
    },
    error: {
      bg: 'bg-gray-800',
      icon: AlertCircle
    },
    info: {
      bg: 'bg-gray-800',
      icon: Info
    },
    sync: {
      bg: 'bg-gray-800',
      icon: Wifi
    },
    offline: {
      bg: 'bg-gray-700',
      icon: WifiOff
    }
  }

  const { bg, icon: Icon } = config[toast.type]

  return (
    <div
      className={`${bg} text-white rounded-xl p-4 shadow-lg ${
        isExiting ? 'animate-slide-down' : 'animate-slide-up'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} className="flex-shrink-0" />
        <p className="flex-1 text-sm">{toast.message}</p>
        <button
          onClick={handleClose}
          className="hover:bg-white/20 rounded p-1 flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
