import { useState, useEffect } from 'react'
import { X, Save, Snowflake, Flame, Droplets, Loader2, Barcode } from 'lucide-react'
import { Product } from '../types'

interface Props {
  product?: Product | null
  onSave: (product: Omit<Product, 'id'>) => Promise<void> | void
  onCancel: () => void
  isLoading?: boolean
}

const categories = [
  { value: 'ice' as const, label: 'น้ำแข็ง', icon: Snowflake },
  { value: 'gas' as const, label: 'แก๊ส', icon: Flame },
  { value: 'water' as const, label: 'น้ำดื่ม', icon: Droplets }
]

export function ProductForm({ product, onSave, onCancel, isLoading = false }: Props) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<'ice' | 'gas' | 'water'>('ice')
  const [unit, setUnit] = useState('')
  const [stock, setStock] = useState('0')
  const [barcode, setBarcode] = useState('')
  const [lowStockThreshold, setLowStockThreshold] = useState('5')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (product) {
      setName(product.name)
      setPrice(product.price.toString())
      setCategory(product.category)
      setUnit(product.unit)
      setStock(product.stock?.toString() || '0')
      setBarcode(product.barcode || '')
      setLowStockThreshold(product.low_stock_threshold?.toString() || '5')
    }
  }, [product])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!name.trim()) {
      newErrors.name = 'กรุณากรอกชื่อสินค้า'
    }
    
    const priceNum = parseFloat(price)
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      newErrors.price = 'กรุณากรอกราคาที่ถูกต้อง'
    }
    
    if (!unit.trim()) {
      newErrors.unit = 'กรุณากรอกหน่วย'
    }

    const stockNum = parseInt(stock)
    if (isNaN(stockNum) || stockNum < 0) {
      newErrors.stock = 'กรุณากรอกจำนวนสต็อกที่ถูกต้อง'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return
    
    setIsSaving(true)
    try {
      await onSave({
        name: name.trim(),
        price: parseFloat(price),
        category,
        unit: unit.trim(),
        stock: parseInt(stock) || 0,
        barcode: barcode.trim() || null,
        low_stock_threshold: parseInt(lowStockThreshold) || 5
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  const isFormDisabled = isSaving || isLoading

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {product ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ชื่อสินค้า
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น น้ำแข็งหลอด 5 กก."
              disabled={isFormDisabled}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.name ? 'border-red-500' : 'border-gray-200'
              }`}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ราคา (บาท)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              disabled={isFormDisabled}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.price ? 'border-red-500' : 'border-gray-200'
              }`}
            />
            {errors.price && (
              <p className="text-red-500 text-sm mt-1">{errors.price}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              หมวดหมู่
            </label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon
                const isSelected = category === cat.value
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    disabled={isFormDisabled}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-gray-800 text-white border-gray-800'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={22} />
                    <span className="text-xs font-medium">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              หน่วย
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="เช่น ถุง, ถัง, ขวด"
              disabled={isFormDisabled}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.unit ? 'border-red-500' : 'border-gray-200'
              }`}
            />
            {errors.unit && (
              <p className="text-red-500 text-sm mt-1">{errors.unit}</p>
            )}
          </div>

          {/* Stock and Threshold */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                สต็อก
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                min="0"
                disabled={isFormDisabled}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  errors.stock ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.stock && (
                <p className="text-red-500 text-sm mt-1">{errors.stock}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                แจ้งเตือนเมื่อต่ำกว่า
              </label>
              <input
                type="number"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="5"
                min="0"
                disabled={isFormDisabled}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Barcode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1">
                <Barcode size={16} />
                Barcode (ไม่บังคับ)
              </span>
            </label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="สแกนหรือพิมพ์ barcode"
              disabled={isFormDisabled}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isFormDisabled}
              className="flex-1 py-3 px-4 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isFormDisabled}
              className="flex-1 py-3 px-4 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save size={18} />
                  {product ? 'บันทึก' : 'เพิ่มสินค้า'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
