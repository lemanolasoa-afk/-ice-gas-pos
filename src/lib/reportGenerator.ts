import { supabase } from './supabase'

// Types for reports
export interface ProfitReport {
  period: { start: string; end: string }
  totalRevenue: number
  totalCost: number
  totalProfit: number
  profitMargin: number
  transactionCount: number
  categoryBreakdown: Record<string, CategoryProfit>
  topProfitableProducts: ProductProfit[]
}

export interface CategoryProfit {
  revenue: number
  cost: number
  profit: number
  margin: number
  quantity: number
}

export interface ProductProfit {
  product_id: string
  product_name: string
  category: string
  quantity_sold: number
  revenue: number
  cost: number
  profit: number
  margin: number
}

export interface SalesReport {
  sales: SaleWithDetails[]
  summary: {
    totalSales: number
    totalDiscount: number
    transactionCount: number
    averageTransaction: number
    paymentMethodBreakdown: Record<string, { count: number; total: number }>
  }
}

export interface SaleWithDetails {
  id: string
  total: number
  payment: number
  change: number
  discount_amount: number
  payment_method: string
  customer_name?: string
  user_name?: string
  timestamp: string
  items: Array<{
    product_name: string
    quantity: number
    price: number
    subtotal: number
  }>
}

export interface DailySales {
  date: string
  total: number
  count: number
  profit: number
}

export interface TopProduct {
  product_id: string
  product_name: string
  category: string
  unit: string
  total_quantity: number
  total_revenue: number
}

export interface SaleFilters {
  startDate?: string
  endDate?: string
  customerId?: string
  userId?: string
  paymentMethod?: string
  productId?: string
}

/**
 * ReportGenerator - Utility class for generating various reports
 * Implements Requirements 14.1-14.9
 */
export class ReportGenerator {
  /**
   * Generate profit report for date range
   * Validates: Requirements 14.4, 14.5
   */
  static async generateProfitReport(
    startDate: string,
    endDate: string
  ): Promise<ProfitReport> {
    // Fetch sales with items and product costs
    const { data: sales, error } = await supabase
      .from('sales')
      .select(`
        id,
        total,
        timestamp,
        sale_items (
          product_id,
          product_name,
          quantity,
          price,
          subtotal
        )
      `)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)

    if (error) throw error

    // Fetch products for cost data
    const { data: products } = await supabase
      .from('products')
      .select('id, cost, category')

    const productCostMap = new Map(
      (products || []).map(p => [p.id, { cost: Number(p.cost) || 0, category: p.category }])
    )

    let totalRevenue = 0
    let totalCost = 0
    const categoryBreakdown: Record<string, CategoryProfit> = {}
    const productProfitMap: Record<string, ProductProfit> = {}

    for (const sale of sales || []) {
      totalRevenue += Number(sale.total)

      for (const item of sale.sale_items || []) {
        const productInfo = productCostMap.get(item.product_id) || { cost: 0, category: 'unknown' }
        const itemCost = productInfo.cost * item.quantity
        const itemRevenue = Number(item.subtotal)
        totalCost += itemCost

        const category = productInfo.category
        if (!categoryBreakdown[category]) {
          categoryBreakdown[category] = {
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0,
            quantity: 0
          }
        }

        categoryBreakdown[category].revenue += itemRevenue
        categoryBreakdown[category].cost += itemCost
        categoryBreakdown[category].quantity += item.quantity

        // Track per-product profit
        if (!productProfitMap[item.product_id]) {
          productProfitMap[item.product_id] = {
            product_id: item.product_id,
            product_name: item.product_name,
            category,
            quantity_sold: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0
          }
        }
        productProfitMap[item.product_id].quantity_sold += item.quantity
        productProfitMap[item.product_id].revenue += itemRevenue
        productProfitMap[item.product_id].cost += itemCost
      }
    }

    // Calculate profits and margins
    const totalProfit = totalRevenue - totalCost
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    for (const category in categoryBreakdown) {
      const data = categoryBreakdown[category]
      data.profit = data.revenue - data.cost
      data.margin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0
    }

