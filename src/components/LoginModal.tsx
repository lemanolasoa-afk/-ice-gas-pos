import { useState } from 'react'
import { Lock, Delete, LogIn, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

interface Props {
  onSuccess: () => void
}

export function LoginModal({ onSuccess: _onSuccess }: Props) {
  const [pin, setPin] = useState('')
  const { login, isLoading, error, clearError } = useAuthStore()

  const handleKeyPress = async (key: string) => {
    clearError()
    if (key === 'delete') {
      setPin((prev) => prev.slice(0, -1))
    } else if (key === 'enter') {
      if (pin.length >= 4) {
        const success = await login(pin)
        if (success) {
          window.location.reload()
        }
      }
    } else if (pin.length < 6) {
      setPin((prev) => prev + key)
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'delete', '0', 'enter']

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm border border-gray-100 animate-scale-in relative">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Lock className="text-gray-600" size={28} />
          </div>
          <h1 className="text-xl font-semibold text-gray-800">ยินดีต้อนรับ</h1>
          <p className="text-gray-500 text-sm mt-1">กรุณาใส่ PIN เพื่อเข้าสู่ระบบ</p>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                i < pin.length
                  ? 'bg-gray-800'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-gray-100 text-gray-700 text-center py-3 px-4 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {keys.map((key, idx) => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              disabled={isLoading}
              style={{ animationDelay: `${idx * 30}ms` }}
              className={`h-14 rounded-lg font-semibold text-xl flex items-center justify-center transition-colors stagger-item ${
                key === 'enter'
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : key === 'delete'
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-800 hover:bg-gray-100'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading && key === 'enter' ? (
                <Loader2 size={22} className="animate-spin" />
              ) : key === 'delete' ? (
                <Delete size={22} />
              ) : key === 'enter' ? (
                <LogIn size={22} />
              ) : (
                key
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-center text-gray-400 text-xs mb-2">ทดสอบระบบ</p>
          <div className="flex justify-center gap-4 text-xs">
            <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded font-medium">
              Admin: 1234
            </span>
            <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded font-medium">
              พนักงาน: 0000
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
