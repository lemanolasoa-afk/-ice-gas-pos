/**
 * usePrinter Hook - React hook for Bluetooth thermal printer
 * Requirements: REQ-1, REQ-3
 * 
 * Provides state and actions for managing Bluetooth printer connection
 * and printing receipts from React components.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  printer, 
  BluetoothPrinter,
  type PrinterSettings, 
  type ReceiptData 
} from '../lib/bluetoothPrinter'

interface PrinterState {
  /** Whether Web Bluetooth API is supported on this device */
  isSupported: boolean
  /** Whether currently connected to a printer */
  isConnected: boolean
  /** Name of the connected printer device */
  deviceName: string | null
  /** Current printer settings */
  settings: PrinterSettings
  /** Whether a print operation is in progress */
  isPrinting: boolean
  /** Whether connection is in progress */
  isConnecting: boolean
  /** Last error message */
  error: string | null
}

interface UsePrinterReturn extends PrinterState {
  /** Connect to a Bluetooth printer (shows device picker) */
  connect: () => Promise<boolean>
  /** Disconnect from the current printer */
  disconnect: () => void
  /** Print a receipt */
  print: (data: ReceiptData) => Promise<boolean>
  /** Print a test page */
  testPrint: () => Promise<boolean>
  /** Update printer settings */
  updateSettings: (updates: Partial<PrinterSettings>) => void
  /** Clear the current error */
  clearError: () => void
}

/**
 * React hook for managing Bluetooth thermal printer
 * 
 * Features:
 * - Auto-reconnect on mount if previously connected
 * - State management for connection status
 * - Error handling with user-friendly messages
 * - Loading states for async operations
 * 
 * @example
 * ```tsx
 * function PrinterButton() {
 *   const { isConnected, connect, print, isPrinting } = usePrinter()
 *   
 *   if (!isConnected) {
 *     return <button onClick={connect}>เชื่อมต่อเครื่องพิมพ์</button>
 *   }
 *   
 *   return (
 *     <button onClick={() => print(receiptData)} disabled={isPrinting}>
 *       {isPrinting ? 'กำลังพิมพ์...' : 'พิมพ์ใบเสร็จ'}
 *     </button>
 *   )
 * }
 * ```
 */
