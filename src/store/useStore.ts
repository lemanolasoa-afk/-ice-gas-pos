import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem, Product, Sale, SaleItem, QueuedOperation, GasSaleType } from '../types'
import { supabase } from '../lib/supabase'
import { NotificationTriggers } from '../lib/notificationTriggers'

interface POSStore {
  // State
  products: Product[]
  cart: CartItem[]
  sales: Sale[]
  isLoading: boolean
  error: string | null
  isOnline: boolean
  offlineQueue: QueuedOperation[]

  // Product Actions
  fetchProducts: () => Promise<void>
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>

  // Cart Actions
  addToCart: (product: Product, gasSaleType?: GasSaleType) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  updateGasSaleType: (productId: string, gasSaleType: GasSaleType) => void
  clearCart: () => void
  getTotal: () => number
  getDepositTotal: () => number  // รวมค่ามัดจำ

  // Sale Actions
  completeSale: (payment: number, options?: {
    customerId?: string
    discountAmount?: number
    pointsUsed?: number
    pointsEarned?: number
    paymentMethod?: 'cash' | 'transfer' | 'credit'
    note?: string
  }) => Promise<Sale | null>
  fetchSales: () => Promise<void>
  
  // Stock Actions
  updateStock: (productId: string, quantity: number) => Promise<void>

  // Offline Actions
  setOnline: (status: boolean) => void
  queueOperation: (operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries'>) => void
  processQueue: () => Promise<void>

  // Error Actions
  clearError: () => void
}

export const useStore = create<POSStore>()(
  persist(
    (set, get) => ({
      // Initial State
      products: [],
      cart: [],
      sales: [],
      isLoading: false,
      error: null,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      offlineQueue: [],

      // Product Actions
      fetchProducts: async () => {
        set({ isLoading: true, error: null })
        try {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('category')
          
          if (error) throw error
          set({ products: data || [], isLoading: false })
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false })
        }
      },

      addProduct: async (product) => {
        const { isOnline } = get()
        // Generate ID for new product
        const newProduct = {
          ...product,
          id: `${product.category}-${Date.now()}`
        }
        
        if (!isOnline) {
          get().queueOperation({ type: 'product_create', payload: newProduct })
          set((state) => ({
            products: [...state.products, { ...newProduct, created_at: new Date().toISOString() } as Product]
          }))
          return
        }

        set({ isLoading: true, error: null })
        try {
          const { data, error } = await supabase
            .from('products')
            .insert(newProduct)
            .select()
            .single()
          
          if (error) throw error
          set((state) => ({
            products: [...state.products, data],
            isLoading: false
          }))
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false })
        }
      },

