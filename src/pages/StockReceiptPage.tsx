import { useState, useEffect } from 'react'
import { PackagePlus, Plus, Calendar, Package, RefreshCw, Flame } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/authStore'
import { StockReceipt, Product } from '../types'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useToast } from '../components/Toast'
import { SearchableSelect } from '../components/SearchableSelect'

type ReceiptType = 'normal' | 'gas_refill'

export function StockReceiptPage() {
  const { products, fetchProducts, updateStock } = useStore()
  const { user } = useAuthStore()
  const [receipts, setReceipts] = useState<StockReceipt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [receiptType, setReceiptType] = useState<ReceiptType>('normal')
  const { showToast } = useToast()
  
  const gasProducts = products.filter(p => p.category === 'gas')

  const fetchReceipts = async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from('stock_receipts')
      .select('*, products(name)')
      .order('received_at', { ascending: false })
      .limit(50)
    if (data) {
      setReceipts(
        data.map((r: any) => ({
          ...r,
          product_name: r.products?.name || 'ไม่ทราบ',
        }))
      )
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchProducts()
    fetchReceipts()
  }, [fetchProducts])

  const handleAddReceipt = async (data: {
    product_id: string
    quantity: number
    cost_per_unit?: number
    note?: string
  }) => {
    const product = products.find((p) => p.id === data.product_id)
    if (!product) return

    const receipt = {
      id: `rcpt-${Date.now()}`,
      product_id: data.product_id,
      quantity: data.quantity,
      cost_per_unit: data.cost_per_unit || null,
      total_cost: data.cost_per_unit ? data.cost_per_unit * data.quantity : null,
      note: data.note || null,
    }

    await supabase.from('stock_receipts').insert(receipt)
    await updateStock(data.product_id, data.quantity)
    
    // บันทึก stock log พร้อม user_id
    await supabase.from('stock_logs').insert({
      id: `log-${Date.now()}`,
      product_id: data.product_id,
      change_amount: data.quantity,
      reason: 'receipt',
      note: data.note || `รับสินค้า ${data.quantity} ${product.unit}`,
      user_id: user?.id || null
    })
    
    showToast('success', `รับสินค้า ${product.name} จำนวน ${data.quantity} ${product.unit}`)
    setShowForm(false)
    fetchReceipts()
    fetchProducts()
  }

  // สำหรับการส่งถังเปล่าไปเติมแล้วรับถังเต็มกลับมา
  const handleGasRefill = async (data: {
    product_id: string
    quantity: number
    cost_per_unit?: number
    note?: string
  }) => {
    const product = products.find((p) => p.id === data.product_id)
    if (!product) return
    
    const emptyStock = product.empty_stock || 0
    if (data.quantity > emptyStock) {
      showToast('error', `มีถังเปล่าแค่ ${emptyStock} ถัง`)
      return
    }

    // บันทึก receipt
    const receipt = {
      id: `rcpt-${Date.now()}`,
      product_id: data.product_id,
      quantity: data.quantity,
      cost_per_unit: data.cost_per_unit || null,
      total_cost: data.cost_per_unit ? data.cost_per_unit * data.quantity : null,
      note: data.note || `ส่งถังเปล่าไปเติม ${data.quantity} ถัง`,
    }

    await supabase.from('stock_receipts').insert(receipt)
    
    // อัพเดท stock: เพิ่มถังเต็ม, ลดถังเปล่า
    await supabase
      .from('products')
      .update({ 
        stock: product.stock + data.quantity,
        empty_stock: emptyStock - data.quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.product_id)
    
    // บันทึก stock log พร้อม user_id
    await supabase.from('stock_logs').insert({
      id: `log-${Date.now()}`,
      product_id: data.product_id,
      change_amount: data.quantity,
      reason: 'refill',
      note: `ส่งถังเปล่า ${data.quantity} ถังไปเติม รับถังเต็มกลับมา`,
      user_id: user?.id || null
    })
    
    showToast('success', `เติมแก๊ส ${product.name} จำนวน ${data.quantity} ถัง`)
    setShowForm(false)
    setReceiptType('normal')
    fetchReceipts()
    fetchProducts()
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-blue-500 text-white px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">📥 รับสินค้าเข้าสต็อก</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Gas Cylinder Summary */}
        {gasProducts.length > 0 && (
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="text-orange-500" size={20} />
              <h3 className="font-bold text-gray-800">สรุปถังแก๊ส</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {gasProducts.map(p => (
                <div key={p.id} className="bg-white rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700">{p.name}</p>
                  <div className="flex justify-between mt-1 text-sm">
                    <span className="text-green-600">เต็ม: {p.stock}</span>
                    <span className="text-orange-500">เปล่า: {p.empty_stock || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setReceiptType('normal'); setShowForm(true) }}
            className="py-4 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            รับสินค้าเข้า
          </button>
          {gasProducts.some(p => (p.empty_stock || 0) > 0) && (
            <button
              onClick={() => { setReceiptType('gas_refill'); setShowForm(true) }}
              className="py-4 bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} />
              ส่งถังไปเติม
            </button>
          )}
        </div>

        {/* Link to Outstanding Cylinders */}
        {gasProducts.length > 0 && (
          <a
            href="/outstanding-cylinders"
            className="block w-full py-3 bg-white border-2 border-amber-200 text-amber-600 rounded-xl font-medium text-center hover:bg-amber-50 transition-colors"
          >
            📦 ดูถังค้างคืน / รับคืนถัง
          </a>
        )}

        {/* Recent Receipts */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center gap-2">
            <Calendar size={20} className="text-blue-500" />
            <h3 className="font-bold text-gray-800">ประวัติการรับสินค้า</h3>
          </div>

          {isLoading ? (
            <LoadingSpinner message="กำลังโหลด..." />
          ) : receipts.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <PackagePlus size={48} className="mx-auto mb-2 opacity-50" />
              <p>ยังไม่มีประวัติการรับสินค้า</p>
            </div>
          ) : (
            <div className="divide-y">
              {receipts.map((receipt) => (
                <div key={receipt.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{receipt.product_name}</p>
                      <p className="text-sm text-gray-500">{formatDate(receipt.received_at)}</p>
                      {receipt.note && (
                        <p className="text-sm text-gray-400 mt-1">📝 {receipt.note}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">+{receipt.quantity}</p>
                      {receipt.total_cost && (
                        <p className="text-sm text-gray-500">฿{receipt.total_cost.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Receipt Form */}
      {showForm && receiptType === 'normal' && (
        <ReceiptForm
          products={products}
          onSave={handleAddReceipt}
          onCancel={() => setShowForm(false)}
        />
      )}
      
      {/* Gas Refill Form */}
      {showForm && receiptType === 'gas_refill' && (
        <GasRefillForm
          products={gasProducts}
          onSave={handleGasRefill}
          onCancel={() => { setShowForm(false); setReceiptType('normal') }}
        />
      )}
    </div>
  )
}

function ReceiptForm({
  products,
  onSave,
  onCancel,
}: {
  products: Product[]
  onSave: (data: { product_id: string; quantity: number; cost_per_unit?: number; note?: string }) => void
  onCancel: () => void
}) {
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [costPerUnit, setCostPerUnit] = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId || !quantity) return
    onSave({
      product_id: productId,
      quantity: parseInt(quantity),
      cost_per_unit: costPerUnit ? parseFloat(costPerUnit) : undefined,
      note: note || undefined,
    })
  }

  const selectedProduct = products.find((p) => p.id === productId)

  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
    subLabel: `สต็อก: ${p.stock} ${p.unit}`,
  }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:w-96 sm:rounded-2xl rounded-t-2xl p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">รับสินค้าเข้าสต็อก</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สินค้า</label>
            <SearchableSelect
              options={productOptions}
              value={productId}
              onChange={setProductId}
              placeholder="พิมพ์ค้นหาหรือเลือกสินค้า..."
            />
          </div>

          {selectedProduct && (
            <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3">
              <Package className="text-blue-500" size={24} />
              <div>
                <p className="font-medium text-gray-800">{selectedProduct.name}</p>
                <p className="text-sm text-gray-500">สต็อกปัจจุบัน: {selectedProduct.stock} {selectedProduct.unit}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">จำนวน</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              className="w-full px-4 py-3 border rounded-xl"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ต้นทุน/หน่วย (ไม่บังคับ)</label>
            <input
              type="number"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
              min="0"
              step="0.01"
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น รับจากซัพพลายเออร์ A"
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 py-3 border rounded-xl">
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium"
            >
              รับสินค้า
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


// Form สำหรับส่งถังเปล่าไปเติมแล้วรับถังเต็มกลับมา
function GasRefillForm({
  products,
  onSave,
  onCancel,
}: {
  products: Product[]
  onSave: (data: { product_id: string; quantity: number; cost_per_unit?: number; note?: string }) => void
  onCancel: () => void
}) {
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [costPerUnit, setCostPerUnit] = useState('')
  const [note, setNote] = useState('')

  const handleProductChange = (value: string) => {
    setProductId(value)
    setQuantity('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId || !quantity) return
    onSave({
      product_id: productId,
      quantity: parseInt(quantity),
      cost_per_unit: costPerUnit ? parseFloat(costPerUnit) : undefined,
      note: note || undefined,
    })
  }

  const selectedProduct = products.find((p) => p.id === productId)
  const maxQuantity = selectedProduct?.empty_stock || 0

  const gasOptions = products
    .filter((p) => (p.empty_stock || 0) > 0)
    .map((p) => ({
      value: p.id,
      label: p.name,
      subLabel: `ถังเปล่า: ${p.empty_stock || 0} ถัง`,
    }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:w-96 sm:rounded-2xl rounded-t-2xl p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <RefreshCw className="text-orange-500" size={24} />
          ส่งถังเปล่าไปเติม
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เลือกถังแก๊ส</label>
            <SearchableSelect
              options={gasOptions}
              value={productId}
              onChange={handleProductChange}
              placeholder="พิมพ์ค้นหาหรือเลือกถังแก๊ส..."
            />
          </div>

          {selectedProduct && (
            <div className="bg-orange-50 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <Flame className="text-orange-500" size={24} />
                <div>
                  <p className="font-medium text-gray-800">{selectedProduct.name}</p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600">ถังเต็ม: {selectedProduct.stock}</span>
                    <span className="text-orange-500">ถังเปล่า: {selectedProduct.empty_stock || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              จำนวนที่ส่งไปเติม {maxQuantity > 0 && `(สูงสุด ${maxQuantity} ถัง)`}
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              max={maxQuantity}
              className="w-full px-4 py-3 border rounded-xl"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ค่าเติมแก๊ส/ถัง (ไม่บังคับ)</label>
            <input
              type="number"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
              min="0"
              step="0.01"
              placeholder="เช่น 450"
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ส่งไปโรงบรรจุ ABC"
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 py-3 border rounded-xl">
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={!productId || !quantity || parseInt(quantity) > maxQuantity}
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-medium disabled:opacity-50"
            >
              ยืนยันส่งเติม
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
