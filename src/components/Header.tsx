import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Bell, Wifi, WifiOff, Crown, ShoppingCart } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/authStore'

interface Props {
  title: string
  icon?: string
  showBack?: boolean
  showNotifications?: boolean
}

export function Header({ title, icon, showBack = false, showNotifications = false }: Props) {
  const navigate = useNavigate()
  const isOnline = useStore((s) => s.isOnline)
  const products = useStore((s) => s.products)
  const { user } = useAuthStore()

  const lowStockCount = products.filter((p) => p.stock <= p.low_stock_threshold).length

  return (
    <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
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
            <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              {icon && <span className="text-xl">{icon}</span>}
              {title}
            </h1>
            {user && (
              <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                {user.role === 'admin' ? (
                  <Crown size={10} className="text-gray-500" />
                ) : (
                  <ShoppingCart size={10} />
                )}
                <span>{user.name}</span>
                <span>•</span>
                <span>{user.role === 'admin' ? 'ผู้ดูแล' : 'พนักงาน'}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div
            className={`p-2 rounded-lg transition-colors ${
              isOnline
                ? 'text-gray-400'
                : 'text-red-400 animate-pulse'
            }`}
          >
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
          </div>

          {/* Notifications */}
          {showNotifications && lowStockCount > 0 && (
            <button
              onClick={() => navigate('/products')}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            >
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-800 text-white rounded-full text-[10px] font-medium flex items-center justify-center">
                {lowStockCount}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
