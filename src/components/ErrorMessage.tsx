import { AlertCircle, RefreshCw, X } from 'lucide-react'

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
  onDismiss?: () => void
  variant?: 'inline' | 'banner' | 'toast'
}

export function ErrorMessage({ 
  message, 
  onRetry, 
  onDismiss,
  variant = 'inline' 
}: ErrorMessageProps) {
  if (variant === 'banner') {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-red-700 font-medium">เกิดข้อผิดพลาด</p>
            <p className="text-red-600 text-sm mt-1">{message}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-medium"
              >
                <RefreshCw size={14} />
                ลองใหม่
              </button>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-red-400 hover:text-red-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'toast') {
    return (
      <div className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto bg-red-500 text-white rounded-xl p-4 shadow-lg z-50 animate-slide-up">
        <div className="flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="flex-1 text-sm">{message}</p>
          {onDismiss && (
            <button onClick={onDismiss} className="hover:bg-red-600 rounded p-1">
              <X size={18} />
            </button>
          )}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 w-full bg-red-600 hover:bg-red-700 rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} />
            ลองใหม่
          </button>
        )}
      </div>
    )
  }

  // Default inline variant
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="text-red-400 mb-3" size={48} />
      <p className="text-gray-600 mb-2">เกิดข้อผิดพลาด</p>
      <p className="text-red-500 text-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
        >
          <RefreshCw size={16} />
          ลองใหม่
        </button>
      )}
    </div>
  )
}
