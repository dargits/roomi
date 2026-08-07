import React, { createContext, useContext, useState, useCallback, useId } from 'react';
import { NOTIFICATION_DURATION_MS } from '../utils/constants';

const NotificationContext = createContext(null);

/**
 * NotificationProvider replaces the single-slot notification in App.jsx.
 * Supports:
 * - Multiple simultaneous notifications (queue / stack)
 * - Manual dismiss
 * - type: 'success' | 'error' | 'warning'
 * - Auto-dismiss after NOTIFICATION_DURATION_MS
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  /**
   * Show a toast notification.
   * @param {string} message - The message to display
   * @param {'success'|'error'|'warning'} type - Visual type
   */
  const showNotification = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setNotifications(prev => [
      ...prev,
      { id, message, type },
    ]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, NOTIFICATION_DURATION_MS);
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}

      {/* Notification stack - renders on top of everything */}
      {notifications.length > 0 && (
        <div className="notification-stack" role="region" aria-label="Thông báo hệ thống">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`notification notification-${n.type}`}
              role="alert"
              aria-live="polite"
            >
              <span>{n.message}</span>
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
