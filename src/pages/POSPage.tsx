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
  Package,
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
        className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 ${isOutOfStock ? 'opacity-40' : ''}`}
      >
        <div className={`w-10 h-10 ${config.light_color} rounded-lg flex items-center justify-center`}>
          <Package size={18} className="text-gray-600" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate text-sm">{product.name}</p>
          <p className="text-gray-500 text-xs">
            {product.price.toLocaleString()} บาท/{product.unit}
            {isOutOfStock && <span className="text-red-500 ml-2">สินค้าหมด</span>}
          </p>
        </div>

        {quantity > 0 && (
          <span className="w-6 h-6 bg-gray-900 text-white text-xs font-medium rounded-full flex items-center justify-center">
            {quantity}
          </span>
        )}

        <button
          onClick={handleAdd}
          disabled={isOutOfStock}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            isOutOfStock
              ? 'bg-gray-100 text-gray-300'
              : isAdding
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {isAdding ? <Check size={18} /> : <Plus size={18} />}
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
  const outrightPrice = product.outright_price || (product.price + depositAmount + 500)
  
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 text-lg">{product.name}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">ลูกค้าต้องการแบบไหน?</p>

        <div className="space-y-3">
          {/* แลกถัง */}
          <button
            onClick={() => onSelect('exchange')}
            className="w-full p-4 border-2 border-green-200 bg-green-50 rounded-xl hover:border-green-400 transition-colors touch-feedback"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <RefreshCw className="text-white" size={24} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-gray-900">แลกถัง</p>
                <p className="text-xs text-green-600">🔄 ลูกค้ามีถังเปล่ามาแลก</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600 text-lg">{product.price.toLocaleString()}</p>
                <p className="text-xs text-gray-400">บาท</p>
              </div>
            </div>
          </button>

          {/* ค้างถัง (มัดจำ) */}
          <button
            onClick={() => onSelect('deposit')}
            className="w-full p-4 border-2 border-amber-200 bg-amber-50 rounded-xl hover:border-amber-400 transition-colors touch-feedback"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                <Package className="text-white" size={24} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-gray-900">ค้างถัง</p>
                <p className="text-xs text-amber-600">📦 ยืมถังไป คืนทีหลัง (มัดจำ ฿{depositAmount.toLocaleString()})</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-amber-600 text-lg">{(product.price + depositAmount).toLocaleString()}</p>
                <p className="text-xs text-gray-400">บาท</p>
              </div>
            </div>
          </button>

          {/* ซื้อขาด */}
          <button
            onClick={() => onSelect('outright')}
            className="w-full p-4 border-2 border-purple-200 bg-purple-50 rounded-xl hover:border-purple-400 transition-colors touch-feedback"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <Banknote className="text-white" size={24} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-gray-900">ซื้อขาด</p>
                <p className="text-xs text-purple-600">💰 ซื้อถังไปเลย ไม่ต้องคืน</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-purple-600 text-lg">{outrightPrice.toLocaleString()}</p>
                <p className="text-xs text-gray-400">บาท</p>
              </div>
            </div>
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">กดเลือกประเภทการขาย</p>
      </div>
    </div>
  )
}

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
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-8 h-8 ${categoryConfig.color} rounded-lg flex items-center justify-center`}>
          <Package size={14} className="text-white" />
        </div>
        <span className="font-medium text-gray-800 text-sm">{categoryConfig.name}</span>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
          {products.length}
        </span>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} category={categoryConfig.id} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
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

  const cart = useStore((s) => s.cart)
  const products = useStore((s) => s.products)
  const isLoading = useStore((s) => s.isLoading)
  const error = useStore((s) => s.error)
  const fetchProducts = useStore((s) => s.fetchProducts)
  const addToCart = useStore((s) => s.addToCart)
  const clearError = useStore((s) => s.clearError)
  const getTotal = useStore((s) => s.getTotal)
  const getDepositTotal = useStore((s) => s.getDepositTotal)

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

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('pos-view-mode', mode)
  }, [])

  const { productsByCategory, hasResults } = useMemo(() => {
    const q = searchQuery.toLowerCase()
    const filtered = searchQuery
      ? products.filter((p) => p.name.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q))
      : products

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
      <Header title="ขายสินค้า" showNotifications />

      <div className="p-4">
        {/* Search & Actions */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาสินค้า..."
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowScanner(true)}
            className="p-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Barcode size={20} />
          </button>

          <div className="flex bg-white border border-gray-200 rounded-lg p-0.5">
            <button
              onClick={() => handleViewModeChange('grid')}
              className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List size={18} />
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
          <div className="text-center py-12 text-gray-400">
            <Search size={32} className="mx-auto mb-2 opacity-40" />
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

      {/* Cart Button */}
      {itemCount > 0 && (
        <button
          onClick={() => navigate('/cart')}
          className="fixed bottom-24 right-4 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 z-20 hover:bg-gray-800 transition-colors"
        >
          <div className="relative">
            <ShoppingCart size={22} />
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-gray-900 text-xs font-medium rounded-full flex items-center justify-center">
              {itemCount}
            </span>
          </div>
          <div className="border-l border-white/20 pl-3">
            <p className="text-xs text-gray-400">ยอดรวม</p>
            <p className="text-base font-semibold">{grandTotal.toLocaleString()} บาท</p>
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
