import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, ShoppingCart, Package, Users, Clock,
  ArrowRight, AlertTriangle, Star, BarChart3
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/authStore'
import { Header } from '../components/Header'
import { StatCard } from '../components/StatCard'
import { supabase } from '../lib/supabase'
import { hasPermission } from '../lib/permissions'

export function DashboardPage() {
  const navigate = useNavigate()
  const { sales, products, fetchSales, fetchProducts } = useStore()
  const { user } = useAuthStore()
  const [customerCount, setCustomerCount] = useState(0)

  useEffect(() => {
    fetchSales()
    fetchProducts()
    fetchCustomerCount()
  }, [fetchSales, fetchProducts])

  const fetchCustomerCount = async () => {
    const { count } = await supabase.from('customers').select('*', { count: 'exact', head: true })
    setCustomerCount(count || 0)
  }

  // Calculate stats
  const today = new Date().toDateString()
  const todaySales = sales.filter((s) => new Date(s.created_at).toDateString() === today)
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0)
  const lowStockProducts = products.filter((p) => p.stock <= p.low_stock_threshold)

  // Recent sales (last 5)
  const recentSales = sales.slice(0, 5)

  // Top selling products today
  const productSales: Record<string, { name: string; qty: number }> = {}
  todaySales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!productSales[item.product_id]) {
        productSales[item.product_id] = { name: item.product_name, qty: 0 }
      }
      productSales[item.product_id].qty += item.quantity
    })
  })
  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 3)

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen pb-20">
      <Header title="Dashboard" icon="📊" showNotifications />

      <div className="p-4 space-y-4">
        {/* Greeting */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-gray-500 text-sm">สวัสดี,</p>
          <h2 className="text-xl font-semibold text-gray-800">{user?.name || 'ผู้ใช้'}</h2>
          <p className="text-gray-400 text-sm mt-2">
            {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={TrendingUp}
            value={`฿${todayRevenue.toLocaleString()}`}
            label="ยอดขายวันนี้"
            color="green"
          />
          <StatCard
            icon={ShoppingCart}
            value={todaySales.length}
            label="ออเดอร์วันนี้"
            color="blue"
          />
          <StatCard
            icon={Package}
            value={products.length}
            label="สินค้าทั้งหมด"
            color="purple"
          />
          <StatCard
            icon={Users}
            value={customerCount}
            label="ลูกค้าสมาชิก"
            color="orange"
          />
        </div>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <button
            onClick={() => navigate('/products')}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-gray-600" size={20} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-800">สินค้าใกล้หมด</p>
              <p className="text-sm text-gray-500">{lowStockProducts.length} รายการต้องเติมสต็อก</p>
            </div>
            <ArrowRight className="text-gray-400" size={20} />
          </button>
        )}

        {/* Quick Actions */}
        <div className={`grid gap-3 ${hasPermission(user?.role, 'stock.receive') || hasPermission(user?.role, 'reports.view') ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-800 text-white rounded-xl p-4 flex flex-col items-center gap-2"
          >
            <ShoppingCart size={24} />
            <span className="font-medium">เริ่มขาย</span>
          </button>
          {hasPermission(user?.role, 'stock.receive') && (
            <button
              onClick={() => navigate('/stock-receipt')}
              className="bg-white border border-gray-200 text-gray-800 rounded-xl p-4 flex flex-col items-center gap-2"
            >
              <Package size={24} />
              <span className="font-medium">รับสินค้า</span>
            </button>
          )}
          {hasPermission(user?.role, 'reports.view') && (
            <button
              onClick={() => navigate('/reports')}
              className="bg-white border border-gray-200 text-gray-800 rounded-xl p-4 flex flex-col items-center gap-2"
            >
              <BarChart3 size={24} />
              <span className="font-medium">รายงาน</span>
            </button>
          )}
        </div>

        {/* Top Products Today */}
        {topProducts.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-800 flex items-center gap-2">
                <Star className="text-gray-400" size={16} />
                สินค้าขายดีวันนี้
              </h3>
            </div>
            <div className="space-y-2">
              {topProducts.map(([id, data], idx) => (
                <div key={id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-gray-700">{data.name}</span>
                  <span className="text-sm font-medium text-gray-600">{data.qty} ชิ้น</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Sales */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-800 flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              การขายล่าสุด
            </h3>
            <button
              onClick={() => navigate('/history')}
              className="text-sm text-gray-500 font-medium flex items-center gap-1"
            >
              ดูทั้งหมด <ArrowRight size={14} />
            </button>
          </div>
          {recentSales.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              ยังไม่มีการขายวันนี้
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentSales.map((sale) => (
                <div key={sale.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">฿{sale.total.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{formatTime(sale.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{sale.items.length} รายการ</p>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      สำเร็จ
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
