import { useState, useEffect } from 'react'
import { 
  Package, AlertTriangle, TrendingDown, Download, 
  ArrowLeft, Search, Filter
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ReportGenerator } from '../lib/reportGenerator'

interface StockItem {
  id: string
  name: string
  category: string
  stock: number
  cost: number
  price: number
  stockValue: number
  profitMargin: number
  lowStock: boolean
  unit: string
}

type SortBy = 'name' | 'stock' | 'value' | 'margin'
type FilterCategory = 'all' | 'ice' | 'gas' | 'water'

export function StockReportPage() {
  const navigate = useNavigate()
  const { products, fetchProducts, isLoading } = useStore()
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [sortBy, setSortBy] = useState<SortBy>('value')
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    const items: StockItem[] = products.map(p => {
      const cost = Number(p.cost) || 0
      const price = Number(p.price) || 0
      const stock = Number(p.stock) || 0
      const lowStockThreshold = Number(p.low_stock_threshold) || 5
      
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        stock,
        cost,
        price,
        stockValue: stock * cost,
        profitMargin: price > 0 ? ((price - cost) / price) * 100 : 0,
        lowStock: stock <= lowStockThreshold,
        unit: p.unit
      }
    })
    setStockItems(items)
  }, [products])

  // Filter and sort
  const filteredItems = stockItems
    .filter(item => {
      if (filterCategory !== 'all' && item.category !== filterCategory) return false
      if (showLowStockOnly && !item.lowStock) return false
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name)
        case 'stock': return b.stock - a.stock
        case 'value': return b.stockValue - a.stockValue
        case 'margin': return b.profitMargin - a.profitMargin
        default: return 0
      }
    })

  // Summary
  const summary = {
    totalItems: filteredItems.length,
    totalStock: filteredItems.reduce((sum, i) => sum + i.stock, 0),
    totalValue: filteredItems.reduce((sum, i) => sum + i.stockValue, 0),
    lowStockCount: filteredItems.filter(i => i.lowStock).length,
    avgMargin: filteredItems.length > 0 
      ? filteredItems.reduce((sum, i) => sum + i.profitMargin, 0) / filteredItems.length 
      : 0
  }

  // Export
  const handleExport = () => {
    const exportData = filteredItems.map(item => ({
      ชื่อสินค้า: item.name,
      หมวดหมู่: item.category === 'ice' ? 'น้ำแข็ง' : item.category === 'gas' ? 'แก๊ส' : 'น้ำดื่ม',
      สต็อก: item.stock,
      หน่วย: item.unit,
      ต้นทุน: item.cost,
      ราคาขาย: item.price,
      มูลค่าสต็อก: item.stockValue,
      กำไร_เปอร์เซ็นต์: item.profitMargin.toFixed(1),
      สต็อกต่ำ: item.lowStock ? 'ใช่' : 'ไม่'
    }))
    ReportGenerator.exportToCSV(exportData, 'stock_report')
  }

  const categoryLabels: Record<string, string> = {
    ice: '🧊 น้ำแข็ง',
    gas: '🔥 แก๊ส',
    water: '💧 น้ำดื่ม'
  }

  const getMarginColor = (margin: number) => {
    if (margin >= 40) return 'text-green-600 bg-green-50'
    if (margin >= 25) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="bg-purple-500 text-white px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">📦 รายงานสต็อก</h1>
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
            <Package size={20} className="text-purple-500 mb-1" />
            <p className="text-xl font-bold text-gray-800">{summary.totalStock}</p>
            <p className="text-xs text-gray-500">สต็อกรวม ({summary.totalItems} รายการ)</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <TrendingDown size={20} className="text-blue-500 mb-1" />
            <p className="text-xl font-bold text-gray-800">฿{summary.totalValue.toLocaleString()}</p>
            <p className="text-xs text-gray-500">มูลค่าสต็อกรวม</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <AlertTriangle size={20} className="text-orange-500 mb-1" />
            <p className="text-xl font-bold text-gray-800">{summary.lowStockCount}</p>
            <p className="text-xs text-gray-500">สินค้าใกล้หมด</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <TrendingDown size={20} className="text-green-500 mb-1" />
            <p className="text-xl font-bold text-gray-800">{summary.avgMargin.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">กำไรเฉลี่ย</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาสินค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['all', 'ice', 'gas', 'water'] as FilterCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                  filterCategory === cat 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-white text-gray-600'
                }`}
              >
                {cat === 'all' ? 'ทั้งหมด' : categoryLabels[cat]}
              </button>
            ))}
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex items-center gap-1 ${
                showLowStockOnly 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-white text-gray-600'
              }`}
            >
              <AlertTriangle size={14} />
              ใกล้หมด
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <span className="text-sm text-gray-500">เรียงตาม:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="text-sm border-0 bg-transparent text-purple-600 font-medium"
            >
              <option value="value">มูลค่า</option>
              <option value="stock">จำนวน</option>
              <option value="margin">กำไร %</option>
              <option value="name">ชื่อ</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner message="กำลังโหลดข้อมูล..." />
        ) : (
          <div className="space-y-2">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                className={`bg-white rounded-xl p-4 shadow-sm ${
                  item.lowStock ? 'border-l-4 border-orange-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-800">{item.name}</h3>
                    <p className="text-xs text-gray-500">
                      {categoryLabels[item.category]} • {item.unit}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getMarginColor(item.profitMargin)}`}>
                    {item.profitMargin.toFixed(0)}% กำไร
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className={`text-lg font-bold ${item.lowStock ? 'text-orange-500' : 'text-gray-800'}`}>
                      {item.stock}
                    </p>
                    <p className="text-[10px] text-gray-400">สต็อก</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-800">฿{item.cost}</p>
                    <p className="text-[10px] text-gray-400">ต้นทุน</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-600">฿{item.price}</p>
                    <p className="text-[10px] text-gray-400">ราคาขาย</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-purple-600">฿{item.stockValue.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400">มูลค่า</p>
                  </div>
                </div>

                {item.lowStock && (
                  <div className="mt-2 flex items-center gap-1 text-orange-500 text-xs">
                    <AlertTriangle size={12} />
                    สต็อกต่ำ - ควรสั่งเพิ่ม
                  </div>
                )}
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                ไม่พบสินค้าที่ตรงกับเงื่อนไข
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
