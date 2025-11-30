import { useEffect, useRef, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { POSPage } from './pages/POSPage'
import { CartPage } from './pages/CartPage'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProductsPage } from './pages/ProductsPage'
import { ReportsPage } from './pages/ReportsPage'
import { CustomersPage } from './pages/CustomersPage'
import { DiscountsPage } from './pages/DiscountsPage'
import { StockReceiptPage } from './pages/StockReceiptPage'
import { UsersPage } from './pages/UsersPage'
import { StockLogsPage } from './pages/StockLogsPage'
import { ProfitReportPage } from './pages/ProfitReportPage'
import { CylinderReturnPage } from './pages/CylinderReturnPage'
import { BackupPage } from './pages/BackupPage'
import { StockReportPage } from './pages/StockReportPage'
import { CustomerReportPage } from './pages/CustomerReportPage'
import { DailyStockCountPage } from './pages/DailyStockCountPage'
import { MeltLossReportPage } from './pages/MeltLossReportPage'
import { AdminPanelPage } from './pages/AdminPanelPage'
import { BottomNav } from './components/BottomNav'
import { InstallPrompt } from './components/InstallPrompt'
import { LoginModal } from './components/LoginModal'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ToastProvider, useToast } from './components/Toast'
import { ConfirmProvider } from './hooks/useConfirm'
import { useNavigationShortcuts } from './hooks/useKeyboardShortcuts'
import { useStore } from './store/useStore'
import { useAuthStore } from './store/authStore'

function AppContent() {
  // Enable keyboard shortcuts for navigation
  useNavigationShortcuts()
  const setOnline = useStore((state) => state.setOnline)
  const isOnline = useStore((state) => state.isOnline)
  const offlineQueue = useStore((state) => state.offlineQueue)
  const error = useStore((state) => state.error)
  const clearError = useStore((state) => state.clearError)
  const { showToast } = useToast()
  const { user } = useAuthStore()
  const [showLogin, setShowLogin] = useState(!user)
  
  // Track previous values for change detection
  const prevOnlineRef = useRef(isOnline)
  const prevQueueLengthRef = useRef(offlineQueue.length)
  const prevErrorRef = useRef<string | null>(null)

  // Add online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
    }

    const handleOffline = () => {
      setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Set initial status
    setOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline])

  // Show toast notifications for online/offline status changes
  useEffect(() => {
    if (prevOnlineRef.current !== isOnline) {
      if (isOnline) {
        showToast('sync', 'กลับมาออนไลน์แล้ว กำลังซิงค์ข้อมูล...', 3000)
      } else {
        showToast('offline', 'ออฟไลน์ - ข้อมูลจะซิงค์เมื่อเชื่อมต่ออินเทอร์เน็ต', 4000)
      }
      prevOnlineRef.current = isOnline
    }
  }, [isOnline, showToast])

  // Show toast when queue is processed (items synced)
  useEffect(() => {
    const prevLength = prevQueueLengthRef.current
    const currentLength = offlineQueue.length
    
    // If queue decreased and we're online, items were synced
    if (prevLength > 0 && currentLength < prevLength && isOnline) {
      const syncedCount = prevLength - currentLength
      if (currentLength === 0) {
        showToast('success', `ซิงค์ข้อมูลสำเร็จ ${syncedCount} รายการ`, 3000)
      }
    }
    
    prevQueueLengthRef.current = currentLength
  }, [offlineQueue.length, isOnline, showToast])

  // Show toast when sync error occurs
  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      // Check if it's a sync-related error
      if (error.includes('Sync failed') || error.includes('sync')) {
        showToast('error', `การซิงค์ล้มเหลว - ระบบจะลองใหม่อัตโนมัติ`, 4000)
      } else if (error) {
        showToast('error', error, 4000)
      }
      // Clear error after showing toast
      clearError()
    }
    prevErrorRef.current = error
  }, [error, showToast, clearError])

  return (
    <div className="max-w-lg mx-auto bg-slate-100 min-h-screen">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-center py-2 text-sm font-medium">
          ออฟไลน์ - ข้อมูลจะซิงค์เมื่อเชื่อมต่ออินเทอร์เน็ต
          {offlineQueue.length > 0 && ` (${offlineQueue.length} รายการรอซิงค์)`}
        </div>
      )}
      <Routes>
        <Route path="/dashboard" element={
          <ProtectedRoute permissions={['dashboard.view']}>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/" element={
          <ProtectedRoute permissions={['pos.sell']}>
            <POSPage />
          </ProtectedRoute>
        } />
        <Route path="/cart" element={
          <ProtectedRoute permissions={['pos.sell']}>
            <CartPage />
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute permissions={['history.view']}>
            <HistoryPage />
          </ProtectedRoute>
        } />
        <Route path="/products" element={
          <ProtectedRoute permissions={['products.view']}>
            <ProductsPage />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute permissions={['reports.view']} fallback="/dashboard">
            <ReportsPage />
          </ProtectedRoute>
        } />
        <Route path="/customers" element={
          <ProtectedRoute permissions={['customers.view']}>
            <CustomersPage />
          </ProtectedRoute>
        } />
        <Route path="/discounts" element={
          <ProtectedRoute permissions={['discounts.view']} fallback="/settings">
            <DiscountsPage />
          </ProtectedRoute>
        } />
        <Route path="/stock-receipt" element={
          <ProtectedRoute permissions={['stock.receive']} fallback="/products">
            <StockReceiptPage />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute permissions={['users.manage']} fallback="/settings">
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path="/stock-logs" element={
          <ProtectedRoute permissions={['stock.logs']} fallback="/products">
            <StockLogsPage />
          </ProtectedRoute>
        } />
        <Route path="/profit" element={
          <ProtectedRoute permissions={['reports.profit']} fallback="/dashboard">
            <ProfitReportPage />
          </ProtectedRoute>
        } />
        <Route path="/cylinder-return" element={
          <ProtectedRoute permissions={['stock.receive']} fallback="/products">
            <CylinderReturnPage />
          </ProtectedRoute>
        } />
        <Route path="/backup" element={
          <ProtectedRoute permissions={['settings.export']} fallback="/settings">
            <BackupPage />
          </ProtectedRoute>
        } />
        <Route path="/stock-report" element={
          <ProtectedRoute permissions={['reports.view']} fallback="/dashboard">
            <StockReportPage />
          </ProtectedRoute>
        } />
        <Route path="/customer-report" element={
          <ProtectedRoute permissions={['reports.view']} fallback="/dashboard">
            <CustomerReportPage />
          </ProtectedRoute>
        } />
        <Route path="/daily-stock-count" element={
          <ProtectedRoute permissions={['stock.receive']} fallback="/products">
            <DailyStockCountPage />
          </ProtectedRoute>
        } />
        <Route path="/melt-loss-report" element={
          <ProtectedRoute permissions={['reports.view']} fallback="/dashboard">
            <MeltLossReportPage />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute permissions={['dashboard.stats']} fallback="/dashboard">
            <AdminPanelPage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <BottomNav />
      <InstallPrompt />
      
      {/* Login Modal */}
      {showLogin && <LoginModal onSuccess={() => setShowLogin(false)} />}
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AppContent />
      </ConfirmProvider>
    </ToastProvider>
  )
}

export default App
