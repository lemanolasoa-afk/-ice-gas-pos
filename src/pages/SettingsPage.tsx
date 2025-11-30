import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Store, Trash2, Info, Package, BarChart3, Users,
  Tag, PackagePlus, ChevronRight, TrendingUp, ShoppingCart,
  LogOut, History, DollarSign, UserCog, Smartphone, AlertCircle, Bell,
  Database, Snowflake, Droplets, Printer, RefreshCw
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/authStore'
import { hasPermission, Permission } from '../lib/permissions'
import { NotificationSettings } from '../components/NotificationSettings'
import { PrinterSettings } from '../components/PrinterSettings'
import { BackupManager } from '../lib/backupManager'

export function SettingsPage() {
  const navigate = useNavigate()
  const sales = useStore((s) => s.sales)
  const products = useStore((s) => s.products)
  const fetchSales = useStore((s) => s.fetchSales)
  const fetchProducts = useStore((s) => s.fetchProducts)
  const { user, logout } = useAuthStore()
  const [isInstalled, setIsInstalled] = useState(false)
  const [showBackupReminder, setShowBackupReminder] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  useEffect(() => {
    fetchSales()
    fetchProducts()
    
    // ตรวจสอบว่าแอปถูกติดตั้งแล้วหรือไม่
    const checkInstallStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isIOSStandalone = (window.navigator as any).standalone === true
      const isAndroidTWA = document.referrer.includes('android-app://')
      setIsInstalled(isStandalone || isIOSStandalone || isAndroidTWA)
    }
    
    checkInstallStatus()
    setShowBackupReminder(BackupManager.shouldShowBackupReminder())
  }, [fetchSales, fetchProducts])

  const handleClearData = () => {
    if (confirm('ต้องการล้างข้อมูลทั้งหมดหรือไม่?')) {
      localStorage.removeItem('ice-gas-pos-storage')
      window.location.reload()
    }
  }

  // Calculate stats
  const todaySales = sales.filter((s) => {
    const today = new Date().toDateString()
    return new Date(s.created_at).toDateString() === today
  })
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0)
  const lowStockCount = products.filter((p) => p.stock <= p.low_stock_threshold).length

  const handleLogout = () => {
    if (confirm('ต้องการออกจากระบบ?')) {
      logout()
      window.location.reload()
    }
  }

  // Menu items organized by category
  interface MenuItem {
    icon: typeof Package
    label: string
    desc?: string
    path: string
    permission?: Permission
  }

  interface MenuSection {
    id: string
    title: string
    icon: typeof Package
    color: string
    items: MenuItem[]
  }

  const menuSections: MenuSection[] = [
    {
      id: 'stock',
      title: 'จัดการสต็อก',
      icon: Package,
      color: 'bg-blue-500',
      items: [
        { icon: Package, label: 'สินค้าทั้งหมด', desc: `${products.length} รายการ`, path: '/products', permission: 'products.view' },
        { icon: PackagePlus, label: 'รับสินค้าเข้า', path: '/stock-receipt', permission: 'stock.receive' },
        { icon: RefreshCw, label: 'รับคืนถังแก๊ส', path: '/cylinder-return', permission: 'stock.receive' },
        { icon: History, label: 'ประวัติสต็อก', path: '/stock-logs', permission: 'stock.logs' },
        { icon: Snowflake, label: 'ปิดยอดน้ำแข็ง', path: '/daily-stock-count', permission: 'stock.receive' },
      ]
    },
    {
      id: 'reports',
      title: 'รายงาน',
      icon: BarChart3,
      color: 'bg-purple-500',
      items: [
        { icon: BarChart3, label: 'ยอดขาย', path: '/reports', permission: 'reports.view' },
        { icon: DollarSign, label: 'กำไร', path: '/profit', permission: 'reports.profit' },
        { icon: Package, label: 'สต็อก', path: '/stock-report', permission: 'reports.view' },
        { icon: Users, label: 'ลูกค้า', path: '/customer-report', permission: 'reports.view' },
        { icon: Droplets, label: 'การละลาย', path: '/melt-loss-report', permission: 'reports.view' },
      ]
    },
    {
      id: 'crm',
      title: 'ลูกค้า & โปรโมชั่น',
      icon: Users,
      color: 'bg-orange-500',
      items: [
        { icon: Users, label: 'ลูกค้าสมาชิก', path: '/customers', permission: 'customers.view' },
        { icon: Tag, label: 'ส่วนลด/โปรโมชั่น', path: '/discounts', permission: 'discounts.view' },
      ]
    },
    {
      id: 'system',
      title: 'ระบบ',
      icon: UserCog,
      color: 'bg-gray-500',
      items: [
        { icon: UserCog, label: 'จัดการผู้ใช้', path: '/users', permission: 'users.manage' },
        { icon: Database, label: 'สำรองข้อมูล', path: '/backup', permission: 'settings.export' },
      ]
    },
  ]

  // Filter sections based on permissions
  const visibleSections = menuSections.map(section => ({
    ...section,
    items: section.items.filter(item => !item.permission || hasPermission(user?.role, item.permission))
  })).filter(section => section.items.length > 0)

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId)
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">⚙️ เพิ่มเติม</h1>
      </header>

      <div className="p-4 space-y-3">
        {/* User Info - Compact */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <h2 className="font-medium text-gray-800">{user?.name || 'ผู้ใช้'}</h2>
                <p className="text-xs text-gray-500">
                  {user?.role === 'admin' ? '👑 ผู้ดูแลระบบ' : '🛒 พนักงานขาย'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg flex items-center gap-1"
            >
              <LogOut size={16} />
              ออก
            </button>
          </div>
        </div>

        {/* Quick Stats - Horizontal */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <div className="flex-shrink-0 bg-white border border-gray-100 rounded-xl px-4 py-3 min-w-[100px]">
            <p className="text-lg font-bold text-gray-800">฿{todayRevenue.toLocaleString()}</p>
            <p className="text-xs text-gray-500">ยอดวันนี้</p>
          </div>
          <div className="flex-shrink-0 bg-white border border-gray-100 rounded-xl px-4 py-3 min-w-[80px]">
            <p className="text-lg font-bold text-gray-800">{todaySales.length}</p>
            <p className="text-xs text-gray-500">ออเดอร์</p>
          </div>
          {lowStockCount > 0 && (
            <button 
              onClick={() => navigate('/products')}
              className="flex-shrink-0 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 min-w-[80px]"
            >
              <p className="text-lg font-bold text-amber-600">{lowStockCount}</p>
              <p className="text-xs text-amber-600">ใกล้หมด</p>
            </button>
          )}
        </div>

        {/* Backup Reminder - Compact */}
        {showBackupReminder && hasPermission(user?.role, 'settings.export') && (
          <button
            onClick={() => navigate('/backup')}
            className="w-full bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-center gap-3"
          >
            <Database className="text-cyan-600" size={20} />
            <span className="flex-1 text-left text-sm text-cyan-800">แนะนำให้สำรองข้อมูล</span>
            <ChevronRight className="text-cyan-400" size={18} />
          </button>
        )}

        {/* Menu Sections - Accordion Style */}
        <div className="space-y-2">
          {visibleSections.map((section) => {
            const SectionIcon = section.icon
            const isExpanded = expandedSection === section.id
            
            return (
              <div key={section.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50"
                >
                  <div className={`w-9 h-9 ${section.color} rounded-lg flex items-center justify-center`}>
                    <SectionIcon className="text-white" size={18} />
                  </div>
                  <span className="flex-1 text-left font-medium text-gray-800">{section.title}</span>
                  <span className="text-xs text-gray-400 mr-1">{section.items.length}</span>
                  <ChevronRight 
                    className={`text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                    size={18} 
                  />
                </button>
                
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {section.items.map((item, idx) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.path}
                          onClick={() => navigate(item.path)}
                          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 ${
                            idx < section.items.length - 1 ? 'border-b border-gray-50' : ''
                          }`}
                        >
                          <Icon className="text-gray-400 ml-2" size={16} />
                          <span className="flex-1 text-left text-gray-700">{item.label}</span>
                          {item.desc && (
                            <span className="text-xs text-gray-400">{item.desc}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Settings Cards - Collapsible */}
        <div className="space-y-2">
          {/* Notification Settings */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => toggleSection('notifications')}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50"
            >
              <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
                <Bell className="text-white" size={18} />
              </div>
              <span className="flex-1 text-left font-medium text-gray-800">การแจ้งเตือน</span>
              <ChevronRight 
                className={`text-gray-300 transition-transform ${expandedSection === 'notifications' ? 'rotate-90' : ''}`} 
                size={18} 
              />
            </button>
            {expandedSection === 'notifications' && (
              <div className="border-t border-gray-100 p-4">
                <NotificationSettings />
              </div>
            )}
          </div>

          {/* Printer Settings */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => toggleSection('printer')}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50"
            >
              <div className="w-9 h-9 bg-indigo-500 rounded-lg flex items-center justify-center">
                <Printer className="text-white" size={18} />
              </div>
              <span className="flex-1 text-left font-medium text-gray-800">เครื่องพิมพ์</span>
              <ChevronRight 
                className={`text-gray-300 transition-transform ${expandedSection === 'printer' ? 'rotate-90' : ''}`} 
                size={18} 
              />
            </button>
            {expandedSection === 'printer' && (
              <div className="border-t border-gray-100 p-4">
                <PrinterSettings />
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone - Admin Only */}
        {hasPermission(user?.role, 'settings.clear') && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <button
              onClick={handleClearData}
              className="w-full flex items-center gap-3 p-4 hover:bg-red-50"
            >
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                <Trash2 className="text-red-500" size={18} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-red-600">ล้างข้อมูลทั้งหมด</p>
                <p className="text-xs text-gray-400">ลบประวัติการขายและตะกร้า</p>
              </div>
            </button>
          </div>
        )}

        {/* App Info - Compact */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500">
              <Info size={16} />
              <span className="text-sm">Ice Gas POS v2.0</span>
            </div>
            <div className="flex items-center gap-2">
              {isInstalled ? (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">✓ ติดตั้งแล้ว</span>
              ) : (
                <span className="text-xs text-gray-400">PWA Ready</span>
              )}
              <Smartphone size={14} className="text-gray-400" />
            </div>
          </div>
        </div>

        {/* PWA Install Guide - Only if not installed */}
        {!isInstalled && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 mb-2">ติดตั้งแอปเพื่อใช้งานได้ดีขึ้น</p>
                <div className="text-xs text-amber-800 space-y-1">
                  <p>• iOS: Share → Add to Home Screen</p>
                  <p>• Android: เมนู (⋮) → Install app</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
