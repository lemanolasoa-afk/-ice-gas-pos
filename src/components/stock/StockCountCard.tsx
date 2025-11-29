import { useState, useEffect } from 'react'
import { Snowflake, AlertTriangle, CheckCircle, Droplets } from 'lucide-react'
import { Product } from '../../types'
import { calculateAllMeltLossData, formatMeltPercent } from '../../lib/meltLossCalculations'

interface Props {
  product: Product
  soldToday: number // รองรับค่าทศนิยม เช่น 0.5
  onActualStockChange: (productId: string, actualStock: number, isAbnormal: boolean) => void
  initialActualStock?: number
}

// Helper function to format decimal numbers for display
const formatDecimal = (num: number): string => {
  return Number.isInteger(num) ? String(num) : num.toFixed(1)
}

export function StockCountCard({ product, soldToday, onActualStockChange, initialActualStock }: Props) {
  const expectedStock = Math.max(0, product.stock - soldToday)
  const [actualStock, setActualStock] = useState<string>(
    initialActualStock !== undefined ? String(initialActualStock) : String(expectedStock)
  )
  
  const actualStockNum = parseFloat(actualStock) || 0
  const expectedMeltPercent = product.melt_rate_percent || 5
  const cost = product.cost || 0

  const calc = calculateAllMeltLossData(
    product.stock,
    soldToday,
    actualStockNum,
    expectedMeltPercent,
    cost
  )

  useEffect(() => {
    onActualStockChange(product.id, actualStockNum, calc.isAbnormal)
  }, [actualStockNum, calc.isAbnormal, product.id, onActualStockChange])

  const handleInputChange = (value: string) => {
    // Allow numbers and decimals (e.g., 0.5, 10.5)
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setActualStock(value)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
          <Snowflake size={24} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{product.name}</h3>
          <p className="text-sm text-gray-500">คาดการณ์ละลาย {expectedMeltPercent}%/วัน</p>
        </div>
      </div>

      {/* Stock Info */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">สต๊อกในระบบ</p>
          <p className="text-lg font-bold text-gray-900">{formatDecimal(product.stock)}</p>
          <p className="text-xs text-gray-400">{product.unit}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">ขายวันนี้</p>
          <p className="text-lg font-bold text-orange-600">{formatDecimal(soldToday)}</p>
          <p className="text-xs text-gray-400">{product.unit}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">คงเหลือควร</p>
          <p className="text-lg font-bold text-blue-600">{formatDecimal(expectedStock)}</p>
          <p className="text-xs text-gray-400">{product.unit}</p>
        </div>
      </div>

      {/* Actual Stock Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          สต๊อกจริงที่นับได้
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={actualStock}
            onChange={(e) => handleInputChange(e.target.value)}
            className="flex-1 px-4 py-3 text-lg font-semibold text-center border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
          />
          <span className="text-gray-500 font-medium">{product.unit}</span>
        </div>
      </div>

      {/* Melt Loss Result */}
      {calc.meltLoss > 0 ? (
        <div className={`rounded-xl p-4 ${calc.isAbnormal ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Droplets size={20} className={calc.isAbnormal ? 'text-red-500' : 'text-amber-500'} />
            <span className={`font-semibold ${calc.isAbnormal ? 'text-red-700' : 'text-amber-700'}`}>
              ละลาย: {formatDecimal(calc.meltLoss)} {product.unit}
            </span>
            {calc.isAbnormal ? (
              <AlertTriangle size={18} className="text-red-500 ml-auto" />
            ) : (
              <CheckCircle size={18} className="text-green-500 ml-auto" />
            )}
          </div>
          <div className="flex justify-between text-sm">
            <span className={calc.isAbnormal ? 'text-red-600' : 'text-amber-600'}>
              {formatMeltPercent(calc.meltPercent)} (คาดการณ์ {expectedMeltPercent}%)
            </span>
            <span className={calc.isAbnormal ? 'text-red-600' : 'text-amber-600'}>
              มูลค่า ฿{calc.meltLossValue.toLocaleString()}
            </span>
          </div>
          {calc.isAbnormal && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
              <AlertTriangle size={14} />
              ละลายสูงกว่าปกติ! ควรตรวจสอบตู้แช่
            </p>
          )}
        </div>
      ) : actualStockNum > expectedStock ? (
        <div className="rounded-xl p-4 bg-green-50 border border-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-green-500" />
            <span className="font-semibold text-green-700">
              สต๊อกมากกว่าที่คาด (+{formatDecimal(actualStockNum - expectedStock)} {product.unit})
            </span>
          </div>
          <p className="text-xs text-green-600 mt-1">อาจมีการรับสินค้าเพิ่มหรือนับผิดพลาด</p>
        </div>
      ) : (
        <div className="rounded-xl p-4 bg-green-50 border border-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-green-500" />
            <span className="font-semibold text-green-700">ไม่มีการละลาย</span>
          </div>
        </div>
      )}
    </div>
  )
}
