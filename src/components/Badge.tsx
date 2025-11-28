interface Props {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default'
  size?: 'sm' | 'md'
}

const variantClasses = {
  success: 'bg-gray-100 text-gray-700',
  warning: 'bg-gray-100 text-gray-700',
  danger: 'bg-gray-200 text-gray-800',
  info: 'bg-gray-100 text-gray-700',
  default: 'bg-gray-100 text-gray-600',
}

export function Badge({ children, variant = 'default', size = 'sm' }: Props) {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses}`}>
      {children}
    </span>
  )
}
