import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2, ArrowLeft, ShoppingBag, Plus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { CartItem } from '../components/CartItem'
import { PaymentModal } from '../components/PaymentModal'
import { SuccessModal } from '../components/SuccessModal'

export function CartPage() {
  const navigate = useNavigate()
  const [showPayment, setShowPayment] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastChange, setLastChange] = useState(0)

  const { cart, getTotal, clearCart } = useStore()
  const total = getTotal()
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const handlePaymentSuccess = (change: number) => {
    setLastChange(change)
    setShowPayment(false)
    setShowSuccess(true)
  }

  const handleSuccessClose = () => {
    setShowSuccess(false)
    navigate('/')
  }

  return (
    <div className="min-h-screen pb-44 bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <ShoppingCart size={20} />
              ตะกร้าสินค้า
            </h1>
            <p className="text-xs text-gray-400">{itemCount} รายการ • ฿{total.toLocaleString()}</p>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => {
                if (confirm('ต้องการล้างตะกร้าทั้งหมด?')) {
                  clearCart()
                }
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </header>

      <div className="p-3">
        {cart.length === 0 ? (
          /* Empty Cart */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="text-gray-400" size={32} />
            </div>
            <h2 className="text-base font-medium text-gray-500 mb-1">ตะกร้าว่างเปล่า</h2>
            <p className="text-gray-400 text-sm mb-6">เลือกสินค้าเพื่อเพิ่มลงตะกร้า</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gray-800 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <Plus size={18} />
              เลือกสินค้า
            </button>
          </div>
        ) : (
          /* Cart Items */
          <div className="space-y-2">
            {cart.map((item, index) => (
              <CartItem key={item.product.id} item={item} index={index} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Summary Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 z-10">
          <div className="max-w-lg mx-auto p-3">
            {/* Summary Row */}
            <div className="flex items-center justify-between mb-3 bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="text-gray-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{itemCount} รายการ</p>
                  <p className="text-lg font-semibold text-gray-800">฿{total.toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm flex items-center gap-1"
              >
                <Plus size={16} />
                เพิ่ม
              </button>
            </div>

            {/* Pay Button */}
            <button
              onClick={() => setShowPayment(true)}
              className="w-full py-3 bg-gray-800 text-white rounded-lg font-medium text-base flex items-center justify-center gap-2 hover:bg-gray-700"
            >
              ชำระเงิน ฿{total.toLocaleString()}
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <PaymentModal isOpen={showPayment} onClose={() => setShowPayment(false)} onSuccess={handlePaymentSuccess} />
      <SuccessModal isOpen={showSuccess} change={lastChange} onClose={handleSuccessClose} />
    </div>
  )
}
