import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Permission, hasAnyPermission, getFallbackRoute } from '../lib/permissions'

interface Props {
  children: React.ReactNode
  permissions?: Permission[]
  fallback?: string
}

export function ProtectedRoute({ children, permissions = [], fallback }: Props) {
  const { user } = useAuthStore()

  // If no permissions required, allow access
  if (permissions.length === 0) {
    return <>{children}</>
  }

  // Check if user has required permissions
  if (!hasAnyPermission(user?.role, permissions)) {
    const redirectTo = fallback || getFallbackRoute(user?.role, window.location.pathname)
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

// Hook for checking permissions in components
export function usePermission(permission: Permission): boolean {
  const { user } = useAuthStore()
  return hasAnyPermission(user?.role, [permission])
}

// Hook for checking multiple permissions
export function usePermissions(permissions: Permission[]): boolean {
  const { user } = useAuthStore()
  return hasAnyPermission(user?.role, permissions)
}
