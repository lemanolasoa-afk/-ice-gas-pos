import { Home, History, Settings, Package, LayoutDashboard } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { hasPermission, Permission } from '../lib/permissions'

interface NavItem {
  path: string
  icon: typeof Home
  label: string
  permission?: Permission
}

const navItems: NavItem[] = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'หน้าหลัก', permission: 'dashboard.view' },
  { path: '/', icon: Home, label: 'ขาย', permission: 'pos.sell' },
  { path: '/history', icon: History, label: 'ประวัติ', permission: 'history.view' },
  { path: '/products', icon: Package, label: 'สินค้า', permission: 'products.view' },
  { path: '/settings', icon: Settings, label: 'เพิ่มเติม' },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const visibleNavItems = navItems.filter((item) => {
    if (!item.permission) return true
    return hasPermission(user?.role, item.permission)
  })

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pb-safe shadow-lg">
      <div className="flex justify-around items-center h-18 max-w-lg mx-auto py-2">
        {visibleNavItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                isActive ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-xs font-semibold ${isActive ? 'text-white' : ''}`}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
