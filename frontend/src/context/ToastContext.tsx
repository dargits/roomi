import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  ReactNode
} from 'react';
import ToastContainer from '../components/ui/Toast/ToastContainer';
import ConfirmDialog from '../components/ui/Toast/ConfirmDialog';
import { ToastData, ToastType } from '../components/ui/Toast/ToastItem';

export interface ShowToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ConfirmDialogConfig {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'error' | 'info';
}

export interface ToastContextType {
  toasts: ToastData[];
  showToast: (options: ShowToastOptions) => string | number | null;
  removeToast: (id: string | number) => void;
  success: (msg: string, title?: string, dur?: number) => string | number | null;
  error: (msg: string, title?: string, dur?: number) => string | number | null;
  warning: (msg: string, title?: string, dur?: number) => string | number | null;
  info: (msg: string, title?: string, dur?: number) => string | number | null;
  toastSuccess: (msg: string, title?: string, dur?: number) => string | number | null;
  toastError: (msg: string, title?: string, dur?: number) => string | number | null;
  toastWarning: (msg: string, title?: string, dur?: number) => string | number | null;
  toastInfo: (msg: string, title?: string, dur?: number) => string | number | null;
  confirm: (options: string | ConfirmDialogConfig) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Global event bus for non-hook usage (e.g. toast.success(...) anywhere)
const toastListeners = new Set<(options: ShowToastOptions) => void>();
let globalConfirmHandler: ((options: string | ConfirmDialogConfig) => Promise<boolean>) | null = null;

export const toast = {
  show: (options: ShowToastOptions) => {
    toastListeners.forEach((listener) => listener(options));
  },
  success: (message: string, title = 'Thành công', duration = 2000) => {
    toast.show({ type: 'success', message, title, duration });
  },
  error: (message: string, title = 'Lỗi', duration = 2000) => {
    toast.show({ type: 'error', message, title, duration });
  },
  warning: (message: string, title = 'Cảnh báo', duration = 2000) => {
    toast.show({ type: 'warning', message, title, duration });
  },
  info: (message: string, title = 'Thông báo', duration = 2000) => {
    toast.show({ type: 'info', message, title, duration });
  },
  confirm: (options: string | ConfirmDialogConfig): Promise<boolean> => {
    if (globalConfirmHandler) {
      return globalConfirmHandler(options);
    }
    return Promise.resolve(
      window.confirm(typeof options === 'string' ? options : options?.message || 'Xác nhận?')
    );
  }
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    type: 'warning' | 'danger' | 'error' | 'info';
    resolve: ((val: boolean) => void) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    type: 'warning',
    resolve: null
  });

  const lastToastRef = useRef<{ message: string; time: number }>({ message: '', time: 0 });

  const removeToast = useCallback((id: string | number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type = 'info', title, message, duration = 2000 }: ShowToastOptions): string | number | null => {
      const now = Date.now();
      if (message && lastToastRef.current.message === message && now - lastToastRef.current.time < 1500) {
        return null;
      }
      lastToastRef.current = { message, time: now };

      const id = Date.now() + Math.random().toString(36).substring(2, 9);
      const newToast: ToastData = {
        id,
        type,
        title:
          title ||
          (type === 'success'
            ? 'Thành công'
            : type === 'error'
            ? 'Lỗi'
            : type === 'warning'
            ? 'Cảnh báo'
            : 'Thông báo'),
        message,
        duration
      };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        if (updated.length > 5) {
          return updated.slice(updated.length - 5);
        }
        return updated;
      });

      return id;
    },
    []
  );

  const confirm = useCallback((options: string | ConfirmDialogConfig): Promise<boolean> => {
    return new Promise((resolve) => {
      let config: ConfirmDialogConfig = {};
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
        title: config.title || 'Xác nhận thao tác',
        message: config.message || '',
        confirmText: config.confirmText || 'Đồng ý',
        cancelText: config.cancelText || 'Hủy',
        type: config.type || 'warning',
        resolve
      });
    });
  }, []);

  const handleConfirmClose = useCallback((result: boolean) => {
    setConfirmDialog((prev) => {
      if (prev.resolve) {
        prev.resolve(result);
      }
      return { ...prev, isOpen: false, resolve: null };
    });
  }, []);

  useEffect(() => {
    const handleGlobalToast = (options: ShowToastOptions) => {
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

  const success = useCallback(
    (msg: string, title?: string, dur = 2000) => showToast({ type: 'success', message: msg, title, duration: dur }),
    [showToast]
  );
  const error = useCallback(
    (msg: string, title?: string, dur = 2000) => showToast({ type: 'error', message: msg, title, duration: dur }),
    [showToast]
  );
  const warning = useCallback(
    (msg: string, title?: string, dur = 2000) => showToast({ type: 'warning', message: msg, title, duration: dur }),
    [showToast]
  );
  const info = useCallback(
    (msg: string, title?: string, dur = 2000) => showToast({ type: 'info', message: msg, title, duration: dur }),
    [showToast]
  );

  const value: ToastContextType = useMemo(
    () => ({
      toasts,
      showToast,
      removeToast,
      success,
      error,
      warning,
      info,
      toastSuccess: success,
      toastError: error,
      toastWarning: warning,
      toastInfo: info,
      confirm
    }),
    [toasts, showToast, removeToast, success, error, warning, info, confirm]
  );

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

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toasts: [],
      showToast: (options) => {
        toast.show(options);
        return null;
      },
      removeToast: () => {},
      success: (msg, title, dur) => {
        toast.success(msg, title, dur);
        return null;
      },
      error: (msg, title, dur) => {
        toast.error(msg, title, dur);
        return null;
      },
      warning: (msg, title, dur) => {
        toast.warning(msg, title, dur);
        return null;
      },
      info: (msg, title, dur) => {
        toast.info(msg, title, dur);
        return null;
      },
      toastSuccess: (msg, title, dur) => {
        toast.success(msg, title, dur);
        return null;
      },
      toastError: (msg, title, dur) => {
        toast.error(msg, title, dur);
        return null;
      },
      toastWarning: (msg, title, dur) => {
        toast.warning(msg, title, dur);
        return null;
      },
      toastInfo: (msg, title, dur) => {
        toast.info(msg, title, dur);
        return null;
      },
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
