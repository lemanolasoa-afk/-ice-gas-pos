import { useState } from 'react'
import { Minus, Plus, Trash2, Snowflake, Flame, Droplets, RefreshCw, Banknote } from 'lucide-react'
import { CartItem as CartItemType } from '../types'
import { useStore } from '../store/useStore'

interface Props {
  item: CartItemType
  index?: number
}

const categoryIcons = {
  ice: Snowflake,
  gas: Flame,
  water: Droplets,
}

const categoryColors = {
  ice: 'bg-gray-100 text-gray-600',
  gas: 'bg-gray-100 text-gray-600',
  water: 'bg-gray-100 text-gray-600',
}

export function CartItem({ item, index = 0 }: Props) {
  const { updateQuantity, removeFromCart, updateGasSaleType } = useStore()
  const [isRemoving, setIsRemoving] = useState(false)
  const Icon = categoryIcons[item.product.category]
  
  const isGas = item.product.category === 'gas'
  const depositAmount = item.product.deposit_amount || 0

  const handleRemove = () => {
    setIsRemoving(true)
    setTimeout(() => {
      removeFromCart(item.product.id)
    }, 200)
  }

  const handleDecrease = () => {
    if (item.quantity === 1) {
      handleRemove()
    } else {
      updateQuantity(item.product.id, item.quantity - 1)
    }
  }

  return (
    <div
      style={{ animationDelay: `${index * 50}ms` }}
      className={`flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100 transition-all duration-200 stagger-item
        ${isRemoving ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100'}
      `}
    >
      {/* Category Icon */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${categoryColors[item.product.category]}`}>
        <Icon size={20} />
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate text-sm">{item.product.name}</p>
        <p className="text-xs text-gray-400">
          ฿{item.product.price.toLocaleString()} × {item.quantity}
          {isGas && item.gasSaleType === 'deposit' && depositAmount > 0 && (
            <span className="text-orange-500"> +มัดจำ ฿{depositAmount}</span>
          )}
        </p>
        
        {/* Gas Sale Type Toggle */}
        {isGas && (
          <div className="flex gap-1 mt-1.5">
            <button
              onClick={() => updateGasSaleType(item.product.id, 'exchange')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                item.gasSaleType === 'exchange'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <RefreshCw size={10} />
              แลกถัง
            </button>
            <button
              onClick={() => updateGasSaleType(item.product.id, 'deposit')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                item.gasSaleType === 'deposit'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <Banknote size={10} />
              มัดจำ
            </button>
          </div>
        )}
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleDecrease}
          className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          {item.quantity === 1 ? <Trash2 size={14} className="text-gray-500" /> : <Minus size={14} />}
        </button>

        <span className="w-8 text-center font-semibold text-gray-800">{item.quantity}</span>

        <button
          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
          className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Subtotal */}
      <div className="w-20 text-right">
        <span className="font-semibold text-gray-800 text-sm">
          ฿{(item.product.price * item.quantity).toLocaleString()}
        </span>
        {isGas && item.gasSaleType === 'deposit' && depositAmount > 0 && (
          <p className="text-xs text-orange-500">
            +฿{(depositAmount * item.quantity).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}
