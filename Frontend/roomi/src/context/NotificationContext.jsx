import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { NOTIFICATION_DURATION_MS } from '../utils/constants';

const NotificationContext = createContext(null);

/**
 * NotificationProvider handles toast notifications.
 * Supports:
 * - Vertical non-overlapping stack
 * - Icons for type: 'success' | 'error' | 'warning' | 'info'
 * - Manual dismiss via close button
 * - Maximum 5 visible toasts at once
 * - Auto-dismiss after NOTIFICATION_DURATION_MS
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showNotification = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setNotifications(prev => {
      const next = [...prev, { id, message, type }];
      // Keep at most 5 notifications to prevent clogging screen
      if (next.length > 5) {
        return next.slice(next.length - 5);
      }
      return next;
    });

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, NOTIFICATION_DURATION_MS || 4000);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />;
      case 'error':
        return <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />;
      case 'warning':
        return <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />;
      case 'info':
      default:
        return <Info size={18} style={{ color: '#2563eb', flexShrink: 0 }} />;
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification, dismissNotification }}>
      {children}

      {/* Notification stack - renders vertically stacked toast list */}
      {notifications.length > 0 && (
        <div className="notification-stack" role="region" aria-label="Thông báo hệ thống">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`notification notification-${n.type}`}
              role="alert"
              aria-live="polite"
            >
              {getIcon(n.type)}
              <span className="notification-message">{n.message}</span>
              <button
                type="button"
                className="notification-close"
                onClick={() => dismissNotification(n.id)}
                aria-label="Đóng thông báo"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </NotificationContext.Provider>
  );
}

/**
 * Custom hook to access the notification system.
 * Must be used inside <NotificationProvider>.
 */
export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification() must be used within a <NotificationProvider>.');
  }
  return context;
}

