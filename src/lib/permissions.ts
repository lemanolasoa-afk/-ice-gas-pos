// Permission configuration for role-based access control

export type UserRole = 'admin' | 'cashier'

export type Permission =
  | 'pos.sell'           // ขายสินค้า
  | 'pos.scan_barcode'   // สแกน barcode
  | 'history.view'       // ดูประวัติการขาย
  | 'history.print'      // พิมพ์ใบเสร็จ
  | 'dashboard.view'     // ดู dashboard
  | 'dashboard.stats'    // ดูสถิติละเอียด
  | 'products.view'      // ดูสินค้า
  | 'products.manage'    // เพิ่ม/แก้ไข/ลบสินค้า
  | 'products.import'    // นำเข้า/ส่งออกสินค้า
  | 'stock.receive'      // รับสินค้าเข้าสต็อก
  | 'stock.logs'         // ดูประวัติสต็อก
  | 'reports.view'       // ดูรายงานยอดขาย
  | 'reports.profit'     // ดูรายงานกำไร
  | 'customers.view'     // ดูลูกค้า
  | 'customers.manage'   // จัดการลูกค้า
  | 'discounts.view'     // ดูโปรโมชั่น
  | 'discounts.manage'   // จัดการโปรโมชั่น
  | 'users.manage'       // จัดการผู้ใช้
  | 'settings.export'    // ส่งออกข้อมูล
  | 'settings.clear'     // ล้างข้อมูล

// Permission matrix for each role
const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    'pos.sell',
    'pos.scan_barcode',
    'history.view',
    'history.print',
    'dashboard.view',
    'dashboard.stats',
    'products.view',
    'products.manage',
    'products.import',
    'stock.receive',
    'stock.logs',
    'reports.view',
    'reports.profit',
    'customers.view',
    'customers.manage',
    'discounts.view',
    'discounts.manage',
    'users.manage',
    'settings.export',
    'settings.clear',
  ],
  cashier: [
    'pos.sell',
    'pos.scan_barcode',
    'history.view',
    'history.print',
    'dashboard.view',
    'products.view',
    'customers.view',
    'stock.receive',    // เพิ่มสต็อก/รับสินค้าเข้า
    'stock.logs',       // ดูประวัติสต็อก
  ],
}

// Check if a role has a specific permission
export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false
  return rolePermissions[role]?.includes(permission) ?? false
}

// Check if a role has any of the specified permissions
export function hasAnyPermission(role: UserRole | undefined, permissions: Permission[]): boolean {
  if (!role) return false
  return permissions.some(p => hasPermission(role, p))
}

// Check if a role has all of the specified permissions
export function hasAllPermissions(role: UserRole | undefined, permissions: Permission[]): boolean {
  if (!role) return false
  return permissions.every(p => hasPermission(role, p))
}

// Get all permissions for a role
export function getPermissions(role: UserRole | undefined): Permission[] {
  if (!role) return []
  return rolePermissions[role] ?? []
}

// Route permission mapping
export interface RouteConfig {
  path: string
  permissions: Permission[]
  fallback?: string
}

export const routePermissions: RouteConfig[] = [
  { path: '/', permissions: ['pos.sell'] },
  { path: '/dashboard', permissions: ['dashboard.view'] },
  { path: '/history', permissions: ['history.view'] },
  { path: '/products', permissions: ['products.view'] },
  { path: '/stock-receipt', permissions: ['stock.receive'], fallback: '/products' },
  { path: '/stock-logs', permissions: ['stock.logs'], fallback: '/products' },
  { path: '/reports', permissions: ['reports.view'], fallback: '/dashboard' },
  { path: '/profit', permissions: ['reports.profit'], fallback: '/dashboard' },
  { path: '/customers', permissions: ['customers.view'] },
  { path: '/discounts', permissions: ['discounts.view'], fallback: '/settings' },
  { path: '/users', permissions: ['users.manage'], fallback: '/settings' },
  { path: '/settings', permissions: [] }, // Everyone can access settings
]

// Check if user can access a route
export function canAccessRoute(role: UserRole | undefined, path: string): boolean {
  const config = routePermissions.find(r => r.path === path)
  if (!config) return true // Allow unknown routes
  if (config.permissions.length === 0) return true // No permissions required
  return hasAnyPermission(role, config.permissions)
}

// Get fallback route if user can't access
export function getFallbackRoute(role: UserRole | undefined, path: string): string {
  const config = routePermissions.find(r => r.path === path)
  if (!config || canAccessRoute(role, path)) return path
  return config.fallback || '/dashboard'
}
