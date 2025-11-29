import { Droplets, Flame, LayoutGrid, Snowflake, Package } from 'lucide-react'

interface Props {
  active: string
  onChange: (category: string) => void
}

const categories = [
  { id: 'all', name: 'ทั้งหมด', icon: LayoutGrid },
  { id: 'ice', name: 'น้ำแข็ง', icon: Snowflake },
  { id: 'gas', name: 'แก๊ส', icon: Flame },
  { id: 'new_gas', name: 'แก๊สใหม่', icon: Package },
  { id: 'water', name: 'น้ำดื่ม', icon: Droplets },
]

export function CategoryTabs({ active, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
      {categories.map((cat, idx) => {
        const Icon = cat.icon
        const isActive = active === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            style={{ animationDelay: `${idx * 50}ms` }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors stagger-item ${
              isActive
                ? 'bg-gray-800 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <Icon size={18} />
            <span className="font-medium text-sm">{cat.name}</span>
          </button>
        )
      })}
    </div>
  )
}
