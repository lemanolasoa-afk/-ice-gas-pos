import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Props {
  isOpen: boolean
  change: number
  onClose: () => void
}

export function SuccessModal({ isOpen, change, onClose }: Props) {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setShowContent(true), 100)
    } else {
      setShowContent(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 modal-backdrop">
      <div className="bg-white w-80 rounded-2xl p-8 text-center animate-scale-in">
        {/* Success Icon */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 bg-gray-100 rounded-full flex items-center justify-center">
            <Check
              className={`text-gray-800 transition-all duration-500 ${showContent ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
              size={36}
              strokeWidth={2.5}
            />
          </div>
        </div>

        <h2
          className={`text-xl font-semibold text-gray-800 mb-2 transition-all duration-300 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
          style={{ transitionDelay: '150ms' }}
        >
          สำเร็จ
        </h2>
        <p
          className={`text-gray-500 mb-4 transition-all duration-300 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
          style={{ transitionDelay: '200ms' }}
        >
          ทำรายการเรียบร้อยแล้ว
        </p>

        <div
          className={`bg-gray-50 rounded-xl p-4 mb-6 transition-all duration-300 ${showContent ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}`}
          style={{ transitionDelay: '250ms' }}
        >
          <p className="text-sm text-gray-500 mb-1">เงินทอน</p>
          <p className={`text-2xl font-semibold ${change > 0 ? 'text-gray-900' : 'text-gray-500'}`}>
            {change > 0 ? `${change.toLocaleString()} บาท` : 'พอดี'}
          </p>
        </div>

        <button
          onClick={onClose}
          className={`w-full py-3 bg-gray-800 text-white rounded-xl font-medium transition-all duration-300 hover:bg-gray-700 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
          style={{ transitionDelay: '300ms' }}
        >
          ตกลง
        </button>
      </div>
    </div>
  )
}
