import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Product, DailyStockCount, MeltLossReportSummary, MeltLossByProduct } from '../types'
import { calculateAllMeltLossData } from '../lib/meltLossCalculations'

// Error types for better error handling
export type MeltLossErrorType = 
  | 'NETWORK_ERROR'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNKNOWN_ERROR'

export interface MeltLossError {
  type: MeltLossErrorType
  message: string
  originalError?: unknown
}

// Helper to classify and format errors
function classifyError(err: unknown): MeltLossError {
  if (err instanceof Error) {
    const message = err.message.toLowerCase()
    
    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return {
        type: 'NETWORK_ERROR',
        message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
        originalError: err
      }
    }
    
    // Database constraint errors
    if (message.includes('duplicate') || message.includes('unique') || message.includes('constraint')) {
      return {
        type: 'DATABASE_ERROR',
        message: 'ข้อมูลซ้ำกับที่มีอยู่แล้ว',
        originalError: err
      }
    }
    
    // Not found errors
    if (message.includes('not found') || message.includes('no rows')) {
      return {
        type: 'NOT_FOUND',
        message: 'ไม่พบข้อมูลที่ต้องการ',
        originalError: err
      }
    }
    
    // Generic database errors
    if (message.includes('database') || message.includes('sql') || message.includes('postgres')) {
      return {
        type: 'DATABASE_ERROR',
        message: 'เกิดข้อผิดพลาดในการเข้าถึงฐานข้อมูล',
        originalError: err
      }
    }
    
    return {
      type: 'UNKNOWN_ERROR',
      message: err.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
      originalError: err
    }
  }
  
  return {
    type: 'UNKNOWN_ERROR',
    message: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
    originalError: err
  }
}

