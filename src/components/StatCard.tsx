import { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  value: string | number
  label: string
  trend?: { value: number; isPositive: boolean }
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'amber'
  size?: 'sm' | 'md' | 'lg'
  index?: number
}

const colorClasses = {
  blue: 'bg-white',
  green: 'bg-white',
  purple: 'bg-white',
  orange: 'bg-white',
  red: 'bg-white',
  amber: 'bg-white',
}

export function StatCard({ icon: Icon, value, label, trend, color = 'blue', size = 'md', index = 0 }: Props) {
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  }

  const valueSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }

  return (
    <div
      style={{ animationDelay: `${index * 100}ms` }}
      className={`${colorClasses[color]} rounded-xl ${sizeClasses[size]} border border-gray-100 stagger-item relative`}
    >
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Icon size={size === 'sm' ? 18 : size === 'md' ? 22 : 26} className="text-gray-600" />
          </div>
          {trend && (
            <span
              className={`text-xs px-2 py-1 rounded font-medium ${
                trend.isPositive ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
          )}
        </div>
        <p className={`${valueSizes[size]} font-semibold mt-3 text-gray-800`}>{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}
