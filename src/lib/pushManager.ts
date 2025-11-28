import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

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
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
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

    await this.registration?.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/badge-72x72.png',
      tag: payload.tag,
      data: payload.data,
      silent: payload.silent,
      vibrate: payload.silent ? undefined : [200, 100, 200]
    })
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
}
