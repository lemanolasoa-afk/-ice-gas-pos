import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  Barcode,
  Search,
  X,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Banknote,
  Check,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Header } from '../components/Header'
import { ProductCard } from '../components/ProductCard'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { useToast } from '../components/Toast'
import { useCategories } from '../hooks/useCategories'
import { Product, GasSaleType, Category } from '../types'
type ViewMode = 'grid' | 'list'

// Product List Item - Clean & Clear
function ProductListItem({ product, categoryConfig }: { product: Product; categoryConfig: Category }) {
  const addToCart = useStore((s) => s.addToCart)
  const cart = useStore((s) => s.cart)
  const [isAdding, setIsAdding] = useState(false)
  const [showGasModal, setShowGasModal] = useState(false)

  const config = categoryConfig
  const cartItem = cart.find((item) => item.product.id === product.id)
  const quantity = cartItem?.quantity || 0
  const isOutOfStock = product.stock <= 0
  const hasDeposit = config.has_deposit
  const depositAmount = product.deposit_amount || 0

  const handleAdd = () => {
    if (isOutOfStock) return
    if (hasDeposit) {
      setShowGasModal(true)
      return
    }
    setIsAdding(true)
    addToCart(product)
    setTimeout(() => setIsAdding(false), 300)
  }

  const handleGasSaleType = (saleType: GasSaleType) => {
    setShowGasModal(false)
    setIsAdding(true)
    addToCart(product, saleType)
    setTimeout(() => setIsAdding(false), 300)
  }

  return (
    <>
      <div
        className={`flex items-center gap-4 px-4 py-4 border-b border-gray-100 last:border-b-0 ${isOutOfStock ? 'opacity-40' : ''}`}
      >
        <div className={`w-12 h-12 ${config.light_color} rounded-xl flex items-center justify-center`}>
          <span className="text-2xl">{config.icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate text-base">{product.name}</p>
          <p className="text-gray-500 text-sm font-medium">
            ฿{product.price}/{product.unit}
            {isOutOfStock && <span className="text-red-500 ml-2 font-bold">หมด</span>}
          </p>
        </div>

        {quantity > 0 && (
          <span className="w-8 h-8 bg-gray-900 text-white text-sm font-bold rounded-full flex items-center justify-center">
            {quantity}
          </span>
        )}

        <button
          onClick={handleAdd}
          disabled={isOutOfStock}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
            isOutOfStock
              ? 'bg-gray-100 text-gray-300'
              : isAdding
                ? 'bg-green-500 text-white scale-95'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
          }`}
        >
          {isAdding ? <Check size={22} /> : <Plus size={22} />}
        </button>
      </div>

      {showGasModal && (
        <DepositModal
          product={product}
          depositAmount={depositAmount}
          onClose={() => setShowGasModal(false)}
          onSelect={handleGasSaleType}
        />
      )}
    </>
  )
}

// Deposit Sale Type Modal - For categories with deposit system
function DepositModal({
  product,
  depositAmount,
  onClose,
  onSelect,
}: {
  product: Product
  depositAmount: number
  onClose: () => void
  onSelect: (type: GasSaleType) => void
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">{product.name}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">เลือกประเภทการขาย</p>

        <div className="space-y-3">
          <button
            onClick={() => onSelect('exchange')}
            className="w-full p-4 bg-green-50 border border-green-200 rounded-xl hover:border-green-400 transition-colors"
          >
            <div className="flex items-center gap-3">
              <RefreshCw className="text-green-600" size={20} />
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-800">แลกถัง</p>
                <p className="text-xs text-gray-500">มีถังเปล่ามาแลก</p>
              </div>
              <p className="font-semibold text-green-600">฿{product.price}</p>
            </div>
          </button>

          <button
            onClick={() => onSelect('deposit')}
            className="w-full p-4 bg-orange-50 border border-orange-200 rounded-xl hover:border-orange-400 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Banknote className="text-orange-600" size={20} />
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-800">ซื้อใหม่ + มัดจำ</p>
                <p className="text-xs text-gray-500">ไม่มีถังมาแลก</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-orange-600">฿{product.price + depositAmount}</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// Category Section - Clean layout
function CategorySection({
  categoryConfig,
  products,
  viewMode,
}: {
  categoryConfig: Category
  products: Product[]
  viewMode: ViewMode
}) {
  if (products.length === 0) return null

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3 px-1">
        <div className={`w-9 h-9 ${categoryConfig.color} rounded-xl flex items-center justify-center shadow-sm`}>
          <span className="text-white">{categoryConfig.icon}</span>
        </div>
        <span className="font-bold text-gray-800 text-base">{categoryConfig.name}</span>
        <span className="text-sm text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
          {products.length} รายการ
        </span>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} category={categoryConfig.id} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          {products.map((product) => (
            <ProductListItem key={product.id} product={product} categoryConfig={categoryConfig} />
          ))}
        </div>
      )}
    </div>
  )
}

export function POSPage() {
  const navigate = useNavigate()
  const [showScanner, setShowScanner] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('pos-view-mode') as ViewMode) || 'grid'
  })
  const [scannedDepositProduct, setScannedDepositProduct] = useState<Product | null>(null)
  const { showToast } = useToast()
  const { categories, getCategoryConfig } = useCategories()

  // Optimized selectors - only subscribe to what we need
  const cart = useStore((s) => s.cart)
  const products = useStore((s) => s.products)
  const isLoading = useStore((s) => s.isLoading)
  const error = useStore((s) => s.error)
  const fetchProducts = useStore((s) => s.fetchProducts)
  const addToCart = useStore((s) => s.addToCart)
  const clearError = useStore((s) => s.clearError)
  const getTotal = useStore((s) => s.getTotal)
  const getDepositTotal = useStore((s) => s.getDepositTotal)

  // Memoized calculations
  const { grandTotal, itemCount } = useMemo(() => {
    const total = getTotal()
    const depositTotal = getDepositTotal()
    return {
      grandTotal: total + depositTotal,
      itemCount: cart.reduce((sum, item) => sum + item.quantity, 0)
    }
  }, [cart, getTotal, getDepositTotal])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Save view mode preference
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('pos-view-mode', mode)
  }, [])

  // Memoized filtered products grouped by category
  const { productsByCategory, hasResults } = useMemo(() => {
    const q = searchQuery.toLowerCase()
    const filtered = searchQuery
      ? products.filter((p) => p.name.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q))
      : products

    // Group products by category
    const grouped: Record<string, Product[]> = {}
    for (const cat of categories) {
      grouped[cat.id] = filtered.filter((p) => p.category === cat.id)
    }

    return {
      productsByCategory: grouped,
      hasResults: filtered.length > 0
    }
  }, [products, searchQuery, categories])

  const handleBarcodeScanned = (barcode: string) => {
    setShowScanner(false)
    const product = products.find((p) => p.barcode === barcode)
    if (product) {
      // For products with deposit, show the sale type modal
      const catConfig = getCategoryConfig(product.category)
      if (catConfig.has_deposit) {
        setScannedDepositProduct(product)
      } else {
        addToCart(product)
        showToast('success', `เพิ่ม ${product.name}`, 1500)
      }
    } else {
      showToast('error', `ไม่พบสินค้า: ${barcode}`, 2000)
    }
  }

  const handleScannedDepositSaleType = (saleType: GasSaleType) => {
    if (scannedDepositProduct) {
      addToCart(scannedDepositProduct, saleType)
      showToast('success', `เพิ่ม ${scannedDepositProduct.name}`, 1500)
      setScannedDepositProduct(null)
    }
  }

  return (
    <div className="min-h-screen pb-24 bg-gray-50">
      <Header title="ขายสินค้า" icon="🛒" showNotifications />

      <div className="p-4">
        {/* Search & Actions */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาสินค้า..."
              className="w-full pl-12 pr-10 py-3.5 bg-white border border-gray-200 rounded-2xl text-base focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowScanner(true)}
            className="p-3.5 bg-gray-900 text-white rounded-2xl shadow-sm hover:bg-gray-800 transition-colors"
          >
            <Barcode size={22} />
          </button>

          <div className="flex bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => handleViewModeChange('grid')}
              className={`p-2.5 rounded-xl transition-colors ${viewMode === 'grid' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`p-2.5 rounded-xl transition-colors ${viewMode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {error && (
          <ErrorMessage
            message={error}
            variant="banner"
            onRetry={() => {
              clearError()
              fetchProducts()
            }}
            onDismiss={clearError}
          />
        )}

        {isLoading && products.length === 0 ? (
          <LoadingSpinner message="กำลังโหลด..." />
        ) : error && products.length === 0 ? (
          <ErrorMessage
            message={error}
            onRetry={() => {
              clearError()
              fetchProducts()
            }}
          />
        ) : !hasResults ? (
          <div className="text-center py-16 text-gray-400">
            <Search size={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">ไม่พบสินค้า</p>
          </div>
        ) : (
          <>
            {categories.map((cat) => (
              <CategorySection 
                key={cat.id} 
                categoryConfig={cat} 
                products={productsByCategory[cat.id] || []} 
                viewMode={viewMode} 
              />
            ))}
          </>
        )}
      </div>

      {itemCount > 0 && (
        <button
          onClick={() => navigate('/cart')}
          className="fixed bottom-24 right-4 bg-gray-900 text-white px-5 py-4 rounded-2xl shadow-xl flex items-center gap-4 z-20 hover:bg-gray-800 transition-colors"
        >
          <div className="relative">
            <ShoppingCart size={24} />
            <span className="absolute -top-2 -right-2 w-6 h-6 bg-white text-gray-900 text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
              {itemCount}
            </span>
          </div>
          <div className="border-l border-white/20 pl-4">
            <p className="text-xs text-gray-300">ยอดรวม</p>
            <p className="text-lg font-bold">฿{grandTotal.toLocaleString()}</p>
          </div>
        </button>
      )}

      {showScanner && <BarcodeScanner onScan={handleBarcodeScanned} onClose={() => setShowScanner(false)} />}

      {scannedDepositProduct && (
        <DepositModal
          product={scannedDepositProduct}
          depositAmount={scannedDepositProduct.deposit_amount || 0}
          onClose={() => setScannedDepositProduct(null)}
          onSelect={handleScannedDepositSaleType}
        />
      )}
    </div>
  )
}
