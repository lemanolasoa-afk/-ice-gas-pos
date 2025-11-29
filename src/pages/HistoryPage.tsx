import { useEffect, useState, useMemo, useCallback } from 'react'
import { Receipt, Calendar, Banknote, Wallet, FileText, ChevronRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Header } from '../components/Header'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { ReceiptModal } from '../components/ReceiptModal'
import { Sale } from '../types'

const paymentMethodLabels = {
  cash: { label: 'เงินสด', icon: Banknote, color: 'text-gray-600 bg-gray-100' },
  transfer: { label: 'โอนเงิน', icon: Wallet, color: 'text-gray-600 bg-gray-100' },
  credit: { label: 'วางบิล', icon: FileText, color: 'text-gray-600 bg-gray-100' },
}

// Memoized date formatters
const formatTime = (date: string) => 
  new Date(date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

const formatDate = (date: string) => 
  new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })

export function HistoryPage() {
  const sales = useStore((s) => s.sales)
  const fetchSales = useStore((s) => s.fetchSales)
  const isLoading = useStore((s) => s.isLoading)
  const error = useStore((s) => s.error)
  const clearError = useStore((s) => s.clearError)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  // Memoized calculations
  const { todaySales, todayTotal, groupedSales } = useMemo(() => {
    const today = new Date().toDateString()
    const todaySales = sales.filter((sale) => new Date(sale.created_at).toDateString() === today)
    const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0)
    
    const groupedSales = sales.reduce((groups, sale) => {
      const date = new Date(sale.created_at).toDateString()
      if (!groups[date]) groups[date] = []
      groups[date].push(sale)
      return groups
    }, {} as Record<string, Sale[]>)

    return { todaySales, todayTotal, groupedSales }
  }, [sales])

  const handleSelectSale = useCallback((sale: Sale) => setSelectedSale(sale), [])

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <Header title="ประวัติการขาย" icon="📋" />

      <div className="p-3">
        {/* Today Summary */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <Calendar size={18} className="mb-2 text-gray-400" />
            <p className="text-xl font-semibold text-gray-800">฿{todayTotal.toLocaleString()}</p>
            <p className="text-xs text-gray-500">ยอดขายวันนี้</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <Receipt size={18} className="mb-2 text-gray-400" />
            <p className="text-xl font-semibold text-gray-800">{todaySales.length}</p>
            <p className="text-xs text-gray-500">รายการวันนี้</p>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <ErrorMessage
            message={error}
            variant="banner"
            onRetry={() => { clearError(); fetchSales() }}
            onDismiss={clearError}
          />
        )}

        {/* Sales List */}
        {isLoading && sales.length === 0 ? (
          <LoadingSpinner message="กำลังโหลดประวัติการขาย..." />
        ) : error && sales.length === 0 ? (
          <ErrorMessage message={error} onRetry={() => { clearError(); fetchSales() }} />
        ) : sales.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="mx-auto text-gray-300 mb-4" size={56} />
            <p className="text-gray-400">ยังไม่มีประวัติการขาย</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedSales).map(([date, dateSales]) => {
              const isToday = new Date(date).toDateString() === new Date().toDateString()
              const dateTotal = dateSales.reduce((sum, s) => sum + s.total, 0)
              return (
                <div key={date}>
                  {/* Date Header */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <p className="text-sm font-medium text-gray-500">
                      {isToday ? 'วันนี้' : formatDate(date)}
                    </p>
                    <p className="text-sm font-medium text-gray-600">฿{dateTotal.toLocaleString()}</p>
                  </div>
                  
                  {/* Sales Cards */}
                  <div className="space-y-2">
                    {dateSales.map((sale, idx) => {
                      const method = paymentMethodLabels[sale.payment_method || 'cash']
                      const MethodIcon = method.icon
                      return (
                        <button
                          key={sale.id}
                          onClick={() => handleSelectSale(sale)}
                          style={{ animationDelay: `${idx * 30}ms` }}
                          className="w-full bg-white rounded-lg p-3 border border-gray-100 text-left stagger-item hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            {/* Payment Method Icon */}
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${method.color}`}>
                              <MethodIcon size={18} />
                            </div>
                            
                            {/* Sale Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-800">฿{sale.total.toLocaleString()}</p>
                                <p className="text-xs text-gray-400">{formatTime(sale.created_at)}</p>
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                {sale.items.map(i => i.product_name).join(', ')}
                              </p>
                            </div>
                            
                            <ChevronRight size={18} className="text-gray-300" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedSale && <ReceiptModal sale={selectedSale} onClose={() => setSelectedSale(null)} />}
    </div>
  )
}
