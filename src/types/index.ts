// Product Interface - matches Supabase products table
export interface Product {
  id: string
  name: string
  price: number
  category: 'ice' | 'gas' | 'water'
  unit: string
  stock: number
  barcode?: string | null
  low_stock_threshold: number
  image?: string | null
  created_at?: string
  updated_at?: string
  // Gas cylinder specific fields
  empty_stock?: number       // จำนวนถังเปล่า
  deposit_amount?: number    // ค่ามัดจำถัง
}

// Gas sale type - for gas cylinder transactions
export type GasSaleType = 'exchange' | 'deposit'  // แลกถัง หรือ ซื้อพร้อมมัดจำ

// Cart Item Interface - for shopping cart
export interface CartItem {
  product: Product
  quantity: number
  gasSaleType?: GasSaleType  // สำหรับสินค้าประเภทแก๊ส
}

// Sale Item Interface - matches Supabase sale_items table
export interface SaleItem {
  id?: string
  sale_id?: string
  product_id: string
  product_name: string
  price: number
  quantity: number
  subtotal: number
  gas_sale_type?: GasSaleType  // สำหรับสินค้าประเภทแก๊ส
  deposit_amount?: number       // ค่ามัดจำ (ถ้ามี)
}

// Payment method type
export type PaymentMethod = 'cash' | 'transfer' | 'credit'

// Sale Interface - matches Supabase sales table with items
export interface Sale {
  id: string
  items: SaleItem[]
  total: number
  payment: number
  change: number
  discount_amount?: number
  customer_id?: string | null
  points_earned?: number
  points_used?: number
  payment_method?: PaymentMethod
  note?: string | null
  created_at: string
}

// Customer Interface - for loyalty program
export interface Customer {
  id: string
  name: string
  phone?: string | null
  points: number
  total_spent: number
  visit_count: number
  created_at?: string
  updated_at?: string
}

// Discount Interface - for promotions
export interface Discount {
  id: string
  name: string
  type: 'percent' | 'fixed' | 'buy_x_get_y'
  value: number
  min_purchase: number
  buy_quantity?: number | null
  get_quantity?: number | null
  product_id?: string | null
  is_active: boolean
  start_date?: string | null
  end_date?: string | null
  created_at?: string
}

// Stock Receipt Interface - for inventory management
export interface StockReceipt {
  id: string
  product_id: string
  product_name?: string
  quantity: number
  cost_per_unit?: number | null
  total_cost?: number | null
  note?: string | null
  received_at: string
}

// Queued Operation Interface - for offline support
export interface QueuedOperation {
  id: string
  type: 'sale' | 'product_create' | 'product_update' | 'product_delete' | 'customer_create' | 'stock_receipt'
  payload: unknown
  timestamp: string
  retries: number
}

// Category type for filtering
export type Category = 'all' | 'ice' | 'gas' | 'water'

// Report types
export interface DailySales {
  date: string
  total: number
  count: number
}

export interface TopProduct {
  product_id: string
  product_name: string
  quantity: number
  revenue: number
}
