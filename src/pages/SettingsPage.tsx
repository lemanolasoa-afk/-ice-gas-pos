import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Store, Trash2, Download, Info, Package, BarChart3, Users,
  Tag, PackagePlus, ChevronRight, TrendingUp, ShoppingCart,
  LogOut, History, DollarSign, UserCog, Smartphone, AlertCircle, Bell,
  Database, Snowflake, Droplets
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../components/Toast'
import { hasPermission, Permission } from '../lib/permissions'
import { NotificationSettings } from '../components/NotificationSettings'
import { BackupManager } from '../lib/backupManager'

export function SettingsPage() {
  const navigate = useNavigate()
  const sales = useStore((s) => s.sales)
  const products = useStore((s) => s.products)
  const fetchSales = useStore((s) => s.fetchSales)
  const fetchProducts = useStore((s) => s.fetchProducts)
  const { user, logout } = useAuthStore()
  const { showToast } = useToast()
  const [isInstalled, setIsInstalled] = useState(false)
  const [showBackupReminder, setShowBackupReminder] = useState(false)

  useEffect(() => {
    fetchSales()
    fetchProducts()
    
    // ตรวจสอบว่าแอปถูกติดตั้งแล้วหรือไม่
    const checkInstallStatus = () => {
      // วิธีที่ 1: ตรวจสอบ display-mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      
      // วิธีที่ 2: ตรวจสอบ iOS standalone
      const isIOSStandalone = (window.navigator as any).standalone === true
      
      // วิธีที่ 3: ตรวจสอบ Android TWA
      const isAndroidTWA = document.referrer.includes('android-app://')
      
      setIsInstalled(isStandalone || isIOSStandalone || isAndroidTWA)
    }
    
    checkInstallStatus()
    
    // Check backup reminder
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

  // Menu items with permission requirements
  interface MenuItem {
    icon: typeof Package
    label: string
    desc: string
    path: string
    color: string
    permission?: Permission
  }

  const allMenuItems: MenuItem[] = [
    { icon: Package, label: 'จัดการสินค้า', desc: `${products.length} รายการ`, path: '/products', color: 'bg-blue-500', permission: 'products.view' },
    { icon: PackagePlus, label: 'รับสินค้าเข้าสต็อก', desc: 'เพิ่มสต็อกสินค้า', path: '/stock-receipt', color: 'bg-green-500', permission: 'stock.receive' },
    { icon: History, label: 'ประวัติสต็อก', desc: 'ดู log การเปลี่ยนแปลง', path: '/stock-logs', color: 'bg-teal-500', permission: 'stock.logs' },
    { icon: Snowflake, label: 'ปิดยอดสต๊อกน้ำแข็ง', desc: 'บันทึกการละลายประจำวัน', path: '/daily-stock-count', color: 'bg-cyan-500', permission: 'stock.receive' },
    { icon: Droplets, label: 'รายงานการละลาย', desc: 'สรุปการสูญเสียจากการละลาย', path: '/melt-loss-report', color: 'bg-amber-500', permission: 'reports.view' },
    { icon: BarChart3, label: 'รายงานยอดขาย', desc: 'ดูสถิติและกราฟ', path: '/reports', color: 'bg-purple-500', permission: 'reports.view' },
    { icon: DollarSign, label: 'รายงานกำไร', desc: 'วิเคราะห์กำไรขาดทุน', path: '/profit', color: 'bg-emerald-500', permission: 'reports.profit' },
    { icon: Users, label: 'ลูกค้าสมาชิก', desc: 'ระบบสะสมแต้ม', path: '/customers', color: 'bg-orange-500', permission: 'customers.view' },
    { icon: Tag, label: 'โปรโมชั่น/ส่วนลด', desc: 'จัดการส่วนลด', path: '/discounts', color: 'bg-pink-500', permission: 'discounts.view' },
    { icon: UserCog, label: 'จัดการผู้ใช้', desc: 'เพิ่ม/ลบพนักงาน', path: '/users', color: 'bg-indigo-500', permission: 'users.manage' },
    { icon: Database, label: 'สำรองข้อมูล', desc: 'Backup & Import', path: '/backup', color: 'bg-cyan-500', permission: 'settings.export' },
  ]

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter(item => {
    if (!item.permission) return true
    return hasPermission(user?.role, item.permission)
  })

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">⚙️ ตั้งค่าและจัดการ</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* User Info */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Store className="text-gray-600" size={22} />
              </div>
              <div>
                <h2 className="font-medium text-gray-800">
                  {user?.name || 'ร้านน้ำแข็ง แก๊ส น้ำดื่ม'}
                </h2>
                <p className="text-sm text-gray-500">
                  {user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงานขาย'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              title="ออกจากระบบ"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Backup Reminder */}
        {showBackupReminder && hasPermission(user?.role, 'settings.export') && (
          <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Database className="text-cyan-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <h3 className="font-medium text-cyan-900 mb-1">แนะนำให้สำรองข้อมูล</h3>
                <p className="text-sm text-cyan-800 mb-2">
                  ควรสำรองข้อมูลเป็นประจำเพื่อป้องกันข้อมูลสูญหาย
                </p>
                <button
                  onClick={() => navigate('/backup')}
                  className="px-3 py-1.5 bg-cyan-600 text-white text-sm rounded-lg"
                >
                  สำรองข้อมูล
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-100 rounded-xl p-3">
            <TrendingUp size={18} className="mb-1 text-gray-400" />
            <p className="text-base font-semibold text-gray-800">฿{todayRevenue.toLocaleString()}</p>
            <p className="text-xs text-gray-500">ยอดวันนี้</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-3">
            <ShoppingCart size={18} className="mb-1 text-gray-400" />
            <p className="text-base font-semibold text-gray-800">{todaySales.length}</p>
            <p className="text-xs text-gray-500">ออเดอร์วันนี้</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-3">
            <Package size={18} className="mb-1 text-gray-400" />
            <p className="text-base font-semibold text-gray-800">{lowStockCount}</p>
            <p className="text-xs text-gray-500">สินค้าใกล้หมด</p>
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {menuItems.map((item, idx) => {
            const Icon = item.icon
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-4 p-4 hover:bg-gray-50 ${idx < menuItems.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Icon className="text-gray-600" size={18} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-800">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                <ChevronRight className="text-gray-300" size={18} />
              </button>
            )
          })}
        </div>

        {/* Actions - Only show for users with permissions */}
        {(hasPermission(user?.role, 'settings.export') || hasPermission(user?.role, 'settings.clear')) && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {hasPermission(user?.role, 'settings.export') && (
              <button
                onClick={() => navigate('/backup')}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 border-b border-gray-50"
              >
                <Download className="text-gray-600" size={20} />
                <div className="text-left">
                  <p className="font-medium text-gray-800">สำรอง/ส่งออกข้อมูล</p>
                  <p className="text-sm text-gray-500">Backup, Export, Import</p>
                </div>
                <ChevronRight className="text-gray-300 ml-auto" size={18} />
              </button>
            )}

            {hasPermission(user?.role, 'settings.clear') && (
              <button
                onClick={handleClearData}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50"
              >
                <Trash2 className="text-gray-500" size={20} />
                <div className="text-left">
                  <p className="font-medium text-gray-700">ล้างข้อมูลทั้งหมด</p>
                  <p className="text-sm text-gray-500">ลบประวัติการขายและตะกร้า</p>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Notification Settings */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-3">
            <Bell size={18} />
            <span className="font-medium">การแจ้งเตือน</span>
          </div>
          <NotificationSettings />
        </div>

        {/* PWA Installation Status */}
        {!isInstalled && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <h3 className="font-medium text-amber-900 mb-1">แนะนำ: ติดตั้งแอปบนหน้าจอหลัก</h3>
                <p className="text-sm text-amber-800 mb-3">
                  เพื่อประสบการณ์การใช้งานที่ดีที่สุด ควรติดตั้งแอปบนหน้าจอหลักของคุณ
                </p>
                <div className="space-y-2 text-sm text-amber-800">
                  <p className="font-medium">วิธีติดตั้ง:</p>
                  <div className="pl-3 space-y-1">
                    <p>• <strong>iOS Safari:</strong> กด Share → Add to Home Screen</p>
                    <p>• <strong>Android Chrome:</strong> กด เมนู (⋮) → Install app</p>
                    <p>• <strong>Desktop:</strong> กดไอคอน ⊕ ที่แถบ URL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* App Info */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-3">
            <Info size={18} />
            <span className="font-medium">เกี่ยวกับแอป</span>
          </div>
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Smartphone size={16} />
              <span>
                {isInstalled ? (
                  <span className="text-green-600 font-medium">✓ ติดตั้งแอปแล้ว</span>
                ) : (
                  <span>รองรับ PWA (Add to Home Screen)</span>
                )}
              </span>
            </div>
            <p>• ใช้งานได้แบบ Offline</p>
            <p>• ข้อมูลเก็บใน Supabase Cloud</p>
            <p>• ระบบสต็อก, ลูกค้า, โปรโมชั่น</p>
          </div>
        </div>

        {/* Total Stats */}
        <div className="bg-gray-800 rounded-xl p-4 text-white">
          <p className="text-gray-400 text-sm mb-1">ยอดขายทั้งหมด</p>
          <p className="text-2xl font-semibold">
            ฿{sales.reduce((sum, s) => sum + s.total, 0).toLocaleString()}
          </p>
          <p className="text-gray-400 text-sm mt-1">{sales.length} รายการ</p>
        </div>
      </div>
    </div>
  )
}