      updateProduct: async (id, updates) => {
        const { isOnline } = get()
        if (!isOnline) {
          get().queueOperation({ type: 'product_update', payload: { id, updates } })
          return
        }

        set({ isLoading: true, error: null })
        try {
          const { error } = await supabase
            .from('products')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
          
          if (error) throw error
          set((state) => ({
            products: state.products.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            ),
            isLoading: false
          }))
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false })
        }
      },

      deleteProduct: async (id) => {
        const { isOnline } = get()
        if (!isOnline) {
          get().queueOperation({ type: 'product_delete', payload: { id } })
          return
        }

        set({ isLoading: true, error: null })
        try {
          const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id)
          
          if (error) throw error
          set((state) => ({
            products: state.products.filter((p) => p.id !== id),
            isLoading: false
          }))
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false })
        }
      },

      // Cart Actions
      addToCart: (product, gasSaleType) => {
        set((state) => {
          // สำหรับแก๊ส ต้องเช็ค gasSaleType ด้วย
          const existing = state.cart.find((item) => 
            item.product.id === product.id && 
            item.gasSaleType === gasSaleType
          )
          if (existing) {
            return {
              cart: state.cart.map((item) =>
                item.product.id === product.id && item.gasSaleType === gasSaleType
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              )
            }
          }
          // Default gasSaleType เป็น 'exchange' สำหรับแก๊ส
          const saleType = product.category === 'gas' ? (gasSaleType || 'exchange') : undefined
          return { cart: [...state.cart, { product, quantity: 1, gasSaleType: saleType }] }
        })
      },

      removeFromCart: (productId) => {
        set((state) => ({
          cart: state.cart.filter((item) => item.product.id !== productId)
        }))
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId)
          return
        }
        set((state) => ({
          cart: state.cart.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item
          )
        }))
      },

      updateGasSaleType: (productId, gasSaleType) => {
        set((state) => ({
          cart: state.cart.map((item) =>
            item.product.id === productId ? { ...item, gasSaleType } : item
          )
        }))
      },

      clearCart: () => set({ cart: [] }),

      getTotal: () => {
        return get().cart.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        )
      },

      getDepositTotal: () => {
        return get().cart.reduce((sum, item) => {
          if (item.product.category === 'gas' && item.gasSaleType === 'deposit') {
            return sum + (item.product.deposit_amount || 0) * item.quantity
          }
          return sum
        }, 0)
      },

      // Sale Actions
      completeSale: async (payment, options = {}) => {
        const baseTotal = get().getTotal()
        const discountAmount = options.discountAmount || 0
        const total = Math.max(0, baseTotal - discountAmount)
        const paymentMethod = options.paymentMethod || 'cash'
        
        // For cash, payment must be >= total. For transfer/credit, payment equals total
        if (paymentMethod === 'cash' && payment < total) return null

        const cart = get().cart
        const saleItems: SaleItem[] = cart.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          subtotal: item.product.price * item.quantity,
          gas_sale_type: item.gasSaleType,
          deposit_amount: item.gasSaleType === 'deposit' ? (item.product.deposit_amount || 0) : 0
        }))

        // Generate UUID for sale
        const saleId = crypto.randomUUID()
        const saleData = {
          id: saleId,
          total,
          payment,
          change: paymentMethod === 'cash' ? payment - total : 0,
          customer_id: options.customerId || null,
          discount_amount: discountAmount,
          points_used: options.pointsUsed || 0,
          points_earned: options.pointsEarned || 0,
          payment_method: paymentMethod,
          note: options.note || null
        }

        const { isOnline } = get()
        if (!isOnline) {
          // Queue for later sync
          const tempSale: Sale = {
            id: `temp-${Date.now()}`,
            items: saleItems,
            total,
            payment,
            change: payment - total,
            created_at: new Date().toISOString()
          }
          get().queueOperation({ type: 'sale', payload: { sale: saleData, items: saleItems } })
          set((state) => ({
            sales: [tempSale, ...state.sales],
            cart: []
          }))
          return tempSale
        }

        set({ isLoading: true, error: null })
        try {
          // Insert sale
          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert(saleData)
            .select()
            .single()

          if (saleError) throw saleError

          // Insert sale items
          const itemsWithSaleId = saleItems.map((item) => ({
            ...item,
            sale_id: sale.id
          }))

          const { error: itemsError } = await supabase
            .from('sale_items')
            .insert(itemsWithSaleId)

          if (itemsError) throw itemsError

          const completedSale: Sale = {
            id: sale.id,
            items: saleItems,
            total: sale.total,
            payment: sale.payment,
            change: sale.change,
            payment_method: sale.payment_method,
            note: sale.note,
            created_at: sale.timestamp || new Date().toISOString()
          }

          // Deduct stock and update empty_stock for gas cylinders
          for (const item of cart) {
            await get().updateStock(item.product.id, -item.quantity)
            
            // สำหรับแก๊ส: ถ้าแลกถัง ให้เพิ่ม empty_stock
            if (item.product.category === 'gas' && item.gasSaleType === 'exchange') {
              await supabase
                .from('products')
                .update({ 
                  empty_stock: (item.product.empty_stock || 0) + item.quantity,
                  updated_at: new Date().toISOString()
                })
                .eq('id', item.product.id)
            }
          }

          set((state) => ({
            sales: [completedSale, ...state.sales],
            cart: [],
            isLoading: false
          }))

          // Trigger notifications
          try {
            // Check low stock after sale
            await NotificationTriggers.checkLowStock()
            
            // Check daily target
            const todayTotal = await NotificationTriggers.getTodaySalesTotal()
            await NotificationTriggers.checkDailyTarget(todayTotal)
          } catch (notifError) {
            console.error('Notification error:', notifError)
          }

          return completedSale
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false })
          return null
        }
      },

      fetchSales: async () => {
        set({ isLoading: true, error: null })
        try {
          const { data: sales, error: salesError } = await supabase
            .from('sales')
            .select('*')
            .order('timestamp', { ascending: false })

          if (salesError) throw salesError

          // Fetch items for each sale
          const salesWithItems: Sale[] = await Promise.all(
            (sales || []).map(async (sale) => {
              const { data: items } = await supabase
                .from('sale_items')
                .select('*')
                .eq('sale_id', sale.id)

              return {
                ...sale,
                created_at: sale.timestamp, // Map timestamp to created_at for interface compatibility
                items: items || []
              }
            })
          )

          set({ sales: salesWithItems, isLoading: false })
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false })
        }
      },

      // Stock Actions
      updateStock: async (productId, quantity) => {
        const { isOnline, products } = get()
        const product = products.find(p => p.id === productId)
        if (!product) return

        const newStock = Math.max(0, product.stock + quantity)
        
        // Update local state immediately
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId ? { ...p, stock: newStock } : p
          )
        }))

        if (!isOnline) {
          get().queueOperation({ type: 'product_update', payload: { id: productId, updates: { stock: newStock } } })
          return
        }

        try {
          await supabase
            .from('products')
            .update({ stock: newStock, updated_at: new Date().toISOString() })
            .eq('id', productId)
        } catch (err) {
          console.error('Failed to update stock:', err)
        }
      },

      // Offline Actions
      setOnline: (status) => {
        set({ isOnline: status })
        if (status) {
          get().processQueue()
        }
      },

      queueOperation: (operation) => {
        const queuedOp: QueuedOperation = {
          id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...operation,
          timestamp: new Date().toISOString(),
          retries: 0
        }
        set((state) => ({
          offlineQueue: [...state.offlineQueue, queuedOp]
        }))
      },

      clearError: () => set({ error: null }),

      processQueue: async () => {
        const { offlineQueue, isOnline } = get()
        if (!isOnline || offlineQueue.length === 0) return

        const MAX_RETRIES = 3
        const BACKOFF_DELAYS = [1000, 2000, 4000] // 1s, 2s, 4s exponential backoff

        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

        const processOperation = async (operation: QueuedOperation): Promise<boolean> => {
          try {
            switch (operation.type) {
              case 'sale': {
                const { sale, items } = operation.payload as { sale: { id: string; total: number; payment: number; change: number }; items: SaleItem[] }
                const { data: newSale, error: saleError } = await supabase
                  .from('sales')
                  .insert(sale)
                  .select()
                  .single()

                if (saleError) throw saleError

                const itemsWithSaleId = items.map((item) => ({
                  ...item,
                  sale_id: newSale.id
                }))

                await supabase.from('sale_items').insert(itemsWithSaleId)
                break
              }
              case 'product_create': {
                await supabase.from('products').insert(operation.payload)
                break
              }
              case 'product_update': {
                const { id, updates } = operation.payload as { id: string; updates: object }
                await supabase.from('products').update(updates).eq('id', id)
                break
              }
              case 'product_delete': {
                const { id } = operation.payload as { id: string }
                await supabase.from('products').delete().eq('id', id)
                break
              }
            }
            return true
          } catch (err) {
            console.error('Failed to process operation:', err)
            return false
          }
        }

        const executeWithRetry = async (operation: QueuedOperation): Promise<boolean> => {
          let retryCount = operation.retries

          // Initial attempt
          let success = await processOperation(operation)
          if (success) return true

          // Retry with exponential backoff (max 3 retries: 1s, 2s, 4s)
          while (retryCount < MAX_RETRIES) {
            const delay = BACKOFF_DELAYS[retryCount]
            console.log(`Retry ${retryCount + 1}/${MAX_RETRIES} for operation ${operation.id} after ${delay}ms`)
            await sleep(delay)

            retryCount++
            // Update retry count in state
            set((state) => ({
              offlineQueue: state.offlineQueue.map((op) =>
                op.id === operation.id ? { ...op, retries: retryCount } : op
              )
            }))

            success = await processOperation(operation)
            if (success) return true
          }

          return false
        }

        for (const operation of offlineQueue) {
          const success = await executeWithRetry(operation)

          if (success) {
            // Remove processed operation from queue
            set((state) => ({
              offlineQueue: state.offlineQueue.filter((op) => op.id !== operation.id)
            }))
          } else {
            // Max retries reached - keep in queue but log error
            console.error(`Operation ${operation.id} failed after ${MAX_RETRIES} retries`)
            set({ error: `Sync failed for operation. Will retry later.` })
          }
        }

        // Refresh data after processing queue
        await get().fetchProducts()
        await get().fetchSales()

        // Notify sync complete if any operations were processed
        const processedCount = offlineQueue.length - get().offlineQueue.length
        if (processedCount > 0) {
          try {
            // Get current user from authStore (if available)
            const authState = JSON.parse(localStorage.getItem('auth-storage') || '{}')
            const userId = authState?.state?.user?.id
            if (userId) {
              await NotificationTriggers.notifySyncComplete(userId, processedCount)
            }
          } catch (notifError) {
            console.error('Sync notification error:', notifError)
          }
        }
      }
    }),
    {
      name: 'ice-gas-pos-storage',
      partialize: (state) => ({
        cart: state.cart,
        offlineQueue: state.offlineQueue
      })
    }
  )
)
