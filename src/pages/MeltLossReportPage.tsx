import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Droplets, TrendingDown, AlertTriangle, Calendar, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMeltLoss } from '../hooks/useMeltLoss'
import { MeltLossChart } from '../components/stock/MeltLossChart'
import { StatCard } from '../components/StatCard'
import { MeltLossReportSkeleton } from '../components/Skeleton'
import { ErrorMessage } from '../components/ErrorMessage'
import { DailyStockCount, MeltLossReportSummary, MeltLossByProduct } from '../types'

type DateRange = 'today' | '7days' | '30days' | 'custom'

export function MeltLossReportPage() {
  const navigate = useNavigate()
  const { error, clearError, getMeltLossReport, getMeltLossSummary, getMeltLossByProduct } = useMeltLoss()
  
  const [dateRange, setDateRange] = useState<DateRange>('7days')
  const [reportData, setReportData] = useState<DailyStockCount[]>([])
  const [summary, setSummary] = useState<MeltLossReportSummary | null>(null)
  const [byProduct, setByProduct] = useState<MeltLossByProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const getDateRange = useCallback((range: DateRange): { start: string; end: string } => {
    const today = new Date()
    const end = today.toISOString().split('T')[0]
    
    let start: Date
    switch (range) {
      case 'today':
        start = today
        break
      case '7days':
        start = new Date(today.setDate(today.getDate() - 6))
        break
      case '30days':
        start = new Date(today.setDate(today.getDate() - 29))
        break
      default:
        start = new Date(today.setDate(today.getDate() - 6))
    }
    
    return { start: start.toISOString().split('T')[0], end }
  }, [])

  const loadData = useCallback(async () => {
    // Show skeleton on initial load, subtle indicator on refresh
    if (summary === null) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }
    
    setLoadError(null)
    clearError()
    
    try {
      const { start, end } = getDateRange(dateRange)
      
      const [data, summaryData, productData] = await Promise.all([
        getMeltLossReport(start, end),
        getMeltLossSummary(start, end),
        getMeltLossByProduct(start, end)
      ])
      
      // Check if we got data or if there was an error
      if (error) {
        setLoadError(error)
      } else {
        setReportData(data)
        setSummary(summaryData)
        setByProduct(productData)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
      setLoadError(message)
      console.error('Failed to load melt loss report:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [dateRange, summary, clearError, getDateRange, getMeltLossReport, getMeltLossSummary, getMeltLossByProduct, error])

  useEffect(() => {
    loadData()
  }, [dateRange]) // Only reload when dateRange changes, not on every loadData change

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: 'today', label: 'วันนี้' },
    { value: '7days', label: '7 วัน' },
    { value: '30days', label: '30 วัน' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">รายงานการละลาย</h1>
              <p className="text-sm text-gray-500">สรุปการสูญเสียจากการละลายของน้ำแข็ง</p>
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex gap-2 mb-4">
          {dateRangeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setDateRange(option.value)}
              disabled={isRefreshing}
              className={`flex-1 py-2 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                dateRange === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              } ${isRefreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isRefreshing && dateRange === option.value && (
                <Loader2 size={14} className="animate-spin" />
              )}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={`max-w-lg mx-auto px-4 ${isRefreshing ? 'opacity-60 pointer-events-none' : ''} transition-opacity`}>
        {isLoading ? (
          <MeltLossReportSkeleton />
        ) : loadError || error ? (
          <ErrorMessage 
            message={loadError || error || 'เกิดข้อผิดพลาด'}
            onRetry={loadData}
            variant="inline"
          />
        ) : (
          <>
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <StatCard
                  icon={Droplets}
                  value={summary.total_melt_loss}
                  label="รวมละลาย (หน่วย)"
                  color="amber"
                />
                <StatCard
                  icon={TrendingDown}
                  value={`฿${summary.total_melt_value.toLocaleString()}`}
                  label="มูลค่าสูญเสีย"
                  color="red"
                />
                <StatCard
                  icon={Calendar}
                  value={`${summary.average_melt_percent.toFixed(1)}%`}
                  label="% ละลายเฉลี่ย"
                  color="blue"
                />
                <StatCard
                  icon={AlertTriangle}
                  value={summary.abnormal_count}
                  label="ครั้งที่ผิดปกติ"
                  color={summary.abnormal_count > 0 ? 'red' : 'green'}
                />
              </div>
            )}

            {/* Chart */}
            <div className="mb-6">
              <MeltLossChart data={reportData} />
            </div>

            {/* By Product Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">รายละเอียดตามสินค้า</h3>
              </div>
              
              {byProduct.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  ไม่มีข้อมูล
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {byProduct.map(item => (
                    <div key={item.product_id} className="px-4 py-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-gray-900">{item.product_name}</span>
                        <span className="text-amber-600 font-semibold">
                          {item.total_melt_loss} หน่วย
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>
                          {item.average_melt_percent.toFixed(1)}% 
                          <span className="text-gray-400"> (คาดการณ์ {item.expected_melt_percent}%)</span>
                        </span>
                        <span className="text-red-500">
                          ฿{item.total_melt_value.toLocaleString()}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            item.average_melt_percent > item.expected_melt_percent * 1.5
                              ? 'bg-red-500'
                              : item.average_melt_percent > item.expected_melt_percent
                              ? 'bg-amber-500'
                              : 'bg-green-500'
                          }`}
                          style={{ 
                            width: `${Math.min((item.average_melt_percent / (item.expected_melt_percent * 2)) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Records */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">บันทึกล่าสุด</h3>
              </div>
              
              {reportData.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  ไม่มีข้อมูล
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                  {reportData.slice(0, 10).map(item => (
                    <div key={item.id} className="px-4 py-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium text-gray-900">{item.product_name}</span>
                          <p className="text-sm text-gray-500">
                            {new Date(item.count_date).toLocaleDateString('th-TH')}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`font-semibold ${item.is_abnormal ? 'text-red-600' : 'text-amber-600'}`}>
                            -{item.melt_loss}
                          </span>
                          {item.is_abnormal && (
                            <AlertTriangle size={14} className="inline ml-1 text-red-500" />
                          )}
                          <p className="text-sm text-gray-500">
                            {item.melt_percent.toFixed(1)}%
                          </p>
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
