// components/PayPalNotifications.tsx - Composant de notifications PayPal
import React from 'react';
import { 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaInfoCircle, 
  FaTimes,
  FaPaypal 
} from 'react-icons/fa';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface PayPalNotificationsProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  className?: string;
}

const PayPalNotifications: React.FC<PayPalNotificationsProps> = ({
  notifications,
  onRemove,
  onMarkAsRead,
  className = ''
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <FaExclamationTriangle className="text-red-500" size={20} />;
      case 'warning':
        return <FaExclamationTriangle className="text-yellow-500" size={20} />;
      case 'info':
        return <FaInfoCircle className="text-blue-500" size={20} />;
      default:
        return <FaPaypal className="text-blue-500" size={20} />;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    
    return timestamp.toLocaleDateString('fr-FR');
  };

  if (notifications.length === 0) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 space-y-3 max-w-sm ${className}`}>
      {notifications.slice(0, 5).map((notification) => (
        <div
          key={notification.id}
          className={`
            ${getBackgroundColor(notification.type)} 
            border rounded-lg shadow-lg p-4 
            transform transition-all duration-300 ease-in-out
            hover:shadow-xl
            ${!notification.read ? 'ring-2 ring-opacity-50' : ''}
          `}
          onClick={() => !notification.read && onMarkAsRead(notification.id)}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(notification.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={`text-sm font-semibold ${getTextColor(notification.type)}`}>
                  {notification.title}
                </h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(notification.id);
                  }}
                  className={`
                    ml-2 p-1 rounded-full opacity-60 hover:opacity-100 
                    transition-opacity ${getTextColor(notification.type)}
                  `}
                >
                  <FaTimes size={12} />
                </button>
              </div>
              
              <p className={`text-sm mt-1 ${getTextColor(notification.type)} opacity-90`}>
                {notification.message}
              </p>
              
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs ${getTextColor(notification.type)} opacity-70`}>
                  {formatTime(notification.timestamp)}
                </span>
                
                {!notification.read && (
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PayPalNotifications;