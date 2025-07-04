import React, { useEffect } from 'react'
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react'

interface NotificationToastProps {
  message: string
  type: 'success' | 'error' | 'info'
  isVisible: boolean
  onClose: () => void
  duration?: number
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  message,
  type,
  isVisible,
  onClose,
  duration = 4000
}) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose])

  if (!isVisible) return null

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  return (
    <div className={`${getStyles()} border rounded-xl p-4 shadow-lg transform transition-all duration-300 ease-in-out ${
      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
    } max-w-sm w-full`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-relaxed">
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default NotificationToast