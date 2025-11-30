/**
 * Hooks Index - Barrel Exports
 * 
 * Usage: import { useCategories, useDarkMode } from '@/hooks'
 */

// ===== Data Hooks =====
export { useCategories } from './useCategories'
export { useMeltLoss } from './useMeltLoss'

// ===== UI Hooks =====
export { useConfirm, ConfirmProvider } from './useConfirm'
export { useDarkMode } from './useDarkMode'
export { useKeyboardShortcuts } from './useKeyboardShortcuts'

// ===== PWA & Native Hooks =====
export { usePWA } from './usePWA'
export { useNativeFeatures } from './useNativeFeatures'

// ===== Printer Hooks =====
export { usePrinter } from './usePrinter'
export { useNetworkPrinter } from './useNetworkPrinter'
export type { PrinterSettings, ReceiptData } from './usePrinter'
export type { NetworkPrinterSettings } from './useNetworkPrinter'
