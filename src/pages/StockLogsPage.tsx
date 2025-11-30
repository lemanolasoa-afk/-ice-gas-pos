import { useState, useEffect, useMemo } from 'react'
import {
  History,
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  RefreshCw,
  Undo2,
  Settings,
  Flame,
  Filter,
  Calendar,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Header } from '../components/Header'
import { LoadingSpinner } from '../components/LoadingSpinner'

interface StockLog {
  id: string
  product_id: string
  product_name?: string
  change_amount: number
  reason: string
  note?: string
  user_name?: string
  created_at: string
}

const reasonConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Package }> = {
  sale: { label: 'ขาย', color: 'text-red-600', bg: 'bg-red-50', icon: ShoppingCart },
  receipt: { label: 'รับเข้า', color: 'text-green-600', bg: 'bg-green-50', icon: Package },
  adjustment: { label: 'ปรับปรุง', color: 'text-blue-600', bg: 'bg-blue-50', icon: Settings },
  return: { label: 'คืนสินค้า', color: 'text-purple-600', bg: 'bg-purple-50', icon: Undo2 },
  exchange: { label: 'แลกถัง', color: 'text-cyan-600', bg: 'bg-cyan-50', icon: RefreshCw },
  deposit_sale: { label: 'ค้างถัง', color: 'text-orange-600', bg: 'bg-orange-50', icon: Flame },
  deposit_return: { label: 'รับคืนถัง', color: 'text-teal-600', bg: 'bg-teal-50', icon: Undo2 },
  refill: { label: 'เติมแก๊ส', color: 'text-amber-600', bg: 'bg-amber-50', icon: Flame },
  outright_sale: { label: 'ซื้อขาด', color: 'text-pink-600', bg: 'bg-pink-50', icon: ShoppingCart },
  melt_loss: { label: 'น้ำแข็งละลาย', color: 'text-sky-600', bg: 'bg-sky-50', icon: TrendingDown },
}

export function StockLogsPage() {
  const [logs, setLogs] = useState<StockLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all')

  const fetchLogs = async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from('stock_logs')
      .select('*, products(name), users(name)')
      .order('created_at', { ascending: false })
      .limit(200)

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

  // Filter logs
  const filteredLogs = useMemo(() => {
    let result = logs

    // Filter by reason
    if (filter !== 'all') {
      result = result.filter((l) => l.reason === filter)
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      if (dateFilter === 'today') {
        result = result.filter((l) => new Date(l.created_at) >= startOfDay)
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000)
        result = result.filter((l) => new Date(l.created_at) >= weekAgo)
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(startOfDay.getTime() - 30 * 24 * 60 * 60 * 1000)
        result = result.filter((l) => new Date(l.created_at) >= monthAgo)
      }
    }

    return result
  }, [logs, filter, dateFilter])

  // Calculate stats
  const stats = useMemo(() => {
    const incoming = filteredLogs.filter((l) => l.change_amount > 0).reduce((sum, l) => sum + l.change_amount, 0)
    const outgoing = filteredLogs.filter((l) => l.change_amount < 0).reduce((sum, l) => sum + Math.abs(l.change_amount), 0)
    return { incoming, outgoing, net: incoming - outgoing }
  }, [filteredLogs])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDateHeader = (date: string) => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    if (d.toDateString() === today.toDateString()) return 'วันนี้'
    if (d.toDateString() === yesterday.toDateString()) return 'เมื่อวาน'
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })
  }

  // Group logs by date
  const groupedLogs = useMemo(() => {
    const groups: Record<string, StockLog[]> = {}
    filteredLogs.forEach((log) => {
      const dateKey = new Date(log.created_at).toDateString()
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(log)
    })
    return groups
  }, [filteredLogs])

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <Header title="ความเคลื่อนไหวสต็อก" icon="📦" showBack />

      <div className="p-4 space-y-4">
        {/* Date Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { value: 'today', label: 'วันนี้' },
            { value: 'week', label: '7 วัน' },
            { value: 'month', label: '30 วัน' },
            { value: 'all', label: 'ทั้งหมด' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setDateFilter(f.value as any)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                dateFilter === f.value
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Reason Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 ${
              filter === 'all' ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <Filter size={12} /> ทั้งหมด
          </button>
          {Object.entries(reasonConfig).map(([key, config]) => {
            const Icon = config.icon
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-all ${
                  filter === key ? `${config.bg} ${config.color}` : 'bg-gray-100 text-gray-500'
                }`}
              >
                <Icon size={12} /> {config.label}
              </button>
            )
          })}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-green-600" size={18} />
              </div>
            </div>
            <p className="text-xl font-bold text-green-600">+{stats.incoming}</p>
            <p className="text-xs text-gray-500 font-medium">รับเข้า</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="text-red-600" size={18} />
              </div>
            </div>
            <p className="text-xl font-bold text-red-600">-{stats.outgoing}</p>
            <p className="text-xs text-gray-500 font-medium">ออก</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="text-blue-600" size={18} />
              </div>
            </div>
            <p className={`text-xl font-bold ${stats.net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {stats.net >= 0 ? '+' : ''}{stats.net}
            </p>
            <p className="text-xs text-gray-500 font-medium">สุทธิ</p>
          </div>
        </div>

        {/* Logs List */}
        {isLoading ? (
          <LoadingSpinner message="กำลังโหลด..." />
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <History size={56} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">ไม่มีความเคลื่อนไหว</p>
            <p className="text-sm text-gray-400 mt-1">ลองเปลี่ยนตัวกรองดู</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedLogs).map(([dateKey, dateLogs]) => (
              <div key={dateKey}>
                {/* Date Header */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Calendar size={14} className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-600">{formatDateHeader(dateKey)}</span>
                  <span className="text-xs text-gray-400">({dateLogs.length} รายการ)</span>
                </div>

                {/* Logs for this date */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  {dateLogs.map((log, idx) => {
                    const config = reasonConfig[log.reason] || reasonConfig.adjustment
                    const Icon = config.icon
                    return (
                      <div
                        key={log.id}
                        className={`p-4 flex items-center gap-4 ${idx < dateLogs.length - 1 ? 'border-b border-gray-100' : ''}`}
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${config.bg}`}>
                          <Icon className={config.color} size={22} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{log.product_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.bg} ${config.color}`}>
                              {config.label}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {log.note && (
                            <p className="text-xs text-gray-500 mt-1 truncate">📝 {log.note}</p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className={`text-lg font-bold ${log.change_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                          </p>
                          {log.user_name && (
                            <p className="text-xs text-gray-400">👤 {log.user_name}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
