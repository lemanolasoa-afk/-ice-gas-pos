import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3, TrendingUp, Package, Users, DollarSign,
  Calendar, Download, ChevronRight, AlertTriangle,
  ShoppingCart, CreditCard, Snowflake, History,
  FileText, PieChart, Activity, Database
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { SalesTrendChart } from '../components/SalesTrendChart'
import { ReportGenerator } from '../lib/reportGenerator'

interface AdminStats {
  totalSales: number
  totalRevenue: number
  todaySales: number
  todayRevenue: number
  totalProducts: number
  lowStockCount: number
  totalCustomers: number
  totalPoints: number
  totalUsers: number
  totalStockLogs: number
  totalReceipts: number
  totalMeltRecords: number
  totalProfit: number
  profitMargin: number
}

interface TopProduct {
  product_name: string
  total_qty: number
  total_revenue: number
}

interface TopCustomer {
  name: string
  total_spent: number
  visit_count: number
}

type TabType = 'overview' | 'sales' | 'products' | 'customers' | 'finance' | 'staff'

export function AdminPanelPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [trendData, setTrendData] = useState<Array<{ date: string; total: number; count: number; profit: number }>>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')

  useEffect(() => {
    loadAllData()
  }, [period])

  const loadAllData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadStats(),
        loadTrendData(),
        loadTopProducts(),
        loadTopCustomers()
      ])
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get basic stats
    const [salesRes, productsRes, customersRes, usersRes, stockLogsRes, receiptsRes, meltRes] = await Promise.all([
      supabase.from('sales').select('total, timestamp').gte('timestamp', startDate.toISOString()),
      supabase.from('products').select('id, stock, low_stock_threshold, cost').eq('is_active', true),
      supabase.from('customers').select('id, points, total_spent'),
      supabase.from('users').select('id').eq('is_active', true),
      supabase.from('stock_logs').select('id'),
      supabase.from('stock_receipts').select('id'),
      supabase.from('daily_stock_counts').select('id')
    ])

    const sales = salesRes.data || []
    const products = productsRes.data || []
    const customers = customersRes.data || []

    // Calculate profit
    const profitReport = await ReportGenerator.generateProfitReport(
      startDate.toISOString(),
      new Date().toISOString()
    )

    // Today's stats
    const today = new Date().toISOString().split('T')[0]
    const todaySales = sales.filter(s => s.timestamp.startsWith(today))

    setStats({
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, s) => sum + Number(s.total), 0),
      todaySales: todaySales.length,
      todayRevenue: todaySales.reduce((sum, s) => sum + Number(s.total), 0),
      totalProducts: products.length,
      lowStockCount: products.filter(p => p.stock <= p.low_stock_threshold).length,
      totalCustomers: customers.length,
      totalPoints: customers.reduce((sum, c) => sum + (c.points || 0), 0),
      totalUsers: usersRes.data?.length || 0,
      totalStockLogs: stockLogsRes.data?.length || 0,
      totalReceipts: receiptsRes.data?.length || 0,
      totalMeltRecords: meltRes.data?.length || 0,
      totalProfit: profitReport.totalProfit,
      profitMargin: profitReport.profitMargin
    })
  }

  const loadTrendData = async () => {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90
    const data = await ReportGenerator.getSalesTrend(days)
    setTrendData(data)
  }

  const loadTopProducts = async () => {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365
    const products = await ReportGenerator.getTopSellingProducts(10, 
      new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    )
    setTopProducts(products.map(p => ({
      product_name: p.product_name,
      total_qty: p.total_quantity,
      total_revenue: p.total_revenue
    })))
  }

  const loadTopCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('name, total_spent, visit_count')
      .order('total_spent', { ascending: false })
      .limit(10)
    setTopCustomers(data || [])
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'ภาพรวม', icon: <BarChart3 size={16} /> },
    { id: 'sales', label: 'การขาย', icon: <ShoppingCart size={16} /> },
    { id: 'products', label: 'สินค้า', icon: <Package size={16} /> },
    { id: 'customers', label: 'ลูกค้า', icon: <Users size={16} /> },
    { id: 'finance', label: 'การเงิน', icon: <DollarSign size={16} /> },
    { id: 'staff', label: 'พนักงาน', icon: <Users size={16} /> }
  ]

  const periodLabels = { week: '7 วัน', month: '30 วัน', year: '1 ปี' }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="กำลังโหลดข้อมูล..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Database size={20} />
              Admin Panel
            </h1>
            <p className="text-xs text-white/70 mt-0.5">จัดการภาพรวมทั้งหมด</p>
          </div>
          <div className="flex gap-2">
            {(['week', 'month', 'year'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  period === p ? 'bg-white text-indigo-600' : 'bg-white/20 text-white'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-14 z-10 overflow-x-auto">
        <div className="flex px-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {activeTab === 'overview' && stats && (
          <OverviewTab 
            stats={stats} 
            trendData={trendData} 
            topProducts={topProducts}
            navigate={navigate}
          />
        )}
        {activeTab === 'sales' && <SalesTab navigate={navigate} period={period} />}
        {activeTab === 'products' && stats && <ProductsTab stats={stats} navigate={navigate} />}
        {activeTab === 'customers' && <CustomersTab topCustomers={topCustomers} navigate={navigate} />}
        {activeTab === 'finance' && stats && <FinanceTab stats={stats} navigate={navigate} />}
        {activeTab === 'staff' && <StaffTab navigate={navigate} />}
      </div>
    </div>
  )
}


