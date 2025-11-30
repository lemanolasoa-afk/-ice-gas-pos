import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, ShoppingCart, Package, Users, Clock,
  ArrowRight, AlertTriangle, BarChart3, DollarSign, ClipboardCheck
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/authStore'
import { Header } from '../components/Header'
import { supabase } from '../lib/supabase'
import { hasPermission } from '../lib/permissions'
import { ReportGenerator } from '../lib/reportGenerator'

export function DashboardPage() {
  const navigate = useNavigate()
  const sales = useStore((s) => s.sales)
  const products = useStore((s) => s.products)
  const fetchSales = useStore((s) => s.fetchSales)
  const fetchProducts = useStore((s) => s.fetchProducts)
  const { user } = useAuthStore()
  const [customerCount, setCustomerCount] = useState(0)
  const [todayProfit, setTodayProfit] = useState<{ profit: number; margin: number } | null>(null)

  useEffect(() => {
    fetchSales()
    fetchProducts()
    supabase.from('customers').select('*', { count: 'exact', head: true })
      .then(({ count }) => setCustomerCount(count || 0))
    
    ReportGenerator.getTodaySummary()
      .then(summary => setTodayProfit({ profit: summary.profit, margin: summary.profitMargin }))
      .catch(err => console.error('Failed to fetch profit:', err))
  }, [fetchSales, fetchProducts])

  const { todaySales, todayRevenue, lowStockProducts, recentSales, topProducts } = useMemo(() => {
    const today = new Date().toDateString()
    const todaySales = sales.filter((s) => new Date(s.created_at).toDateString() === today)
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0)
    const lowStockProducts = products.filter((p) => p.stock <= p.low_stock_threshold)
    const recentSales = sales.slice(0, 5)

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

    return { todaySales, todayRevenue, lowStockProducts, recentSales, topProducts }
  }, [sales, products])

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <Header title="ภาพรวม" showNotifications />

      <div className="p-4 space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-gray-500 text-xs">สวัสดี,</p>
          <h2 className="text-lg font-semibold text-gray-900">{user?.name || 'ผู้ใช้'}</h2>
          <p className="text-gray-400 text-xs mt-1">
            {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-gray-400" />
              <span className="text-xs text-gray-500">ยอดขายวันนี้</span>
            </div>
            <p className="text-xl font-semibold text-gray-900">{todayRevenue.toLocaleString()} บาท</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-gray-400" />
              <span className="text-xs text-gray-500">กำไรวันนี้</span>
            </div>
            <p className="text-xl font-semibold text-gray-900">
              {todayProfit ? `${todayProfit.profit.toLocaleString()} บาท` : '...'}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart size={16} className="text-gray-400" />
              <span className="text-xs text-gray-500">ออเดอร์วันนี้</span>
            </div>
            <p className="text-xl font-semibold text-gray-900">{todaySales.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-gray-400" />
              <span className="text-xs text-gray-500">ลูกค้าสมาชิก</span>
            </div>
            <p className="text-xl font-semibold text-gray-900">{customerCount}</p>
          </div>
        </div>

        {lowStockProducts.length > 0 && (
          <button
            onClick={() => navigate('/products')}
            className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-gray-600" size={18} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900 text-sm">สินค้าใกล้หมด</p>
              <p className="text-xs text-gray-500">{lowStockProducts.length} รายการต้องเติมสต็อก</p>
            </div>
            <ArrowRight className="text-gray-400" size={18} />
          </button>
        )}

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => navigate('/')}
            className="bg-gray-900 text-white rounded-xl p-3 flex flex-col items-center gap-1.5"
          >
            <ShoppingCart size={20} />
            <span className="font-medium text-xs">เริ่มขาย</span>
          </button>
          {hasPermission(user?.role, 'stock.receive') && (
            <button
              onClick={() => navigate('/stock-receipt')}
              className="bg-white border border-gray-200 text-gray-800 rounded-xl p-3 flex flex-col items-center gap-1.5"
            >
              <Package size={20} />
              <span className="font-medium text-xs">รับสินค้า</span>
            </button>
          )}
          {hasPermission(user?.role, 'stock.receive') && (
            <button
              onClick={() => navigate('/daily-stock-count')}
              className="bg-white border border-gray-200 text-gray-800 rounded-xl p-3 flex flex-col items-center gap-1.5"
            >
              <ClipboardCheck size={20} />
              <span className="font-medium text-xs">ปิดยอดสต็อก</span>
            </button>
          )}
        </div>

        {hasPermission(user?.role, 'reports.view') && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="font-medium text-gray-900 text-sm mb-3 flex items-center gap-2">
              <BarChart3 size={14} className="text-gray-400" />
              รายงาน
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => navigate('/reports')}
                className="bg-gray-50 text-gray-700 rounded-lg p-2.5 text-xs font-medium flex flex-col items-center gap-1"
              >
                <BarChart3 size={16} />
                ยอดขาย
              </button>
              <button
                onClick={() => navigate('/profit')}
                className="bg-gray-50 text-gray-700 rounded-lg p-2.5 text-xs font-medium flex flex-col items-center gap-1"
              >
                <DollarSign size={16} />
                กำไร
              </button>
              <button
                onClick={() => navigate('/stock-report')}
                className="bg-gray-50 text-gray-700 rounded-lg p-2.5 text-xs font-medium flex flex-col items-center gap-1"
              >
                <Package size={16} />
                สต็อก
              </button>
              <button
                onClick={() => navigate('/customer-report')}
                className="bg-gray-50 text-gray-700 rounded-lg p-2.5 text-xs font-medium flex flex-col items-center gap-1"
              >
                <Users size={16} />
                ลูกค้า
              </button>
            </div>
          </div>
        )}

        {topProducts.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="font-medium text-gray-900 text-sm mb-3">สินค้าขายดีวันนี้</h3>
            <div className="space-y-2">
              {topProducts.map(([id, data], idx) => (
                <div key={id} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-[10px] font-medium text-gray-600">
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-sm text-gray-700">{data.name}</span>
                  <span className="text-xs font-medium text-gray-500">{data.qty} ชิ้น</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-900 text-sm flex items-center gap-2">
              <Clock size={14} className="text-gray-400" />
              การขายล่าสุด
            </h3>
            <button
              onClick={() => navigate('/history')}
              className="text-xs text-gray-500 font-medium flex items-center gap-1"
            >
              ดูทั้งหมด <ArrowRight size={12} />
            </button>
          </div>
          {recentSales.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              ยังไม่มีการขายวันนี้
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentSales.map((sale) => (
                <div key={sale.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{sale.total.toLocaleString()} บาท</p>
                    <p className="text-xs text-gray-400">{formatTime(sale.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{sale.items.length} รายการ</p>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
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
