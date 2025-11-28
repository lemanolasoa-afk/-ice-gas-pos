import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Package, Calendar } from 'lucide-react'
import { useStore } from '../store/useStore'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { DailySales, TopProduct } from '../types'

type Period = 'week' | 'month' | 'year'

export function ReportsPage() {
  const { sales, fetchSales, isLoading } = useStore()
  const [period, setPeriod] = useState<Period>('week')
  const [dailySales, setDailySales] = useState<DailySales[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  useEffect(() => {
    if (sales.length === 0) return

    // Calculate daily sales
    const now = new Date()
    const daysToShow = period === 'week' ? 7 : period === 'month' ? 30 : 365
    const startDate = new Date(now.getTime() - daysToShow * 24 * 60 * 60 * 1000)

    const salesByDate: Record<string, { total: number; count: number }> = {}
    const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {}

    sales.forEach((sale) => {
      const saleDate = new Date(sale.created_at)
      if (saleDate >= startDate) {
        const dateKey = saleDate.toISOString().split('T')[0]
        if (!salesByDate[dateKey]) {
          salesByDate[dateKey] = { total: 0, count: 0 }
        }
        salesByDate[dateKey].total += sale.total
        salesByDate[dateKey].count += 1

        // Track product stats
        sale.items.forEach((item) => {
          if (!productStats[item.product_id]) {
            productStats[item.product_id] = { name: item.product_name, quantity: 0, revenue: 0 }
          }
          productStats[item.product_id].quantity += item.quantity
          productStats[item.product_id].revenue += item.subtotal
        })
      }
    })

    // Convert to array and sort
    const dailyArray = Object.entries(salesByDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))
    setDailySales(dailyArray)

    // Top products
    const topArray = Object.entries(productStats)
      .map(([product_id, data]) => ({ product_id, product_name: data.name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
    setTopProducts(topArray)
  }, [sales, period])

  const totalRevenue = dailySales.reduce((sum, d) => sum + d.total, 0)
  const totalOrders = dailySales.reduce((sum, d) => sum + d.count, 0)
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const maxDailySale = Math.max(...dailySales.map((d) => d.total), 1)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-blue-500 text-white px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">📊 รายงานยอดขาย</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Period Selector */}
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                period === p ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'
              }`}
            >
              {p === 'week' ? '7 วัน' : p === 'month' ? '30 วัน' : '1 ปี'}
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingSpinner message="กำลังโหลดข้อมูล..." />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 text-white">
                <TrendingUp size={20} className="mb-1 opacity-80" />
                <p className="text-xl font-bold">฿{totalRevenue.toLocaleString()}</p>
                <p className="text-xs opacity-80">ยอดขายรวม</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 text-white">
                <BarChart3 size={20} className="mb-1 opacity-80" />
                <p className="text-xl font-bold">{totalOrders}</p>
                <p className="text-xs opacity-80">จำนวนออเดอร์</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 text-white">
                <Package size={20} className="mb-1 opacity-80" />
                <p className="text-xl font-bold">฿{avgOrderValue.toFixed(0)}</p>
                <p className="text-xs opacity-80">เฉลี่ย/ออเดอร์</p>
              </div>
            </div>

            {/* Sales Chart */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar size={18} />
                ยอดขายรายวัน
              </h3>
              {dailySales.length === 0 ? (
                <p className="text-center text-gray-400 py-8">ไม่มีข้อมูลในช่วงนี้</p>
              ) : (
                <div className="space-y-2">
                  {dailySales.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-16">{formatDate(day.date)}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${(day.total / maxDailySale) * 100}%`, minWidth: '40px' }}
                        >
                          <span className="text-xs text-white font-medium">
                            ฿{day.total.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 w-8">{day.count}รายการ</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Package size={18} />
                สินค้าขายดี
              </h3>
              {topProducts.length === 0 ? (
                <p className="text-center text-gray-400 py-8">ไม่มีข้อมูล</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((product, idx) => (
                    <div key={product.product_id} className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0
                            ? 'bg-yellow-400 text-yellow-900'
                            : idx === 1
                            ? 'bg-gray-300 text-gray-700'
                            : idx === 2
                            ? 'bg-orange-300 text-orange-800'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{product.product_name}</p>
                        <p className="text-xs text-gray-500">ขายได้ {product.quantity} ชิ้น</p>
                      </div>
                      <p className="font-bold text-blue-600">฿{product.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
