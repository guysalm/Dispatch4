import { useState, useCallback } from 'react'

interface Notification {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

export const useNotification = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info', duration = 4000) => {
    const id = Math.random().toString(36).substr(2, 9)
    const notification: Notification = { id, message, type, duration }
    
    setNotifications(prev => [...prev, notification])
    
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }, duration)
    }
    
    return id
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const showSuccess = useCallback((message: string, duration?: number) => {
    return showNotification(message, 'success', duration)
  }, [showNotification])

  const showError = useCallback((message: string, duration?: number) => {
    return showNotification(message, 'error', duration)
  }, [showNotification])

  const showInfo = useCallback((message: string, duration?: number) => {
    return showNotification(message, 'info', duration)
  }, [showNotification])

  return {
    notifications,
    showNotification,
    removeNotification,
    showSuccess,
    showError,
    showInfo
  }
}