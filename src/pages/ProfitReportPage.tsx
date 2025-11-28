import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Package, Calculator } from 'lucide-react'

import { useStore } from '../store/useStore'
import { LoadingSpinner } from '../components/LoadingSpinner'

interface ProductProfit {
  product_id: string
  product_name: string
  quantity_sold: number
  revenue: number
  cost: number
  profit: number
  margin: number
}

export function ProfitReportPage() {
  const { sales, fetchSales, products, fetchProducts } = useStore()
  const [isLoading, setIsLoading] = useState(true)
  const [productProfits, setProductProfits] = useState<ProductProfit[]>([])
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month')

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await fetchSales()
      await fetchProducts()
      setIsLoading(false)
    }
    load()
  }, [fetchSales, fetchProducts])

  useEffect(() => {
    if (sales.length === 0 || products.length === 0) return

    const now = new Date()
    const daysToShow = period === 'week' ? 7 : period === 'month' ? 30 : 9999
    const startDate = new Date(now.getTime() - daysToShow * 24 * 60 * 60 * 1000)

    const filteredSales = sales.filter((s) => new Date(s.created_at) >= startDate)

    // Calculate profit per product
    const profitMap: Record<string, ProductProfit> = {}

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const product = products.find((p) => p.id === item.product_id)
        const cost = (product as any)?.cost || 0

        if (!profitMap[item.product_id]) {
          profitMap[item.product_id] = {
            product_id: item.product_id,
            product_name: item.product_name,
            quantity_sold: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0,
          }
        }

        profitMap[item.product_id].quantity_sold += item.quantity
        profitMap[item.product_id].revenue += item.subtotal
        profitMap[item.product_id].cost += cost * item.quantity
      })
    })

    // Calculate profit and margin
    const profits = Object.values(profitMap).map((p) => ({
      ...p,
      profit: p.revenue - p.cost,
      margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0,
    }))

    profits.sort((a, b) => b.profit - a.profit)
    setProductProfits(profits)
  }, [sales, products, period])

  const totalRevenue = productProfits.reduce((sum, p) => sum + p.revenue, 0)
  const totalCost = productProfits.reduce((sum, p) => sum + p.cost, 0)
  const totalProfit = totalRevenue - totalCost
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-blue-500 text-white px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">💰 รายงานกำไร</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Period Selector */}
        <div className="flex gap-2">
          {[
            { value: 'week', label: '7 วัน' },
            { value: 'month', label: '30 วัน' },
            { value: 'all', label: 'ทั้งหมด' },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value as any)}
              className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                period === p.value ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingSpinner message="กำลังคำนวณ..." />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                <DollarSign size={20} className="mb-1 opacity-80" />
                <p className="text-2xl font-bold">฿{totalRevenue.toLocaleString()}</p>
                <p className="text-xs opacity-80">รายได้</p>
              </div>
              <div className="bg-gradient-to-br from-red-400 to-red-500 rounded-xl p-4 text-white">
                <Package size={20} className="mb-1 opacity-80" />
                <p className="text-2xl font-bold">฿{totalCost.toLocaleString()}</p>
                <p className="text-xs opacity-80">ต้นทุน</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                <TrendingUp size={20} className="mb-1 opacity-80" />
                <p className="text-2xl font-bold">฿{totalProfit.toLocaleString()}</p>
                <p className="text-xs opacity-80">กำไร</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                <Calculator size={20} className="mb-1 opacity-80" />
                <p className="text-2xl font-bold">{avgMargin.toFixed(1)}%</p>
                <p className="text-xs opacity-80">อัตรากำไร</p>
              </div>
            </div>

            {/* Note about cost */}
            {totalCost === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm">
                💡 เพิ่มต้นทุนสินค้าในหน้าจัดการสินค้าเพื่อดูรายงานกำไรที่แม่นยำ
              </div>
            )}

            {/* Product Profit List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-bold text-gray-800">กำไรรายสินค้า</h3>
              </div>
              {productProfits.length === 0 ? (
                <div className="p-8 text-center text-gray-400">ไม่มีข้อมูล</div>
              ) : (
                <div className="divide-y">
                  {productProfits.map((product) => (
                    <div key={product.product_id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-800">{product.product_name}</p>
                          <p className="text-sm text-gray-500">
                            ขาย {product.quantity_sold} ชิ้น • รายได้ ฿{product.revenue.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${product.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ฿{product.profit.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400">{product.margin.toFixed(1)}%</p>
                        </div>
                      </div>
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
