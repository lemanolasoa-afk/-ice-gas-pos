import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Calendar, Save, Loader2, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StockCountCard } from '../components/stock/StockCountCard'
import { StockCountListSkeleton } from '../components/Skeleton'
import { ErrorMessage } from '../components/ErrorMessage'
import { useToast } from '../components/Toast'
import { useMeltLoss } from '../hooks/useMeltLoss'
import { Product } from '../types'
import { useAuthStore } from '../store/authStore'
import { NotificationTriggers } from '../lib/notificationTriggers'
import { calculateAllMeltLossData } from '../lib/meltLossCalculations'

interface StockCountData {
  actualStock: number // รองรับค่าทศนิยม เช่น 0.5, 10.5
  isAbnormal: boolean
}

interface SaveError {
  productName: string
  message: string
}

export function DailyStockCountPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  const { showToast } = useToast()
  const { loading, error, clearError, getIceProducts, getAllTodaySales, saveDailyStockCount } = useMeltLoss()
  
  const [products, setProducts] = useState<Product[]>([])
  const [salesByProduct, setSalesByProduct] = useState<Record<string, number>>({})
  const [stockCounts, setStockCounts] = useState<Record<string, StockCountData>>({})
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ success: boolean; abnormalCount: number } | null>(null)
  const [saveErrors, setSaveErrors] = useState<SaveError[]>([])
  const [selectedDate] = useState(new Date().toISOString().split('T')[0])

  // Load ice products and today's sales
  const loadData = useCallback(async () => {
    clearError()
    setSaveErrors([])
    const iceProducts = await getIceProducts()
    setProducts(iceProducts)
    
    if (iceProducts.length > 0) {
      const productIds = iceProducts.map(p => p.id)
      const sales = await getAllTodaySales(productIds)
      setSalesByProduct(sales)
    }
  }, [getIceProducts, getAllTodaySales, clearError])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle stock count change
  const handleStockCountChange = useCallback((productId: string, actualStock: number, isAbnormal: boolean) => {
    setStockCounts(prev => ({
      ...prev,
      [productId]: { actualStock, isAbnormal }
    }))
  }, [])

  // Save all stock counts
  const handleSave = async () => {
    setSaving(true)
    setSaveResult(null)
    setSaveErrors([])
    clearError()
    
    let abnormalCount = 0
    let successCount = 0
    const errors: SaveError[] = []
    const abnormalProducts: { name: string; meltPercent: number; expectedPercent: number }[] = []

    for (const product of products) {
      const countData = stockCounts[product.id]
      if (!countData) continue

      const soldToday = salesByProduct[product.id] || 0
      const result = await saveDailyStockCount(
        product,
        countData.actualStock,
        soldToday,
        currentUser?.id,
        note
      )

      if (!result.success) {
        errors.push({
          productName: product.name,
          message: result.error || 'เกิดข้อผิดพลาดในการบันทึก'
        })
        // Continue with other products instead of breaking
        continue
      }

      successCount++

      if (result.isAbnormal) {
        abnormalCount++
        // Calculate melt data for notification
        const expectedMeltPercent = product.melt_rate_percent || 5
        const calc = calculateAllMeltLossData(
          product.stock,
          soldToday,
          countData.actualStock,
          expectedMeltPercent,
          product.cost || 0
        )
        abnormalProducts.push({
          name: product.name,
          meltPercent: calc.meltPercent,
          expectedPercent: expectedMeltPercent
        })
      }
    }

    setSaving(false)
    
    if (errors.length > 0) {
      setSaveErrors(errors)
      showToast('error', `บันทึกไม่สำเร็จ ${errors.length} รายการ`, 4000)
    }
    
    if (successCount > 0) {
      setSaveResult({ success: true, abnormalCount })
      
      // Show success toast
      if (abnormalCount > 0) {
        showToast('info', `บันทึกสำเร็จ ${successCount} รายการ - พบการละลายผิดปกติ ${abnormalCount} รายการ`, 4000)
      } else {
        showToast('success', `บันทึกปิดยอดสำเร็จ ${successCount} รายการ`, 3000)
      }
      
      // Send notifications for abnormal melt loss
      for (const abnormal of abnormalProducts) {
        try {
          await NotificationTriggers.notifyMeltLossAbnormal(
            abnormal.name,
            abnormal.meltPercent,
            abnormal.expectedPercent
          )
        } catch (notifyErr) {
          console.error('Failed to send notification:', notifyErr)
          // Don't fail the whole operation for notification errors
        }
      }
      
      // Reload products to get updated stock
      await loadData()
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const hasAbnormal = Object.values(stockCounts).some(c => c.isAbnormal)

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
              <h1 className="text-xl font-bold text-gray-900">ปิดยอดสต๊อกประจำวัน</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar size={14} />
                <span>{formatDate(selectedDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-4">
        {loading && products.length === 0 ? (
          <StockCountListSkeleton count={3} />
        ) : error ? (
          <ErrorMessage 
            message={error}
            onRetry={loadData}
            variant="inline"
          />
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            ไม่มีสินค้าประเภทน้ำแข็ง
          </div>
        ) : (
          <>
            {/* Save Errors */}
            {saveErrors.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <AlertTriangle size={20} />
                  <span className="font-semibold">บันทึกไม่สำเร็จบางรายการ</span>
                </div>
                <ul className="text-sm text-red-600 space-y-1">
                  {saveErrors.map((err, idx) => (
                    <li key={idx}>• {err.productName}: {err.message}</li>
                  ))}
                </ul>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="mt-3 flex items-center gap-2 text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  <RefreshCw size={14} />
                  ลองบันทึกใหม่
                </button>
              </div>
            )}

            {/* Success/Warning Message */}
            {saveResult && (
              <div className={`mb-4 p-4 rounded-xl flex items-center gap-3 ${
                saveResult.abnormalCount > 0 
                  ? 'bg-amber-50 border border-amber-200' 
                  : 'bg-green-50 border border-green-200'
              }`}>
                {saveResult.abnormalCount > 0 ? (
                  <>
                    <AlertTriangle className="text-amber-500" size={24} />
                    <div>
                      <p className="font-semibold text-amber-700">บันทึกสำเร็จ</p>
                      <p className="text-sm text-amber-600">
                        พบการละลายผิดปกติ {saveResult.abnormalCount} รายการ
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle className="text-green-500" size={24} />
                    <div>
                      <p className="font-semibold text-green-700">บันทึกสำเร็จ</p>
                      <p className="text-sm text-green-600">อัพเดทสต๊อกเรียบร้อยแล้ว</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Product Cards */}
            <div className="space-y-4 mb-6">
              {products.map(product => (
                <StockCountCard
                  key={product.id}
                  product={product}
                  soldToday={salesByProduct[product.id] || 0}
                  onActualStockChange={handleStockCountChange}
                />
              ))}
            </div>

            {/* Note */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                หมายเหตุ (ถ้ามี)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={2}
                placeholder="เช่น ตู้แช่มีปัญหา, ไฟดับ..."
              />
            </div>

            {/* Warning if abnormal */}
            {hasAbnormal && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle size={20} />
                  <span className="font-semibold">พบการละลายผิดปกติ!</span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  ควรตรวจสอบตู้แช่หรือสภาพการเก็บรักษา
                </p>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving || products.length === 0}
              className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save size={20} />
                  บันทึกปิดยอด
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
