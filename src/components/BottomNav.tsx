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
  { path: '/settings', icon: Settings, label: 'เพิ่มเติม' }, // No permission required
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Filter nav items based on user permissions
  const visibleNavItems = navItems.filter(item => {
    if (!item.permission) return true
    return hasPermission(user?.role, item.permission)
  })

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${
                isActive 
                  ? 'text-gray-800' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-gray-100' : ''}`}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-gray-800' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 w-4 h-0.5 bg-gray-800 rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
