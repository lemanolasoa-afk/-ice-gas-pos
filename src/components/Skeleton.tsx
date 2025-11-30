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

// Melt Loss Stock Count Card Skeleton
export function StockCountCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton variant="rounded" width={44} height={44} />
        <div className="flex-1">
          <Skeleton width="60%" height={20} />
          <Skeleton width="40%" height={14} className="mt-1" />
        </div>
      </div>

      {/* Stock Info Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
            <Skeleton width="80%" height={12} className="mx-auto mb-1" />
            <Skeleton width="50%" height={24} className="mx-auto" />
            <Skeleton width="40%" height={12} className="mx-auto mt-1" />
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="mb-4">
        <Skeleton width="40%" height={16} className="mb-2" />
        <Skeleton width="100%" height={48} variant="rounded" />
      </div>

      {/* Result */}
      <Skeleton width="100%" height={80} variant="rounded" />
    </div>
  )
}

export function StockCountListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <StockCountCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Melt Loss Report Skeleton
export function MeltLossReportSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <Skeleton width={120} height={20} className="mb-4" />
        <Skeleton width="100%" height={200} variant="rounded" />
      </div>

      {/* By Product Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <Skeleton width={150} height={20} />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex justify-between items-start mb-1">
                <Skeleton width="40%" height={18} />
                <Skeleton width="20%" height={18} />
              </div>
              <div className="flex justify-between mb-2">
                <Skeleton width="50%" height={14} />
                <Skeleton width="15%" height={14} />
              </div>
              <Skeleton width="100%" height={8} variant="rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Records */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <Skeleton width={100} height={20} />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex justify-between items-start">
                <div>
                  <Skeleton width={120} height={18} />
                  <Skeleton width={80} height={14} className="mt-1" />
                </div>
                <div className="text-right">
                  <Skeleton width={40} height={18} />
                  <Skeleton width={30} height={14} className="mt-1 ml-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
