import React, { useState, useEffect, useRef } from 'react';
import { 
  IoCheckmarkCircle, 
  IoAlertCircle, 
  IoWarning, 
  IoInformationCircle, 
  IoClose 
} from 'react-icons/io5';

const TOAST_STYLES = {
  success: {
    container: 'bg-white border-l-4 border-emerald-500 shadow-emerald-500/10',
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50',
    titleColor: 'text-emerald-950',
    barColor: 'bg-emerald-500',
    Icon: IoCheckmarkCircle
  },
  error: {
    container: 'bg-white border-l-4 border-rose-500 shadow-rose-500/10',
    iconColor: 'text-rose-500',
    iconBg: 'bg-rose-50',
    titleColor: 'text-rose-950',
    barColor: 'bg-rose-500',
    Icon: IoAlertCircle
  },
  warning: {
    container: 'bg-white border-l-4 border-amber-500 shadow-amber-500/10',
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
    titleColor: 'text-amber-950',
    barColor: 'bg-amber-500',
    Icon: IoWarning
  },
  info: {
    container: 'bg-white border-l-4 border-primary shadow-primary/10',
    iconColor: 'text-primary',
    iconBg: 'bg-sky-50',
    titleColor: 'text-slate-900',
    barColor: 'bg-primary',
    Icon: IoInformationCircle
  }
};

const ToastItem = ({ toast, onClose }) => {
  const { id, type = 'info', title, message, duration = 4000 } = toast;
  const style = TOAST_STYLES[type] || TOAST_STYLES.info;
  const IconComponent = style.Icon;

  const [isPaused, setIsPaused] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [progress, setProgress] = useState(100);

  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(duration);
  const animationFrameRef = useRef(null);

  const triggerClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose(id);
    }, 250); // Match fade/slide-out animation duration
  };

  useEffect(() => {
    if (duration <= 0) return;

    let start = Date.now();
    let currentRemaining = remainingTimeRef.current;

    const tick = () => {
      if (isPaused) return;

      const elapsed = Date.now() - start;
      const newRemaining = Math.max(0, currentRemaining - elapsed);
      remainingTimeRef.current = newRemaining;
      
      const newPercent = (newRemaining / duration) * 100;
      setProgress(newPercent);

      if (newRemaining <= 0) {
        triggerClose();
      } else {
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };

    if (!isPaused) {
      start = Date.now();
      currentRemaining = remainingTimeRef.current;
      animationFrameRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPaused, duration]);

  return (
    <div
      role="alert"
      className={`relative overflow-hidden rounded-lg shadow-xl border border-slate-200/80 p-4 transition-all duration-300 pointer-events-auto transform ${
        style.container
      } ${
        isClosing 
          ? 'opacity-0 translate-x-8 scale-95' 
          : 'opacity-100 translate-x-0 scale-100 animate-slide-in-right'
      }`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className={`p-2 rounded-full shrink-0 ${style.iconBg} ${style.iconColor}`}>
          <IconComponent className="w-5 h-5" />
        </div>

        {/* Message Content */}
        <div className="flex-1 pt-0.5 pr-2 min-w-0">
          {title && (
            <h4 className={`text-sm font-bold tracking-normal uppercase-none leading-5 ${style.titleColor}`}>
              {title}
            </h4>
          )}
          {message && (
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed break-words font-normal normal-case">
              {message}
            </p>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={triggerClose}
          aria-label="Đóng thông báo"
          className="btn-override text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-md transition-colors shrink-0 normal-case font-normal"
        >
          <IoClose className="w-4 h-4" />
        </button>
      </div>

      {/* Countdown Progress Bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
          <div
            className={`h-full transition-all duration-75 ${style.barColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default ToastItem;
