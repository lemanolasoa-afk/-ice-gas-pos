import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

interface ShortcutConfig {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return
    }

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey
      const altMatch = shortcut.alt ? e.altKey : !e.altKey
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        e.preventDefault()
        shortcut.action()
        break
      }
    }
  }, [shortcuts])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Pre-defined navigation shortcuts
export function useNavigationShortcuts() {
  const navigate = useNavigate()

  useKeyboardShortcuts([
    { key: '1', action: () => navigate('/'), description: 'ไปหน้าขาย' },
    { key: '2', action: () => navigate('/cart'), description: 'ไปตะกร้า' },
    { key: '3', action: () => navigate('/history'), description: 'ไปประวัติ' },
    { key: '4', action: () => navigate('/dashboard'), description: 'ไป Dashboard' },
    { key: '5', action: () => navigate('/products'), description: 'ไปสินค้า' },
    { key: 's', ctrl: true, action: () => navigate('/settings'), description: 'ไปตั้งค่า' },
  ])
}

// Shortcut help display
export const SHORTCUT_HELP = [
  { keys: '1', description: 'หน้าขาย (POS)' },
  { keys: '2', description: 'ตะกร้าสินค้า' },
  { keys: '3', description: 'ประวัติการขาย' },
  { keys: '4', description: 'Dashboard' },
  { keys: '5', description: 'จัดการสินค้า' },
  { keys: 'Ctrl+S', description: 'ตั้งค่า' },
]
