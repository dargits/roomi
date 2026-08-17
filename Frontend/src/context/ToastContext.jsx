import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import ToastContainer from '../components/ui/Toast/ToastContainer';
import ConfirmDialog from '../components/ui/Toast/ConfirmDialog';

const ToastContext = createContext(null);

// Global event bus for non-hook usage (e.g. toast.success(...) anywhere)
const toastListeners = new Set();
let globalConfirmHandler = null;

export const toast = {
  show: (options) => {
    toastListeners.forEach(listener => listener(options));
  },
  success: (message, title = 'Thành công', duration = 3500) => {
    toast.show({ type: 'success', message, title, duration });
  },
  error: (message, title = 'Lỗi', duration = 4500) => {
    toast.show({ type: 'error', message, title, duration });
  },
  warning: (message, title = 'Cảnh báo', duration = 4000) => {
    toast.show({ type: 'warning', message, title, duration });
  },
  info: (message, title = 'Thông báo', duration = 3500) => {
    toast.show({ type: 'info', message, title, duration });
  },
  confirm: (options) => {
    if (globalConfirmHandler) {
      return globalConfirmHandler(options);
    }
    // Fallback if provider not mounted yet
    return Promise.resolve(window.confirm(typeof options === 'string' ? options : (options?.message || 'Xác nhận?')));
  }
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    type: 'warning',
    resolve: null
  });

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = {
      id,
      type,
      title: title || (type === 'success' ? 'Thành công' : type === 'error' ? 'Lỗi' : type === 'warning' ? 'Cảnh báo' : 'Thông báo'),
      message,
      duration
    };

    setToasts((prev) => {
      // Keep maximum 5 toasts stacked to avoid screen clutter
      const updated = [...prev, newToast];
      if (updated.length > 5) {
        return updated.slice(updated.length - 5);
      }
      return updated;
    });

    return id;
  }, []);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      let config = {};
      if (typeof options === 'string') {
        config = {
          title: 'Xác nhận thao tác',
          message: options,
          confirmText: 'Đồng ý',
          cancelText: 'Hủy',
          type: 'warning'
        };
      } else {
        config = {
          title: options.title || 'Xác nhận thao tác',
          message: options.message || '',
          confirmText: options.confirmText || 'Đồng ý',
          cancelText: options.cancelText || 'Hủy',
          type: options.type || 'warning'
        };
      }

      setConfirmDialog({
        isOpen: true,
        ...config,
        resolve
      });
    });
  }, []);

  const handleConfirmClose = useCallback((result) => {
    setConfirmDialog((prev) => {
      if (prev.resolve) {
        prev.resolve(result);
      }
      return { ...prev, isOpen: false, resolve: null };
    });
  }, []);

  // Sync with global singleton toast listeners
  useEffect(() => {
    const handleGlobalToast = (options) => {
      showToast(options);
    };
    toastListeners.add(handleGlobalToast);
    globalConfirmHandler = confirm;

    return () => {
      toastListeners.delete(handleGlobalToast);
      if (globalConfirmHandler === confirm) {
        globalConfirmHandler = null;
      }
    };
  }, [showToast, confirm]);

  const value = {
    toasts,
    showToast,
    removeToast,
    success: (msg, title, dur) => showToast({ type: 'success', message: msg, title, duration: dur }),
    error: (msg, title, dur) => showToast({ type: 'error', message: msg, title, duration: dur }),
    warning: (msg, title, dur) => showToast({ type: 'warning', message: msg, title, duration: dur }),
    info: (msg, title, dur) => showToast({ type: 'info', message: msg, title, duration: dur }),
    confirm
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
        onConfirm={() => handleConfirmClose(true)}
        onCancel={() => handleConfirmClose(false)}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // If used outside provider, return singleton toast methods
    return {
      toasts: [],
      showToast: toast.show,
      removeToast: () => {},
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
      confirm: toast.confirm
    };
  }
  return context;
};

export const useConfirm = () => {
  const { confirm } = useToast();
  return confirm;
};

export default ToastContext;
