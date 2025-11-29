import { useState, useEffect } from 'react'
import { RotateCcw, Flame, Check, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/authStore'
import { Product } from '../types'
import { GasCylinderManager } from '../lib/gasCylinderManager'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useToast } from '../components/Toast'

interface CylinderReturn {
  id: string
  product_id: string
  product_name: string
  quantity: number
  refund_amount: number
  note?: string
  user_id?: string
  created_at: string
}

export function CylinderReturnPage() {
  const { products, fetchProducts } = useStore()
  const { user } = useAuthStore()
  const [returns, setReturns] = useState<CylinderReturn[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const { showToast } = useToast()

  const gasProducts = products.filter(p => p.category === 'gas')

  const fetchReturns = async () => {
    setIsLoading(true)
    // Fetch from stock_logs where reason is 'deposit_return'
    const { data } = await supabase
      .from('stock_logs')
      .select('*, products(name, deposit_amount)')
      .eq('reason', 'deposit_return')
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      setReturns(
        data.map((r: any) => ({
          id: r.id,
          product_id: r.product_id,
          product_name: r.products?.name || 'ไม่ทราบ',
          quantity: r.change_amount,
          refund_amount: (r.products?.deposit_amount || 0) * r.change_amount,
          note: r.note,
          user_id: r.user_id,
          created_at: r.created_at
        }))
      )
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchProducts()
    fetchReturns()
  }, [fetchProducts])

  const handleReturn = async (data: {
    product_id: string
    quantity: number
    note?: string
  }) => {
    const product = gasProducts.find(p => p.id === data.product_id)
    if (!product) return

    try {
      const refundAmount = await GasCylinderManager.processCylinderReturn(
        data.product_id,
        data.quantity,
        user?.id,
        data.note
      )

      showToast('success', `คืนถังแก๊ส ${data.quantity} ถัง คืนเงินมัดจำ ฿${refundAmount.toLocaleString()}`)
      setShowForm(false)
      fetchReturns()
      fetchProducts()
    } catch (err) {
      showToast('error', (err as Error).message)
    }
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
      <header className="bg-orange-500 text-white px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <RotateCcw size={24} />
          คืนถังแก๊ส (คืนเงินมัดจำ)
        </h1>
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
                  {p.deposit_amount && p.deposit_amount > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      มัดจำ: ฿{p.deposit_amount.toLocaleString()}/ถัง
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Return Button */}
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <RotateCcw size={20} />
          รับคืนถังแก๊ส
        </button>

        {/* Return History */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center gap-2">
            <RotateCcw size={20} className="text-orange-500" />
            <h3 className="font-bold text-gray-800">ประวัติการคืนถัง</h3>
          </div>

          {isLoading ? (
            <LoadingSpinner message="กำลังโหลด..." />
          ) : returns.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <RotateCcw size={48} className="mx-auto mb-2 opacity-50" />
              <p>ยังไม่มีประวัติการคืนถัง</p>
            </div>
          ) : (
            <div className="divide-y">
              {returns.map((ret) => (
                <div key={ret.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{ret.product_name}</p>
                      <p className="text-sm text-gray-500">{formatDate(ret.created_at)}</p>
                      {ret.note && (
                        <p className="text-sm text-gray-400 mt-1">📝 {ret.note}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">+{ret.quantity} ถัง</p>
                      <p className="text-sm text-green-600">คืน ฿{ret.refund_amount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Return Form Modal */}
      {showForm && (
        <CylinderReturnForm
          products={gasProducts}
          onSave={handleReturn}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}


// Form component for cylinder return
function CylinderReturnForm({
  products,
  onSave,
  onCancel,
}: {
  products: Product[]
  onSave: (data: { product_id: string; quantity: number; note?: string }) => void
  onCancel: () => void
}) {
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [note, setNote] = useState('')

  const selectedProduct = products.find(p => p.id === productId)
  const depositAmount = selectedProduct?.deposit_amount || 0
  const refundAmount = depositAmount * parseInt(quantity || '0')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId || !quantity) return
    onSave({
      product_id: productId,
      quantity: parseInt(quantity),
      note: note || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:w-96 sm:rounded-2xl rounded-t-2xl p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <RotateCcw className="text-orange-500" size={24} />
          รับคืนถังแก๊ส
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              เลือกประเภทถังแก๊ส
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl"
              required
            >
              <option value="">เลือกถังแก๊ส</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (มัดจำ ฿{p.deposit_amount || 0})
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="bg-orange-50 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <Flame className="text-orange-500" size={24} />
                <div>
                  <p className="font-medium text-gray-800">{selectedProduct.name}</p>
                  <p className="text-sm text-gray-500">
                    มัดจำ: ฿{depositAmount.toLocaleString()}/ถัง
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              จำนวนถังที่คืน
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              className="w-full px-4 py-3 border rounded-xl"
              required
            />
          </div>

          {selectedProduct && parseInt(quantity) > 0 && (
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="text-green-600" size={20} />
                  <span className="font-medium text-gray-800">เงินมัดจำที่ต้องคืน</span>
                </div>
                <span className="text-xl font-bold text-green-600">
                  ฿{refundAmount.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {quantity} ถัง × ฿{depositAmount.toLocaleString()} = ฿{refundAmount.toLocaleString()}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              หมายเหตุ (ไม่บังคับ)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ลูกค้าคืนถังเก่า"
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 border rounded-xl font-medium"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={!productId || !quantity || parseInt(quantity) <= 0}
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-medium disabled:opacity-50"
            >
              ยืนยันรับคืน
            </button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-amber-700">
              การรับคืนถังจะเพิ่มจำนวนถังเปล่าในสต็อก และต้องคืนเงินมัดจำให้ลูกค้า
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
