import { useEffect, useRef, useState } from 'react'
import { X, Camera, Keyboard } from 'lucide-react'

interface Props {
  onScan: (barcode: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onScan, onClose }: Props) {
  const [mode, setMode] = useState<'camera' | 'manual'>('manual')
  const [manualCode, setManualCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (mode === 'camera') {
      startCamera()
    }
    return () => {
      stopCamera()
    }
  }, [mode])

  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setError('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้งานกล้อง')
      setMode('manual')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      onScan(manualCode.trim())
    }
  }

  // Simple barcode detection using keyboard input (for USB barcode scanners)
  useEffect(() => {
    let buffer = ''
    let timeout: NodeJS.Timeout

    const handleKeyPress = (e: KeyboardEvent) => {
      // USB barcode scanners typically send characters rapidly followed by Enter
      if (e.key === 'Enter' && buffer.length > 3) {
        onScan(buffer)
        buffer = ''
        return
      }

      if (e.key.length === 1) {
        buffer += e.key
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          buffer = ''
        }, 100) // Reset buffer if no input for 100ms
      }
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => {
      window.removeEventListener('keypress', handleKeyPress)
      clearTimeout(timeout)
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">สแกน Barcode</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 font-medium ${
              mode === 'manual' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
            }`}
          >
            <Keyboard size={18} />
            พิมพ์เอง
          </button>
          <button
            onClick={() => setMode('camera')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 font-medium ${
              mode === 'camera' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
            }`}
          >
            <Camera size={18} />
            กล้อง
          </button>
        </div>

        <div className="p-4">
          {mode === 'manual' ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  รหัส Barcode
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="พิมพ์หรือสแกนด้วยเครื่องอ่าน..."
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-sm text-gray-500">
                💡 เสียบเครื่องอ่าน Barcode USB แล้วสแกนได้เลย
              </p>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium disabled:bg-gray-300"
              >
                ค้นหา
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {error ? (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm">
                  {error}
                </div>
              ) : (
                <>
                  <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3/4 h-1/3 border-2 border-white/50 rounded-lg" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 text-center">
                    วาง barcode ให้อยู่ในกรอบ
                  </p>
                  <p className="text-xs text-amber-600 text-center">
                    ⚠️ การสแกนด้วยกล้องต้องใช้ library เพิ่มเติม แนะนำใช้เครื่องอ่าน USB
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
