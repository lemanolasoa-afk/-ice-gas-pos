import { useState } from 'react'
import { X, Plus, Save, Trash2, GripVertical, Loader2 } from 'lucide-react'
import { Category } from '../types'
import { useCategories } from '../hooks/useCategories'
import { useToast } from './Toast'

interface Props {
  onClose: () => void
}

const iconOptions = ['📦', '❄️', '🔥', '💧', '🍺', '🥤', '🧊', '⛽', '🛢️', '🍶', '🧃', '🥛']
const colorOptions = [
  { value: 'bg-blue-500', label: 'น้ำเงิน', light: 'bg-blue-50', text: 'text-blue-600' },
  { value: 'bg-orange-500', label: 'ส้ม', light: 'bg-orange-50', text: 'text-orange-600' },
  { value: 'bg-cyan-500', label: 'ฟ้า', light: 'bg-cyan-50', text: 'text-cyan-600' },
  { value: 'bg-green-500', label: 'เขียว', light: 'bg-green-50', text: 'text-green-600' },
  { value: 'bg-purple-500', label: 'ม่วง', light: 'bg-purple-50', text: 'text-purple-600' },
  { value: 'bg-pink-500', label: 'ชมพู', light: 'bg-pink-50', text: 'text-pink-600' },
  { value: 'bg-red-500', label: 'แดง', light: 'bg-red-50', text: 'text-red-600' },
  { value: 'bg-yellow-500', label: 'เหลือง', light: 'bg-yellow-50', text: 'text-yellow-600' },
  { value: 'bg-gray-500', label: 'เทา', light: 'bg-gray-50', text: 'text-gray-600' },
]

export function CategoryManager({ onClose }: Props) {
  const { categories, addCategory, updateCategory, deleteCategory, fetchCategories } = useCategories()
  const { showToast } = useToast()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    icon: '📦',
    color: 'bg-gray-500',
    has_deposit: false
  })

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      icon: '📦',
      color: 'bg-gray-500',
      has_deposit: false
    })
    setShowAddForm(false)
    setEditingId(null)
  }

  const handleEdit = (cat: Category) => {
    setFormData({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      has_deposit: cat.has_deposit
    })
    setEditingId(cat.id)
    setShowAddForm(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast('error', 'กรุณากรอกชื่อหมวดหมู่')
      return
    }

    setIsLoading(true)
    try {
      const colorConfig = colorOptions.find(c => c.value === formData.color) || colorOptions[0]
      
      if (editingId) {
        // Update existing
        await updateCategory(editingId, {
          name: formData.name.trim(),
          icon: formData.icon,
          color: formData.color,
          light_color: colorConfig.light,
          text_color: colorConfig.text,
          has_deposit: formData.has_deposit
        })
        showToast('success', `อัปเดตหมวดหมู่ "${formData.name}" สำเร็จ`)
      } else {
        // Add new
        const newId = formData.id.trim() || formData.name.toLowerCase().replace(/\s+/g, '_')
        
        // Check if ID already exists
        if (categories.some(c => c.id === newId)) {
          showToast('error', 'รหัสหมวดหมู่นี้มีอยู่แล้ว')
          setIsLoading(false)
          return
        }

        await addCategory({
          id: newId,
          name: formData.name.trim(),
          icon: formData.icon,
          color: formData.color,
          light_color: colorConfig.light,
          text_color: colorConfig.text,
          sort_order: categories.length + 1,
          is_active: true,
          has_deposit: formData.has_deposit
        })
        showToast('success', `เพิ่มหมวดหมู่ "${formData.name}" สำเร็จ`)
      }
      
      resetForm()
      fetchCategories()
    } catch (err) {
      showToast('error', (err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (cat: Category) => {
    if (!confirm(`ต้องการลบหมวดหมู่ "${cat.name}" หรือไม่?`)) return
    
    setIsLoading(true)
    try {
      await deleteCategory(cat.id)
      showToast('success', `ลบหมวดหมู่ "${cat.name}" สำเร็จ`)
      fetchCategories()
    } catch (err) {
      showToast('error', (err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">จัดการหมวดหมู่</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Category List */}
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
            >
              <GripVertical size={16} className="text-gray-300" />
              <div className={`w-10 h-10 ${cat.color} rounded-lg flex items-center justify-center text-white text-lg`}>
                {cat.icon}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{cat.name}</p>
                <p className="text-xs text-gray-500">
                  {cat.has_deposit ? '🏷️ มีระบบมัดจำ' : ''}
                </p>
              </div>
              <button
                onClick={() => handleEdit(cat)}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                แก้ไข
              </button>
              <button
                onClick={() => handleDelete(cat)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {/* Add/Edit Form */}
          {showAddForm ? (
            <div className="p-4 bg-blue-50 rounded-xl space-y-3">
              <h3 className="font-medium text-gray-800">
                {editingId ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
              </h3>
              
              {!editingId && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    รหัส (ภาษาอังกฤษ)
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="เช่น snack, beverage"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ชื่อหมวดหมู่</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น ขนม, เครื่องดื่ม"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ไอคอน</label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-10 h-10 rounded-lg border-2 text-lg flex items-center justify-center ${
                        formData.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">สี</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-8 h-8 rounded-full ${color.value} ${
                        formData.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="has_deposit"
                  checked={formData.has_deposit}
                  onChange={(e) => setFormData({ ...formData, has_deposit: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="has_deposit" className="text-sm text-gray-700">
                  มีระบบมัดจำ (เช่น ถังแก๊ส)
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <><Save size={16} /> บันทึก</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              เพิ่มหมวดหมู่ใหม่
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
