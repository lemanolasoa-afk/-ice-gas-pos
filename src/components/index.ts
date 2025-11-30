/**
 * Components Index - Barrel Exports
 * จัดหมวดหมู่ components ให้ import ง่ายขึ้น
 * 
 * Usage: import { ProductCard, CartItem, Header } from '@/components'
 */

// ===== Common UI Components =====
// UI พื้นฐานที่ใช้ทั่วทั้งแอป
export { Badge } from './Badge'
export { ConfirmDialog } from './ConfirmDialog'
export { EmptyState } from './EmptyState'
export { ErrorMessage } from './ErrorMessage'
export { LoadingSpinner } from './LoadingSpinner'
export { Skeleton } from './Skeleton'
export { SuccessModal } from './SuccessModal'
export { Toast } from './Toast'
export { SearchableSelect } from './SearchableSelect'

// ===== Layout Components =====
// โครงสร้างหน้าจอ
export { Header } from './Header'
export { BottomNav } from './BottomNav'

// ===== POS & Sales Components =====
// เกี่ยวกับการขาย ตะกร้า ชำระเงิน
export { CartItem } from './CartItem'
export { PaymentModal } from './PaymentModal'
export { ReceiptModal } from './ReceiptModal'

// ===== Product Components =====
// จัดการสินค้า
export { ProductCard } from './ProductCard'
export { ProductForm } from './ProductForm'
export { ProductList } from './ProductList'
export { CategoryTabs } from './CategoryTabs'
export { CategoryManager } from './CategoryManager'

// ===== Stock Components =====
// จัดการสต็อก
export { MeltLossChart } from './stock/MeltLossChart'
export { StockCountCard } from './stock/StockCountCard'

// ===== Charts & Reports =====
// กราฟและรายงาน
export { SalesTrendChart } from './SalesTrendChart'
export { StatCard } from './StatCard'

// ===== Auth Components =====
// เข้าสู่ระบบ
export { LoginModal } from './LoginModal'
export { ProtectedRoute } from './ProtectedRoute'

// ===== Settings Components =====
// ตั้งค่า
export { NotificationSettings } from './NotificationSettings'
export { PrinterSettings } from './PrinterSettings'

// ===== PWA Components =====
// Progressive Web App
export { InstallPrompt } from './InstallPrompt'
export { UpdatePrompt } from './UpdatePrompt'

// ===== Scanner =====
// สแกนบาร์โค้ด
export { BarcodeScanner } from './BarcodeScanner'
