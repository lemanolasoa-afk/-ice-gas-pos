import { useState, useEffect, useRef } from 'react'
import { X, Save, Loader2, Barcode, AlertCircle, Camera, Plus } from 'lucide-react'
import { Product } from '../types'
import { useStore } from '../store/useStore'
import { useCategories } from '../hooks/useCategories'
import { uploadProductImage, compressImage } from '../lib/imageUpload'

interface Props {
  product?: Product | null
  onSave: (product: Omit<Product, 'id'>) => Promise<void> | void
  onCancel: () => void
  isLoading?: boolean
}

export function ProductForm({ product, onSave, onCancel, isLoading = false }: Props) {
  const { categories, getCategoryConfig } = useCategories()
  
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [unit, setUnit] = useState('')
  const [stock, setStock] = useState('0')
  const [barcode, setBarcode] = useState('')
  const [lowStockThreshold, setLowStockThreshold] = useState('5')
  const [cost, setCost] = useState('0')
  const [depositAmount, setDepositAmount] = useState('0')
  const [outrightPrice, setOutrightPrice] = useState('0')
  const [meltRatePercent, setMeltRatePercent] = useState('5')
  const [image, setImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Get all products to check barcode uniqueness
  const products = useStore((s) => s.products)

  // Set default category when categories load
  useEffect(() => {
    if (!category && categories.length > 0) {
      setCategory(categories[0].id)
    }
  }, [categories, category])

  useEffect(() => {
    if (product) {
      setName(product.name)
      setPrice(product.price.toString())
      setCategory(product.category)
      setUnit(product.unit)
      setStock(product.stock?.toString() || '0')
      setBarcode(product.barcode || '')
      setLowStockThreshold(product.low_stock_threshold?.toString() || '5')
      setCost(product.cost?.toString() || '0')
      setDepositAmount(product.deposit_amount?.toString() || '0')
      setOutrightPrice(product.outright_price?.toString() || '0')
      setMeltRatePercent(product.melt_rate_percent?.toString() || '5')
      setImage(product.image || null)
    }
  }, [product])

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
    setImageFile(file)
  }

  const handleRemoveImage = () => {
    setImage(null)
    setImageFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

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
    
    if (barcode.trim()) {
      const existingProduct = products.find(
        (p) => p.barcode === barcode.trim() && p.id !== product?.id
      )
      if (existingProduct) {
        newErrors.barcode = `Barcode นี้ใช้กับ "${existingProduct.name}" แล้ว`
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return
    
    setIsSaving(true)
    try {
      let imageUrl = image

      if (imageFile) {
        setIsUploading(true)
        const compressed = await compressImage(imageFile, 600, 0.8)
        const productId = product?.id || `new-${Date.now()}`
        const uploadedUrl = await uploadProductImage(compressed, productId)
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        }
        setIsUploading(false)
      }

      const categoryConfig = getCategoryConfig(category)

      await onSave({
        name: name.trim(),
        price: parseFloat(price),
        category,
        unit: unit.trim(),
        stock: parseInt(stock) || 0,
        barcode: barcode.trim() || null,
        low_stock_threshold: parseInt(lowStockThreshold) || 5,
        cost: parseFloat(cost) || 0,
        deposit_amount: categoryConfig.has_deposit ? parseFloat(depositAmount) || 0 : 0,
        outright_price: categoryConfig.has_deposit ? parseFloat(outrightPrice) || 0 : 0,
        melt_rate_percent: category === 'ice' ? parseFloat(meltRatePercent) || 5 : undefined,
        image: imageUrl
      })
    } finally {
      setIsSaving(false)
      setIsUploading(false)
    }
  }
  
  const isFormDisabled = isSaving || isLoading
  const selectedCategoryConfig = getCategoryConfig(category)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-800">
            {product ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-3 overflow-y-auto flex-1">
          {/* Image Upload */}
          <div className="flex items-center gap-3">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors overflow-hidden"
            >
              {image ? (
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera size={24} className="text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-700">รูปสินค้า</p>
              <p className="text-[10px] text-gray-500">กดเพื่อเลือกรูป (ไม่บังคับ)</p>
              {image && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="text-xs text-red-500 hover:underline mt-1"
                >
                  ลบรูป
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">ชื่อสินค้า</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น น้ำแข็งหลอด"
              disabled={isFormDisabled}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 ${
                errors.name ? 'border-red-500' : 'border-gray-200'
              }`}
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">หมวดหมู่</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isSelected = category === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    disabled={isFormDisabled}
                    className={`px-3 py-2 rounded-lg border transition-colors flex items-center gap-1.5 text-sm ${
                      isSelected 
                        ? `${cat.color} text-white border-transparent` 
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Price, Cost, Unit */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ราคา</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                min="0"
                disabled={isFormDisabled}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.price ? 'border-red-500' : 'border-gray-200'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ต้นทุน</label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0"
                min="0"
                disabled={isFormDisabled}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">หน่วย</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="ถุง"
                disabled={isFormDisabled}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.unit ? 'border-red-500' : 'border-gray-200'
                }`}
              />
            </div>
          </div>

          {/* Profit display */}
          {parseFloat(price) > 0 && parseFloat(cost) > 0 && (
            <p className={`text-xs -mt-1 ${
              ((parseFloat(price) - parseFloat(cost)) / parseFloat(price)) * 100 >= 30 ? 'text-green-600' : 'text-orange-600'
            }`}>
              กำไร: ฿{(parseFloat(price) - parseFloat(cost)).toFixed(0)} ({(((parseFloat(price) - parseFloat(cost)) / parseFloat(price)) * 100).toFixed(0)}%)
            </p>
          )}

          {/* Stock & Threshold */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">สต็อก</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                min="0"
                disabled={isFormDisabled}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.stock ? 'border-red-500' : 'border-gray-200'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">แจ้งเตือนต่ำกว่า</label>
              <input
                type="number"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="5"
                min="0"
                disabled={isFormDisabled}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Deposit fields for categories with has_deposit */}
          {selectedCategoryConfig.has_deposit && (
            <div className="grid grid-cols-2 gap-2 p-2 bg-orange-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-orange-700 mb-1">ค่ามัดจำถัง</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  disabled={isFormDisabled}
                  className="w-full px-3 py-2 text-sm border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-purple-700 mb-1">ราคาซื้อขาด</label>
                <input
                  type="number"
                  value={outrightPrice}
                  onChange={(e) => setOutrightPrice(e.target.value)}
                  placeholder="0"
                  min="0"
                  disabled={isFormDisabled}
                  className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <p className="col-span-2 text-[10px] text-gray-500">
                มัดจำ = คืนถังได้เงินคืน | ซื้อขาด = ซื้อถังไปเลย
              </p>
            </div>
          )}

          {/* Ice-specific: Melt Rate */}
          {category === 'ice' && (
            <div className="p-2 bg-cyan-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-cyan-700 mb-1">
                  อัตราการละลาย (%/วัน)
                </label>
                <input
                  type="number"
                  value={meltRatePercent}
                  onChange={(e) => setMeltRatePercent(e.target.value)}
                  placeholder="5"
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={isFormDisabled}
                  className="w-full px-3 py-2 text-sm border border-cyan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                ใช้คำนวณการสูญเสียจากการละลายในการปิดยอดสต๊อก
              </p>
            </div>
          )}

          {/* Barcode */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Barcode size={12} /> Barcode
            </label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="สแกนหรือพิมพ์ (ไม่บังคับ)"
              disabled={isFormDisabled}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.barcode ? 'border-red-500' : 'border-gray-200'
              }`}
            />
            {errors.barcode && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.barcode}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onCancel}
              disabled={isFormDisabled}
              className="flex-1 py-2.5 px-3 border border-gray-200 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isFormDisabled}
              className="flex-1 py-2.5 px-3 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 flex items-center justify-center gap-1.5"
            >
              {isSaving || isUploading ? (
                <><Loader2 size={16} className="animate-spin" /> {isUploading ? 'อัพโหลดรูป...' : 'บันทึก...'}</>
              ) : (
                <><Save size={16} /> {product ? 'บันทึก' : 'เพิ่ม'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
