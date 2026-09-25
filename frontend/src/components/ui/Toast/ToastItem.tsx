import React, { useState, useEffect, useRef } from 'react';
import {
  IoCheckmarkCircle,
  IoAlertCircle,
  IoWarning,
  IoInformationCircle,
  IoClose
} from 'react-icons/io5';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string | number;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

const TOAST_STYLES: Record<
  ToastType,
  {
    iconColor: string;
    iconBg: string;
    barColor: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  success: {
    iconColor: 'text-[#00B63E]',
    iconBg: 'bg-emerald-50 border-emerald-200',
    barColor: 'bg-[#00B63E]',
    Icon: IoCheckmarkCircle
  },
  error: {
    iconColor: 'text-error',
    iconBg: 'bg-[#FEE2E2] border-[#FCA5A5]/50',
    barColor: 'bg-error',
    Icon: IoAlertCircle
  },
  warning: {
    iconColor: 'text-amber-700',
    iconBg: 'bg-[#FEF3C7] border-[#FDE68A]',
    barColor: 'bg-amber-500',
    Icon: IoWarning
  },
  info: {
    iconColor: 'text-[#0070F4]',
    iconBg: 'bg-blue-50 border-blue-200',
    barColor: 'bg-[#0070F4]',
    Icon: IoInformationCircle
  }
};

interface ToastItemProps {
  toast: ToastData;
  onClose: (id: string | number) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const { id, type = 'info', title, message, duration = 2000 } = toast;
  const style = TOAST_STYLES[type] || TOAST_STYLES.info;
  const IconComponent = style.Icon;

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);

  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);

  const triggerClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose(id);
    }, 250);
  };

  useEffect(() => {
    if (duration <= 0) return;

    if (!isPaused) {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(triggerClose, remainingTimeRef.current);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPaused, duration]);

  return (
    <div
      role="alert"
      className={`relative overflow-hidden rounded-2xl bg-white/98 backdrop-blur-md border border-border-grey shadow-[0_12px_32px_-4px_rgba(0,33,70,0.12),0_4px_12px_-2px_rgba(0,33,70,0.06)] p-3.5 sm:p-4 transition-all pointer-events-auto transform ${
        isClosing 
          ? 'animate-toast-slide-out' 
          : 'animate-toast-slide-in'
      }`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${style.iconBg} ${style.iconColor}`}>
          <IconComponent className="w-5 h-5" />
        </div>

        {/* Message Content */}
        <div className="flex-1 pt-0.5 pr-2 min-w-0">
          {title && (
            <h4 className="text-sm font-bold text-[#002146] tracking-tight leading-tight">
              {title}
            </h4>
          )}
          {message && (
            <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words font-medium normal-case">
              {message}
            </p>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={triggerClose}
          aria-label="Đóng thông báo"
          className="btn-override w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#002146] hover:bg-slate-100 transition-colors cursor-pointer shrink-0 border border-transparent hover:border-border-grey"
        >
          <IoClose className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-100 overflow-hidden">
          <div
            className={`h-full ${style.barColor} animate-toast-progress`}
            style={{
              animationDuration: `${duration}ms`,
              animationPlayState: isPaused ? 'paused' : 'running'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ToastItem;
