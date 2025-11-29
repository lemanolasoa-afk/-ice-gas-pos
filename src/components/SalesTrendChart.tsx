import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface DailySales {
  date: string
  total: number
  count: number
  profit?: number
}

interface SalesTrendChartProps {
  data: DailySales[]
  showProfit?: boolean
  height?: number
}

export function SalesTrendChart({ data, showProfit = false, height = 200 }: SalesTrendChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return { bars: [], maxValue: 0, trend: 0 }

    const maxValue = Math.max(...data.map(d => showProfit ? (d.profit || 0) : d.total), 1)
    
    // Calculate trend (compare last day vs average of previous days)
    let trend = 0
    if (data.length >= 2) {
      const lastDay = showProfit ? (data[data.length - 1].profit || 0) : data[data.length - 1].total
      const previousDays = data.slice(0, -1)
      const avgPrevious = previousDays.reduce((sum, d) => sum + (showProfit ? (d.profit || 0) : d.total), 0) / previousDays.length
      if (avgPrevious > 0) {
        trend = ((lastDay - avgPrevious) / avgPrevious) * 100
      }
    }

    const bars = data.map(d => ({
      date: d.date,
      value: showProfit ? (d.profit || 0) : d.total,
      count: d.count,
      heightPercent: ((showProfit ? (d.profit || 0) : d.total) / maxValue) * 100
    }))

    return { bars, maxValue, trend }
  }, [data, showProfit])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  }

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('th-TH', { day: 'numeric' })
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400">
        ไม่มีข้อมูลในช่วงนี้
      </div>
    )
  }

  const TrendIcon = chartData.trend > 5 ? TrendingUp : chartData.trend < -5 ? TrendingDown : Minus
  const trendColor = chartData.trend > 5 ? 'text-green-500' : chartData.trend < -5 ? 'text-red-500' : 'text-gray-500'

  return (
    <div className="space-y-3">
      {/* Trend Indicator */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {showProfit ? 'กำไร' : 'ยอดขาย'} {data.length} วันล่าสุด
        </span>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon size={16} />
          <span className="text-sm font-medium">
            {chartData.trend > 0 ? '+' : ''}{chartData.trend.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex items-end justify-between gap-1">
          {chartData.bars.map((bar, idx) => (
            <div
              key={bar.date}
              className="flex-1 flex flex-col items-center group"
            >
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                <div className="font-medium">{formatDate(bar.date)}</div>
                <div>฿{bar.value.toLocaleString()}</div>
                <div className="text-gray-300">{bar.count} รายการ</div>
              </div>
              
              {/* Bar */}
              <div
                className={`w-full rounded-t transition-all duration-300 ${
                  showProfit 
                    ? bar.value >= 0 ? 'bg-green-500' : 'bg-red-500'
                    : 'bg-blue-500'
                } hover:opacity-80`}
                style={{ 
                  height: `${Math.max(bar.heightPercent, 2)}%`,
                  minHeight: '4px'
                }}
              />
              
              {/* Date Label */}
              <span className="text-[10px] text-gray-400 mt-1 truncate w-full text-center">
                {data.length <= 7 ? formatShortDate(bar.date) : (idx % 2 === 0 ? formatShortDate(bar.date) : '')}
              </span>
            </div>
          ))}
        </div>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-gray-400 -ml-1">
          <span>฿{(chartData.maxValue / 1000).toFixed(0)}k</span>
          <span>฿{(chartData.maxValue / 2000).toFixed(0)}k</span>
          <span>฿0</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-500">รวม</div>
          <div className="font-bold text-gray-800">
            ฿{chartData.bars.reduce((sum, b) => sum + b.value, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-500">เฉลี่ย/วัน</div>
          <div className="font-bold text-gray-800">
            ฿{Math.round(chartData.bars.reduce((sum, b) => sum + b.value, 0) / chartData.bars.length).toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-500">รายการ</div>
          <div className="font-bold text-gray-800">
            {chartData.bars.reduce((sum, b) => sum + b.count, 0)}
          </div>
        </div>
      </div>
    </div>
  )
}
