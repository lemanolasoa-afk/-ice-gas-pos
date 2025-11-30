/**
 * PrinterSettings Component
 * Requirements: REQ-1, REQ-2
 * 
 * UI component for managing thermal printer settings
 * Supports both Bluetooth and Network (iMin Inner Printer) connections
 */

import { useState } from 'react'
import { 
  Printer, 
  Bluetooth, 
  BluetoothOff, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Settings,
  Store,
  Phone,
  MapPin,
  MessageSquare,
  FileText,
  Wifi,
  WifiOff
} from 'lucide-react'
import { usePrinter } from '../hooks/usePrinter'
import { useNetworkPrinter } from '../hooks/useNetworkPrinter'
import { useToast } from './Toast'

type PrinterType = 'bluetooth' | 'network'

export function PrinterSettings() {
  const [printerType, setPrinterType] = useState<PrinterType>('network')  // Default to network for iMin
  
  const bluetooth = usePrinter()
  const network = useNetworkPrinter()
  const { showToast } = useToast()

  // Use the appropriate printer based on type
  const isConnected = printerType === 'bluetooth' ? bluetooth.isConnected : network.isConnected
  const isConnecting = printerType === 'bluetooth' ? bluetooth.isConnecting : network.isConnecting
  const isPrinting = printerType === 'bluetooth' ? bluetooth.isPrinting : network.isPrinting
  const error = printerType === 'bluetooth' ? bluetooth.error : network.error
  const settings = printerType === 'bluetooth' ? bluetooth.settings : network.settings

  const [localSettings, setLocalSettings] = useState({
    storeName: settings.storeName,
    storeAddress: settings.storeAddress,
    storePhone: settings.storePhone,
    footerText: settings.footerText
  })

  const [networkIp, setNetworkIp] = useState(network.printerIp || '127.0.0.1')
  const [networkPort, setNetworkPort] = useState(network.settings.printerPort?.toString() || '8080')

  const handleInputChange = (field: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleInputBlur = (field: string) => {
    const value = localSettings[field as keyof typeof localSettings]
    if (printerType === 'bluetooth') {
      bluetooth.updateSettings({ [field]: value })
    } else {
      network.updateSettings({ [field]: value })
    }
  }

  const handlePaperWidthChange = (width: 58 | 80) => {
    if (printerType === 'bluetooth') {
      bluetooth.updateSettings({ paperWidth: width })
    } else {
      network.updateSettings({ paperWidth: width })
    }
  }

  const handleAutoPrintChange = (enabled: boolean) => {
    if (printerType === 'bluetooth') {
      bluetooth.updateSettings({ autoPrint: enabled })
    } else {
      network.updateSettings({ autoPrint: enabled })
    }
  }


  const handleConnect = async () => {
    if (printerType === 'bluetooth') {
      bluetooth.clearError()
      const success = await bluetooth.connect()
      if (success) {
        // Get the updated device name from settings after connection
        const deviceName = bluetooth.settings.deviceName || 'เครื่องพิมพ์'
        showToast('success', `เชื่อมต่อ ${deviceName} สำเร็จ`)
      }
    } else {
      network.clearError()
      const success = await network.connect(networkIp, parseInt(networkPort))
      if (success) {
        showToast('success', `เชื่อมต่อเครื่องพิมพ์ ${networkIp}:${networkPort} สำเร็จ`)
      }
    }
  }

  const handleDisconnect = () => {
    if (printerType === 'bluetooth') {
      bluetooth.disconnect()
    } else {
      network.disconnect()
    }
  }

  const handleTestPrint = async () => {
    if (printerType === 'bluetooth') {
      bluetooth.clearError()
      await bluetooth.testPrint()
    } else {
      network.clearError()
      await network.testPrint()
    }
  }

  const handleClearError = () => {
    if (printerType === 'bluetooth') {
      bluetooth.clearError()
    } else {
      network.clearError()
    }
  }

  // Not supported warning for Bluetooth
  const showBluetoothWarning = printerType === 'bluetooth' && !bluetooth.isSupported

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-gray-700">
        <Printer size={20} />
        <h3 className="font-semibold">เครื่องพิมพ์ใบเสร็จ</h3>
      </div>

      {/* Printer Type Selection */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings size={18} className="text-gray-500" />
          <span className="font-medium text-gray-700">ประเภทการเชื่อมต่อ</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setPrinterType('network')}
            className={`flex-1 py-3 rounded-lg border-2 transition-colors ${
              printerType === 'network'
                ? 'border-sky-500 bg-sky-50 text-sky-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Wifi size={20} className="mx-auto mb-1" />
            <p className="font-medium text-sm">Network (iMin)</p>
            <p className="text-xs opacity-70">Inner Printer</p>
          </button>
          <button
            onClick={() => setPrinterType('bluetooth')}
            className={`flex-1 py-3 rounded-lg border-2 transition-colors ${
              printerType === 'bluetooth'
                ? 'border-sky-500 bg-sky-50 text-sky-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Bluetooth size={20} className="mx-auto mb-1" />
            <p className="font-medium text-sm">Bluetooth</p>
            <p className="text-xs opacity-70">เครื่องพิมพ์ภายนอก</p>
          </button>
        </div>
      </div>

      {/* Bluetooth Not Supported Warning */}
      {showBluetoothWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-medium text-amber-900 mb-1">ไม่รองรับ Web Bluetooth</h3>
              <p className="text-sm text-amber-800">
                อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับ Web Bluetooth API
              </p>
              <p className="text-sm text-amber-700 mt-2">
                • ใช้ Chrome บน Android หรือ Desktop
              </p>
              <p className="text-sm text-amber-700">
                • หรือเลือก Network (iMin) แทน
              </p>
            </div>
          </div>
        </div>
      )}


      {/* Network Printer IP Settings */}
      {printerType === 'network' && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wifi size={18} className="text-gray-500" />
            <span className="font-medium text-gray-700">ที่อยู่เครื่องพิมพ์</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">IP Address</label>
              <input
                type="text"
                value={networkIp}
                onChange={(e) => setNetworkIp(e.target.value)}
                placeholder="127.0.0.1"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs text-gray-500 mb-1">Port</label>
              <input
                type="text"
                value={networkPort}
                onChange={(e) => setNetworkPort(e.target.value)}
                placeholder="8080"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            สำหรับ iMin Inner Printer ใช้ 127.0.0.1:8080 หรือ 127.0.0.1:9100
          </p>
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                {printerType === 'bluetooth' ? (
                  <Bluetooth className="text-green-600" size={20} />
                ) : (
                  <Wifi className="text-green-600" size={20} />
                )}
              </div>
            ) : (
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                {printerType === 'bluetooth' ? (
                  <BluetoothOff className="text-gray-400" size={20} />
                ) : (
                  <WifiOff className="text-gray-400" size={20} />
                )}
              </div>
            )}
            <div>
              <p className="font-medium text-gray-800">
                {isConnected ? 'เชื่อมต่อแล้ว' : 'ไม่ได้เชื่อมต่อ'}
              </p>
              {isConnected && (
                <p className="text-sm text-gray-500">
                  {printerType === 'bluetooth' 
                    ? bluetooth.deviceName 
                    : `${networkIp}:${networkPort}`}
                </p>
              )}
            </div>
          </div>

          {isConnected && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle size={16} />
              <span className="text-sm">พร้อมใช้งาน</span>
            </div>
          )}
        </div>

        {/* Connect/Disconnect Button */}
        {isConnected ? (
          <button
            onClick={handleDisconnect}
            className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50"
          >
            {printerType === 'bluetooth' ? <BluetoothOff size={18} /> : <WifiOff size={18} />}
            ยกเลิกการเชื่อมต่อ
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isConnecting || showBluetoothWarning}
            className="w-full py-2.5 bg-sky-500 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isConnecting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                กำลังเชื่อมต่อ...
              </>
            ) : (
              <>
                {printerType === 'bluetooth' ? <Bluetooth size={18} /> : <Wifi size={18} />}
                เชื่อมต่อเครื่องพิมพ์
              </>
            )}
          </button>
        )}

        {/* Error Message - User-friendly display */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">เกิดข้อผิดพลาด</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button 
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                ลองเชื่อมต่อใหม่
              </button>
              <button 
                onClick={handleClearError}
                className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
              >
                ปิด
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Paper Size Selection */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings size={18} className="text-gray-500" />
          <span className="font-medium text-gray-700">ขนาดกระดาษ</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handlePaperWidthChange(58)}
            className={`flex-1 py-3 rounded-lg border-2 transition-colors ${
              settings.paperWidth === 58
                ? 'border-sky-500 bg-sky-50 text-sky-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <p className="font-medium">58mm</p>
            <p className="text-xs opacity-70">32 ตัวอักษร/บรรทัด</p>
          </button>
          <button
            onClick={() => handlePaperWidthChange(80)}
            className={`flex-1 py-3 rounded-lg border-2 transition-colors ${
              settings.paperWidth === 80
                ? 'border-sky-500 bg-sky-50 text-sky-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <p className="font-medium">80mm</p>
            <p className="text-xs opacity-70">48 ตัวอักษร/บรรทัด</p>
          </button>
        </div>
      </div>

      {/* Store Info Settings */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Store size={18} className="text-gray-500" />
          <span className="font-medium text-gray-700">ข้อมูลร้านบนใบเสร็จ</span>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            <Store size={14} className="inline mr-1" />
            ชื่อร้าน
          </label>
          <input
            type="text"
            value={localSettings.storeName}
            onChange={(e) => handleInputChange('storeName', e.target.value)}
            onBlur={() => handleInputBlur('storeName')}
            placeholder="ชื่อร้านค้า"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            <MapPin size={14} className="inline mr-1" />
            ที่อยู่ (ไม่บังคับ)
          </label>
          <input
            type="text"
            value={localSettings.storeAddress}
            onChange={(e) => handleInputChange('storeAddress', e.target.value)}
            onBlur={() => handleInputBlur('storeAddress')}
            placeholder="ที่อยู่ร้าน"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            <Phone size={14} className="inline mr-1" />
            เบอร์โทร (ไม่บังคับ)
          </label>
          <input
            type="tel"
            value={localSettings.storePhone}
            onChange={(e) => handleInputChange('storePhone', e.target.value)}
            onBlur={() => handleInputBlur('storePhone')}
            placeholder="081-234-5678"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            <MessageSquare size={14} className="inline mr-1" />
            ข้อความท้ายใบเสร็จ
          </label>
          <input
            type="text"
            value={localSettings.footerText}
            onChange={(e) => handleInputChange('footerText', e.target.value)}
            onBlur={() => handleInputBlur('footerText')}
            placeholder="ขอบคุณที่ใช้บริการ"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Auto Print Toggle */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-gray-500" />
            <div>
              <p className="font-medium text-gray-700">พิมพ์อัตโนมัติ</p>
              <p className="text-sm text-gray-500">พิมพ์ใบเสร็จหลังขายสำเร็จ</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoPrint}
              onChange={(e) => handleAutoPrintChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
          </label>
        </div>
      </div>

      {/* Test Print Button */}
      {isConnected && (
        <button
          onClick={handleTestPrint}
          disabled={isPrinting}
          className="w-full py-3 border border-sky-500 text-sky-600 rounded-xl flex items-center justify-center gap-2 hover:bg-sky-50 disabled:opacity-50"
        >
          {isPrinting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              กำลังพิมพ์...
            </>
          ) : (
            <>
              <Printer size={18} />
              ทดสอบพิมพ์
            </>
          )}
        </button>
      )}
    </div>
  )
}
