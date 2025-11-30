/**
 * Library Index - Barrel Exports
 * 
 * Usage: import { supabase, printer } from '@/lib'
 */

// ===== Database =====
export { supabase } from './supabase'

// ===== Payment & Sales =====
export * from './payment'
export * from './discountEngine'
export * from './loyaltySystem'

// ===== Stock & Inventory =====
export * from './gasCylinderManager'
export * from './meltLossCalculations'

// ===== Printing =====
export { 
  printer, 
  BluetoothPrinter,
  Commands,
  encodeThaiText,
  decodeTIS620,
  isThaiChar,
  unicodeToTIS620
} from './bluetoothPrinter'
export type { 
  PrinterSettings, 
  ReceiptData, 
  ReceiptItem,
  TextAlignment,
  TextSize,
  CutType
} from './bluetoothPrinter'

// Network Printer (iMin Inner Printer)
export { networkPrinter, NetworkPrinter } from './networkPrinter'
export type { NetworkPrinterSettings } from './networkPrinter'

// ===== Reports =====
export * from './reportGenerator'

// ===== Backup =====
export * from './backupManager'

// ===== Permissions =====
export * from './permissions'

// ===== Notifications =====
export * from './pushManager'
export * from './notificationTriggers'

// ===== Utils =====
export * from './imageUpload'
export * from './iosSupport'
