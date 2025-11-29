import { DailyStockCount } from '../../types'

interface Props {
  data: DailyStockCount[]
  height?: number
}

export function MeltLossChart({ data, height = 200 }: Props) {
  if (data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-xl text-gray-400"
        style={{ height }}
      >
        ไม่มีข้อมูล
      </div>
    )
  }

  // Group by date and sum melt_loss
  const byDate: Record<string, { meltLoss: number; meltValue: number }> = {}
  data.forEach(item => {
    if (!byDate[item.count_date]) {
      byDate[item.count_date] = { meltLoss: 0, meltValue: 0 }
    }
    byDate[item.count_date].meltLoss += item.melt_loss
    byDate[item.count_date].meltValue += item.melt_loss_value
  })

  const chartData = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7) // Last 7 days

  const maxValue = Math.max(...chartData.map(([, v]) => v.meltLoss), 1)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('th-TH', { weekday: 'short' })
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4">แนวโน้มการละลาย (7 วัน)</h3>
      
      <div className="flex items-end justify-between gap-2" style={{ height: height - 60 }}>
        {chartData.map(([date, values]) => {
          const barHeight = (values.meltLoss / maxValue) * 100
          return (
            <div key={date} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col items-center justify-end" style={{ height: '100%' }}>
                <span className="text-xs text-gray-600 mb-1">{values.meltLoss}</span>
                <div 
                  className="w-full max-w-[40px] bg-gradient-to-t from-amber-500 to-amber-300 rounded-t-lg transition-all duration-300"
                  style={{ height: `${Math.max(barHeight, 5)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 mt-2">{formatDate(date)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