// Overview Tab Component
function OverviewTab({ stats, trendData, topProducts, navigate }: {
  stats: AdminStats
  trendData: Array<{ date: string; total: number; count: number; profit: number }>
  topProducts: TopProduct[]
  navigate: (path: string) => void
}) {
  return (
    <>
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<TrendingUp size={18} />}
          label="ยอดขายรวม"
          value={`฿${stats.totalRevenue.toLocaleString()}`}
          subValue={`${stats.totalSales} รายการ`}
          color="blue"
        />
        <StatCard
          icon={<DollarSign size={18} />}
          label="กำไรรวม"
          value={`฿${stats.totalProfit.toLocaleString()}`}
          subValue={`${stats.profitMargin.toFixed(1)}%`}
          color="green"
        />
        <StatCard
          icon={<ShoppingCart size={18} />}
          label="ขายวันนี้"
          value={`฿${stats.todayRevenue.toLocaleString()}`}
          subValue={`${stats.todaySales} รายการ`}
          color="purple"
        />
        <StatCard
          icon={<Users size={18} />}
          label="ลูกค้า"
          value={stats.totalCustomers.toString()}
          subValue={`${stats.totalPoints.toLocaleString()} แต้ม`}
          color="orange"
        />
      </div>

      {/* Alerts */}
      {stats.lowStockCount > 0 && (
        <button
          onClick={() => navigate('/products')}
          className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="text-amber-600" size={18} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium text-amber-800">สินค้าใกล้หมด</p>
            <p className="text-xs text-amber-600">{stats.lowStockCount} รายการต้องเติมสต็อก</p>
          </div>
          <ChevronRight className="text-amber-400" size={18} />
        </button>
      )}

      {/* Sales Trend */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Activity size={18} />
          แนวโน้มยอดขาย
        </h3>
        <SalesTrendChart data={trendData} height={200} />
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Package size={18} />
            สินค้าขายดี Top 10
          </h3>
          <button onClick={() => navigate('/reports')} className="text-sm text-indigo-600">
            ดูทั้งหมด
          </button>
        </div>
        <div className="divide-y">
          {topProducts.slice(0, 5).map((p, idx) => (
            <div key={idx} className="p-3 flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                idx === 1 ? 'bg-gray-300 text-gray-700' :
                idx === 2 ? 'bg-orange-300 text-orange-800' :
                'bg-gray-100 text-gray-500'
              }`}>{idx + 1}</span>
              <div className="flex-1">
                <p className="font-medium text-gray-800 text-sm">{p.product_name}</p>
                <p className="text-xs text-gray-500">{p.total_qty} ชิ้น</p>
              </div>
              <span className="font-bold text-gray-800">฿{p.total_revenue.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-4 gap-2">
        <QuickLink icon={<FileText size={18} />} label="รายงาน" onClick={() => navigate('/reports')} />
        <QuickLink icon={<History size={18} />} label="ประวัติ" onClick={() => navigate('/history')} />
        <QuickLink icon={<Snowflake size={18} />} label="ละลาย" onClick={() => navigate('/melt-loss-report')} />
        <QuickLink icon={<Download size={18} />} label="สำรอง" onClick={() => navigate('/backup')} />
      </div>
    </>
  )
}


// Sales Tab Component
function SalesTab({ navigate, period }: { navigate: (path: string) => void; period: string }) {
  const [salesData, setSalesData] = useState<any[]>([])
  const [summary, setSummary] = useState({ total: 0, count: 0, avgOrder: 0 })
  const [paymentBreakdown, setPaymentBreakdown] = useState<Record<string, { count: number; total: number }>>({})

  useEffect(() => {
    loadSalesData()
  }, [period])

  const loadSalesData = async () => {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false })
      .limit(100)

    const sales = data || []
    setSalesData(sales)

    const total = sales.reduce((sum, s) => sum + Number(s.total), 0)
    setSummary({
      total,
      count: sales.length,
      avgOrder: sales.length > 0 ? total / sales.length : 0
    })

    const breakdown: Record<string, { count: number; total: number }> = {}
    sales.forEach(s => {
      const method = s.payment_method || 'cash'
      if (!breakdown[method]) breakdown[method] = { count: 0, total: 0 }
      breakdown[method].count++
      breakdown[method].total += Number(s.total)
    })
    setPaymentBreakdown(breakdown)
  }

  const paymentLabels: Record<string, string> = { cash: 'เงินสด', transfer: 'โอนเงิน', credit: 'วางบิล' }

  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-800">฿{summary.total.toLocaleString()}</p>
          <p className="text-xs text-gray-500">ยอดขายรวม</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{summary.count}</p>
          <p className="text-xs text-gray-500">รายการ</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-800">฿{summary.avgOrder.toFixed(0)}</p>
          <p className="text-xs text-gray-500">เฉลี่ย/รายการ</p>
        </div>
      </div>

      {/* Payment Breakdown */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <CreditCard size={18} />
          แยกตามวิธีชำระเงิน
        </h3>
        <div className="space-y-2">
          {Object.entries(paymentBreakdown).map(([method, data]) => (
            <div key={method} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  method === 'cash' ? 'bg-green-500' : method === 'transfer' ? 'bg-blue-500' : 'bg-orange-500'
                }`} />
                <span>{paymentLabels[method] || method}</span>
              </div>
              <div className="text-right">
                <p className="font-bold">฿{data.total.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{data.count} รายการ</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-800">รายการขายล่าสุด</h3>
          <button onClick={() => navigate('/history')} className="text-sm text-indigo-600">ดูทั้งหมด</button>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {salesData.slice(0, 20).map(sale => (
            <div key={sale.id} className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">
                  {new Date(sale.timestamp).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="font-bold text-indigo-600">฿{Number(sale.total).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full ${
                  sale.payment_method === 'cash' ? 'bg-green-100 text-green-700' :
                  sale.payment_method === 'transfer' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                }`}>{paymentLabels[sale.payment_method] || sale.payment_method}</span>
                <span className="text-gray-400">{sale.sale_items?.length || 0} รายการ</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/reports')} className="bg-indigo-600 text-white rounded-xl p-4 flex items-center justify-center gap-2">
          <BarChart3 size={18} />
          รายงานยอดขาย
        </button>
        <button onClick={() => navigate('/history')} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-center gap-2">
          <History size={18} />
          ประวัติทั้งหมด
        </button>
      </div>
    </>
  )
}


// Products Tab Component
function ProductsTab({ stats, navigate }: { stats: AdminStats; navigate: (path: string) => void }) {
  const [products, setProducts] = useState<any[]>([])
  const [stockValue, setStockValue] = useState(0)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('stock', { ascending: true })

    const prods = data || []
    setProducts(prods)
    setStockValue(prods.reduce((sum, p) => sum + (p.stock * (p.cost || 0)), 0))
  }

  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{stats.totalProducts}</p>
          <p className="text-xs text-gray-500">สินค้าทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.lowStockCount}</p>
          <p className="text-xs text-gray-500">ใกล้หมด</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-600">฿{stockValue.toLocaleString()}</p>
          <p className="text-xs text-gray-500">มูลค่าสต็อก</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
            <AlertTriangle size={18} />
            สินค้าใกล้หมด
          </h3>
          <div className="space-y-2">
            {products.filter(p => p.stock <= p.low_stock_threshold).map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-lg p-2">
                <span className="font-medium text-gray-800">{p.name}</span>
                <span className="text-red-600 font-bold">{p.stock} {p.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Products */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-800">สินค้าทั้งหมด</h3>
          <button onClick={() => navigate('/products')} className="text-sm text-indigo-600">จัดการ</button>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {products.map(p => (
            <div key={p.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-500">฿{p.price} / {p.unit}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${p.stock <= p.low_stock_threshold ? 'text-red-600' : 'text-gray-800'}`}>
                  {p.stock} {p.unit}
                </p>
                {p.cost && <p className="text-xs text-gray-400">ต้นทุน ฿{p.cost}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/stock-receipt')} className="bg-indigo-600 text-white rounded-xl p-4 flex items-center justify-center gap-2">
          <Package size={18} />
          รับสินค้าเข้า
        </button>
        <button onClick={() => navigate('/stock-logs')} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-center gap-2">
          <History size={18} />
          ประวัติสต็อก
        </button>
      </div>
    </>
  )
}

// Customers Tab Component
function CustomersTab({ topCustomers, navigate }: { topCustomers: TopCustomer[]; navigate: (path: string) => void }) {
  const [customers, setCustomers] = useState<any[]>([])

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('total_spent', { ascending: false })

    setCustomers(data || [])
  }

  const totalSpent = customers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0)
  const totalPoints = customers.reduce((sum, c) => sum + (c.points || 0), 0)

  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{customers.length}</p>
          <p className="text-xs text-gray-500">ลูกค้าทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-600">฿{totalSpent.toLocaleString()}</p>
          <p className="text-xs text-gray-500">ยอดซื้อรวม</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-purple-600">{totalPoints.toLocaleString()}</p>
          <p className="text-xs text-gray-500">แต้มรวม</p>
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Users size={18} />
            ลูกค้าประจำ Top 10
          </h3>
        </div>
        <div className="divide-y">
          {topCustomers.map((c, idx) => (
            <div key={idx} className="p-3 flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                idx === 1 ? 'bg-gray-300 text-gray-700' :
                idx === 2 ? 'bg-orange-300 text-orange-800' : 'bg-gray-100 text-gray-500'
              }`}>{idx + 1}</span>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{c.name}</p>
                <p className="text-xs text-gray-500">{c.visit_count} ครั้ง</p>
              </div>
              <span className="font-bold text-green-600">฿{c.total_spent.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/customers')} className="bg-indigo-600 text-white rounded-xl p-4 flex items-center justify-center gap-2">
          <Users size={18} />
          จัดการลูกค้า
        </button>
        <button onClick={() => navigate('/customer-report')} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-center gap-2">
          <BarChart3 size={18} />
          รายงานลูกค้า
        </button>
      </div>
    </>
  )
}


// Finance Tab Component
function FinanceTab({ stats, navigate }: { stats: AdminStats; navigate: (path: string) => void }) {
  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <DollarSign size={20} className="mb-1 opacity-80" />
          <p className="text-2xl font-bold">฿{stats.totalRevenue.toLocaleString()}</p>
          <p className="text-xs opacity-80">รายได้รวม</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <TrendingUp size={20} className="mb-1 opacity-80" />
          <p className="text-2xl font-bold">฿{stats.totalProfit.toLocaleString()}</p>
          <p className="text-xs opacity-80">กำไรรวม</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <PieChart size={20} className="mb-1 opacity-80" />
          <p className="text-2xl font-bold">{stats.profitMargin.toFixed(1)}%</p>
          <p className="text-xs opacity-80">อัตรากำไร</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
          <ShoppingCart size={20} className="mb-1 opacity-80" />
          <p className="text-2xl font-bold">{stats.totalSales}</p>
          <p className="text-xs opacity-80">รายการขาย</p>
        </div>
      </div>

      {/* Today Stats */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Calendar size={18} />
          วันนี้
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">ยอดขาย</p>
            <p className="text-xl font-bold text-gray-800">฿{stats.todayRevenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">รายการ</p>
            <p className="text-xl font-bold text-gray-800">{stats.todaySales}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3">สถิติอื่นๆ</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-gray-600">ค่าเฉลี่ยต่อรายการ</span>
            <span className="font-bold">฿{stats.totalSales > 0 ? (stats.totalRevenue / stats.totalSales).toFixed(0) : 0}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-gray-600">แต้มลูกค้ารวม</span>
            <span className="font-bold">{stats.totalPoints.toLocaleString()} แต้ม</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-600">การรับสินค้าเข้า</span>
            <span className="font-bold">{stats.totalReceipts} ครั้ง</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/profit')} className="bg-indigo-600 text-white rounded-xl p-4 flex items-center justify-center gap-2">
          <DollarSign size={18} />
          รายงานกำไร
        </button>
        <button onClick={() => navigate('/reports')} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-center gap-2">
          <BarChart3 size={18} />
          รายงานยอดขาย
        </button>
      </div>
    </>
  )
}

// Staff Tab Component
function StaffTab({ navigate }: { navigate: (path: string) => void }) {
  const [users, setUsers] = useState<any[]>([])
  const [salesByUser, setSalesByUser] = useState<Record<string, { count: number; total: number }>>({})

  useEffect(() => {
    loadStaffData()
  }, [])

  const loadStaffData = async () => {
    const [usersRes, salesRes] = await Promise.all([
      supabase.from('users').select('*').eq('is_active', true),
      supabase.from('sales').select('user_id, total')
    ])

    setUsers(usersRes.data || [])

    const byUser: Record<string, { count: number; total: number }> = {}
    ;(salesRes.data || []).forEach(s => {
      const userId = s.user_id || 'unknown'
      if (!byUser[userId]) byUser[userId] = { count: 0, total: 0 }
      byUser[userId].count++
      byUser[userId].total += Number(s.total)
    })
    setSalesByUser(byUser)
  }

  return (
    <>
      {/* Summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Users size={18} />
          พนักงานทั้งหมด ({users.length} คน)
        </h3>
        <div className="space-y-3">
          {users.map(user => {
            const userSales = salesByUser[user.id] || { count: 0, total: 0 }
            return (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-500">
                    {user.role === 'admin' ? '👑 Admin' : '👤 Cashier'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">฿{userSales.total.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{userSales.count} รายการ</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <button onClick={() => navigate('/users')} className="w-full bg-indigo-600 text-white rounded-xl p-4 flex items-center justify-center gap-2">
        <Users size={18} />
        จัดการผู้ใช้
      </button>
    </>
  )
}


// Helper Components
function StatCard({ icon, label, value, subValue, color }: {
  icon: React.ReactNode
  label: string
  value: string
  subValue: string
  color: 'blue' | 'green' | 'purple' | 'orange'
}) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600'
  }

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl p-4 text-white`}>
      <div className="opacity-80 mb-1">{icon}</div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-xs opacity-60 mt-1">{subValue}</p>
    </div>
  )
}

function QuickLink({ icon, label, onClick }: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col items-center gap-1.5 hover:bg-gray-50 transition-colors"
    >
      <div className="text-gray-600">{icon}</div>
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </button>
  )
}
