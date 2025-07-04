import React from 'react'
import NotificationToast from './NotificationToast'

interface NotificationContainerProps {
  notifications: Array<{
    id: string
    message: string
    type: 'success' | 'error' | 'info'
    duration?: number
  }>
  onRemove: (id: string) => void
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onRemove
}) => {
  return (
    <div className="fixed top-4 left-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{ 
            transform: `translateY(${index * 10}px)`,
            zIndex: 1000 - index
          }}
        >
          <NotificationToast
            message={notification.message}
            type={notification.type}
            isVisible={true}
            onClose={() => onRemove(notification.id)}
            duration={notification.duration}
          />
        </div>
      ))}
    </div>
  )
}

export default NotificationContainer