    // Calculate product profits and sort by profit
    const topProfitableProducts = Object.values(productProfitMap)
      .map(p => ({
        ...p,
        profit: p.revenue - p.cost,
        margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10)

    return {
      period: { start: startDate, end: endDate },
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      categoryBreakdown,
      transactionCount: sales?.length || 0,
      topProfitableProducts
    }
  }

  /**
   * Generate sales report with filters
   * Validates: Requirements 14.6, 14.7
   */
  static async generateSalesReport(filters: SaleFilters): Promise<SalesReport> {
    let query = supabase
      .from('sales')
      .select(`
        id,
        total,
        payment,
        change,
        discount_amount,
        payment_method,
        customer_id,
        user_id,
        timestamp,
        sale_items (
          product_name,
          quantity,
          price,
          subtotal
        ),
        customers (name),
        users (name)
      `)
      .order('timestamp', { ascending: false })

    if (filters.startDate) {
      query = query.gte('timestamp', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('timestamp', filters.endDate)
    }
    if (filters.customerId) {
      query = query.eq('customer_id', filters.customerId)
    }
    if (filters.userId) {
      query = query.eq('user_id', filters.userId)
    }
    if (filters.paymentMethod) {
      query = query.eq('payment_method', filters.paymentMethod)
    }

    const { data: sales, error } = await query

    if (error) throw error

    const salesWithDetails: SaleWithDetails[] = (sales || []).map(sale => ({
      id: sale.id,
      total: Number(sale.total),
      payment: Number(sale.payment),
      change: Number(sale.change),
      discount_amount: Number(sale.discount_amount) || 0,
      payment_method: sale.payment_method || 'cash',
      customer_name: (sale.customers as any)?.name,
      user_name: (sale.users as any)?.name,
      timestamp: sale.timestamp,
      items: sale.sale_items || []
    }))

    // Calculate summary
    const totalSales = salesWithDetails.reduce((sum, s) => sum + s.total, 0)
    const totalDiscount = salesWithDetails.reduce((sum, s) => sum + s.discount_amount, 0)
    
    // Payment method breakdown
    const paymentMethodBreakdown: Record<string, { count: number; total: number }> = {}
    for (const sale of salesWithDetails) {
      const method = sale.payment_method
      if (!paymentMethodBreakdown[method]) {
        paymentMethodBreakdown[method] = { count: 0, total: 0 }
      }
      paymentMethodBreakdown[method].count += 1
      paymentMethodBreakdown[method].total += sale.total
    }

    return {
      sales: salesWithDetails,
      summary: {
        totalSales,
        totalDiscount,
        transactionCount: salesWithDetails.length,
        averageTransaction: salesWithDetails.length > 0 ? totalSales / salesWithDetails.length : 0,
        paymentMethodBreakdown
      }
    }
  }

  /**
   * Get top selling products
   * Validates: Requirements 14.2
   */
  static async getTopSellingProducts(
    limit: number = 10,
    startDate?: string,
    endDate?: string
  ): Promise<TopProduct[]> {
    let query = supabase
      .from('sale_items')
      .select(`
        product_id,
        product_name,
        quantity,
        subtotal,
        sales!inner (timestamp)
      `)

    if (startDate) {
      query = query.gte('sales.timestamp', startDate)
    }
    if (endDate) {
      query = query.lte('sales.timestamp', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    // Fetch product details
    const { data: products } = await supabase
      .from('products')
      .select('id, category, unit')

    const productInfoMap = new Map(
      (products || []).map(p => [p.id, { category: p.category, unit: p.unit }])
    )

    // Aggregate by product
    const productMap = new Map<string, TopProduct>()

    for (const item of data || []) {
      if (!productMap.has(item.product_id)) {
        const info = productInfoMap.get(item.product_id) || { category: 'unknown', unit: '' }
        productMap.set(item.product_id, {
          product_id: item.product_id,
          product_name: item.product_name,
          category: info.category,
          unit: info.unit,
          total_quantity: 0,
          total_revenue: 0
        })
      }

      const product = productMap.get(item.product_id)!
      product.total_quantity += item.quantity
      product.total_revenue += Number(item.subtotal)
    }

    // Sort by revenue and return top N
    return Array.from(productMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, limit)
  }

  /**
   * Get sales trend for last N days
   * Validates: Requirements 14.3
   */
  static async getSalesTrend(days: number = 7): Promise<DailySales[]> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const { data: sales, error } = await supabase
      .from('sales')
      .select(`
        total,
        timestamp,
        sale_items (
          product_id,
          quantity,
          subtotal
        )
      `)
      .gte('timestamp', startDate.toISOString())

    if (error) throw error

    // Fetch products for cost
    const { data: products } = await supabase
      .from('products')
      .select('id, cost')

    const productCostMap = new Map(
      (products || []).map(p => [p.id, Number(p.cost) || 0])
    )

    // Group by date
    const dailyMap = new Map<string, DailySales>()

    for (const sale of sales || []) {
      const date = new Date(sale.timestamp).toISOString().split('T')[0]

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          total: 0,
          count: 0,
          profit: 0
        })
      }

      const daily = dailyMap.get(date)!
      daily.total += Number(sale.total)
      daily.count += 1

      // Calculate profit for this sale
      let saleCost = 0
      for (const item of sale.sale_items || []) {
        const cost = productCostMap.get(item.product_id) || 0
        saleCost += cost * item.quantity
      }
      daily.profit += Number(sale.total) - saleCost
    }

    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Get today's summary with profit
   * Validates: Requirements 14.1
   */
  static async getTodaySummary(): Promise<{
    revenue: number
    cost: number
    profit: number
    transactionCount: number
    profitMargin: number
  }> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const report = await this.generateProfitReport(
      today.toISOString(),
      tomorrow.toISOString()
    )

    return {
      revenue: report.totalRevenue,
      cost: report.totalCost,
      profit: report.totalProfit,
      transactionCount: report.transactionCount,
      profitMargin: report.profitMargin
    }
  }

  /**
   * Export data to CSV format
   * Validates: Requirements 14.7
   */
  static exportToCSV(data: Record<string, any>[], filename: string): void {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => {
          const val = row[h]
          // Escape commas and quotes
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`
          }
          return val ?? ''
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }
}
