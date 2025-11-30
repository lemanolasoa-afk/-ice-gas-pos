import { useState } from 'react'
import { Minus, Plus, Trash2, Snowflake, Flame, Droplets, RefreshCw, Banknote, Package } from 'lucide-react'
import { CartItem as CartItemType } from '../types'
import { useStore } from '../store/useStore'
import { useCategories } from '../hooks/useCategories'

interface Props {
  item: CartItemType
  index?: number
}

// Fallback icons for known categories
const fallbackIcons: Record<string, React.ComponentType<{ size?: number }>> = {
  ice: Snowflake,
  gas: Flame,
  water: Droplets,
}

export function CartItem({ item, index = 0 }: Props) {
  const { updateQuantity, removeFromCart, updateGasSaleType } = useStore()
  const { getCategoryConfig } = useCategories()
  const [isRemoving, setIsRemoving] = useState(false)
  
  const categoryConfig = getCategoryConfig(item.product.category)
  const FallbackIcon = fallbackIcons[item.product.category] || Package
  
  const hasDeposit = categoryConfig.has_deposit
  const depositAmount = item.product.deposit_amount || 0

  const handleRemove = () => {
    if (isRemoving) return
    setIsRemoving(true)
    setTimeout(() => {
      removeFromCart(item.product.id)
    }, 200)
  }

  const handleDecrease = () => {
    if (isRemoving) return
    if (item.quantity <= 1) {
      handleRemove()
    } else {
      updateQuantity(item.product.id, item.quantity - 1)
    }
  }

  // คำนวณราคารวม
  const getSubtotal = () => {
    if (hasDeposit && item.gasSaleType === 'deposit') {
      return (item.product.price + depositAmount) * item.quantity
    }
    return item.product.price * item.quantity
  }

  // แสดงราคาต่อหน่วย
  const getUnitPrice = () => {
    if (hasDeposit && item.gasSaleType === 'deposit') return item.product.price + depositAmount
    return item.product.price
  }

  return (
    <div
      style={{ animationDelay: `${index * 50}ms` }}
      className={`bg-white p-3 pb-4 border-b-2 border-gray-200 transition-all duration-200 stagger-item
        ${isRemoving ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100'}
      `}
    >
      {/* Row 1: ชื่อสินค้า (เต็มความกว้าง) */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${categoryConfig.light_color} ${categoryConfig.text_color}`}>
          {categoryConfig.icon ? (
            <span className="text-base">{categoryConfig.icon}</span>
          ) : (
            <FallbackIcon size={18} />
          )}
        </div>
        <p className="font-semibold text-gray-800 flex-1">{item.product.name}</p>
      </div>

      {/* Row 2: ราคา + จำนวน + รวม */}
      <div className="flex items-center justify-between">
        {/* ราคาต่อหน่วย */}
        <div className="text-sm text-gray-500">
          ฿{getUnitPrice().toLocaleString()} × {item.quantity}
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleDecrease}
            className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {item.quantity === 1 ? <Trash2 size={16} className="text-red-500" /> : <Minus size={16} />}
          </button>
          <span className="w-8 text-center font-bold text-gray-800">{item.quantity}</span>
          <button
            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
            className="w-9 h-9 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Subtotal */}
        <div className="text-right min-w-[70px]">
          <span className="font-bold text-lg text-gray-900">
            {getSubtotal().toLocaleString()} บาท
          </span>
        </div>
      </div>

      {/* Row 3: Deposit Sale Type Toggle - แค่ 2 ตัวเลือก */}
      {hasDeposit && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => updateGasSaleType(item.product.id, 'exchange')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              item.gasSaleType === 'exchange'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <RefreshCw size={14} />
            แลกถัง
          </button>
          <button
            onClick={() => updateGasSaleType(item.product.id, 'deposit')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              item.gasSaleType === 'deposit'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Banknote size={14} />
            ค้างถัง +{depositAmount.toLocaleString()}
          </button>
        </div>
      )}
    </div>
  )
}
