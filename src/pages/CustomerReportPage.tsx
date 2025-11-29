import { useState, useEffect } from 'react'
import { 
  Users, Crown, TrendingUp, Download, ArrowLeft, 
  Search, Star, ShoppingBag
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ReportGenerator } from '../lib/reportGenerator'

interface CustomerStats {
  id: string
  name: string
  phone: string | null
  points: number
  total_spent: number
  visit_count: number
  avg_order: number
  last_visit: string | null
  rank: number
}

type SortBy = 'spent' | 'visits' | 'points' | 'recent'

export function CustomerReportPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<CustomerStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortBy>('spent')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadCustomerStats()
  }, [])

  const loadCustomerStats = async () => {
    setIsLoading(true)
    try {
      // Get customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')

      // Get last visit for each customer
      const { data: salesData } = await supabase
        .from('sales')
        .select('customer_id, timestamp')
        .not('customer_id', 'is', null)
        .order('timestamp', { ascending: false })

      // Map last visits
      const lastVisitMap = new Map<string, string>()
      for (const sale of salesData || []) {
        if (sale.customer_id && !lastVisitMap.has(sale.customer_id)) {
          lastVisitMap.set(sale.customer_id, sale.timestamp)
        }
      }

      // Calculate stats
      const stats: CustomerStats[] = (customersData || []).map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        points: c.points || 0,
        total_spent: Number(c.total_spent) || 0,
        visit_count: c.visit_count || 0,
        avg_order: c.visit_count > 0 ? (Number(c.total_spent) || 0) / c.visit_count : 0,
        last_visit: lastVisitMap.get(c.id) || null,
        rank: 0
      }))

      // Assign ranks by total spent
      stats.sort((a, b) => b.total_spent - a.total_spent)
      stats.forEach((c, idx) => c.rank = idx + 1)

      setCustomers(stats)
    } catch (error) {
      console.error('Error loading customer stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter and sort
  const filteredCustomers = customers
    .filter(c => {
      if (!searchTerm) return true
      const term = searchTerm.toLowerCase()
      return c.name.toLowerCase().includes(term) || 
             (c.phone && c.phone.includes(term))
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'spent': return b.total_spent - a.total_spent
        case 'visits': return b.visit_count - a.visit_count
        case 'points': return b.points - a.points
        case 'recent': 
          if (!a.last_visit) return 1
          if (!b.last_visit) return -1
          return new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime()
        default: return 0
      }
    })

  // Summary
  const summary = {
    totalCustomers: customers.length,
    totalSpent: customers.reduce((sum, c) => sum + c.total_spent, 0),
    totalVisits: customers.reduce((sum, c) => sum + c.visit_count, 0),
    totalPoints: customers.reduce((sum, c) => sum + c.points, 0),
    avgLifetimeValue: customers.length > 0 
      ? customers.reduce((sum, c) => sum + c.total_spent, 0) / customers.length 
      : 0
  }

  // Export
  const handleExport = () => {
    const exportData = filteredCustomers.map(c => ({
      อันดับ: c.rank,
      ชื่อ: c.name,
      เบอร์โทร: c.phone || '-',
      ยอดซื้อรวม: c.total_spent,
      จำนวนครั้ง: c.visit_count,
      เฉลี่ยต่อครั้ง: c.avg_order.toFixed(0),
      แต้มสะสม: c.points,
      เข้าร้านล่าสุด: c.last_visit ? new Date(c.last_visit).toLocaleDateString('th-TH') : '-'
    }))
    ReportGenerator.exportToCSV(exportData, 'customer_report')
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    })
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { bg: 'bg-yellow-400', text: 'text-yellow-900', icon: '👑' }
    if (rank === 2) return { bg: 'bg-gray-300', text: 'text-gray-700', icon: '🥈' }
    if (rank === 3) return { bg: 'bg-orange-300', text: 'text-orange-800', icon: '🥉' }
    return { bg: 'bg-gray-100', text: 'text-gray-500', icon: '' }
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="bg-indigo-500 text-white px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">👥 รายงานลูกค้า</h1>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-lg text-sm"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <Users size={20} className="text-indigo-500 mb-1" />
            <p className="text-xl font-bold text-gray-800">{summary.totalCustomers}</p>
            <p className="text-xs text-gray-500">ลูกค้าทั้งหมด</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <TrendingUp size={20} className="text-green-500 mb-1" />
            <p className="text-xl font-bold text-gray-800">฿{summary.totalSpent.toLocaleString()}</p>
            <p className="text-xs text-gray-500">ยอดซื้อรวม</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <ShoppingBag size={20} className="text-blue-500 mb-1" />
            <p className="text-xl font-bold text-gray-800">{summary.totalVisits}</p>
            <p className="text-xs text-gray-500">จำนวนครั้งที่ซื้อ</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <Star size={20} className="text-yellow-500 mb-1" />
            <p className="text-xl font-bold text-gray-800">{summary.totalPoints.toLocaleString()}</p>
            <p className="text-xs text-gray-500">แต้มสะสมรวม</p>
          </div>
        </div>

        {/* Avg Lifetime Value */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Crown size={20} />
            <span className="text-sm opacity-80">มูลค่าลูกค้าเฉลี่ย (CLV)</span>
          </div>
          <p className="text-2xl font-bold">฿{summary.avgLifetimeValue.toLocaleString()}</p>
        </div>

        {/* Search & Sort */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อหรือเบอร์โทร..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">เรียงตาม:</span>
            <div className="flex gap-1">
              {[
                { key: 'spent', label: 'ยอดซื้อ' },
                { key: 'visits', label: 'จำนวนครั้ง' },
                { key: 'points', label: 'แต้ม' },
                { key: 'recent', label: 'ล่าสุด' }
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key as SortBy)}
                  className={`px-3 py-1 rounded-full text-xs ${
                    sortBy === opt.key 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-white text-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner message="กำลังโหลดข้อมูล..." />
        ) : (
          <div className="space-y-2">
            {filteredCustomers.map(customer => {
              const badge = getRankBadge(customer.rank)
              return (
                <div key={customer.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    {/* Rank Badge */}
                    <div className={`w-10 h-10 rounded-full ${badge.bg} ${badge.text} flex items-center justify-center font-bold text-sm`}>
                      {badge.icon || customer.rank}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-800 truncate">{customer.name}</h3>
                        <span className="text-lg font-bold text-indigo-600">
                          ฿{customer.total_spent.toLocaleString()}
                        </span>
                      </div>
                      
                      {customer.phone && (
                        <p className="text-xs text-gray-500">{customer.phone}</p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <ShoppingBag size={12} />
                          {customer.visit_count} ครั้ง
                        </span>
                        <span className="flex items-center gap-1">
                          <Star size={12} className="text-yellow-500" />
                          {customer.points} แต้ม
                        </span>
                        <span>
                          เฉลี่ย ฿{customer.avg_order.toFixed(0)}/ครั้ง
                        </span>
                      </div>

                      {customer.last_visit && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          เข้าร้านล่าสุด: {formatDate(customer.last_visit)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {filteredCustomers.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                {customers.length === 0 ? 'ยังไม่มีข้อมูลลูกค้า' : 'ไม่พบลูกค้าที่ตรงกับเงื่อนไข'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
