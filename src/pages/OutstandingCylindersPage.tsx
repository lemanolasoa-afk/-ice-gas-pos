import { useState, useEffect } from 'react'
import { Package, User, Phone, Calendar, ArrowLeft, RefreshCw, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/authStore'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useToast } from '../components/Toast'

interface OutstandingCylinder {
  id: string
  sale_id: string
  product_id: string
  product_name: string
  customer_id: string | null
  customer_name: string | null
  customer_phone: string | null
  quantity: number
  deposit_amount: number
  created_at: string
}

export function OutstandingCylindersPage() {
  const [cylinders, setCylinders] = useState<OutstandingCylinder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [returning, setReturning] = useState<string | null>(null)
  const { products, fetchProducts } = useStore()
  const { user } = useAuthStore()
  const { showToast } = useToast()

  // สรุปถังเปล่าที่ร้าน
  const gasProducts = products.filter((p) => p.category === 'gas')
  const totalEmptyAtShop = gasProducts.reduce((sum, p) => sum + (p.empty_stock || 0), 0)

  const fetchOutstandingCylinders = async () => {
    setIsLoading(true)

    const { data, error } = await supabase
      .from('outstanding_cylinders')
      .select(
        `
        id,
        sale_id,
        product_id,
        quantity,
        deposit_amount,
        created_at,
        products (name),
        customers (name, phone)
      `
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (data) {
      setCylinders(
        data.map((item: any) => ({
          id: item.id,
          sale_id: item.sale_id,
          product_id: item.product_id,
          product_name: item.products?.name || 'ไม่ทราบ',
          customer_id: item.customer_id,
          customer_name: item.customers?.name || null,
          customer_phone: item.customers?.phone || null,
          quantity: Number(item.quantity),
          deposit_amount: Number(item.deposit_amount),
          created_at: item.created_at,
        }))
      )
    }

    setIsLoading(false)
  }

  useEffect(() => {
    fetchProducts()
    fetchOutstandingCylinders()
  }, [fetchProducts])

  // คืนถัง
  const handleReturn = async (cylinder: OutstandingCylinder) => {
    setReturning(cylinder.id)

    try {
      // 1. อัพเดทสถานะเป็น returned
      await supabase
        .from('outstanding_cylinders')
        .update({
          status: 'returned',
          returned_at: new Date().toISOString(),
          returned_by: user?.id,
        })
        .eq('id', cylinder.id)

      // 2. เพิ่มถังเปล่าในสต็อก
      const product = gasProducts.find((p) => p.id === cylinder.product_id)
      if (product) {
        await supabase
          .from('products')
          .update({ empty_stock: (product.empty_stock || 0) + cylinder.quantity })
          .eq('id', cylinder.product_id)
      }

      // 3. บันทึก stock_log
      await supabase.from('stock_logs').insert({
        id: `log-${Date.now()}`,
        product_id: cylinder.product_id,
        change_amount: cylinder.quantity,
        reason: 'deposit_return',
        note: `ลูกค้าคืนถัง ${cylinder.customer_name || 'ทั่วไป'} - คืนมัดจำ ฿${cylinder.deposit_amount * cylinder.quantity}`,
        user_id: user?.id,
      })

      showToast(
        'success',
        `รับคืนถัง ${cylinder.quantity} ถัง - คืนมัดจำ ฿${(cylinder.deposit_amount * cylinder.quantity).toLocaleString()}`
      )

      fetchProducts()
      fetchOutstandingCylinders()
    } catch (err) {
      showToast('error', 'เกิดข้อผิดพลาด')
    }

    setReturning(null)
  }

  // สรุปยอด
  const totalOutstanding = cylinders.reduce((sum, c) => sum + c.quantity, 0)
  const totalDeposit = cylinders.reduce((sum, c) => sum + c.deposit_amount * c.quantity, 0)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getDaysAgo = (date: string) => {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return 'วันนี้'
    if (days === 1) return 'เมื่อวาน'
    return `${days} วัน`
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      {/* Header */}
      <header className="bg-amber-500 text-white px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/cylinder-return" className="p-1">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">ถังค้างคืน</h1>
          </div>
          <button onClick={fetchOutstandingCylinders} className="p-2">
            <RefreshCw size={20} />
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <p className="text-2xl font-bold text-amber-600">{totalOutstanding}</p>
            <p className="text-xs text-gray-500">ค้างคืน</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <p className="text-2xl font-bold text-orange-500">{totalEmptyAtShop}</p>
            <p className="text-xs text-gray-500">เปล่าที่ร้าน</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <p className="text-2xl font-bold text-green-600">฿{totalDeposit.toLocaleString()}</p>
            <p className="text-xs text-gray-500">มัดจำค้าง</p>
          </div>
        </div>

        {/* Empty Stock by Product */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-3">สรุปถังเปล่าที่ร้าน</h3>
          <div className="grid grid-cols-2 gap-2">
            {gasProducts.map((p) => (
              <div key={p.id} className="flex justify-between items-center bg-gray-50 rounded-lg p-2">
                <span className="text-sm text-gray-600">{p.name}</span>
                <span className="font-bold text-orange-500">{p.empty_stock || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Outstanding List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-amber-50">
            <h3 className="font-bold text-amber-700">รายการถังค้างคืน ({cylinders.length})</h3>
          </div>

          {isLoading ? (
            <LoadingSpinner message="กำลังโหลด..." />
          ) : cylinders.length === 0 ? (
            <div className="p-8 text-center">
              <Package size={48} className="mx-auto mb-2 text-gray-300" />
              <p className="text-gray-500">ไม่มีถังค้างคืน</p>
            </div>
          ) : (
            <div className="divide-y">
              {cylinders.map((cylinder) => (
                <div key={cylinder.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      {/* Customer */}
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-amber-500" />
                        <span className="font-bold">{cylinder.customer_name || 'ลูกค้าทั่วไป'}</span>
                      </div>

                      {/* Phone */}
                      {cylinder.customer_phone && (
                        <a
                          href={`tel:${cylinder.customer_phone}`}
                          className="inline-flex items-center gap-1 text-sm text-blue-500 mt-1"
                        >
                          <Phone size={12} />
                          {cylinder.customer_phone}
                        </a>
                      )}

                      {/* Product & Date */}
                      <p className="text-sm text-gray-600 mt-1">{cylinder.product_name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <Calendar size={12} />
                        <span>{formatDate(cylinder.created_at)}</span>
                        <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                          {getDaysAgo(cylinder.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Quantity & Return Button */}
                    <div className="text-right">
                      <p className="text-xl font-bold text-amber-600">{cylinder.quantity} ถัง</p>
                      <p className="text-xs text-green-600">
                        มัดจำ ฿{(cylinder.deposit_amount * cylinder.quantity).toLocaleString()}
                      </p>
                      <button
                        onClick={() => handleReturn(cylinder)}
                        disabled={returning === cylinder.id}
                        className="mt-2 px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg flex items-center gap-1 disabled:opacity-50"
                      >
                        <Check size={14} />
                        {returning === cylinder.id ? 'กำลังคืน...' : 'รับคืน'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
