import { supabase } from './supabase'

// Types for backup/export
export interface BackupData {
  version: string
  exportDate: string
  exportedBy?: string
  data: {
    products?: ProductExport[]
    sales?: SaleExport[]
    customers?: CustomerExport[]
    stockLogs?: StockLogExport[]
    stockReceipts?: StockReceiptExport[]
    discounts?: DiscountExport[]
  }
  summary: {
    productsCount: number
    salesCount: number
    customersCount: number
    totalRevenue: number
    dateRange?: { start: string; end: string }
  }
}

export interface ProductExport {
  id: string
  name: string
  price: number
  cost: number
  category: string
  unit: string
  stock: number
  barcode?: string
  low_stock_threshold: number
  empty_stock?: number
  deposit_amount?: number
  created_at?: string
  updated_at?: string
}

export interface SaleExport {
  id: string
  total: number
  payment: number
  change: number
  discount_amount?: number
  payment_method?: string
  customer_name?: string
  user_name?: string
  timestamp: string
  items: SaleItemExport[]
}

export interface SaleItemExport {
  product_name: string
  quantity: number
  price: number
  subtotal: number
  gas_sale_type?: string
  deposit_amount?: number
}

export interface CustomerExport {
  id: string
  name: string
  phone?: string
  points: number
  total_spent: number
  visit_count: number
  created_at?: string
}

export interface StockLogExport {
  id: string
  product_name?: string
  change_amount: number
  reason?: string
  note?: string
  user_name?: string
  created_at?: string
}

export interface StockReceiptExport {
  id: string
  product_name?: string
  quantity: number
  cost_per_unit?: number
  total_cost?: number
  note?: string
  received_at?: string
}

export interface DiscountExport {
  id: string
  name: string
  type: string
  value: number
  min_purchase: number
  is_active: boolean
  start_date?: string
  end_date?: string
}

export interface ExportOptions {
  includeProducts?: boolean
  includeSales?: boolean
  includeCustomers?: boolean
  includeStockLogs?: boolean
  includeStockReceipts?: boolean
  includeDiscounts?: boolean
  startDate?: string
  endDate?: string
  format?: 'json' | 'csv'
}

export interface ImportResult {
  success: boolean
  imported: {
    products: number
    customers: number
    discounts: number
  }
  errors: string[]
}

/**
 * BackupManager - Utility class for data backup and export
 * Implements Requirements 16.1-16.7
 */
export class BackupManager {
  private static readonly BACKUP_VERSION = '2.0'
  private static readonly BACKUP_REMINDER_KEY = 'ice-gas-pos-last-backup'

