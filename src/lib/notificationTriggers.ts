import { supabase } from './supabase'
import { PushManager, NotificationPayload } from './pushManager'

export type NotificationType = 
  | 'low_stock'
  | 'daily_target'
  | 'sync_complete'
  | 'sale_complete'
  | 'credit_due'
  | 'system'

// Flag to use Edge Function for push notifications (server-side)
// Set to true when VAPID keys are configured on the server
const USE_EDGE_FUNCTION = true

interface NotificationSettings {
  user_id: string
  enabled: boolean
  low_stock: boolean
  daily_target: boolean
  sync_complete: boolean
  sale_complete: boolean
  credit_due: boolean
  daily_target_amount: number
}

export class NotificationTriggers {
  /**
   * Check and send low stock notifications
   */
  static async checkLowStock(): Promise<void> {
    // Get low stock products
    const { data: products } = await supabase
      .from('products')
      .select('*')

    const lowStockProducts = products?.filter(p => p.stock <= p.low_stock_threshold) || []

    if (lowStockProducts.length === 0) return

    // Send notifications for each low stock product
    for (const product of lowStockProducts) {
      if (USE_EDGE_FUNCTION) {
        // Use Edge Function for server-side push
        await PushManager.sendLowStockAlert(product.name, product.stock, product.unit)
      } else {
        // Fallback to local notification
        const { data: settings } = await supabase
          .from('notification_settings')
          .select('user_id')
          .eq('low_stock', true)
          .eq('enabled', true)

        if (!settings?.length) continue

        const payload: NotificationPayload = {
          title: '⚠️ สินค้าใกล้หมด',
          body: `${product.name} เหลือ ${product.stock} ${product.unit}`,
          tag: `low-stock-${product.id}`,
          data: {
            type: 'low_stock' as NotificationType,
            productId: product.id,
            url: '/products'
          }
        }

        for (const setting of settings) {
          await this.logNotification(setting.user_id, 'low_stock', payload)
          await PushManager.showLocalNotification(payload)
        }
      }
    }
  }

  /**
   * Check and send daily target notification
   */
  static async checkDailyTarget(currentTotal: number): Promise<void> {
    // Get the minimum daily target to check if we should send notification
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('user_id, daily_target_amount')
      .eq('daily_target', true)
      .eq('enabled', true)

    if (!settings?.length) return

    // Check if any user's target has been reached
    const targetReached = settings.some(s => currentTotal >= s.daily_target_amount)
    if (!targetReached) return

    if (USE_EDGE_FUNCTION) {
      // Use Edge Function for server-side push
      await PushManager.sendDailyTargetReached(currentTotal)
    } else {
      // Fallback to local notification
      for (const setting of settings) {
        if (currentTotal >= setting.daily_target_amount) {
          const payload: NotificationPayload = {
            title: '🎉 ยอดขายถึงเป้า!',
            body: `วันนี้ขายได้ ${currentTotal.toLocaleString()} บาท`,
            tag: `daily-target-${new Date().toISOString().split('T')[0]}`,
            data: {
              type: 'daily_target' as NotificationType,
              url: '/dashboard'
            }
          }

          await this.logNotification(setting.user_id, 'daily_target', payload)
          await PushManager.showLocalNotification(payload)
        }
      }
    }
  }

  /**
   * Send sale complete notification
   */
  static async notifySaleComplete(
    userId: string,
    sale: { total: number; itemCount: number }
  ): Promise<void> {
    // Check if user has sale_complete enabled
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('sale_complete, enabled')
      .eq('user_id', userId)
      .single()

    if (!settings?.sale_complete || !settings?.enabled) return

    const payload: NotificationPayload = {
      title: '✅ ขายสำเร็จ',
      body: `${sale.itemCount} รายการ - ${sale.total.toLocaleString()} บาท`,
      tag: 'sale-complete',
      data: {
        type: 'sale_complete' as NotificationType,
        url: '/history'
      }
    }

    await this.logNotification(userId, 'sale_complete', payload)
    await PushManager.showLocalNotification(payload)
  }

  /**
   * Send sync complete notification
   */
  static async notifySyncComplete(userId: string, count: number): Promise<void> {
    // Check if user has sync_complete enabled
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('sync_complete, enabled')
      .eq('user_id', userId)
      .single()

    if (!settings?.sync_complete || !settings?.enabled) return

    const payload: NotificationPayload = {
      title: '✅ ซิงค์ข้อมูลสำเร็จ',
      body: `อัพเดท ${count} รายการ`,
      tag: 'sync-complete',
      silent: true,
      data: {
        type: 'sync_complete' as NotificationType,
        count
      }
    }

    await this.logNotification(userId, 'sync_complete', payload)
    await PushManager.showLocalNotification(payload)
  }

  /**
   * Send credit due notification
   */
  static async notifyCreditDue(
    userId: string,
    customer: { name: string; amount: number }
  ): Promise<void> {
    if (USE_EDGE_FUNCTION) {
      // Use Edge Function for server-side push
      await PushManager.sendCreditDueReminder(customer.name, customer.amount)
    } else {
      // Fallback to local notification
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('credit_due, enabled')
        .eq('user_id', userId)
        .single()

      if (!settings?.credit_due || !settings?.enabled) return

      const payload: NotificationPayload = {
        title: '💰 วางบิลครบกำหนด',
        body: `${customer.name} - ${customer.amount.toLocaleString()} บาท`,
        tag: `credit-due-${customer.name}`,
        data: {
          type: 'credit_due' as NotificationType,
          url: '/customers'
        }
      }

      await this.logNotification(userId, 'credit_due', payload)
      await PushManager.showLocalNotification(payload)
    }
  }

  /**
   * Get today's sales total
   */
  static async getTodaySalesTotal(): Promise<number> {
    const today = new Date().toISOString().split('T')[0]
    
    const { data: sales } = await supabase
      .from('sales')
      .select('total')
      .gte('timestamp', `${today}T00:00:00`)
      .lte('timestamp', `${today}T23:59:59`)

    return sales?.reduce((sum, s) => sum + Number(s.total), 0) || 0
  }

  /**
   * Log notification to database
   */
  private static async logNotification(
    userId: string,
    type: NotificationType,
    payload: NotificationPayload
  ): Promise<void> {
    await supabase.from('notification_logs').insert({
      user_id: userId,
      type,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sent_at: new Date().toISOString()
    })
  }

  /**
   * Get notification settings for user
   */
  static async getSettings(userId: string): Promise<NotificationSettings | null> {
    const { data } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    return data
  }

  /**
   * Update notification settings
   */
  static async updateSettings(
    userId: string,
    settings: Partial<NotificationSettings>
  ): Promise<boolean> {
    const { error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: userId,
        ...settings
      })

    return !error
  }
}
