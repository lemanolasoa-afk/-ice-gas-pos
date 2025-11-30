/**
 * useNetworkPrinter Hook - React hook for iMin Inner Printer (Network)
 * 
 * Provides state and actions for managing network printer connection
 * via HTTP for iMin devices with built-in thermal printers.
 */

import { useState, useCallback } from 'react'
import { 
  networkPrinter, 
  type NetworkPrinterSettings 
} from '../lib/networkPrinter'
import type { ReceiptData } from '../lib/bluetoothPrinter'

interface NetworkPrinterState {
  isConnected: boolean
  printerIp: string
  settings: NetworkPrinterSettings
  isPrinting: boolean
  isConnecting: boolean
  error: string | null
}

interface UseNetworkPrinterReturn extends NetworkPrinterState {
  connect: (ip?: string, port?: number) => Promise<boolean>
  disconnect: () => void
  print: (data: ReceiptData) => Promise<boolean>
  testPrint: () => Promise<boolean>
  updateSettings: (updates: Partial<NetworkPrinterSettings>) => void
  clearError: () => void
}

export function useNetworkPrinter(): UseNetworkPrinterReturn {
  const [state, setState] = useState<NetworkPrinterState>(() => {
    const settings = networkPrinter.getSettings()
    return {
      isConnected: networkPrinter.isConnected(),
      printerIp: settings.printerIp,
      settings,
      isPrinting: false,
      isConnecting: false,
      error: null,
    }
  })

  const connect = useCallback(async (ip?: string, port?: number): Promise<boolean> => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      const success = await networkPrinter.connect(ip, port)
      const settings = networkPrinter.getSettings()
      
      setState(prev => ({
        ...prev,
        isConnected: success,
        printerIp: settings.printerIp,
        settings,
        isConnecting: false,
        error: success ? null : 'ไม่สามารถเชื่อมต่อเครื่องพิมพ์ได้',
      }))
      
      return success
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด',
      }))
      return false
    }
  }, [])

  const disconnect = useCallback((): void => {
    networkPrinter.disconnect()
    setState(prev => ({
      ...prev,
      isConnected: false,
    }))
  }, [])

  const print = useCallback(async (data: ReceiptData): Promise<boolean> => {
    setState(prev => ({ ...prev, isPrinting: true, error: null }))

    try {
      await networkPrinter.printReceipt(data)
      setState(prev => ({ ...prev, isPrinting: false }))
      return true
    } catch (error) {
      setState(prev => ({
        ...prev,
        isPrinting: false,
        error: error instanceof Error ? error.message : 'พิมพ์ไม่สำเร็จ',
      }))
      return false
    }
  }, [])

  const testPrint = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isPrinting: true, error: null }))

    try {
      await networkPrinter.testPrint()
      setState(prev => ({ ...prev, isPrinting: false }))
      return true
    } catch (error) {
      setState(prev => ({
        ...prev,
        isPrinting: false,
        error: error instanceof Error ? error.message : 'ทดสอบพิมพ์ไม่สำเร็จ',
      }))
      return false
    }
  }, [])

  const updateSettings = useCallback((updates: Partial<NetworkPrinterSettings>): void => {
    networkPrinter.updateSettings(updates)
    const settings = networkPrinter.getSettings()
    setState(prev => ({ ...prev, settings, printerIp: settings.printerIp }))
  }, [])

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

export type { NetworkPrinterSettings }
