/**
 * iOS-specific support utilities
 */

// Detect iOS device
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

// Detect if running as PWA on iOS
export function isIOSPWA(): boolean {
  if (!isIOS()) return false
  return (navigator as any).standalone === true
}

// Detect Safari browser
export function isSafari(): boolean {
  if (typeof window === 'undefined') return false
  
  const ua = navigator.userAgent
  return /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua)
}

// Check if iOS version supports push notifications (iOS 16.4+)
export function supportsIOSPush(): boolean {
  if (!isIOS()) return false
  
  // Check for iOS 16.4+ by checking for Push API support
  return 'PushManager' in window && isIOSPWA()
}

// Get iOS version
export function getIOSVersion(): number | null {
  if (!isIOS()) return null
  
  const match = navigator.userAgent.match(/OS (\d+)_/)
  return match ? parseInt(match[1], 10) : null
}

// iOS install instructions
export interface IOSInstallStep {
  step: number
  icon: string
  text: string
}

export function getIOSInstallInstructions(): IOSInstallStep[] {
  return [
    {
      step: 1,
      icon: '📤',
      text: 'กดปุ่ม "แชร์" (Share) ที่ด้านล่างของ Safari'
    },
    {
      step: 2,
      icon: '📱',
      text: 'เลื่อนลงแล้วกด "เพิ่มไปยังหน้าจอหลัก" (Add to Home Screen)'
    },
    {
      step: 3,
      icon: '✅',
      text: 'กด "เพิ่ม" (Add) ที่มุมบนขวา'
    },
    {
      step: 4,
      icon: '🎉',
      text: 'เปิดแอปจากหน้าจอหลักได้เลย!'
    }
  ]
}

// Fix iOS input zoom issue
export function preventIOSZoom(): void {
  if (!isIOS()) return

  // Add font-size: 16px to inputs to prevent zoom
  const style = document.createElement('style')
  style.textContent = `
    @supports (-webkit-touch-callout: none) {
      input, select, textarea {
        font-size: 16px !important;
      }
    }
  `
  document.head.appendChild(style)
}

// Fix iOS 100vh issue
export function fixIOSViewportHeight(): void {
  if (!isIOS()) return

  const setVH = () => {
    const vh = window.innerHeight * 0.01
    document.documentElement.style.setProperty('--vh', `${vh}px`)
  }

  setVH()
  window.addEventListener('resize', setVH)
  window.addEventListener('orientationchange', () => {
    setTimeout(setVH, 100)
  })
}

// Handle iOS keyboard
export function handleIOSKeyboard(): void {
  if (!isIOS()) return

  // Scroll input into view when keyboard opens
  document.addEventListener('focusin', (e) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  })
}

// Initialize all iOS fixes
export function initIOSSupport(): void {
  if (!isIOS()) return

  preventIOSZoom()
  fixIOSViewportHeight()
  handleIOSKeyboard()
}

// Check if should show iOS install prompt
export function shouldShowIOSInstallPrompt(): boolean {
  if (!isIOS()) return false
  if (isIOSPWA()) return false
  if (!isSafari()) return false
  
  // Check if user dismissed the prompt recently
  const dismissed = localStorage.getItem('ios-install-dismissed')
  if (dismissed) {
    const dismissedTime = parseInt(dismissed, 10)
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
    if (daysSinceDismissed < 7) return false // Don't show for 7 days
  }
  
  return true
}

// Dismiss iOS install prompt
export function dismissIOSInstallPrompt(): void {
  localStorage.setItem('ios-install-dismissed', Date.now().toString())
}
