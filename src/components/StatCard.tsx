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

const colorConfig = {
  blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', text: 'text-blue-700' },
  green: { bg: 'bg-green-50', icon: 'bg-green-100 text-green-600', text: 'text-green-700' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-700' },
  orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', text: 'text-orange-700' },
  red: { bg: 'bg-red-50', icon: 'bg-red-100 text-red-600', text: 'text-red-700' },
  amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', text: 'text-amber-700' },
}

export function StatCard({ icon: Icon, value, label, trend, color = 'blue', size = 'md', index = 0 }: Props) {
  const config = colorConfig[color]
  
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  }

  const valueSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  }

  const iconSizes = {
    sm: 20,
    md: 24,
    lg: 28,
  }

  return (
    <div
      style={{ animationDelay: `${index * 100}ms` }}
      className={`bg-white rounded-2xl ${sizeClasses[size]} border border-gray-100 shadow-sm stagger-item`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${config.icon}`}>
          <Icon size={iconSizes[size]} />
        </div>
        {trend && (
          <span
            className={`text-sm px-2.5 py-1 rounded-lg font-semibold ${
              trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className={`${valueSizes[size]} font-bold text-gray-900`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1 font-medium">{label}</p>
    </div>
  )
}
