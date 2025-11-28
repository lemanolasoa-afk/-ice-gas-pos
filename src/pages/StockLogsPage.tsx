import { useState, useEffect } from 'react'
import { History, TrendingUp, TrendingDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LoadingSpinner } from '../components/LoadingSpinner'

interface StockLog {
  id: string
  product_id: string
  product_name?: string
  change_amount: number
  reason: 'sale' | 'receipt' | 'adjustment' | 'return'
  note?: string
  user_name?: string
  created_at: string
}

const reasonLabels = {
  sale: { label: 'ขาย', color: 'text-red-500', bg: 'bg-red-50' },
  receipt: { label: 'รับเข้า', color: 'text-green-500', bg: 'bg-green-50' },
  adjustment: { label: 'ปรับปรุง', color: 'text-blue-500', bg: 'bg-blue-50' },
  return: { label: 'คืนสินค้า', color: 'text-orange-500', bg: 'bg-orange-50' },
}

export function StockLogsPage() {
  const [logs, setLogs] = useState<StockLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  const fetchLogs = async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from('stock_logs')
      .select('*, products(name), users(name)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (data) {
      setLogs(
        data.map((log: any) => ({
          ...log,
          product_name: log.products?.name || 'ไม่ทราบ',
          user_name: log.users?.name,
        }))
      )
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = filter === 'all' ? logs : logs.filter((l) => l.reason === filter)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-blue-500 text-white px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">📜 ประวัติสต็อก</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: 'all', label: 'ทั้งหมด' },
            { value: 'sale', label: 'ขาย' },
            { value: 'receipt', label: 'รับเข้า' },
            { value: 'adjustment', label: 'ปรับปรุง' },
            { value: 'return', label: 'คืน' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                filter === f.value ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-xl p-3">
            <TrendingUp className="text-green-500 mb-1" size={20} />
            <p className="text-lg font-bold text-green-700">
              +{logs.filter((l) => l.change_amount > 0).reduce((sum, l) => sum + l.change_amount, 0)}
            </p>
            <p className="text-xs text-green-600">รับเข้าทั้งหมด</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3">
            <TrendingDown className="text-red-500 mb-1" size={20} />
            <p className="text-lg font-bold text-red-700">
              {logs.filter((l) => l.change_amount < 0).reduce((sum, l) => sum + l.change_amount, 0)}
            </p>
            <p className="text-xs text-red-600">ขายออกทั้งหมด</p>
          </div>
        </div>

        {/* Logs List */}
        {isLoading ? (
          <LoadingSpinner message="กำลังโหลด..." />
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400">
            <History size={48} className="mx-auto mb-2 opacity-50" />
            <p>ไม่มีประวัติ</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => {
              const reason = reasonLabels[log.reason]
              return (
                <div key={log.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${reason.bg}`}>
                        {log.change_amount > 0 ? (
                          <TrendingUp className={reason.color} size={20} />
                        ) : (
                          <TrendingDown className={reason.color} size={20} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{log.product_name}</p>
                        <p className="text-sm text-gray-500">{formatDate(log.created_at)}</p>
                        {log.note && <p className="text-xs text-gray-400 mt-1">📝 {log.note}</p>}
                        {log.user_name && (
                          <p className="text-xs text-gray-400">👤 {log.user_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${log.change_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${reason.bg} ${reason.color}`}>
                        {reason.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
