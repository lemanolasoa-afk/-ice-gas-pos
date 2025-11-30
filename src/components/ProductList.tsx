import { Edit2, Trash2, AlertTriangle, Barcode } from 'lucide-react'
import { Product, Category } from '../types'

interface Props {
  products: Product[]
  categories: Category[]
  onEdit?: (product: Product) => void
  onDelete?: (product: Product) => void
}

export function ProductList({ products, categories, onEdit, onDelete }: Props) {
  // Group products by category
  const groupedProducts = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = []
    }
    acc[product.category].push(product)
    return acc
  }, {} as Record<string, Product[]>)

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-100">
        ไม่พบสินค้า
      </div>
    )
  }

  // Get all unique categories from products that exist in categories list
  const productCategories = [...new Set(products.map(p => p.category))]
  const sortedCategories = categories
    .filter(c => productCategories.includes(c.id))
    .sort((a, b) => a.sort_order - b.sort_order)

  // Also include categories that have products but aren't in the categories list
  const unknownCategories = productCategories.filter(
    catId => !categories.find(c => c.id === catId)
  )

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {sortedCategories.map((category) => {
        const categoryProducts = groupedProducts[category.id] || []
        if (categoryProducts.length === 0) return null

        return (
          <div key={category.id}>
            <div className="px-4 py-2 bg-gray-800 text-white flex items-center gap-2">
              <span className="text-sm font-medium">{category.name}</span>
              <span className="text-xs opacity-75">({categoryProducts.length})</span>
            </div>
            {categoryProducts.map((product) => (
              <ProductRow 
                key={product.id} 
                product={product} 
                category={category}
                onEdit={onEdit} 
                onDelete={onDelete} 
              />
            ))}
          </div>
        )
      })}
      
      {/* Unknown categories */}
      {unknownCategories.map((catId) => {
        const categoryProducts = groupedProducts[catId] || []
        if (categoryProducts.length === 0) return null

        return (
          <div key={catId}>
            <div className="px-4 py-2 bg-gray-600 text-white flex items-center gap-2">
              <span className="text-sm font-medium">{catId}</span>
              <span className="text-xs opacity-75">({categoryProducts.length})</span>
            </div>
            {categoryProducts.map((product) => (
              <ProductRow 
                key={product.id} 
                product={product} 
                onEdit={onEdit} 
                onDelete={onDelete} 
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function ProductRow({ 
  product, 
  category,
  onEdit, 
  onDelete 
}: { 
  product: Product
  category?: Category
  onEdit?: (product: Product) => void
  onDelete?: (product: Product) => void
}) {
  const isLowStock = product.stock <= product.low_stock_threshold
  const hasDeposit = category?.has_deposit

  return (
    <div className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-800 truncate">{product.name}</p>
          {isLowStock && (
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mt-1">
          <span>฿{product.price.toLocaleString()} / {product.unit}</span>
          {hasDeposit ? (
            <>
              <span className={isLowStock ? 'text-amber-600 font-medium' : 'text-green-600'}>
                ถังเต็ม: {product.stock}
              </span>
              <span className="text-orange-500">
                ถังเปล่า: {product.empty_stock || 0}
              </span>
              {product.deposit_amount && product.deposit_amount > 0 && (
                <span className="text-gray-400 text-xs">
                  มัดจำ: ฿{product.deposit_amount.toLocaleString()}
                </span>
              )}
            </>
          ) : (
            <span className={isLowStock ? 'text-amber-600 font-medium' : ''}>
              สต็อก: {product.stock}
            </span>
          )}
          {product.barcode && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Barcode size={12} />
              {product.barcode}
            </span>
          )}
        </div>
      </div>
      {(onEdit || onDelete) && (
        <div className="flex items-center gap-1 ml-2">
          {onEdit && (
            <button
              onClick={() => onEdit(product)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              title="แก้ไข"
            >
              <Edit2 size={18} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(product)}
              className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
              title="ลบ"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
