import { useState, useEffect } from 'react'
import { Plus, Shield, ShoppingCart, Trash2, X } from 'lucide-react'
import { useAuthStore, User } from '../store/authStore'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useToast } from '../components/Toast'

export function UsersPage() {
  const { fetchUsers, deleteUser, user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const { showToast } = useToast()

  const loadUsers = async () => {
    setIsLoading(true)
    const data = await fetchUsers()
    setUsers(data)
    setIsLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleDelete = async (user: User) => {
    if (user.id === currentUser?.id) {
      showToast('error', 'ไม่สามารถลบตัวเองได้')
      return
    }
    if (!confirm(`ปิดการใช้งาน "${user.name}"?`)) return
    
    const success = await deleteUser(user.id)
    if (success) {
      showToast('success', 'ปิดการใช้งานสำเร็จ')
      loadUsers()
    }
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-blue-500 text-white px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">👤 จัดการผู้ใช้</h1>
      </header>

      <div className="p-4 space-y-4">
        {currentUser?.role !== 'admin' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700">
            ⚠️ เฉพาะ Admin เท่านั้นที่สามารถจัดการผู้ใช้ได้
          </div>
        )}

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            เพิ่มผู้ใช้ใหม่
          </button>
        )}

        {isLoading ? (
          <LoadingSpinner message="กำลังโหลด..." />
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className={`bg-white rounded-xl p-4 shadow-sm ${!user.is_active ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      user.role === 'admin' ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      {user.role === 'admin' ? (
                        <Shield className="text-purple-500" size={20} />
                      ) : (
                        <ShoppingCart className="text-blue-500" size={20} />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{user.name}</p>
                      <p className="text-sm text-gray-500">
                        {user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงานขาย'}
                      </p>
                    </div>
                  </div>
                  {currentUser?.role === 'admin' && user.id !== currentUser.id && user.is_active && (
                    <button
                      onClick={() => handleDelete(user)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <UserForm
          onSave={() => { setShowForm(false); loadUsers() }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

function UserForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const { createUser } = useAuthStore()
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [role, setRole] = useState<'admin' | 'cashier'>('cashier')
  const [isSaving, setIsSaving] = useState(false)
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || pin.length < 4) return

    setIsSaving(true)
    const success = await createUser(name, pin, role)
    if (success) {
      showToast('success', 'เพิ่มผู้ใช้สำเร็จ')
      onSave()
    } else {
      showToast('error', 'เกิดข้อผิดพลาด')
    }
    setIsSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">เพิ่มผู้ใช้ใหม่</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">PIN (4-6 หลัก)</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 border rounded-xl"
              minLength={4}
              maxLength={6}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">บทบาท</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('cashier')}
                className={`py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
                  role === 'cashier' ? 'bg-blue-500 text-white' : 'bg-gray-100'
                }`}
              >
                <ShoppingCart size={18} />
                พนักงานขาย
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
                  role === 'admin' ? 'bg-purple-500 text-white' : 'bg-gray-100'
                }`}
              >
                <Shield size={18} />
                Admin
              </button>
            </div>
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
