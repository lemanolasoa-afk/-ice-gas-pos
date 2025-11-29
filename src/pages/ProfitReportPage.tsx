import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Package, Calculator, Download, PieChart } from 'lucide-react'

import { LoadingSpinner } from '../components/LoadingSpinner'
import { ReportGenerator, ProfitReport, CategoryProfit } from '../lib/reportGenerator'

const CATEGORY_LABELS: Record<string, string> = {
  ice: '🧊 น้ำแข็ง',
  gas: '🔥 แก๊ส',
  water: '💧 น้ำดื่ม',
  unknown: '❓ อื่นๆ'
}

const CATEGORY_COLORS: Record<string, string> = {
  ice: 'from-cyan-500 to-cyan-600',
  gas: 'from-orange-500 to-orange-600',
  water: 'from-blue-500 to-blue-600',
  unknown: 'from-gray-500 to-gray-600'
}

export function ProfitReportPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [report, setReport] = useState<ProfitReport | null>(null)
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadReport = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const now = new Date()
        const daysToShow = period === 'week' ? 7 : period === 'month' ? 30 : 365
        const startDate = new Date(now.getTime() - daysToShow * 24 * 60 * 60 * 1000)
        startDate.setHours(0, 0, 0, 0)
        
        const endDate = new Date()
        endDate.setHours(23, 59, 59, 999)

        const data = await ReportGenerator.generateProfitReport(
          startDate.toISOString(),
          endDate.toISOString()
        )
        setReport(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }
    loadReport()
  }, [period])

  const handleExportCSV = () => {
    if (!report) return

    // Export product profits
    const exportData = report.topProfitableProducts.map(p => ({
      'สินค้า': p.product_name,
      'หมวดหมู่': CATEGORY_LABELS[p.category] || p.category,
      'จำนวนขาย': p.quantity_sold,
      'รายได้': p.revenue,
      'ต้นทุน': p.cost,
      'กำไร': p.profit,
      'อัตรากำไร (%)': p.margin.toFixed(1)
    }))

    ReportGenerator.exportToCSV(exportData, 'profit_report')
  }

  const getCategoryData = (): Array<{ key: string; label: string; data: CategoryProfit }> => {
    if (!report) return []
    return Object.entries(report.categoryBreakdown)
      .map(([key, data]) => ({
        key,
        label: CATEGORY_LABELS[key] || key,
        data
      }))
      .sort((a, b) => b.data.profit - a.data.profit)
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-blue-500 text-white px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">💰 รายงานกำไร</h1>
          {report && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-lg text-sm"
            >
              <Download size={16} />
              Export
            </button>
          )}
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Period Selector */}
        <div className="flex gap-2">
          {[
            { value: 'week', label: '7 วัน' },
            { value: 'month', label: '30 วัน' },
            { value: 'all', label: '1 ปี' },
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
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            เกิดข้อผิดพลาด: {error}
          </div>
        ) : report ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                <DollarSign size={20} className="mb-1 opacity-80" />
                <p className="text-2xl font-bold">฿{report.totalRevenue.toLocaleString()}</p>
                <p className="text-xs opacity-80">รายได้</p>
              </div>
              <div className="bg-gradient-to-br from-red-400 to-red-500 rounded-xl p-4 text-white">
                <Package size={20} className="mb-1 opacity-80" />
                <p className="text-2xl font-bold">฿{report.totalCost.toLocaleString()}</p>
                <p className="text-xs opacity-80">ต้นทุน</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                <TrendingUp size={20} className="mb-1 opacity-80" />
                <p className="text-2xl font-bold">฿{report.totalProfit.toLocaleString()}</p>
                <p className="text-xs opacity-80">กำไร</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                <Calculator size={20} className="mb-1 opacity-80" />
                <p className="text-2xl font-bold">{report.profitMargin.toFixed(1)}%</p>
                <p className="text-xs opacity-80">อัตรากำไร</p>
              </div>
            </div>

            {/* Transaction Count */}
            <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
              <span className="text-gray-600">จำนวนรายการขาย</span>
              <span className="text-xl font-bold text-gray-800">{report.transactionCount} รายการ</span>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b flex items-center gap-2">
                <PieChart size={18} className="text-gray-400" />
                <h3 className="font-bold text-gray-800">กำไรแยกตามหมวดหมู่</h3>
              </div>
              {getCategoryData().length === 0 ? (
                <div className="p-8 text-center text-gray-400">ไม่มีข้อมูล</div>
              ) : (
                <div className="divide-y">
                  {getCategoryData().map(({ key, label, data }) => (
                    <div key={key} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-800">{label}</span>
                        <span className={`font-bold ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ฿{data.profit.toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-blue-50 rounded p-2">
                          <p className="text-blue-600 font-medium">รายได้</p>
                          <p className="text-blue-800">฿{data.revenue.toLocaleString()}</p>
                        </div>
                        <div className="bg-red-50 rounded p-2">
                          <p className="text-red-600 font-medium">ต้นทุน</p>
                          <p className="text-red-800">฿{data.cost.toLocaleString()}</p>
                        </div>
                        <div className="bg-purple-50 rounded p-2">
                          <p className="text-purple-600 font-medium">อัตรากำไร</p>
                          <p className="text-purple-800">{data.margin.toFixed(1)}%</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">ขายได้ {data.quantity} ชิ้น</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Profitable Products */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-bold text-gray-800">🏆 สินค้าทำกำไรสูงสุด</h3>
              </div>
              {report.topProfitableProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-400">ไม่มีข้อมูล</div>
              ) : (
                <div className="divide-y">
                  {report.topProfitableProducts.slice(0, 5).map((product, idx) => (
                    <div key={product.product_id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                            idx === 1 ? 'bg-gray-300 text-gray-700' :
                            idx === 2 ? 'bg-orange-300 text-orange-800' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-medium text-gray-800">{product.product_name}</p>
                            <p className="text-sm text-gray-500">
                              ขาย {product.quantity_sold} ชิ้น • รายได้ ฿{product.revenue.toLocaleString()}
                            </p>
                          </div>
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
        ) : null}
      </div>
    </div>
  )
}
