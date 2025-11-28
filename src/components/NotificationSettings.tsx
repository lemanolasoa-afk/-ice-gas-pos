import { useState, useEffect } from 'react'
import { Bell, BellOff, Package, Target, RefreshCw, ShoppingCart, CreditCard, Loader2 } from 'lucide-react'
import { PushManager } from '../lib/pushManager'
import { NotificationTriggers } from '../lib/notificationTriggers'
import { useAuthStore } from '../store/authStore'

interface Settings {
  enabled: boolean
  low_stock: boolean
  daily_target: boolean
  sync_complete: boolean
  sale_complete: boolean
  credit_due: boolean
  daily_target_amount: number
}

export function NotificationSettings() {
  const { user } = useAuthStore()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Settings>({
    enabled: true,
    low_stock: true,
    daily_target: true,
    sync_complete: false,
    sale_complete: false,
    credit_due: true,
    daily_target_amount: 10000
  })

  useEffect(() => {
    checkSupport()
    loadSettings()
  }, [user])

  const checkSupport = async () => {
    const supported = PushManager.isSupported()
    setIsSupported(supported)
    
    if (supported) {
      setPermission(PushManager.getPermission())
      const subscribed = await PushManager.isSubscribed()
      setIsSubscribed(subscribed)
    }
  }

  const loadSettings = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    const data = await NotificationTriggers.getSettings(user.id)
    if (data) {
      setSettings({
        enabled: data.enabled,
        low_stock: data.low_stock,
        daily_target: data.daily_target,
        sync_complete: data.sync_complete,
        sale_complete: data.sale_complete,
        credit_due: data.credit_due,
        daily_target_amount: data.daily_target_amount
      })
    }
    setLoading(false)
  }


  const handleEnableNotifications = async () => {
    setSaving(true)
    const perm = await PushManager.requestPermission()
    setPermission(perm)

    if (perm === 'granted' && user) {
      await PushManager.subscribe(user.id)
      setIsSubscribed(true)
    }
    setSaving(false)
  }

  const handleDisableNotifications = async () => {
    setSaving(true)
    await PushManager.unsubscribe()
    setIsSubscribed(false)
    setSaving(false)
  }

  const updateSetting = async (key: keyof Settings, value: boolean | number) => {
    if (!user) return

    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)

    setSaving(true)
    await NotificationTriggers.updateSettings(user.id, {
      enabled: newSettings.enabled,
      low_stock: newSettings.low_stock,
      daily_target: newSettings.daily_target,
      sync_complete: newSettings.sync_complete,
      sale_complete: newSettings.sale_complete,
      credit_due: newSettings.credit_due,
      daily_target_amount: newSettings.daily_target_amount
    })
    setSaving(false)
  }

  const testNotification = async () => {
    await PushManager.showLocalNotification({
      title: '🔔 ทดสอบการแจ้งเตือน',
      body: 'การแจ้งเตือนทำงานปกติ!',
      tag: 'test'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
      </div>
    )
  }

  if (!isSupported) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-amber-700 text-sm">
          เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">การแจ้งเตือน</h3>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-sky-500" />}
      </div>

      {/* Permission Status */}
      {permission === 'denied' ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">
            การแจ้งเตือนถูกปิดกั้น กรุณาเปิดในการตั้งค่าเบราว์เซอร์
          </p>
        </div>
      ) : !isSubscribed ? (
        <button
          onClick={handleEnableNotifications}
          disabled={saving}
          className="w-full bg-sky-500 text-white py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          เปิดการแจ้งเตือน
        </button>
      ) : (
        <div className="space-y-3">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-sky-500" />
              <span className="text-sm font-medium">เปิดการแจ้งเตือน</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => updateSetting('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>

          {settings.enabled && (
            <>
              {/* Low Stock */}
              <SettingRow
                icon={<Package className="w-5 h-5 text-amber-500" />}
                label="สินค้าใกล้หมด"
                checked={settings.low_stock}
                onChange={(v) => updateSetting('low_stock', v)}
              />

              {/* Daily Target */}
              <div className="p-3 bg-white rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium">ยอดขายถึงเป้า</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.daily_target}
                      onChange={(e) => updateSetting('daily_target', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>
                {settings.daily_target && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-500">เป้าหมาย:</span>
                    <input
                      type="number"
                      value={settings.daily_target_amount}
                      onChange={(e) => updateSetting('daily_target_amount', Number(e.target.value))}
                      className="w-24 px-2 py-1 border rounded text-sm"
                    />
                    <span className="text-xs text-gray-500">บาท</span>
                  </div>
                )}
              </div>

              {/* Sync Complete */}
              <SettingRow
                icon={<RefreshCw className="w-5 h-5 text-blue-500" />}
                label="ซิงค์ข้อมูลสำเร็จ"
                checked={settings.sync_complete}
                onChange={(v) => updateSetting('sync_complete', v)}
              />

              {/* Sale Complete */}
              <SettingRow
                icon={<ShoppingCart className="w-5 h-5 text-purple-500" />}
                label="ขายสำเร็จ"
                checked={settings.sale_complete}
                onChange={(v) => updateSetting('sale_complete', v)}
              />

              {/* Credit Due */}
              <SettingRow
                icon={<CreditCard className="w-5 h-5 text-red-500" />}
                label="วางบิลครบกำหนด"
                checked={settings.credit_due}
                onChange={(v) => updateSetting('credit_due', v)}
              />
            </>
          )}

          {/* Test & Disable Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={testNotification}
              className="flex-1 text-sky-600 py-2 text-sm border border-sky-200 rounded-lg"
            >
              ทดสอบ
            </button>
            <button
              onClick={handleDisableNotifications}
              disabled={saving}
              className="flex-1 text-red-500 py-2 text-sm flex items-center justify-center gap-1"
            >
              <BellOff className="w-4 h-4" />
              ปิดทั้งหมด
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingRow({
  icon,
  label,
  checked,
  onChange
}: {
  icon: React.ReactNode
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
      </label>
    </div>
  )
}
