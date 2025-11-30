import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, RefreshCw, Banknote, X, Package } from 'lucide-react'
import { Product, GasSaleType } from '../types'
import { useStore } from '../store/useStore'
import { useCategories } from '../hooks/useCategories'

interface Props {
  product: Product
  index?: number
  category?: string
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
  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{product.name}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">เลือกรูปแบบการซื้อ</p>

        <div className="space-y-2">
          <button
            onClick={() => onSelect('exchange')}
            className="w-full p-3 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="text-gray-600" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">แลกถัง</p>
                <p className="text-xs text-gray-500">มีถังเปล่ามาแลก</p>
              </div>
              <p className="font-semibold text-gray-900">{product.price.toLocaleString()} บาท</p>
            </div>
          </button>

          <button
            onClick={() => onSelect('deposit')}
            className="w-full p-3 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                <Banknote className="text-gray-600" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">ค้างถัง</p>
                <p className="text-xs text-gray-500">คืนถังได้เงินคืน {depositAmount.toLocaleString()} บาท</p>
              </div>
              <p className="font-semibold text-gray-900">{(product.price + depositAmount).toLocaleString()} บาท</p>
            </div>
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-3 text-center">
          สต็อก: {product.stock} ถังเต็ม | {product.empty_stock || 0} ถังเปล่า
        </p>
      </div>
    </div>,
    document.body
  )
}

export function ProductCard({ product, index = 0 }: Props) {
  const addToCart = useStore((s) => s.addToCart)
  const cart = useStore((s) => s.cart)
  const { getCategoryConfig } = useCategories()
  const [isAdding, setIsAdding] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  
  const categoryConfig = getCategoryConfig(product.category)

  const cartItem = cart.find((item) => item.product.id === product.id)
  const quantity = cartItem?.quantity || 0
  const isLowStock = product.stock <= product.low_stock_threshold
  const isOutOfStock = product.stock <= 0
  const hasDeposit = categoryConfig.has_deposit
  const depositAmount = product.deposit_amount || 0

  const handleClick = () => {
    if (isOutOfStock) return
    if (hasDeposit) {
      setShowDepositModal(true)
      return
    }
    setIsAdding(true)
    addToCart(product)
    setTimeout(() => setIsAdding(false), 300)
  }

  const handleDepositSaleType = (saleType: GasSaleType) => {
    setShowDepositModal(false)
    setIsAdding(true)
    addToCart(product, saleType)
    setTimeout(() => setIsAdding(false), 300)
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isOutOfStock}
        style={{ animationDelay: `${index * 30}ms` }}
        className={`relative bg-white rounded-xl p-3 flex flex-col items-center gap-1.5 border transition-all duration-200
          ${isOutOfStock ? 'opacity-50 cursor-not-allowed border-gray-100' : 'border-gray-200 hover:border-gray-300 active:scale-95'}
          ${isAdding ? 'border-green-400 bg-green-50' : ''}
        `}
      >
        {quantity > 0 && (
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-900 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
            {quantity}
          </div>
        )}

        {isLowStock && !isOutOfStock && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[9px] font-medium rounded">
            เหลือ {product.stock}
          </div>
        )}

        <div
          className={`w-12 h-12 rounded-lg transition-transform duration-200 overflow-hidden flex items-center justify-center bg-gray-50 ${
            isAdding ? 'scale-110' : ''
          }`}
        >
          {isAdding ? (
            <Check size={24} className="text-green-600" />
          ) : product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Package size={24} className="text-gray-400" />
          )}
        </div>

        <span className="text-xs font-medium text-gray-800 text-center leading-tight line-clamp-2 min-h-[2rem]">
          {product.name}
        </span>

        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold text-gray-900">{product.price.toLocaleString()}</span>
          <span className="text-[10px] text-gray-500">บาท/{product.unit}</span>
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
            <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded">สินค้าหมด</span>
          </div>
        )}
      </button>

      {showDepositModal && (
        <DepositModal
          product={product}
          depositAmount={depositAmount}
          onClose={() => setShowDepositModal(false)}
          onSelect={handleDepositSaleType}
        />
      )}
    </>
  )
}
