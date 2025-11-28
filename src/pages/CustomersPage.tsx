import { useState, useEffect } from 'react'
import { Users, Plus, Search, Star, Phone, X, Edit2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Customer } from '../types'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useToast } from '../components/Toast'
import { useAuthStore } from '../store/authStore'
import { hasPermission } from '../lib/permissions'

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const { showToast } = useToast()
  const { user } = useAuthStore()
  
  // Permission check
  const canManage = hasPermission(user?.role, 'customers.manage')

  const fetchCustomers = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('total_spent', { ascending: false })
    if (!error && data) setCustomers(data)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery)
  )

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`ลบลูกค้า "${customer.name}"?`)) return
    await supabase.from('customers').delete().eq('id', customer.id)
    showToast('success', 'ลบลูกค้าสำเร็จ')
    fetchCustomers()
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-blue-500 text-white px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">👥 ลูกค้าสมาชิก</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{customers.length}</p>
            <p className="text-xs text-gray-500">สมาชิกทั้งหมด</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-600">
              {customers.reduce((sum, c) => sum + c.points, 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">แต้มรวม</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-purple-600">
              ฿{customers.reduce((sum, c) => sum + c.total_spent, 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">ยอดซื้อรวม</p>
          </div>
        </div>

        {/* Search & Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อหรือเบอร์โทร..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl"
            />
          </div>
          {canManage && (
            <button
              onClick={() => { setEditingCustomer(null); setShowForm(true) }}
              className="px-4 py-3 bg-blue-500 text-white rounded-xl font-medium flex items-center gap-2"
            >
              <Plus size={20} />
            </button>
          )}
        </div>

        {/* Customer List */}
        {isLoading ? (
          <LoadingSpinner message="กำลังโหลด..." />
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400">
            <Users size={48} className="mx-auto mb-2 opacity-50" />
            <p>ไม่พบลูกค้า</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{customer.name}</p>
                    {customer.phone && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone size={14} /> {customer.phone}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1 text-yellow-600">
                        <Star size={14} /> {customer.points} แต้ม
                      </span>
                      <span className="text-gray-500">
                        ซื้อ {customer.visit_count} ครั้ง
                      </span>
                      <span className="text-green-600 font-medium">
                        ฿{customer.total_spent.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditingCustomer(customer); setShowForm(true) }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(customer)}
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

      {/* Customer Form Modal */}
      {showForm && (
        <CustomerForm
          customer={editingCustomer}
          onSave={() => { setShowForm(false); fetchCustomers() }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

function CustomerForm({
  customer,
  onSave,
  onCancel,
}: {
  customer: Customer | null
  onSave: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(customer?.name || '')
  const [phone, setPhone] = useState(customer?.phone || '')
  const [isSaving, setIsSaving] = useState(false)
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    if (customer) {
      await supabase.from('customers').update({ name, phone: phone || null }).eq('id', customer.id)
      showToast('success', 'อัปเดตลูกค้าสำเร็จ')
    } else {
      await supabase.from('customers').insert({
        id: `cust-${Date.now()}`,
        name,
        phone: phone || null,
        points: 0,
        total_spent: 0,
        visit_count: 0,
      })
      showToast('success', 'เพิ่มลูกค้าสำเร็จ')
    }
    setIsSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">{customer ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้าใหม่'}</h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>
          <div className="flex gap-3">
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