  /**
   * Export products data
   */
  static async exportProducts(): Promise<ProductExport[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('category')

    if (error) throw error

    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      cost: Number(p.cost) || 0,
      category: p.category,
      unit: p.unit,
      stock: p.stock || 0,
      barcode: p.barcode,
      low_stock_threshold: p.low_stock_threshold || 5,
      empty_stock: p.empty_stock || 0,
      deposit_amount: Number(p.deposit_amount) || 0,
      created_at: p.created_at,
      updated_at: p.updated_at
    }))
  }

  /**
   * Export sales data with items
   */
  static async exportSales(startDate?: string, endDate?: string): Promise<SaleExport[]> {
    let query = supabase
      .from('sales')
      .select(`
        *,
        sale_items (*),
        customers (name),
        users (name)
      `)
      .order('timestamp', { ascending: false })

    if (startDate) {
      query = query.gte('timestamp', startDate)
    }
    if (endDate) {
      query = query.lte('timestamp', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map(sale => ({
      id: sale.id,
      total: Number(sale.total),
      payment: Number(sale.payment),
      change: Number(sale.change),
      discount_amount: Number(sale.discount_amount) || 0,
      payment_method: sale.payment_method || 'cash',
      customer_name: (sale.customers as any)?.name,
      user_name: (sale.users as any)?.name,
      timestamp: sale.timestamp,
      items: (sale.sale_items || []).map((item: any) => ({
        product_name: item.product_name,
        quantity: item.quantity,
        price: Number(item.price),
        subtotal: Number(item.subtotal),
        gas_sale_type: item.gas_sale_type,
        deposit_amount: Number(item.deposit_amount) || 0
      }))
    }))
  }

  /**
   * Export customers data
   */
  static async exportCustomers(): Promise<CustomerExport[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name')

    if (error) throw error

    return (data || []).map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      points: c.points || 0,
      total_spent: Number(c.total_spent) || 0,
      visit_count: c.visit_count || 0,
      created_at: c.created_at
    }))
  }

  /**
   * Export stock logs
   */
  static async exportStockLogs(startDate?: string, endDate?: string): Promise<StockLogExport[]> {
    let query = supabase
      .from('stock_logs')
      .select(`
        *,
        products (name),
        users (name)
      `)
      .order('created_at', { ascending: false })

    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map(log => ({
      id: log.id,
      product_name: (log.products as any)?.name,
      change_amount: log.change_amount,
      reason: log.reason,
      note: log.note,
      user_name: (log.users as any)?.name,
      created_at: log.created_at
    }))
  }

  /**
   * Export stock receipts
   */
  static async exportStockReceipts(startDate?: string, endDate?: string): Promise<StockReceiptExport[]> {
    let query = supabase
      .from('stock_receipts')
      .select(`
        *,
        products (name)
      `)
      .order('received_at', { ascending: false })

    if (startDate) {
      query = query.gte('received_at', startDate)
    }
    if (endDate) {
      query = query.lte('received_at', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map(receipt => ({
      id: receipt.id,
      product_name: (receipt.products as any)?.name,
      quantity: receipt.quantity,
      cost_per_unit: Number(receipt.cost_per_unit) || 0,
      total_cost: Number(receipt.total_cost) || 0,
      note: receipt.note,
      received_at: receipt.received_at
    }))
  }

  /**
   * Export discounts
   */
  static async exportDiscounts(): Promise<DiscountExport[]> {
    const { data, error } = await supabase
      .from('discounts')
      .select('*')
      .order('name')

    if (error) throw error

    return (data || []).map(d => ({
      id: d.id,
      name: d.name,
      type: d.type,
      value: Number(d.value),
      min_purchase: Number(d.min_purchase) || 0,
      is_active: d.is_active,
      start_date: d.start_date,
      end_date: d.end_date
    }))
  }

  /**
   * Create full backup with all data
   */
  static async createFullBackup(options: ExportOptions = {}): Promise<BackupData> {
    const {
      includeProducts = true,
      includeSales = true,
      includeCustomers = true,
      includeStockLogs = true,
      includeStockReceipts = true,
      includeDiscounts = true,
      startDate,
      endDate
    } = options

    const backup: BackupData = {
      version: this.BACKUP_VERSION,
      exportDate: new Date().toISOString(),
      data: {},
      summary: {
        productsCount: 0,
        salesCount: 0,
        customersCount: 0,
        totalRevenue: 0
      }
    }

    // Get current user
    try {
      const authState = JSON.parse(localStorage.getItem('ice-gas-pos-auth') || '{}')
      backup.exportedBy = authState?.state?.user?.name
    } catch {
      // Ignore
    }

    // Export each data type
    if (includeProducts) {
      backup.data.products = await this.exportProducts()
      backup.summary.productsCount = backup.data.products.length
    }

    if (includeSales) {
      backup.data.sales = await this.exportSales(startDate, endDate)
      backup.summary.salesCount = backup.data.sales.length
      backup.summary.totalRevenue = backup.data.sales.reduce((sum, s) => sum + s.total, 0)
    }

    if (includeCustomers) {
      backup.data.customers = await this.exportCustomers()
      backup.summary.customersCount = backup.data.customers.length
    }

    if (includeStockLogs) {
      backup.data.stockLogs = await this.exportStockLogs(startDate, endDate)
    }

    if (includeStockReceipts) {
      backup.data.stockReceipts = await this.exportStockReceipts(startDate, endDate)
    }

    if (includeDiscounts) {
      backup.data.discounts = await this.exportDiscounts()
    }

    if (startDate || endDate) {
      backup.summary.dateRange = {
        start: startDate || 'beginning',
        end: endDate || 'now'
      }
    }

    // Update last backup date
    this.setLastBackupDate()

    return backup
  }

  /**
   * Download backup as JSON file
   */
  static downloadAsJSON(data: BackupData, filename?: string): void {
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Download data as CSV file
   */
  static downloadAsCSV(data: Record<string, any>[], filename: string): void {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => {
          const val = row[h]
          if (val === null || val === undefined) return ''
          if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
          if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
            return `"${val.replace(/"/g, '""')}"`
          }
          return val
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Export sales to CSV
   */
  static async exportSalesToCSV(startDate?: string, endDate?: string): Promise<void> {
    const sales = await this.exportSales(startDate, endDate)
    
    // Flatten sales data for CSV
    const flatData = sales.map(s => ({
      id: s.id,
      timestamp: s.timestamp,
      total: s.total,
      payment: s.payment,
      change: s.change,
      discount_amount: s.discount_amount || 0,
      payment_method: s.payment_method,
      customer_name: s.customer_name || '',
      user_name: s.user_name || '',
      items_count: s.items.length,
      items_detail: s.items.map(i => `${i.product_name}x${i.quantity}`).join('; ')
    }))

    this.downloadAsCSV(flatData, 'sales')
  }

  /**
   * Export products to CSV
   */
  static async exportProductsToCSV(): Promise<void> {
    const products = await this.exportProducts()
    this.downloadAsCSV(products, 'products')
  }

  /**
   * Export customers to CSV
   */
  static async exportCustomersToCSV(): Promise<void> {
    const customers = await this.exportCustomers()
    this.downloadAsCSV(customers, 'customers')
  }

  /**
   * Import data from backup file
   */
  static async importFromBackup(backupData: BackupData): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: {
        products: 0,
        customers: 0,
        discounts: 0
      },
      errors: []
    }

    try {
      // Validate backup version
      if (!backupData.version) {
        result.errors.push('Invalid backup file: missing version')
        return result
      }

      // Import products (upsert)
      if (backupData.data.products && backupData.data.products.length > 0) {
        for (const product of backupData.data.products) {
          try {
            const { error } = await supabase
              .from('products')
              .upsert({
                id: product.id,
                name: product.name,
                price: product.price,
                cost: product.cost,
                category: product.category,
                unit: product.unit,
                stock: product.stock,
                barcode: product.barcode,
                low_stock_threshold: product.low_stock_threshold,
                empty_stock: product.empty_stock,
                deposit_amount: product.deposit_amount,
                updated_at: new Date().toISOString()
              }, { onConflict: 'id' })

            if (error) {
              result.errors.push(`Product ${product.name}: ${error.message}`)
            } else {
              result.imported.products++
            }
          } catch (err) {
            result.errors.push(`Product ${product.name}: ${(err as Error).message}`)
          }
        }
      }

      // Import customers (upsert)
      if (backupData.data.customers && backupData.data.customers.length > 0) {
        for (const customer of backupData.data.customers) {
          try {
            const { error } = await supabase
              .from('customers')
              .upsert({
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                points: customer.points,
                total_spent: customer.total_spent,
                visit_count: customer.visit_count,
                updated_at: new Date().toISOString()
              }, { onConflict: 'id' })

            if (error) {
              result.errors.push(`Customer ${customer.name}: ${error.message}`)
            } else {
              result.imported.customers++
            }
          } catch (err) {
            result.errors.push(`Customer ${customer.name}: ${(err as Error).message}`)
          }
        }
      }

      // Import discounts (upsert)
      if (backupData.data.discounts && backupData.data.discounts.length > 0) {
        for (const discount of backupData.data.discounts) {
          try {
            const { error } = await supabase
              .from('discounts')
              .upsert({
                id: discount.id,
                name: discount.name,
                type: discount.type,
                value: discount.value,
                min_purchase: discount.min_purchase,
                is_active: discount.is_active,
                start_date: discount.start_date,
                end_date: discount.end_date
              }, { onConflict: 'id' })

            if (error) {
              result.errors.push(`Discount ${discount.name}: ${error.message}`)
            } else {
              result.imported.discounts++
            }
          } catch (err) {
            result.errors.push(`Discount ${discount.name}: ${(err as Error).message}`)
          }
        }
      }

      result.success = result.errors.length === 0 || 
        (result.imported.products > 0 || result.imported.customers > 0 || result.imported.discounts > 0)

    } catch (err) {
      result.errors.push(`Import failed: ${(err as Error).message}`)
    }

    return result
  }

  /**
   * Get last backup date
   */
  static getLastBackupDate(): Date | null {
    const stored = localStorage.getItem(this.BACKUP_REMINDER_KEY)
    return stored ? new Date(stored) : null
  }

  /**
   * Set last backup date
   */
  static setLastBackupDate(): void {
    localStorage.setItem(this.BACKUP_REMINDER_KEY, new Date().toISOString())
  }

  /**
   * Check if backup reminder should be shown (weekly)
   */
  static shouldShowBackupReminder(): boolean {
    const lastBackup = this.getLastBackupDate()
    if (!lastBackup) return true

    const daysSinceBackup = Math.floor(
      (Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysSinceBackup >= 7
  }

  /**
   * Dismiss backup reminder for now
   */
  static dismissBackupReminder(): void {
    // Set to 3 days ago so it will remind again in 4 days
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    localStorage.setItem(this.BACKUP_REMINDER_KEY, threeDaysAgo.toISOString())
  }
}
