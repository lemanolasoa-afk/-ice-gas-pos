import { useCallback, useEffect, useState } from 'react'

/**
 * Hook for native-like features
 * - Pull to refresh
 * - Screen wake lock
 * - Haptic feedback
 * - App badge
 */
export function useNativeFeatures() {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)

  // Screen Wake Lock - keep screen on during POS operations
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        const lock = await (navigator as any).wakeLock.request('screen')
        setWakeLock(lock)
        
        lock.addEventListener('release', () => {
          setWakeLock(null)
        })
        
        return true
      } catch (err) {
        console.error('Wake lock error:', err)
        return false
      }
    }
    return false
  }, [])

  const releaseWakeLock = useCallback(async () => {
    if (wakeLock) {
      await wakeLock.release()
      setWakeLock(null)
    }
  }, [wakeLock])

  // Re-acquire wake lock when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !wakeLock) {
        // Optionally re-acquire wake lock
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [wakeLock])

  // Haptic Feedback
  const vibrate = useCallback((pattern: number | number[] = 50) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
      return true
    }
    return false
  }, [])

  // Light vibration for button press
  const tapFeedback = useCallback(() => vibrate(10), [vibrate])
  
  // Medium vibration for success
  const successFeedback = useCallback(() => vibrate([50, 30, 50]), [vibrate])
  
  // Strong vibration for error
  const errorFeedback = useCallback(() => vibrate([100, 50, 100]), [vibrate])

  // App Badge (for notification count)
  const setBadge = useCallback(async (count: number) => {
    if ('setAppBadge' in navigator) {
      try {
        if (count > 0) {
          await (navigator as any).setAppBadge(count)
        } else {
          await (navigator as any).clearAppBadge()
        }
        return true
      } catch (err) {
        console.error('Badge error:', err)
        return false
      }
    }
    return false
  }, [])

  const clearBadge = useCallback(async () => {
    if ('clearAppBadge' in navigator) {
      try {
        await (navigator as any).clearAppBadge()
        return true
      } catch (err) {
        return false
      }
    }
    return false
  }, [])

  // Share API
  const share = useCallback(async (data: ShareData) => {
    if ('share' in navigator) {
      try {
        await navigator.share(data)
        return true
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share error:', err)
        }
        return false
      }
    }
    return false
  }, [])

  const canShare = useCallback((data?: ShareData) => {
    if ('canShare' in navigator && data) {
      return navigator.canShare(data)
    }
    return 'share' in navigator
  }, [])

  return {
    // Wake Lock
    wakeLock: !!wakeLock,
    requestWakeLock,
    releaseWakeLock,
    
    // Haptic
    vibrate,
    tapFeedback,
    successFeedback,
    errorFeedback,
    
    // Badge
    setBadge,
    clearBadge,
    
    // Share
    share,
    canShare,
  }
}

/**
 * Hook for pull-to-refresh functionality
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)

  useEffect(() => {
    let startY = 0
    let isPulling = false
    const threshold = 80

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY
        isPulling = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling) return

      const currentY = e.touches[0].clientY
      const distance = currentY - startY

      if (distance > 0 && window.scrollY === 0) {
        setPullDistance(Math.min(distance, threshold * 1.5))
        
        if (distance > threshold) {
          e.preventDefault()
        }
      }
    }

    const handleTouchEnd = async () => {
      if (pullDistance > threshold && !isRefreshing) {
        setIsRefreshing(true)
        try {
          await onRefresh()
        } finally {
          setIsRefreshing(false)
        }
      }
      
      isPulling = false
      setPullDistance(0)
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onRefresh, pullDistance, isRefreshing])

  return { isRefreshing, pullDistance }
}
