import { useState, useEffect } from 'react'
import { 
  BarChart3, TrendingUp, Package, Calendar, Filter, 
  Users, CreditCard, Download, ChevronDown, ChevronUp,
  Search, X
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { SalesTrendChart } from '../components/SalesTrendChart'
import { ReportGenerator, SaleFilters, SaleWithDetails } from '../lib/reportGenerator'
import { supabase } from '../lib/supabase'

type Period = 'week' | 'month' | 'year'

interface Customer {
  id: string
  name: string
}

interface User {
  id: string
  name: string
}

export function ReportsPage() {
  const { sales, fetchSales, isLoading, products } = useStore()
  const [period, setPeriod] = useState<Period>('week')
  const [showFilters, setShowFilters] = useState(false)
  const [trendData, setTrendData] = useState<Array<{ date: string; total: number; count: number; profit: number }>>([])
  const [filteredSales, setFilteredSales] = useState<SaleWithDetails[]>([])
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  
  // Filter states
  const [filters, setFilters] = useState<SaleFilters>({})
  const [customers, setCustomers] = useState<Customer[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch initial data
  useEffect(() => {
    fetchSales()
    loadFilterOptions()
  }, [fetchSales])

  // Load filter options
  const loadFilterOptions = async () => {
    const [customersRes, usersRes] = await Promise.all([
      supabase.from('customers').select('id, name'),
      supabase.from('users').select('id, name')
    ])
    setCustomers(customersRes.data || [])
    setUsers(usersRes.data || [])
  }

  // Load trend data
  useEffect(() => {
    const loadTrendData = async () => {
      const days = period === 'week' ? 7 : period === 'month' ? 30 : 365
      const data = await ReportGenerator.getSalesTrend(days)
      setTrendData(data)
    }
    loadTrendData()
  }, [period])

  // Apply filters
  useEffect(() => {
    const applyFilters = async () => {
      setIsLoadingReport(true)
      try {
        const days = period === 'week' ? 7 : period === 'month' ? 30 : 365
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        
        const report = await ReportGenerator.generateSalesReport({
          ...filters,
          startDate: filters.startDate || startDate.toISOString(),
          endDate: filters.endDate || new Date().toISOString()
        })
        
        // Apply search filter
        let filtered = report.sales
        if (searchTerm) {
          const term = searchTerm.toLowerCase()
          filtered = filtered.filter(s => 
            s.customer_name?.toLowerCase().includes(term) ||
            s.user_name?.toLowerCase().includes(term) ||
            s.items.some(i => i.product_name.toLowerCase().includes(term))
          )
        }
        
        setFilteredSales(filtered)
      } catch (error) {
        console.error('Error loading report:', error)
      } finally {
        setIsLoadingReport(false)
      }
    }
    applyFilters()
  }, [period, filters, searchTerm])

  // Calculate summary
  const summary = {
    totalRevenue: filteredSales.reduce((sum, s) => sum + s.total, 0),
    totalDiscount: filteredSales.reduce((sum, s) => sum + s.discount_amount, 0),
    totalOrders: filteredSales.length,
    avgOrderValue: filteredSales.length > 0 
      ? filteredSales.reduce((sum, s) => sum + s.total, 0) / filteredSales.length 
      : 0
  }

  // Payment method breakdown
  const paymentBreakdown = filteredSales.reduce((acc, s) => {
    const method = s.payment_method || 'cash'
    if (!acc[method]) acc[method] = { count: 0, total: 0 }
    acc[method].count += 1
    acc[method].total += s.total
    return acc
  }, {} as Record<string, { count: number; total: number }>)

  const paymentMethodLabels: Record<string, string> = {
    cash: 'เงินสด',
    transfer: 'โอนเงิน',
    credit: 'วางบิล'
  }

  // Export to CSV
  const handleExport = () => {
    const exportData = filteredSales.map(s => ({
      วันที่: new Date(s.timestamp).toLocaleString('th-TH'),
      ยอดรวม: s.total,
      ส่วนลด: s.discount_amount,
      ชำระ: s.payment,
      ทอน: s.change,
      วิธีชำระ: paymentMethodLabels[s.payment_method] || s.payment_method,
      ลูกค้า: s.customer_name || '-',
      พนักงาน: s.user_name || '-',
      รายการ: s.items.map(i => `${i.product_name} x${i.quantity}`).join(', ')
    }))
    ReportGenerator.exportToCSV(exportData, 'sales_report')
  }

  // Clear filters
  const clearFilters = () => {
    setFilters({})
    setSearchTerm('')
  }

  const hasActiveFilters = Object.keys(filters).length > 0 || searchTerm

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="bg-blue-500 text-white px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">📊 รายงานยอดขาย</h1>
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
        {/* Period Selector */}
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                period === p ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'
              }`}
            >
              {p === 'week' ? '7 วัน' : p === 'month' ? '30 วัน' : '1 ปี'}
            </button>
          ))}
        </div>

        {/* Search & Filter Toggle */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-4 py-2 rounded-lg border ${
              hasActiveFilters ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-200'
            }`}
          >
            <Filter size={18} />
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">ตัวกรอง</h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-sm text-red-500 flex items-center gap-1">
                  <X size={14} /> ล้างทั้งหมด
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Payment Method */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">วิธีชำระเงิน</label>
                <select
                  value={filters.paymentMethod || ''}
                  onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value || undefined })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                >
                  <option value="">ทั้งหมด</option>
                  <option value="cash">เงินสด</option>
                  <option value="transfer">โอนเงิน</option>
                  <option value="credit">วางบิล</option>
                </select>
              </div>

              {/* Customer */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ลูกค้า</label>
                <select
                  value={filters.customerId || ''}
                  onChange={(e) => setFilters({ ...filters, customerId: e.target.value || undefined })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                >
                  <option value="">ทั้งหมด</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* User */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">พนักงาน</label>
                <select
                  value={filters.userId || ''}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value || undefined })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                >
                  <option value="">ทั้งหมด</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* Product */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">สินค้า</label>
                <select
                  value={filters.productId || ''}
                  onChange={(e) => setFilters({ ...filters, productId: e.target.value || undefined })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                >
                  <option value="">ทั้งหมด</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {isLoading || isLoadingReport ? (
          <LoadingSpinner message="กำลังโหลดข้อมูล..." />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 text-white">
                <TrendingUp size={20} className="mb-1 opacity-80" />
                <p className="text-xl font-bold">฿{summary.totalRevenue.toLocaleString()}</p>
                <p className="text-xs opacity-80">ยอดขายรวม</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 text-white">
                <BarChart3 size={20} className="mb-1 opacity-80" />
                <p className="text-xl font-bold">{summary.totalOrders}</p>
                <p className="text-xs opacity-80">จำนวนออเดอร์</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 text-white">
                <Package size={20} className="mb-1 opacity-80" />
                <p className="text-xl font-bold">฿{summary.avgOrderValue.toFixed(0)}</p>
                <p className="text-xs opacity-80">เฉลี่ย/ออเดอร์</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-3 text-white">
                <CreditCard size={20} className="mb-1 opacity-80" />
                <p className="text-xl font-bold">฿{summary.totalDiscount.toLocaleString()}</p>
                <p className="text-xs opacity-80">ส่วนลดรวม</p>
              </div>
            </div>

            {/* Sales Trend Chart */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar size={18} />
                แนวโน้มยอดขาย
              </h3>
              <SalesTrendChart data={trendData} height={180} />
            </div>

            {/* Payment Method Breakdown */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <CreditCard size={18} />
                แยกตามวิธีชำระเงิน
              </h3>
              <div className="space-y-2">
                {Object.entries(paymentBreakdown).map(([method, data]) => (
                  <div key={method} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${
                        method === 'cash' ? 'bg-green-500' : 
                        method === 'transfer' ? 'bg-blue-500' : 'bg-orange-500'
                      }`} />
                      <span className="text-gray-700">{paymentMethodLabels[method] || method}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">฿{data.total.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{data.count} รายการ</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sales List */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Users size={18} />
                รายการขาย ({filteredSales.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredSales.slice(0, 50).map((sale) => (
                  <div key={sale.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">{formatDateTime(sale.timestamp)}</span>
                      <span className="font-bold text-blue-600">฿{sale.total.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className={`px-2 py-0.5 rounded-full ${
                        sale.payment_method === 'cash' ? 'bg-green-100 text-green-700' :
                        sale.payment_method === 'transfer' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {paymentMethodLabels[sale.payment_method] || sale.payment_method}
                      </span>
                      {sale.customer_name && <span>👤 {sale.customer_name}</span>}
                      {sale.user_name && <span>🧑‍💼 {sale.user_name}</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-1 truncate">
                      {sale.items.map(i => `${i.product_name} x${i.quantity}`).join(', ')}
                    </div>
                  </div>
                ))}
                {filteredSales.length > 50 && (
                  <p className="text-center text-sm text-gray-400 py-2">
                    แสดง 50 จาก {filteredSales.length} รายการ
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
