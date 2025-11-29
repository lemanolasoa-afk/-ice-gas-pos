import { supabase } from './supabase'

// @ts-expect-error - Vite env types
const VAPID_PUBLIC_KEY = import.meta.env?.VITE_VAPID_PUBLIC_KEY || ''
const SUPABASE_URL = 'https://diuqqgbldqmokhthvjsx.supabase.co'

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
  actions?: Array<{ action: string; title: string }>
  silent?: boolean
}

export interface SendPushResult {
  success: boolean
  sent?: number
  failed?: number
  total?: number
  message?: string
  error?: string
}

export class PushManager {
  private static registration: ServiceWorkerRegistration | null = null

  /**
   * Initialize push notifications
   */
  static async init(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported')
      return false
    }

    try {
      this.registration = await navigator.serviceWorker.ready
      return true
    } catch (error) {
      console.error('Service worker not ready:', error)
      return false
    }
  }

  /**
   * Check if push is supported
   */
  static isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window
  }

  /**
   * Request notification permission
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied'
    }
    return await Notification.requestPermission()
  }

  /**
   * Get current permission status
   */
  static getPermission(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied'
    }
    return Notification.permission
  }


  /**
   * Subscribe to push notifications
   */
  static async subscribe(userId: string): Promise<PushSubscription | null> {
    if (!this.registration) {
      const initialized = await this.init()
      if (!initialized) return null
    }

    try {
      // Check if VAPID key is configured
      if (!VAPID_PUBLIC_KEY) {
        console.warn('VAPID_PUBLIC_KEY not configured')
        return null
      }

      const subscription = await this.registration!.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
      })

      // Save subscription to database
      const subscriptionJson = subscription.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        endpoint: subscriptionJson.endpoint,
        p256dh: subscriptionJson.keys?.p256dh,
        auth: subscriptionJson.keys?.auth,
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        },
        last_used_at: new Date().toISOString()
      }, {
        onConflict: 'endpoint'
      })

      if (error) {
        console.error('Failed to save subscription:', error)
        return null
      }

      return subscription
    } catch (error) {
      console.error('Failed to subscribe:', error)
      return null
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  static async unsubscribe(): Promise<boolean> {
    if (!this.registration) {
      await this.init()
    }

    try {
      const subscription = await this.registration?.pushManager.getSubscription()
      if (subscription) {
        // Remove from database first
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint)

        // Then unsubscribe
        await subscription.unsubscribe()
      }
      return true
    } catch (error) {
      console.error('Failed to unsubscribe:', error)
      return false
    }
  }

  /**
   * Check if currently subscribed
   */
  static async isSubscribed(): Promise<boolean> {
    if (!this.registration) {
      const initialized = await this.init()
      if (!initialized) return false
    }

    try {
      const subscription = await this.registration?.pushManager.getSubscription()
      return !!subscription
    } catch {
      return false
    }
  }

  /**
   * Get current subscription
   */
  static async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.init()
    }
    return await this.registration?.pushManager.getSubscription() || null
  }

  /**
   * Send local notification (for testing or offline)
   */
  static async showLocalNotification(payload: NotificationPayload): Promise<void> {
    if (!this.registration) {
      await this.init()
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted')
      return
    }

    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/badge-72x72.png',
      tag: payload.tag,
      data: payload.data,
      silent: payload.silent,
    }
    
    await this.registration?.showNotification(payload.title, options)
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  /**
   * Send push notification to a specific user via Edge Function
   */
  static async sendPushToUser(userId: string, payload: NotificationPayload): Promise<SendPushResult> {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token

      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          user_id: userId,
          payload,
        }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Failed to send push notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Send push notification to users by role via Edge Function
   * @param role - 'admin' | 'cashier' | 'all'
   * @param notificationType - 'low_stock' | 'daily_target' | 'credit_due' | 'system'
   * @param payload - Notification content
   */
  static async sendPushToRole(
    role: 'admin' | 'cashier' | 'all',
    notificationType: string,
    payload: NotificationPayload
  ): Promise<SendPushResult> {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token

      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push-to-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          role,
          notification_type: notificationType,
          payload,
        }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Failed to send push notification to role:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Send low stock alert to admins
   */
  static async sendLowStockAlert(productName: string, currentStock: number, unit: string): Promise<SendPushResult> {
    return this.sendPushToRole('admin', 'low_stock', {
      title: '⚠️ สินค้าใกล้หมด',
      body: `${productName} เหลือ ${currentStock} ${unit}`,
      tag: `low-stock-${productName}`,
      data: {
        type: 'low_stock',
        url: '/products',
      },
    })
  }

  /**
   * Send daily target reached notification
   */
  static async sendDailyTargetReached(totalSales: number): Promise<SendPushResult> {
    return this.sendPushToRole('all', 'daily_target', {
      title: '🎉 ยอดขายถึงเป้า!',
      body: `วันนี้ขายได้ ${totalSales.toLocaleString()} บาท`,
      tag: `daily-target-${new Date().toISOString().split('T')[0]}`,
      data: {
        type: 'daily_target',
        url: '/dashboard',
      },
    })
  }

  /**
   * Send credit due reminder
   */
  static async sendCreditDueReminder(customerName: string, amount: number): Promise<SendPushResult> {
    return this.sendPushToRole('admin', 'credit_due', {
      title: '💰 วางบิลครบกำหนด',
      body: `${customerName} - ${amount.toLocaleString()} บาท`,
      tag: `credit-due-${customerName}`,
      data: {
        type: 'credit_due',
        url: '/customers',
      },
    })
  }
}