export function usePrinter(): UsePrinterReturn {
  const [state, setState] = useState<PrinterState>(() => {
    const settings = printer.getSettings()
    return {
      isSupported: BluetoothPrinter.isSupported(),
      isConnected: false,
      deviceName: settings.deviceName,
      settings,
      isPrinting: false,
      isConnecting: false,
      error: null,
    }
  })

  // Track if auto-reconnect has been attempted
  const reconnectAttempted = useRef(false)

  // Set up disconnect callback for immediate UI updates when connection is lost
  useEffect(() => {
    const handleDisconnect = () => {
      console.log('usePrinter: Connection lost callback triggered')
      const settings = printer.getSettings()
      setState(prev => ({
        ...prev,
        isConnected: false,
        settings,
        error: 'การเชื่อมต่อขาดหาย กรุณาเชื่อมต่อใหม่',
      }))
    }

    // Register the disconnect callback
    printer.setOnDisconnect(handleDisconnect)

    // Cleanup on unmount
    return () => {
      printer.setOnDisconnect(null)
    }
  }, [])

  // Auto-reconnect on mount if previously connected
  useEffect(() => {
    const attemptReconnect = async () => {
      // Only attempt once
      if (reconnectAttempted.current) return
      reconnectAttempted.current = true

      const settings = printer.getSettings()
      
      // Only try to reconnect if we have a saved device
      if (!settings.deviceId || !BluetoothPrinter.isSupported()) return

      setState(prev => ({ ...prev, isConnecting: true }))

      try {
        const success = await printer.reconnect()
        if (success) {
          const updatedSettings = printer.getSettings()
          setState(prev => ({
            ...prev,
            isConnected: true,
            deviceName: updatedSettings.deviceName,
            settings: updatedSettings,
            isConnecting: false,
          }))
        } else {
          setState(prev => ({ ...prev, isConnecting: false }))
        }
      } catch {
        // Silent fail on auto-reconnect
        setState(prev => ({ ...prev, isConnecting: false }))
      }
    }

    attemptReconnect()
  }, [])

  // Sync settings when they change externally
  useEffect(() => {
    const syncSettings = () => {
      const currentSettings = printer.getSettings()
      setState(prev => ({
        ...prev,
        settings: currentSettings,
        isConnected: printer.isConnected(),
        deviceName: currentSettings.deviceName,
      }))
    }

    // Check connection status periodically (for disconnect detection)
    const interval = setInterval(syncSettings, 2000)
    return () => clearInterval(interval)
  }, [])

  /**
   * Connect to a Bluetooth printer
   * Shows the browser's Bluetooth device picker
   * AC-1.2, AC-1.3: แสดงรายการเครื่องพิมพ์และจับคู่
   */
  const connect = useCallback(async (): Promise<boolean> => {
    if (!BluetoothPrinter.isSupported()) {
      setState(prev => ({
        ...prev,
        error: 'Web Bluetooth ไม่รองรับบนอุปกรณ์นี้',
      }))
      return false
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      const success = await printer.connect()
      if (success) {
        const settings = printer.getSettings()
        setState(prev => ({
          ...prev,
          isConnected: true,
          deviceName: settings.deviceName,
          settings,
          isConnecting: false,
        }))
        return true
      }
      setState(prev => ({ ...prev, isConnecting: false }))
      return false
    } catch (error) {
      // Check if user cancelled the device picker - this is not an error, just user action
      if (isUserCancelledError(error)) {
        // Don't show error message for user cancellation - it's expected behavior
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: null, // No error message for user cancellation
        }))
        return false
      }
      
      const message = getErrorMessage(error)
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: message,
      }))
      return false
    }
  }, [])

  /**
   * Disconnect from the current printer
   * AC-1.6: ยกเลิกการเชื่อมต่อ
   */
  const disconnect = useCallback((): void => {
    printer.disconnect()
    const settings = printer.getSettings()
    setState(prev => ({
      ...prev,
      isConnected: false,
      settings,
    }))
  }, [])

  /**
   * Print a receipt
   * REQ-3: พิมพ์ใบเสร็จ
   */
  const print = useCallback(async (data: ReceiptData): Promise<boolean> => {
    if (!printer.isConnected()) {
      setState(prev => ({
        ...prev,
        error: 'ไม่ได้เชื่อมต่อเครื่องพิมพ์',
      }))
      return false
    }

    setState(prev => ({ ...prev, isPrinting: true, error: null }))

    try {
      await printer.printReceipt(data)
      setState(prev => ({ ...prev, isPrinting: false }))
      return true
    } catch (error) {
      const message = getErrorMessage(error)
      setState(prev => ({
        ...prev,
        isPrinting: false,
        error: message,
      }))
      return false
    }
  }, [])

  /**
   * Print a test page
   * Useful for verifying printer connection and settings
   */
  const testPrint = useCallback(async (): Promise<boolean> => {
    if (!printer.isConnected()) {
      setState(prev => ({
        ...prev,
        error: 'ไม่ได้เชื่อมต่อเครื่องพิมพ์',
      }))
      return false
    }

    setState(prev => ({ ...prev, isPrinting: true, error: null }))

    try {
      await printer.testPrint()
      setState(prev => ({ ...prev, isPrinting: false }))
      return true
    } catch (error) {
      const message = getErrorMessage(error)
      setState(prev => ({
        ...prev,
        isPrinting: false,
        error: message,
      }))
      return false
    }
  }, [])

  /**
   * Update printer settings
   * AC-2.1 - AC-2.6: ตั้งค่าเครื่องพิมพ์
   */
  const updateSettings = useCallback((updates: Partial<PrinterSettings>): void => {
    printer.updateSettings(updates)
    const settings = printer.getSettings()
    setState(prev => ({ ...prev, settings }))
  }, [])

  /**
   * Clear the current error
   */
  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    connect,
    disconnect,
    print,
    testPrint,
    updateSettings,
    clearError,
  }
}

/**
 * Check if error is a user cancellation (not a real error)
 * User cancellation happens when user closes the Bluetooth device picker without selecting a device
 */
function isUserCancelledError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes('user cancelled') || 
           message.includes('user canceled') ||
           message.includes('user denied') ||
           message.includes('cancelled by user') ||
           message.includes('canceled by user')
  }
  return false
}

/**
 * Check if error is a "Device not found" error
 * This can happen when:
 * - No matching Bluetooth devices are found during scan
 * - Previously paired device is no longer available
 * - Device is out of range or powered off
 */
function isDeviceNotFoundError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes('not found') || 
           message.includes('no device') ||
           message.includes('no bluetooth') ||
           message.includes('no matching') ||
           message.includes('device not available') ||
           message.includes('failed to find')
  }
  return false
}

/**
 * User-friendly error messages mapping
 * Maps technical error patterns to Thai messages that users can understand
 * 
 * Error categories:
 * - User actions (cancelled, denied)
 * - Device issues (not found, out of range, powered off)
 * - Connection issues (disconnected, lost, timeout)
 * - Printer issues (busy, buffer full, incompatible)
 * - Permission issues (denied, not allowed)
 * - System issues (Bluetooth disabled, not supported)
 */
interface ErrorMapping {
  patterns: string[]
  message: string
  suggestion?: string
}