export function useMeltLoss() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<MeltLossError | null>(null)

  // Clear error state
  const clearError = useCallback(() => {
    setError(null)
    setErrorDetails(null)
  }, [])

  // ดึงสินค้าประเภท ice ทั้งหมด
  const getIceProducts = useCallback(async (): Promise<Product[]> => {
    setLoading(true)
    clearError()
    try {
      const { data, error: err } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'ice')
        .order('name')
      
      if (err) throw err
      return data || []
    } catch (err) {
      const classified = classifyError(err)
      setError(classified.message)
      setErrorDetails(classified)
      console.error('getIceProducts error:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [clearError])

  // ดึงยอดขายวันนี้ของสินค้า
  const getTodaySales = useCallback(async (productId: string): Promise<number> => {
    const today = new Date().toISOString().split('T')[0]
    const startOfDay = `${today}T00:00:00`
    const endOfDay = `${today}T23:59:59`

    try {
      const { data, error: err } = await supabase
        .from('sale_items')
        .select('quantity, sales!inner(timestamp)')
        .eq('product_id', productId)
        .gte('sales.timestamp', startOfDay)
        .lte('sales.timestamp', endOfDay)

      if (err) throw err
      return data?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
    } catch (err) {
      const classified = classifyError(err)
      console.error('getTodaySales error:', classified.message, err)
      // Return 0 but don't set global error - this is a non-critical operation
      return 0
    }
  }, [])

  // ดึงยอดขายวันนี้ของสินค้าทั้งหมด (batch)
  const getAllTodaySales = useCallback(async (productIds: string[]): Promise<Record<string, number>> => {
    const today = new Date().toISOString().split('T')[0]
    const startOfDay = `${today}T00:00:00`
    const endOfDay = `${today}T23:59:59`

    try {
      const { data, error: err } = await supabase
        .from('sale_items')
        .select('product_id, quantity, sales!inner(timestamp)')
        .in('product_id', productIds)
        .gte('sales.timestamp', startOfDay)
        .lte('sales.timestamp', endOfDay)

      if (err) throw err

      const salesByProduct: Record<string, number> = {}
      data?.forEach(item => {
        salesByProduct[item.product_id] = (salesByProduct[item.product_id] || 0) + (item.quantity || 0)
      })

      return salesByProduct
    } catch (err) {
      const classified = classifyError(err)
      console.error('getAllTodaySales error:', classified.message, err)
      // Return empty but don't set global error - this is a non-critical operation
      return {}
    }
  }, [])

  // บันทึกปิดยอดสต๊อก
  const saveDailyStockCount = useCallback(async (
    product: Product,
    actualStock: number,
    soldToday: number,
    userId?: string,
    note?: string
  ): Promise<{ success: boolean; error?: string; errorType?: MeltLossErrorType; isAbnormal?: boolean }> => {
    setLoading(true)
    clearError()

    // Validation
    if (actualStock < 0) {
      const validationError: MeltLossError = {
        type: 'VALIDATION_ERROR',
        message: 'จำนวนสต๊อกต้องไม่ติดลบ'
      }
      setError(validationError.message)
      setErrorDetails(validationError)
      setLoading(false)
      return { success: false, error: validationError.message, errorType: 'VALIDATION_ERROR' }
    }

    try {
      const today = new Date().toISOString().split('T')[0]
      const expectedMeltPercent = product.melt_rate_percent || 5
      const cost = product.cost || 0

      // คำนวณข้อมูล melt loss
      const calc = calculateAllMeltLossData(
        product.stock,
        soldToday,
        actualStock,
        expectedMeltPercent,
        cost
      )

      // บันทึก daily_stock_counts (upsert)
      const { error: countError } = await supabase
        .from('daily_stock_counts')
        .upsert({
          product_id: product.id,
          count_date: today,
          system_stock: product.stock,
          actual_stock: actualStock,
          melt_loss: calc.meltLoss,
          melt_loss_value: calc.meltLossValue,
          melt_percent: calc.meltPercent,
          expected_melt_percent: expectedMeltPercent,
          is_abnormal: calc.isAbnormal,
          user_id: userId,
          note: note
        }, {
          onConflict: 'product_id,count_date'
        })

      if (countError) throw countError

      // อัพเดทสต๊อกในระบบ
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: actualStock, updated_at: new Date().toISOString() })
        .eq('id', product.id)

      if (updateError) throw updateError

      // บันทึก stock_log ถ้ามีการละลาย
      if (calc.meltLoss > 0) {
        const { error: logError } = await supabase
          .from('stock_logs')
          .insert({
            id: crypto.randomUUID(),
            product_id: product.id,
            change_amount: -calc.meltLoss,
            reason: 'melt_loss',
            note: `ปิดยอดวันที่ ${today} - ละลาย ${calc.meltLoss} ${product.unit} (${calc.meltPercent}%)`,
            user_id: userId
          })

        if (logError) throw logError
      }

      return { success: true, isAbnormal: calc.isAbnormal }
    } catch (err) {
      const classified = classifyError(err)
      setError(classified.message)
      setErrorDetails(classified)
      console.error('saveDailyStockCount error:', err)
      return { success: false, error: classified.message, errorType: classified.type }
    } finally {
      setLoading(false)
    }
  }, [clearError])

  // ดึงรายงาน melt loss
  const getMeltLossReport = useCallback(async (
    startDate: string,
    endDate: string
  ): Promise<DailyStockCount[]> => {
    setLoading(true)
    clearError()

    try {
      const { data, error: err } = await supabase
        .from('daily_stock_counts')
        .select(`
          *,
          products (name, cost)
        `)
        .gte('count_date', startDate)
        .lte('count_date', endDate)
        .order('count_date', { ascending: false })

      if (err) throw err

      return (data || []).map(item => ({
        ...item,
        product_name: item.products?.name,
        product_cost: item.products?.cost
      }))
    } catch (err) {
      const classified = classifyError(err)
      setError(classified.message)
      setErrorDetails(classified)
      console.error('getMeltLossReport error:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [clearError])

  // ดึงสรุปรายงาน
  const getMeltLossSummary = useCallback(async (
    startDate: string,
    endDate: string
  ): Promise<MeltLossReportSummary> => {
    const data = await getMeltLossReport(startDate, endDate)
    
    const totalMeltLoss = data.reduce((sum, item) => sum + item.melt_loss, 0)
    const totalMeltValue = data.reduce((sum, item) => sum + item.melt_loss_value, 0)
    const avgMeltPercent = data.length > 0 
      ? data.reduce((sum, item) => sum + item.melt_percent, 0) / data.length 
      : 0
    const abnormalCount = data.filter(item => item.is_abnormal).length

    return {
      total_melt_loss: totalMeltLoss,
      total_melt_value: totalMeltValue,
      average_melt_percent: Math.round(avgMeltPercent * 100) / 100,
      abnormal_count: abnormalCount
    }
  }, [getMeltLossReport])

  // ดึงรายงานแยกตามสินค้า
  const getMeltLossByProduct = useCallback(async (
    startDate: string,
    endDate: string
  ): Promise<MeltLossByProduct[]> => {
    const data = await getMeltLossReport(startDate, endDate)
    
    const byProduct: Record<string, MeltLossByProduct> = {}
    
    data.forEach(item => {
      if (!byProduct[item.product_id]) {
        byProduct[item.product_id] = {
          product_id: item.product_id,
          product_name: item.product_name || '',
          total_melt_loss: 0,
          total_melt_value: 0,
          average_melt_percent: 0,
          expected_melt_percent: item.expected_melt_percent,
          count_days: 0
        }
      }
      
      byProduct[item.product_id].total_melt_loss += item.melt_loss
      byProduct[item.product_id].total_melt_value += item.melt_loss_value
      byProduct[item.product_id].average_melt_percent += item.melt_percent
      byProduct[item.product_id].count_days += 1
    })

    // คำนวณค่าเฉลี่ย
    return Object.values(byProduct).map(p => ({
      ...p,
      average_melt_percent: p.count_days > 0 
        ? Math.round((p.average_melt_percent / p.count_days) * 100) / 100 
        : 0
    }))
  }, [getMeltLossReport])

  // เช็คว่าวันนี้ปิดยอดแล้วหรือยัง
  const checkTodayCount = useCallback(async (productId: string): Promise<DailyStockCount | null> => {
    const today = new Date().toISOString().split('T')[0]
    
    try {
      const { data, error: err } = await supabase
        .from('daily_stock_counts')
        .select('*')
        .eq('product_id', productId)
        .eq('count_date', today)
        .single()

      // PGRST116 means no rows found - this is expected, not an error
      if (err && err.code !== 'PGRST116') {
        console.error('checkTodayCount error:', err)
      }
      
      return data
    } catch (err) {
      console.error('checkTodayCount error:', err)
      return null
    }
  }, [])

  return {
    loading,
    error,
    errorDetails,
    clearError,
    getIceProducts,
    getTodaySales,
    getAllTodaySales,
    saveDailyStockCount,
    getMeltLossReport,
    getMeltLossSummary,
    getMeltLossByProduct,
    checkTodayCount
  }
}
