import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, RefreshCw, Banknote, X } from 'lucide-react'
import { Product, GasSaleType } from '../types'
import { useStore } from '../store/useStore'
import { useCategories } from '../hooks/useCategories'

interface Props {
  product: Product
  index?: number
  category?: string
}

// Deposit Modal Component - rendered via Portal
function DepositModal({
  product,
  depositAmount,
  outrightPrice,
  categoryIcon,
  onClose,
  onSelect,
}: {
  product: Product
  depositAmount: number
  outrightPrice: number
  categoryIcon: string
  onClose: () => void
  onSelect: (type: GasSaleType) => void
}) {
  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-5 animate-scale-in shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">{categoryIcon}</span>
            {product.name}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X size={20} />
          </button>
        </div>

        <p className="text-base text-gray-600 mb-4">เลือกรูปแบบการซื้อ</p>

        <div className="space-y-2.5">
          {/* แลกถัง */}
          <button
            onClick={() => onSelect('exchange')}
            className="w-full p-3.5 border-2 border-green-300 bg-green-50 rounded-xl hover:border-green-500 hover:bg-green-100 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <RefreshCw className="text-green-700" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">แลกถัง</p>
                <p className="text-xs text-gray-600">มีถังเปล่ามาแลก</p>
              </div>
              <p className="text-lg font-bold text-green-600">฿{product.price}</p>
            </div>
          </button>

          {/* ค้างถัง (มัดจำ) */}
          <button
            onClick={() => onSelect('deposit')}
            className="w-full p-3.5 border-2 border-orange-300 bg-orange-50 rounded-xl hover:border-orange-500 hover:bg-orange-100 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <Banknote className="text-orange-700" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">ค้างถัง</p>
                <p className="text-xs text-gray-600">คืนถังได้เงินคืน ฿{depositAmount}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-orange-600">฿{product.price + depositAmount}</p>
              </div>
            </div>
          </button>

          {/* ซื้อขาด */}
          <button
            onClick={() => onSelect('outright')}
            className="w-full p-3.5 border-2 border-purple-300 bg-purple-50 rounded-xl hover:border-purple-500 hover:bg-purple-100 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <Check className="text-purple-700" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">ซื้อขาด</p>
                <p className="text-xs text-gray-600">ซื้อถังไปเลย ไม่ต้องคืน</p>
              </div>
              <p className="text-lg font-bold text-purple-600">฿{outrightPrice}</p>
            </div>
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-3 text-center font-medium">
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
  const outrightPrice = product.outright_price || (product.price + depositAmount + 500)

  const handleClick = () => {
    if (isOutOfStock) return
    // Categories with deposit system need to select sale type
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

  // Dynamic accent colors based on category
  const accentClass = isOutOfStock
    ? 'border-gray-200'
    : isAdding
      ? 'border-green-400 bg-green-50'
      : `border-gray-200 hover:shadow-md active:scale-95`

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isOutOfStock}
        style={{ animationDelay: `${index * 30}ms` }}
        className={`relative bg-white rounded-2xl p-4 flex flex-col items-center gap-2 border-2 transition-all duration-200 stagger-item shadow-sm
          ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'scale-95'}
          ${accentClass}
        `}
      >
        {/* Quantity badge */}
        {quantity > 0 && (
          <div className="absolute -top-2 -right-2 w-7 h-7 bg-gray-900 text-white text-sm font-bold rounded-full flex items-center justify-center shadow-md">
            {quantity}
          </div>
        )}

        {/* Low stock indicator */}
        {isLowStock && !isOutOfStock && (
          <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
            เหลือ {product.stock}
          </div>
        )}

        {/* Image or Icon */}
        <div
          className={`w-14 h-14 rounded-xl transition-transform duration-200 overflow-hidden flex items-center justify-center ${
            isAdding ? 'scale-110' : ''
          } ${!product.image ? categoryConfig.light_color : ''}`}
        >
          {isAdding ? (
            <Check size={28} className="text-green-600" />
          ) : product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">{categoryConfig.icon}</span>
          )}
        </div>

        {/* Name */}
        <span className="text-sm font-semibold text-gray-800 text-center leading-tight line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </span>

        {/* Price */}
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-gray-900">฿{product.price}</span>
          <span className="text-xs text-gray-500 font-medium">/{product.unit}</span>
          {product.cost && product.cost > 0 && (
            <span className={`text-[10px] font-medium mt-0.5 px-1.5 py-0.5 rounded ${
              ((product.price - product.cost) / product.price) * 100 >= 30 
                ? 'bg-green-100 text-green-700' 
                : 'bg-orange-100 text-orange-700'
            }`}>
              {(((product.price - product.cost) / product.price) * 100).toFixed(0)}% กำไร
            </span>
          )}
        </div>

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center">
            <span className="text-sm font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-full">หมด</span>
          </div>
        )}
      </button>

      {/* Deposit Modal - rendered outside button via Portal */}
      {showDepositModal && (
        <DepositModal
          product={product}
          depositAmount={depositAmount}
          outrightPrice={outrightPrice}
          categoryIcon={categoryConfig.icon}
          onClose={() => setShowDepositModal(false)}
          onSelect={handleDepositSaleType}
        />
      )}
    </>
  )
}
