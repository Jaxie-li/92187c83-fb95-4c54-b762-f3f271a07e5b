'use client'

import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useEffect, useState } from 'react'

export function NetworkStatusIndicator() {
  const { isOnline } = useNetworkStatus()
  const [showOfflineNotice, setShowOfflineNotice] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setShowOfflineNotice(true)
    } else {
      // Delay hiding the notice for better UX
      const timer = setTimeout(() => {
        setShowOfflineNotice(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline])

  if (!showOfflineNotice) return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 p-2 text-center text-white transition-all duration-300 ${
        isOnline ? 'bg-green-600' : 'bg-red-600'
      }`}
    >
      {isOnline ? (
        <span>Back online! You can now send messages.</span>
      ) : (
        <span>You&apos;re offline. You can view your chat history but cannot send new messages.</span>
      )}
    </div>
  )
}