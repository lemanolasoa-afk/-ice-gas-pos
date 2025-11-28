import { useState } from 'react'
import { Droplets, Flame, Snowflake, Check } from 'lucide-react'
import { Product } from '../types'
import { useStore } from '../store/useStore'

interface Props {
  product: Product
  index?: number
  category?: 'ice' | 'gas' | 'water'
}

const categoryIcons = {
  ice: Snowflake,
  gas: Flame,
  water: Droplets,
}

const categoryColors = {
  ice: 'bg-blue-100 text-blue-600',
  gas: 'bg-orange-100 text-orange-600',
  water: 'bg-cyan-100 text-cyan-600',
}

const categoryAccent = {
  ice: 'border-blue-200 hover:border-blue-300',
  gas: 'border-orange-200 hover:border-orange-300',
  water: 'border-cyan-200 hover:border-cyan-300',
}

export function ProductCard({ product, index = 0 }: Props) {
  const addToCart = useStore((s) => s.addToCart)
  const cart = useStore((s) => s.cart)
  const [isAdding, setIsAdding] = useState(false)
  const Icon = categoryIcons[product.category]

  const cartItem = cart.find((item) => item.product.id === product.id)
  const quantity = cartItem?.quantity || 0
  const isLowStock = product.stock <= product.low_stock_threshold
  const isOutOfStock = product.stock <= 0

  const handleClick = () => {
    if (isOutOfStock) return
    setIsAdding(true)
    addToCart(product)
    setTimeout(() => setIsAdding(false), 300)
  }

  return (
    <button
      onClick={handleClick}
      disabled={isOutOfStock}
      style={{ animationDelay: `${index * 30}ms` }}
      className={`relative bg-white rounded-xl p-3 flex flex-col items-center gap-1.5 border-2 transition-all duration-200 stagger-item
        ${isOutOfStock 
          ? 'opacity-50 cursor-not-allowed border-gray-200' 
          : isAdding 
            ? 'scale-95 border-gray-400' 
            : `${categoryAccent[product.category]} active:scale-95`
        }
      `}
    >
      {/* Quantity badge */}
      {quantity > 0 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 text-white text-xs font-medium rounded-full flex items-center justify-center">
          {quantity}
        </div>
      )}

      {/* Low stock indicator */}
      {isLowStock && !isOutOfStock && (
        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-gray-200 text-gray-600 text-[8px] font-medium rounded">
          เหลือ {product.stock}
        </div>
      )}

      {/* Icon */}
      <div
        className={`${categoryColors[product.category]} p-2.5 rounded-lg transition-transform duration-200 ${
          isAdding ? 'scale-110' : ''
        }`}
      >
        {isAdding ? <Check size={24} /> : <Icon size={24} />}
      </div>

      {/* Name */}
      <span className="text-xs font-medium text-gray-700 text-center leading-tight line-clamp-2 min-h-[2rem]">
        {product.name}
      </span>

      {/* Price */}
      <div className="flex flex-col items-center">
        <span className="text-base font-semibold text-gray-800">฿{product.price}</span>
        <span className="text-[10px] text-gray-400">/{product.unit}</span>
      </div>

      {/* Out of stock overlay */}
      {isOutOfStock && (
        <div className="absolute inset-0 bg-white/60 rounded-xl flex items-center justify-center">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
            หมด
          </span>
        </div>
      )}
    </button>
  )
}
