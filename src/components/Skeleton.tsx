interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200'
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  }

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  }

  const style: React.CSSProperties = {
    width: width,
    height: height,
  }

  return (
    <div
      className={`${baseClasses} ${animationClasses[animation]} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  )
}

// Pre-built skeleton patterns
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 border-2 border-gray-100">
      <Skeleton variant="circular" width={56} height={56} />
      <Skeleton width="80%" height={16} className="mt-2" />
      <Skeleton width="60%" height={14} />
      <Skeleton width="40%" height={20} className="mt-1" />
    </div>
  )
}

export function ProductListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function SaleCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex justify-between items-start mb-3">
        <div>
          <Skeleton width={80} height={20} />
          <Skeleton width={120} height={14} className="mt-1" />
        </div>
        <Skeleton width={60} height={24} />
      </div>
      <div className="space-y-2">
        <Skeleton width="100%" height={12} />
        <Skeleton width="80%" height={12} />
      </div>
    </div>
  )
}

export function SalesListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SaleCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <Skeleton variant="circular" width={40} height={40} />
      <Skeleton width="60%" height={24} className="mt-2" />
      <Skeleton width="40%" height={14} className="mt-1" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <Skeleton width={120} height={20} className="mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={40} variant="rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
