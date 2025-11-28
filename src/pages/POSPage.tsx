import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Barcode, Search, X, Snowflake, Flame, Droplets } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Header } from '../components/Header'
import { ProductCard } from '../components/ProductCard'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { useToast } from '../components/Toast'
import { Product } from '../types'

const categoryConfig = {
  ice: { name: 'น้ำแข็ง', icon: Snowflake, color: 'bg-blue-500', lightColor: 'bg-blue-50', textColor: 'text-blue-600' },
  gas: { name: 'แก๊ส', icon: Flame, color: 'bg-orange-500', lightColor: 'bg-orange-50', textColor: 'text-orange-600' },
  water: { name: 'น้ำดื่ม', icon: Droplets, color: 'bg-cyan-500', lightColor: 'bg-cyan-50', textColor: 'text-cyan-600' },
}

type CategoryKey = keyof typeof categoryConfig

// Category Section Component
function CategorySection({ 
  category, 
  products 
}: { 
  category: CategoryKey
  products: Product[] 
}) {
  const config = categoryConfig[category]
  const Icon = config.icon
  
  if (products.length === 0) return null

  return (
    <div className="mb-6">
      {/* Category Header */}
      <div className={`flex items-center gap-2 mb-3 px-1`}>
        <div className={`w-8 h-8 ${config.color} rounded-lg flex items-center justify-center`}>
          <Icon size={18} className="text-white" />
        </div>
        <h2 className="font-semibold text-gray-800">{config.name}</h2>
        <span className="text-sm text-gray-400">({products.length})</span>
      </div>
      
      {/* Products Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} category={category} />
        ))}
      </div>
    </div>
  )
}

export function POSPage() {
  const navigate = useNavigate()
  const [showScanner, setShowScanner] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { showToast } = useToast()

  const { cart, getTotal, getDepositTotal, addToCart, products, fetchProducts, isLoading, error, clearError } = useStore()
  const total = getTotal()
  const depositTotal = getDepositTotal()
  const grandTotal = total + depositTotal
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Filter by search
  const filteredProducts = products.filter((p) => {
    if (searchQuery === '') return true
    return p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Group by category
  const iceProducts = filteredProducts.filter(p => p.category === 'ice')
  const gasProducts = filteredProducts.filter(p => p.category === 'gas')
  const waterProducts = filteredProducts.filter(p => p.category === 'water')

  const handleBarcodeScanned = (barcode: string) => {
    setShowScanner(false)
    const product = products.find((p) => p.barcode === barcode)
    if (product) {
      addToCart(product)
      showToast('success', `เพิ่ม ${product.name} ลงตะกร้า`, 1500)
    } else {
      showToast('error', `ไม่พบสินค้า barcode: ${barcode}`, 2000)
    }
  }

  return (
    <div className="min-h-screen pb-24 bg-gray-50">
      <Header title="ขายสินค้า" icon="🛒" showNotifications />

      <div className="p-3">
        {/* Search Bar */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาสินค้า..."
              className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowScanner(true)}
            className="p-3 bg-gray-800 text-white rounded-xl"
            title="สแกน Barcode"
          >
            <Barcode size={20} />
          </button>
        </div>

        {/* Error Banner */}
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

        {/* Products by Category */}
        {isLoading && products.length === 0 ? (
          <LoadingSpinner message="กำลังโหลดสินค้า..." />
        ) : error && products.length === 0 ? (
          <ErrorMessage
            message={error}
            onRetry={() => {
              clearError()
              fetchProducts()
            }}
          />
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Search size={48} className="mx-auto mb-2 opacity-50" />
            <p>ไม่พบสินค้า</p>
          </div>
        ) : (
          <div>
            <CategorySection category="ice" products={iceProducts} />
            <CategorySection category="gas" products={gasProducts} />
            <CategorySection category="water" products={waterProducts} />
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <button
          onClick={() => navigate('/cart')}
          className="fixed bottom-20 right-3 bg-gray-800 text-white pl-4 pr-5 py-3 rounded-full font-medium shadow-lg flex items-center gap-3 z-20"
        >
          <div className="relative">
            <ShoppingCart size={20} />
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-gray-800 text-[10px] font-semibold rounded-full flex items-center justify-center">
              {itemCount}
            </span>
          </div>
          <div className="text-left border-l border-white/20 pl-3">
            <p className="text-base font-semibold">฿{grandTotal.toLocaleString()}</p>
            {depositTotal > 0 && (
              <p className="text-[10px] text-gray-300">รวมมัดจำ</p>
            )}
          </div>
        </button>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && <BarcodeScanner onScan={handleBarcodeScanned} onClose={() => setShowScanner(false)} />}
    </div>
  )
}
