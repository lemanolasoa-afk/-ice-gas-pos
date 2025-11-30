import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Bell, Wifi, WifiOff, User, Printer } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/authStore'
import { usePrinter } from '../hooks/usePrinter'

interface Props {
  title: string
  showBack?: boolean
  showNotifications?: boolean
}

export function Header({ title, showBack = false, showNotifications = false }: Props) {
  const navigate = useNavigate()
  const isOnline = useStore((s) => s.isOnline)
  const products = useStore((s) => s.products)
  const { user } = useAuthStore()
  const { isSupported: isPrinterSupported, isConnected: isPrinterConnected } = usePrinter()

  const lowStockCount = products.filter((p) => p.stock <= p.low_stock_threshold).length

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            {user && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <User size={10} />
                <span>{user.name}</span>
                <span className="text-gray-300">|</span>
                <span>{user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน'}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPrinterSupported && (
            <button
              onClick={() => navigate('/settings')}
              className={`p-2 rounded-lg transition-colors ${
                isPrinterConnected 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'bg-gray-50 text-gray-400'
              }`}
              title={isPrinterConnected ? 'เครื่องพิมพ์เชื่อมต่อแล้ว' : 'ไม่ได้เชื่อมต่อเครื่องพิมพ์'}
            >
              <Printer size={18} />
            </button>
          )}

          <div
            className={`p-2 rounded-lg ${
              isOnline ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
            }`}
            title={isOnline ? 'ออนไลน์' : 'ออฟไลน์'}
          >
            {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
          </div>

          {showNotifications && lowStockCount > 0 && (
            <button
              onClick={() => navigate('/products')}
              className="relative p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            >
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-medium flex items-center justify-center">
                {lowStockCount}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
