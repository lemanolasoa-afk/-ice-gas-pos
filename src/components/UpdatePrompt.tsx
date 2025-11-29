import { RefreshCw, X } from 'lucide-react'
import { usePWA } from '../hooks/usePWA'

export function UpdatePrompt() {
  const { isUpdateAvailable, update } = usePWA()

  if (!isUpdateAvailable) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5" />
          <div>
            <p className="font-medium">มีอัพเดทใหม่</p>
            <p className="text-sm text-blue-100">กดอัพเดทเพื่อใช้เวอร์ชันล่าสุด</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={update}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            อัพเดท
          </button>
        </div>
      </div>
    </div>
  )
}
