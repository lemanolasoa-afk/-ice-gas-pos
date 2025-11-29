import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Download, Upload, AlertTriangle, Barcode, X, FolderCog } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/authStore'
import { ProductForm } from '../components/ProductForm'
import { ProductList } from '../components/ProductList'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { CategoryManager } from '../components/CategoryManager'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { useToast } from '../components/Toast'
import { Product } from '../types'
import { hasPermission } from '../lib/permissions'

export function ProductsPage() {
  const products = useStore((s) => s.products)
  const fetchProducts = useStore((s) => s.fetchProducts)
  const addProduct = useStore((s) => s.addProduct)
  const updateProduct = useStore((s) => s.updateProduct)
  const deleteProduct = useStore((s) => s.deleteProduct)
  const isLoading = useStore((s) => s.isLoading)
  const error = useStore((s) => s.error)
  const clearError = useStore((s) => s.clearError)
  const { showToast } = useToast()
  const { user } = useAuthStore()

  // Permission checks
  const canManage = hasPermission(user?.role, 'products.manage')
  const canImport = hasPermission(user?.role, 'products.import')

  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Filter products by search query
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get low stock products
  const lowStockProducts = products.filter((p) => p.stock <= p.low_stock_threshold)

  const handleAddProduct = () => {
    setEditingProduct(null)
    setShowForm(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleDeleteProduct = async (product: Product) => {
    if (confirm(`ต้องการลบ "${product.name}" หรือไม่?`)) {
      await deleteProduct(product.id)
      showToast('success', `ลบ "${product.name}" สำเร็จ`, 2000)
    }
  }

  const handleSaveProduct = async (productData: Omit<Product, 'id'>) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, productData)
      showToast('success', `อัปเดต "${productData.name}" สำเร็จ`, 2000)
    } else {
      await addProduct(productData)
      showToast('success', `เพิ่ม "${productData.name}" สำเร็จ`, 2000)
    }
    setShowForm(false)
    setEditingProduct(null)
  }

  const handleExportProducts = () => {
    const exportData = products.map(({ id, name, price, category, unit, stock, barcode, low_stock_threshold }) => ({
      id, name, price, category, unit, stock, barcode, low_stock_threshold
    }))
    const csv = [
      ['ID', 'ชื่อสินค้า', 'ราคา', 'หมวดหมู่', 'หน่วย', 'สต็อก', 'Barcode', 'แจ้งเตือนเมื่อต่ำกว่า'].join(','),
      ...exportData.map(p => [p.id, p.name, p.price, p.category, p.unit, p.stock, p.barcode || '', p.low_stock_threshold].join(','))
    ].join('\n')
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `products-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('success', 'ส่งออกข้อมูลสินค้าสำเร็จ', 2000)
  }

  const handleImportProducts = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const lines = text.split('\n').slice(1) // Skip header
    let imported = 0

    for (const line of lines) {
      if (!line.trim()) continue
      const [, name, price, category, unit, stock, barcode, low_stock_threshold] = line.split(',')
      if (name && price && category && unit) {
        await addProduct({
          name: name.trim(),
          price: parseFloat(price),
          category: category.trim() as 'ice' | 'gas' | 'water',
          unit: unit.trim(),
          stock: parseInt(stock) || 0,
          barcode: barcode?.trim() || null,
          low_stock_threshold: parseInt(low_stock_threshold) || 5
        })
        imported++
      }
    }
    
    showToast('success', `นำเข้าสินค้า ${imported} รายการสำเร็จ`, 3000)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleBarcodeScanned = (barcode: string) => {
    setShowScanner(false)
    setSearchQuery(barcode)
    const product = products.find(p => p.barcode === barcode)
    if (product) {
      showToast('info', `พบสินค้า: ${product.name}`, 2000)
    } else {
      showToast('info', `ไม่พบสินค้า barcode: ${barcode}`, 2000)
    }
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">📦 จัดการสินค้า</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <AlertTriangle size={18} />
              <span className="font-medium">สินค้าใกล้หมด ({lowStockProducts.length} รายการ)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.slice(0, 5).map(p => (
                <span key={p.id} className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  {p.name} ({p.stock})
                </span>
              ))}
              {lowStockProducts.length > 5 && (
                <span className="text-sm text-gray-500">+{lowStockProducts.length - 5} อื่นๆ</span>
              )}
            </div>
          </div>
        )}

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาสินค้า หรือ barcode..."
              className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
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
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-white rounded-lg font-medium"
          >
            <Barcode size={18} />
            <span className="sm:inline hidden">สแกน</span>
          </button>
        </div>

        {/* Action Buttons - Only show for users with permissions */}
        {(canManage || canImport) && (
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <>
                <button
                  onClick={handleAddProduct}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg font-medium"
                >
                  <Plus size={18} />
                  เพิ่มสินค้า
                </button>
                <button
                  onClick={() => setShowCategoryManager(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium"
                >
                  <FolderCog size={18} />
                  จัดการหมวดหมู่
                </button>
              </>
            )}
            {canImport && (
              <>
                <button
                  onClick={handleExportProducts}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium"
                >
                  <Download size={18} />
                  ส่งออก CSV
                </button>
                <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium cursor-pointer">
                  <Upload size={18} />
                  นำเข้า CSV
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleImportProducts}
                    className="hidden"
                  />
                </label>
              </>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
            <p className="text-xl font-semibold text-gray-800">{products.length}</p>
            <p className="text-xs text-gray-500">สินค้าทั้งหมด</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
            <p className="text-xl font-semibold text-gray-800">
              {products.reduce((sum, p) => sum + p.stock, 0)}
            </p>
            <p className="text-xs text-gray-500">สต็อกรวม</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
            <p className="text-xl font-semibold text-purple-600">
              ฿{products.reduce((sum, p) => sum + (p.stock * (p.cost || 0)), 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">มูลค่าสต็อก</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
            <p className={`text-xl font-semibold ${lowStockProducts.length > 0 ? 'text-orange-500' : 'text-green-500'}`}>
              {lowStockProducts.length}
            </p>
            <p className="text-xs text-gray-500">ใกล้หมด</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <ErrorMessage
            message={error}
            variant="banner"
            onRetry={() => { clearError(); fetchProducts() }}
            onDismiss={clearError}
          />
        )}

        {/* Product List */}
        {isLoading && products.length === 0 ? (
          <LoadingSpinner message="กำลังโหลดสินค้า..." />
        ) : (
          <ProductList
            products={filteredProducts}
            onEdit={canManage ? handleEditProduct : undefined}
            onDelete={canManage ? handleDeleteProduct : undefined}
          />
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <ProductForm
          product={editingProduct}
          onSave={handleSaveProduct}
          onCancel={() => { setShowForm(false); setEditingProduct(null) }}
          isLoading={isLoading}
        />
      )}

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showCategoryManager && (
        <CategoryManager onClose={() => setShowCategoryManager(false)} />
      )}
    </div>
  )
}
