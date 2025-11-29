import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Product, DailyStockCount, MeltLossReportSummary, MeltLossByProduct } from '../types'
import { calculateAllMeltLossData } from '../lib/meltLossCalculations'

export function useMeltLoss() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ดึงสินค้าประเภท ice ทั้งหมด
  const getIceProducts = useCallback(async (): Promise<Product[]> => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'ice')
        .order('name')
      
      if (err) throw err
      return data || []
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // ดึงยอดขายวันนี้ของสินค้า
  const getTodaySales = useCallback(async (productId: string): Promise<number> => {
    const today = new Date().toISOString().split('T')[0]
    const startOfDay = `${today}T00:00:00`
    const endOfDay = `${today}T23:59:59`

    const { data, error: err } = await supabase
      .from('sale_items')
      .select('quantity, sales!inner(timestamp)')
      .eq('product_id', productId)
      .gte('sales.timestamp', startOfDay)
      .lte('sales.timestamp', endOfDay)

    if (err) {
      console.error('Error fetching today sales:', err)
      return 0
    }

    return data?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
  }, [])

  // ดึงยอดขายวันนี้ของสินค้าทั้งหมด (batch)
  const getAllTodaySales = useCallback(async (productIds: string[]): Promise<Record<string, number>> => {
    const today = new Date().toISOString().split('T')[0]
    const startOfDay = `${today}T00:00:00`
    const endOfDay = `${today}T23:59:59`

    const { data, error: err } = await supabase
      .from('sale_items')
      .select('product_id, quantity, sales!inner(timestamp)')
      .in('product_id', productIds)
      .gte('sales.timestamp', startOfDay)
      .lte('sales.timestamp', endOfDay)

    if (err) {
      console.error('Error fetching today sales:', err)
      return {}
    }

    const salesByProduct: Record<string, number> = {}
    data?.forEach(item => {
      salesByProduct[item.product_id] = (salesByProduct[item.product_id] || 0) + (item.quantity || 0)
    })

    return salesByProduct
  }, [])

  // บันทึกปิดยอดสต๊อก
  const saveDailyStockCount = useCallback(async (
    product: Product,
    actualStock: number,
    soldToday: number,
    userId?: string,
    note?: string
  ): Promise<{ success: boolean; error?: string; isAbnormal?: boolean }> => {
    setLoading(true)
    setError(null)

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
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก'
      setError(message)
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }, [])

  // ดึงรายงาน melt loss
  const getMeltLossReport = useCallback(async (
    startDate: string,
    endDate: string
  ): Promise<DailyStockCount[]> => {
    setLoading(true)
    setError(null)

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
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

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
    
    const { data } = await supabase
      .from('daily_stock_counts')
      .select('*')
      .eq('product_id', productId)
      .eq('count_date', today)
      .single()

    return data
  }, [])

  return {
    loading,
    error,
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
