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
    <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-700"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {icon && <span className="text-2xl">{icon}</span>}
              {title}
            </h1>
            {user && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                {user.role === 'admin' ? (
                  <Crown size={12} className="text-amber-500" />
                ) : (
                  <ShoppingCart size={12} />
                )}
                <span className="font-medium">{user.name}</span>
                <span className="text-gray-300">•</span>
                <span className={user.role === 'admin' ? 'text-amber-600' : 'text-gray-500'}>
                  {user.role === 'admin' ? 'ผู้ดูแล' : 'พนักงาน'}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div
            className={`p-2.5 rounded-xl transition-colors ${
              isOnline ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500 animate-pulse'
            }`}
          >
            {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
          </div>

          {/* Notifications */}
          {showNotifications && lowStockCount > 0 && (
            <button
              onClick={() => navigate('/products')}
              className="relative p-2.5 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors text-amber-600"
            >
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-sm">
                {lowStockCount}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