const ERROR_MAPPINGS: ErrorMapping[] = [
  // User cancelled - not really an error
  {
    patterns: ['user cancelled', 'user canceled', 'user denied', 'cancelled by user', 'canceled by user'],
    message: 'ยกเลิกการเลือกเครื่องพิมพ์',
  },
  // Device not found
  {
    patterns: ['not found', 'no device', 'no bluetooth', 'no matching', 'device not available', 'failed to find'],
    message: 'ไม่พบเครื่องพิมพ์',
    suggestion: 'ตรวจสอบว่าเครื่องพิมพ์เปิดอยู่และอยู่ในระยะ Bluetooth',
  },
  // Service not found (incompatible printer)
  {
    patterns: ['service', 'ไม่พบ service'],
    message: 'เครื่องพิมพ์ไม่รองรับ',
    suggestion: 'กรุณาใช้เครื่องพิมพ์ที่รองรับ ESC/POS',
  },
  // Characteristic not found
  {
    patterns: ['characteristic', 'ไม่พบ characteristic'],
    message: 'ไม่พบช่องทางสื่อสาร',
    suggestion: 'กรุณาลองเชื่อมต่อใหม่',
  },
  // Connection lost / disconnected
  {
    patterns: ['disconnected', 'connection lost', 'gatt server disconnected', 'การเชื่อมต่อขาดหาย', 'ขาดหาย'],
    message: 'การเชื่อมต่อขาดหาย',
    suggestion: 'กรุณาเชื่อมต่อใหม่',
  },
  // Printer busy / buffer full
  {
    patterns: ['busy', 'buffer', 'ไม่ว่าง'],
    message: 'เครื่องพิมพ์ไม่ว่าง',
    suggestion: 'กรุณารอสักครู่แล้วลองใหม่',
  },
  // Timeout
  {
    patterns: ['timeout', 'หมดเวลา'],
    message: 'หมดเวลาการเชื่อมต่อ',
    suggestion: 'กรุณาลองใหม่',
  },
  // Permission denied
  {
    patterns: ['permission', 'denied', 'not allowed', 'ไม่มีสิทธิ์'],
    message: 'ไม่มีสิทธิ์เข้าถึงเครื่องพิมพ์',
    suggestion: 'กรุณาอนุญาตการเข้าถึง Bluetooth แล้วเชื่อมต่อใหม่',
  },
  // Write failed
  {
    patterns: ['write', 'send', 'ส่งข้อมูล'],
    message: 'ส่งข้อมูลไม่สำเร็จ',
    suggestion: 'กรุณาลองใหม่อีกครั้ง',
  },
  // GATT error
  {
    patterns: ['gatt'],
    message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
    suggestion: 'กรุณาลองเชื่อมต่อใหม่',
  },
  // Bluetooth disabled
  {
    patterns: ['adapter', 'bluetooth is disabled', 'bluetooth disabled'],
    message: 'Bluetooth ปิดอยู่',
    suggestion: 'กรุณาเปิด Bluetooth บนอุปกรณ์',
  },
  // Not connected
  {
    patterns: ['not connected', 'ไม่ได้เชื่อมต่อ'],
    message: 'ไม่ได้เชื่อมต่อเครื่องพิมพ์',
    suggestion: 'กรุณาเชื่อมต่อเครื่องพิมพ์ก่อน',
  },
  // Web Bluetooth not supported
  {
    patterns: ['web bluetooth', 'ไม่รองรับ'],
    message: 'อุปกรณ์ไม่รองรับ Bluetooth',
    suggestion: 'กรุณาใช้ Chrome บน Android หรือ Desktop',
  },
]

/**
 * Convert error to user-friendly Thai message
 * 
 * This function:
 * 1. Checks if the error message matches known patterns
 * 2. Returns a user-friendly Thai message with optional suggestion
 * 3. Falls back to the original message if it's already in Thai
 * 4. Returns a generic error message for unknown errors
 * 
 * @param error - The error to convert
 * @returns User-friendly error message in Thai
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    // Check against known error patterns
    for (const mapping of ERROR_MAPPINGS) {
      const matches = mapping.patterns.some(pattern => message.includes(pattern))
      if (matches) {
        // Return message with suggestion if available
        if (mapping.suggestion) {
          return `${mapping.message} - ${mapping.suggestion}`
        }
        return mapping.message
      }
    }
    
    // Return original message if it's already in Thai (contains Thai characters)
    // This handles errors that are already translated in bluetoothPrinter.ts
    if (/[\u0E00-\u0E7F]/.test(error.message)) {
      return error.message
    }
    
    // Generic error with original message for debugging
    return `เกิดข้อผิดพลาด: ${error.message}`
  }
  
  // Unknown error type
  return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาลองใหม่'
}

export type { PrinterSettings, ReceiptData }
