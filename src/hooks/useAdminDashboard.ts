import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Product, Customer, Sale } from '../types'

export interface DateRange {
  start: Date
  end: Date
  label: 'today' | 'week' | 'month' | 'year' | 'custom'
}

export interface SalesSummary {
  totalRevenue: number
  totalCost: number
  totalProfit: number
  profitMargin: number
  totalOrders: number
  averageOrderValue: number
}

export interface SalesTrendItem {
  date: string
  revenue: number
  orders: number
}

export interface TopProduct {
  product: Product
  quantity: number
  revenue: number
  profit: number
}

export interface CategoryRevenue {
  category: string
  categoryName: string
  revenue: number
  profit: number
  percentage: number
}

export interface PaymentBreakdown {
  method: string
  amount: number
  count: number
  percentage: number
}

export interface StaffPerformance {
  userId: string
  userName: string
  revenue: number
  orders: number
}

export interface TopCustomer {
  customer: Customer
  totalSpent: number
  orders: number
}

export interface MeltLossSummary {
  totalLoss: number
  totalValue: number
  avgPercent: number
  recordCount: number
}

export interface AdminDashboardData {
  summary: SalesSummary
  salesTrend: SalesTrendItem[]
  topProducts: TopProduct[]
  lowStockProducts: Product[]
  revenueByCategory: CategoryRevenue[]
  paymentBreakdown: PaymentBreakdown[]
  staffPerformance: StaffPerformance[]
  topCustomers: TopCustomer[]
  meltLossSummary: MeltLossSummary
}

export function getDateRange(label: DateRange['label']): DateRange {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (label) {
    case 'today':
      return { start: today, end: now, label }
    case 'week': {
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return { start: weekAgo, end: now, label }
    }
    case 'month': {
      const monthAgo = new Date(today)
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      return { start: monthAgo, end: now, label }
    }
    case 'year': {
      const yearAgo = new Date(today)
      yearAgo.setFullYear(yearAgo.getFullYear() - 1)
      return { start: yearAgo, end: now, label }
    }
    default:
      return { start: today, end: now, label: 'today' }
  }
}

