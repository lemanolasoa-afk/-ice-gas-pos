// Product Interface - matches Supabase products table
export interface Product {
  id: string
  name: string
  price: number
  category: string  // Dynamic category from categories table
  unit: string
  stock: number
  barcode?: string | null
  low_stock_threshold: number
  image?: string | null
  is_active?: boolean        // Soft delete flag
  created_at?: string
  updated_at?: string
  // Gas cylinder specific fields
  empty_stock?: number       // จำนวนถังเปล่า
  deposit_amount?: number    // ค่ามัดจำถัง
  outright_price?: number    // ราคาซื้อขาด (ซื้อถังไปเลย ไม่ต้องคืน)
  cost?: number              // ต้นทุน
  // Ice melt loss tracking
  melt_rate_percent?: number // อัตราการละลายโดยประมาณ (%/วัน)
}

// Category Interface - matches Supabase categories table
export interface Category {
  id: string
  name: string
  icon: string
  color: string
  light_color: string
  text_color: string
  sort_order: number
  is_active: boolean
  has_deposit: boolean  // หมวดหมู่ที่มีระบบมัดจำ (เช่น แก๊ส)
  created_at?: string
}

// Gas sale type - for gas cylinder transactions
export type GasSaleType = 'exchange' | 'deposit' | 'outright'  // แลกถัง, ซื้อพร้อมมัดจำ, หรือซื้อขาด

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
  discount_id?: string | null
  discount_name?: string | null  // For display in receipt
  customer_id?: string | null
  customer_name?: string | null  // For display in receipt
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

// Category type for filtering (legacy support + dynamic)
export type CategoryFilter = 'all' | string

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


// ===== Melt Loss Tracking Types =====

// Daily Stock Count - บันทึกการปิดยอดสต๊อกประจำวัน
export interface DailyStockCount {
  id: string
  product_id: string
  count_date: string          // YYYY-MM-DD
  system_stock: number        // สต๊อกในระบบก่อนปิดยอด
  actual_stock: number        // สต๊อกจริงที่นับได้
  melt_loss: number           // จำนวนที่ละลาย
  melt_loss_value: number     // มูลค่าที่สูญเสีย
  melt_percent: number        // % การละลายจริง
  expected_melt_percent: number // % ที่คาดการณ์
  is_abnormal: boolean        // ละลายผิดปกติหรือไม่
  user_id?: string
  note?: string
  created_at?: string
  // Joined fields
  product_name?: string
  product_cost?: number
}

// Stock Count Input - สำหรับกรอกข้อมูลปิดยอด
export interface StockCountInput {
  product_id: string
  product_name: string
  system_stock: number        // สต๊อกในระบบ
  sold_today: number          // ขายวันนี้
  expected_stock: number      // คงเหลือควร (system - sold)
  actual_stock: number        // สต๊อกจริง (user input)
  melt_loss: number           // ละลาย (expected - actual)
  melt_percent: number        // % ละลาย
  expected_melt_percent: number
  is_abnormal: boolean
  cost: number
}

// Melt Loss Report Summary
export interface MeltLossReportSummary {
  total_melt_loss: number     // รวมจำนวนที่ละลาย
  total_melt_value: number    // รวมมูลค่าที่สูญเสีย
  average_melt_percent: number // % เฉลี่ย
  abnormal_count: number      // จำนวนครั้งที่ผิดปกติ
}

// Melt Loss by Product
export interface MeltLossByProduct {
  product_id: string
  product_name: string
  total_melt_loss: number
  total_melt_value: number
  average_melt_percent: number
  expected_melt_percent: number
  count_days: number
}

// Stock Log Reason - เพิ่ม melt_loss
export type StockLogReason = 
  | 'sale' 
  | 'receipt' 
  | 'adjustment' 
  | 'return' 
  | 'exchange' 
  | 'deposit_sale' 
  | 'deposit_return' 
  | 'refill' 
  | 'outright_sale' 
  | 'melt_loss'
