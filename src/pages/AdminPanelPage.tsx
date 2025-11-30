import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  CreditCard,
  Droplets,
  ChevronRight,
  RefreshCw,
  Download,
  Calendar
} from 'lucide-react'
import { Header } from '../components/Header'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { useAdminDashboard, getDateRange, DateRange } from '../hooks/useAdminDashboard'
import { BackupManager } from '../lib/backupManager'
import { useToast } from '../components/Toast'

type DateRangeLabel = 'today' | 'week' | 'month' | 'year'

const dateRangeOptions: { label: DateRangeLabel; text: string }[] = [
  { label: 'today', text: 'วันนี้' },
  { label: 'week', text: '7 วัน' },
  { label: 'month', text: '30 วัน' },
  { label: 'year', text: '1 ปี' }
]

const paymentMethodNames: Record<string, string> = {
  cash: 'เงินสด',
  transfer: 'โอนเงิน',
  credit: 'บัตรเครดิต'
}

export function AdminPanelPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [selectedRange, setSelectedRange] = useState<DateRangeLabel>('month')
  const dateRange: DateRange = getDateRange(selectedRange)
  const { data, isLoading, error, refetch } = useAdminDashboard(dateRange)

  const handleExport = async () => {
    try {
      await BackupManager.exportSalesReport()
      showToast('success', 'ส่งออกรายงานสำเร็จ')
    } catch {
      showToast('error', 'ไม่สามารถส่งออกได้')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20 bg-gray-50">
        <Header title="📊 Admin Panel" />
        <div className="p-4">
          <LoadingSpinner message="กำลังโหลดข้อมูล..." />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen pb-20 bg-gray-50">
        <Header title="📊 Admin Panel" />
        <div className="p-4">
          <ErrorMessage message={error || 'เกิดข้อผิดพลาด'} onRetry={refetch} />
        </div>
      </div>
    )
  }

  const { summary, salesTrend, topProducts, lowStockProducts, revenueByCategory, paymentBreakdown, staffPerformance, meltLossSummary } = data

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <Header title="📊 Admin Panel" />

      <div className="p-4 space-y-4">
        {/* Date Range Selector */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-white rounded-lg p-1 border border-gray-200">
            {dateRangeOptions.map(opt => (
              <button
                key={opt.label}
                onClick={() => setSelectedRange(opt.label)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  selectedRange === opt.label
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {opt.text}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={refetch}
              className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw size={18} className="text-gray-600" />
            </button>
            <button
              onClick={handleExport}
              className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Download size={18} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            icon={<DollarSign size={20} />}
            label="รายได้"
            value={`฿${summary.totalRevenue.toLocaleString()}`}
            color="bg-green-500"
          />
          <SummaryCard
            icon={<TrendingDown size={20} />}
            label="ต้นทุน"
            value={`฿${summary.totalCost.toLocaleString()}`}
            color="bg-red-500"
          />
          <SummaryCard
            icon={<TrendingUp size={20} />}
            label="กำไร"
            value={`฿${summary.totalProfit.toLocaleString()}`}
            subValue={`${summary.profitMargin.toFixed(1)}%`}
            color="bg-blue-500"
          />
          <SummaryCard
            icon={<ShoppingCart size={20} />}
            label="ออเดอร์"
            value={summary.totalOrders.toString()}
            subValue={`เฉลี่ย ฿${summary.averageOrderValue.toFixed(0)}`}
            color="bg-purple-500"
          />
        </div>

        {/* Sales Trend */}
        {salesTrend.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Calendar size={18} />
              แนวโน้มยอดขาย
            </h3>
            <div className="space-y-2">
              {salesTrend.slice(-7).map(item => {
                const maxRevenue = Math.max(...salesTrend.map(s => s.revenue))
                const percentage = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0
                return (
                  <div key={item.date} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-20">
                      {new Date(item.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-20 text-right">
                      ฿{item.revenue.toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Top Products */}
        {topProducts.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Package size={18} />
                สินค้าขายดี
              </h3>
              <button
                onClick={() => navigate('/products')}
                className="text-xs text-blue-600 flex items-center gap-1"
              >
                ดูทั้งหมด <ChevronRight size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {topProducts.slice(0, 5).map((item, idx) => (
                <div key={item.product.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                    idx === 1 ? 'bg-gray-100 text-gray-600' :
                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-sm text-gray-800 truncate">{item.product.name}</span>
                  <span className="text-xs text-gray-500">{item.quantity} ชิ้น</span>
                  <span className="text-sm font-medium text-gray-800">฿{item.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revenue by Category */}
        {revenueByCategory.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3">รายได้ตามหมวดหมู่</h3>
            <div className="space-y-3">
              {revenueByCategory.map(cat => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{cat.categoryName}</span>
                    <span className="text-sm font-medium">฿{cat.revenue.toLocaleString()} ({cat.percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        cat.category === 'ice' ? 'bg-cyan-500' :
                        cat.category === 'gas' ? 'bg-orange-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Breakdown */}
        {paymentBreakdown.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <CreditCard size={18} />
              ช่องทางชำระเงิน
            </h3>
            <div className="space-y-2">
              {paymentBreakdown.map(pm => (
                <div key={pm.method} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">{paymentMethodNames[pm.method] || pm.method}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-800">฿{pm.amount.toLocaleString()}</span>
                    <span className="text-xs text-gray-500 ml-2">({pm.count} รายการ)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Staff Performance */}
        {staffPerformance.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Users size={18} />
              ยอดขายพนักงาน
            </h3>
            <div className="space-y-2">
              {staffPerformance.map((staff, idx) => (
                <div key={staff.userId} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-sm text-gray-800">{staff.userName}</span>
                  <span className="text-xs text-gray-500">{staff.orders} ออเดอร์</span>
                  <span className="text-sm font-medium text-gray-800">฿{staff.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low Stock Warning */}
        {lowStockProducts.length > 0 && (
          <button
            onClick={() => navigate('/products')}
            className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <Package className="text-amber-600" size={24} />
              <div className="flex-1 text-left">
                <p className="font-medium text-amber-800">สินค้าใกล้หมด</p>
                <p className="text-sm text-amber-600">{lowStockProducts.length} รายการ</p>
              </div>
              <ChevronRight className="text-amber-400" size={20} />
            </div>
          </button>
        )}

        {/* Melt Loss Summary */}
        {meltLossSummary.recordCount > 0 && (
          <button
            onClick={() => navigate('/melt-loss-report')}
            className="w-full bg-cyan-50 border border-cyan-200 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <Droplets className="text-cyan-600" size={24} />
              <div className="flex-1 text-left">
                <p className="font-medium text-cyan-800">การละลายน้ำแข็ง</p>
                <p className="text-sm text-cyan-600">
                  {meltLossSummary.totalLoss.toFixed(1)} กก. (฿{meltLossSummary.totalValue.toLocaleString()})
                </p>
              </div>
              <ChevronRight className="text-cyan-400" size={20} />
            </div>
          </button>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <QuickAction label="รายงานยอดขาย" onClick={() => navigate('/reports')} />
          <QuickAction label="รายงานกำไร" onClick={() => navigate('/profit')} />
          <QuickAction label="รายงานสต็อก" onClick={() => navigate('/stock-report')} />
          <QuickAction label="รายงานลูกค้า" onClick={() => navigate('/customer-report')} />
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value, subValue, color }: {
  icon: React.ReactNode
  label: string
  value: string
  subValue?: string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center text-white`}>
          {icon}
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-800">{value}</p>
      {subValue && <p className="text-xs text-gray-500">{subValue}</p>}
    </div>
  )
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
    >
      {label}
      <ChevronRight size={16} className="text-gray-400" />
    </button>
  )
}
