import { useState, useEffect } from 'react'
import { Percent, Plus, Tag, Trash2, Edit2, X, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/authStore'
import { Discount } from '../types'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useToast } from '../components/Toast'
import { hasPermission } from '../lib/permissions'

export function DiscountsPage() {
  const { products } = useStore()
  const { user } = useAuthStore()
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null)
  const { showToast } = useToast()
  
  // Permission check
  const canManage = hasPermission(user?.role, 'discounts.manage')

  const fetchDiscounts = async () => {
    setIsLoading(true)
    const { data } = await supabase.from('discounts').select('*').order('created_at', { ascending: false })
    if (data) setDiscounts(data)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchDiscounts()
  }, [])

  const toggleActive = async (discount: Discount) => {
    await supabase.from('discounts').update({ is_active: !discount.is_active }).eq('id', discount.id)
    showToast('success', discount.is_active ? 'ปิดโปรโมชั่น' : 'เปิดโปรโมชั่น')
    fetchDiscounts()
  }

  const handleDelete = async (discount: Discount) => {
    if (!confirm(`ลบโปรโมชั่น "${discount.name}"?`)) return
    await supabase.from('discounts').delete().eq('id', discount.id)
    showToast('success', 'ลบโปรโมชั่นสำเร็จ')
    fetchDiscounts()
  }

  const getDiscountLabel = (d: Discount) => {
    if (d.type === 'percent') return `ลด ${d.value}%`
    if (d.type === 'fixed') return `ลด ฿${d.value}`
    return `ซื้อ ${d.buy_quantity} แถม ${d.get_quantity}`
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-blue-500 text-white px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">🏷️ โปรโมชั่น/ส่วนลด</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-green-600">
              {discounts.filter((d) => d.is_active).length}
            </p>
            <p className="text-sm text-gray-500">โปรโมชั่นที่ใช้งาน</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-gray-400">
              {discounts.filter((d) => !d.is_active).length}
            </p>
            <p className="text-sm text-gray-500">ปิดใช้งาน</p>
          </div>
        </div>

        {/* Add Button - Only for users with manage permission */}
        {canManage && (
          <button
            onClick={() => { setEditingDiscount(null); setShowForm(true) }}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            เพิ่มโปรโมชั่น
          </button>
        )}

        {/* Discount List */}
        {isLoading ? (
          <LoadingSpinner message="กำลังโหลด..." />
        ) : discounts.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400">
            <Tag size={48} className="mx-auto mb-2 opacity-50" />
            <p>ยังไม่มีโปรโมชั่น</p>
          </div>
        ) : (
          <div className="space-y-2">
            {discounts.map((discount) => (
              <div
                key={discount.id}
                className={`bg-white rounded-xl p-4 shadow-sm ${!discount.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Percent size={18} className="text-green-500" />
                      <p className="font-bold text-gray-800">{discount.name}</p>
                    </div>
                    <p className="text-lg font-bold text-green-600 mt-1">{getDiscountLabel(discount)}</p>
                    {discount.min_purchase > 0 && (
                      <p className="text-sm text-gray-500">ขั้นต่ำ ฿{discount.min_purchase}</p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleActive(discount)}
                        className={`p-2 rounded-lg ${discount.is_active ? 'text-green-500' : 'text-gray-400'}`}
                      >
                        {discount.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </button>
                      <button
                        onClick={() => { setEditingDiscount(discount); setShowForm(true) }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(discount)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <DiscountForm
          discount={editingDiscount}
          products={products}
          onSave={() => { setShowForm(false); fetchDiscounts() }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

function DiscountForm({
  discount,
  onSave,
  onCancel,
}: {
  discount: Discount | null
  products: any[]
  onSave: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(discount?.name || '')
  const [type, setType] = useState<'percent' | 'fixed' | 'buy_x_get_y'>(discount?.type || 'percent')
  const [value, setValue] = useState(discount?.value?.toString() || '')
  const [minPurchase, setMinPurchase] = useState(discount?.min_purchase?.toString() || '0')
  const [buyQty, setBuyQty] = useState(discount?.buy_quantity?.toString() || '')
  const [getQty, setGetQty] = useState(discount?.get_quantity?.toString() || '')
  const [isSaving, setIsSaving] = useState(false)
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !value) return

    setIsSaving(true)
    const data = {
      name,
      type,
      value: parseFloat(value),
      min_purchase: parseFloat(minPurchase) || 0,
      buy_quantity: type === 'buy_x_get_y' ? parseInt(buyQty) : null,
      get_quantity: type === 'buy_x_get_y' ? parseInt(getQty) : null,
      is_active: true,
    }

    if (discount) {
      await supabase.from('discounts').update(data).eq('id', discount.id)
      showToast('success', 'อัปเดตโปรโมชั่นสำเร็จ')
    } else {
      await supabase.from('discounts').insert({ id: `disc-${Date.now()}`, ...data })
      showToast('success', 'เพิ่มโปรโมชั่นสำเร็จ')
    }
    setIsSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-bold">{discount ? 'แก้ไขโปรโมชั่น' : 'เพิ่มโปรโมชั่น'}</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโปรโมชั่น</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น ลดราคาวันหยุด"
              className="w-full px-4 py-3 border rounded-xl"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ประเภท</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'percent', label: 'ลด %' },
                { value: 'fixed', label: 'ลดบาท' },
                { value: 'buy_x_get_y', label: 'ซื้อแถม' },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value as any)}
                  className={`py-2 rounded-lg font-medium ${
                    type === t.value ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {type === 'buy_x_get_y' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ซื้อ (ชิ้น)</label>
                <input
                  type="number"
                  value={buyQty}
                  onChange={(e) => setBuyQty(e.target.value)}
                  min="1"
                  className="w-full px-4 py-3 border rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">แถม (ชิ้น)</label>
                <input
                  type="number"
                  value={getQty}
                  onChange={(e) => setGetQty(e.target.value)}
                  min="1"
                  className="w-full px-4 py-3 border rounded-xl"
                  required
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {type === 'percent' ? 'เปอร์เซ็นต์ลด' : 'จำนวนเงินลด (บาท)'}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                min="0"
                max={type === 'percent' ? '100' : undefined}
                className="w-full px-4 py-3 border rounded-xl"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ยอดซื้อขั้นต่ำ (บาท)</label>
            <input
              type="number"
              value={minPurchase}
              onChange={(e) => setMinPurchase(e.target.value)}
              min="0"
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 py-3 border rounded-xl">
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium disabled:bg-gray-300"
            >
              {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