export function useAdminDashboard(dateRange: DateRange) {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const startISO = dateRange.start.toISOString()
      const endISO = dateRange.end.toISOString()

      // Fetch sales with items
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            product_id,
            quantity,
            price,
            cost,
            subtotal
          )
        `)
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: false })

      if (salesError) throw salesError

      // Fetch products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')

      if (productsError) throw productsError

      // Fetch customers
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*')

      if (customersError) throw customersError

      // Fetch users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, role')

      if (usersError) throw usersError

      // Fetch categories
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')

      if (categoriesError) throw categoriesError

      // Fetch melt loss data
      const { data: meltLossData, error: meltLossError } = await supabase
        .from('daily_stock_counts')
        .select('*')
        .gte('count_date', startISO.split('T')[0])
        .lte('count_date', endISO.split('T')[0])

      if (meltLossError) throw meltLossError

      // Calculate summary
      const totalRevenue = sales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0
      const totalCost = sales?.reduce((sum, s) => {
        const itemsCost = s.sale_items?.reduce((ic: number, item: any) => 
          ic + ((item.cost || 0) * (item.quantity || 0)), 0) || 0
        return sum + itemsCost
      }, 0) || 0
      const totalProfit = totalRevenue - totalCost
      const totalOrders = sales?.length || 0
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

      const summary: SalesSummary = {
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin,
        totalOrders,
        averageOrderValue
      }

      // Calculate sales trend (group by date)
      const trendMap = new Map<string, { revenue: number; orders: number }>()
      sales?.forEach(sale => {
        const date = new Date(sale.created_at).toISOString().split('T')[0]
        const existing = trendMap.get(date) || { revenue: 0, orders: 0 }
        trendMap.set(date, {
          revenue: existing.revenue + (sale.total || 0),
          orders: existing.orders + 1
        })
      })
      const salesTrend: SalesTrendItem[] = Array.from(trendMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // Calculate top products
      const productSales = new Map<string, { quantity: number; revenue: number; cost: number }>()
      sales?.forEach(sale => {
        sale.sale_items?.forEach((item: any) => {
          const existing = productSales.get(item.product_id) || { quantity: 0, revenue: 0, cost: 0 }
          productSales.set(item.product_id, {
            quantity: existing.quantity + (item.quantity || 0),
            revenue: existing.revenue + (item.subtotal || 0),
            cost: existing.cost + ((item.cost || 0) * (item.quantity || 0))
          })
        })
      })
      const topProducts: TopProduct[] = Array.from(productSales.entries())
        .map(([productId, data]) => {
          const product = products?.find(p => p.id === productId)
          return {
            product: product as Product,
            quantity: data.quantity,
            revenue: data.revenue,
            profit: data.revenue - data.cost
          }
        })
        .filter(p => p.product)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)

      // Low stock products
      const lowStockProducts = products?.filter(p => p.stock <= (p.low_stock_threshold || 5)) || []

      // Revenue by category
      const categoryMap = new Map<string, { revenue: number; cost: number }>()
      sales?.forEach(sale => {
        sale.sale_items?.forEach((item: any) => {
          const product = products?.find(p => p.id === item.product_id)
          if (product) {
            const existing = categoryMap.get(product.category) || { revenue: 0, cost: 0 }
            categoryMap.set(product.category, {
              revenue: existing.revenue + (item.subtotal || 0),
              cost: existing.cost + ((item.cost || 0) * (item.quantity || 0))
            })
          }
        })
      })
      const revenueByCategory: CategoryRevenue[] = Array.from(categoryMap.entries())
        .map(([categoryId, data]) => {
          const category = categories?.find(c => c.id === categoryId)
          return {
            category: categoryId,
            categoryName: category?.name || categoryId,
            revenue: data.revenue,
            profit: data.revenue - data.cost,
            percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
          }
        })
        .sort((a, b) => b.revenue - a.revenue)

      // Payment breakdown
      const paymentMap = new Map<string, { amount: number; count: number }>()
      sales?.forEach(sale => {
        const method = sale.payment_method || 'cash'
        const existing = paymentMap.get(method) || { amount: 0, count: 0 }
        paymentMap.set(method, {
          amount: existing.amount + (sale.total || 0),
          count: existing.count + 1
        })
      })
      const paymentBreakdown: PaymentBreakdown[] = Array.from(paymentMap.entries())
        .map(([method, data]) => ({
          method,
          amount: data.amount,
          count: data.count,
          percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)

      // Staff performance
      const staffMap = new Map<string, { revenue: number; orders: number }>()
      sales?.forEach(sale => {
        const userId = sale.user_id || 'unknown'
        const existing = staffMap.get(userId) || { revenue: 0, orders: 0 }
        staffMap.set(userId, {
          revenue: existing.revenue + (sale.total || 0),
          orders: existing.orders + 1
        })
      })
      const staffPerformance: StaffPerformance[] = Array.from(staffMap.entries())
        .map(([userId, data]) => {
          const user = users?.find(u => u.id === userId)
          return {
            userId,
            userName: user?.name || 'ไม่ระบุ',
            revenue: data.revenue,
            orders: data.orders
          }
        })
        .sort((a, b) => b.revenue - a.revenue)

      // Top customers
      const customerMap = new Map<string, { totalSpent: number; orders: number }>()
      sales?.forEach(sale => {
        if (sale.customer_id) {
          const existing = customerMap.get(sale.customer_id) || { totalSpent: 0, orders: 0 }
          customerMap.set(sale.customer_id, {
            totalSpent: existing.totalSpent + (sale.total || 0),
            orders: existing.orders + 1
          })
        }
      })
      const topCustomers: TopCustomer[] = Array.from(customerMap.entries())
        .map(([customerId, data]) => {
          const customer = customers?.find(c => c.id === customerId)
          return {
            customer: customer as Customer,
            totalSpent: data.totalSpent,
            orders: data.orders
          }
        })
        .filter(c => c.customer)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10)

      // Melt loss summary
      const meltLossSummary: MeltLossSummary = {
        totalLoss: meltLossData?.reduce((sum, m) => sum + (m.melt_loss || 0), 0) || 0,
        totalValue: meltLossData?.reduce((sum, m) => sum + (m.melt_loss_value || 0), 0) || 0,
        avgPercent: meltLossData?.length 
          ? meltLossData.reduce((sum, m) => sum + (m.melt_percent || 0), 0) / meltLossData.length 
          : 0,
        recordCount: meltLossData?.length || 0
      }

      setData({
        summary,
        salesTrend,
        topProducts,
        lowStockProducts,
        revenueByCategory,
        paymentBreakdown,
        staffPerformance,
        topCustomers,
        meltLossSummary
      })
    } catch (err) {
      console.error('Error fetching admin dashboard:', err)
      setError('ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}
