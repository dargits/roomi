import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IoWarningOutline, IoTrashOutline, IoHelpCircleOutline, IoInformationCircleOutline, IoClose } from 'react-icons/io5';

const ConfirmDialog = ({
  isOpen,
  title = 'Xác nhận thao tác',
  message = '',
  confirmText = 'Đồng ý',
  cancelText = 'Hủy',
  type = 'warning',
  onConfirm,
  onCancel
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const isDanger = type === 'danger' || type === 'error';
  const isWarning = type === 'warning';

  const iconConfig = {
    danger: {
      Icon: IoTrashOutline,
      bg: 'bg-rose-100 text-rose-600',
      btn: 'bg-rose-600 hover:bg-rose-700 text-white'
    },
    error: {
      Icon: IoTrashOutline,
      bg: 'bg-rose-100 text-rose-600',
      btn: 'bg-rose-600 hover:bg-rose-700 text-white'
    },
    warning: {
      Icon: IoWarningOutline,
      bg: 'bg-amber-100 text-amber-600',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white'
    },
    info: {
      Icon: IoInformationCircleOutline,
      bg: 'bg-sky-100 text-primary',
      btn: 'bg-primary hover:bg-primary-container text-white'
    }
  };

  const currentConfig = iconConfig[type] || iconConfig.warning;
  const IconComponent = currentConfig.Icon;

  const content = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-backdrop-in"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-none shadow-2xl max-w-md w-full p-6 transform transition-all animate-modal-pop relative border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          className="btn-override absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          title="Đóng"
        >
          <IoClose className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`p-3.5 rounded-2xl shrink-0 ${currentConfig.bg}`}>
            <IconComponent className="w-6 h-6" />
          </div>

          {/* Details */}
          <div className="flex-1 pt-0.5">
            <h3 className="text-lg font-bold text-slate-900 leading-6">
              {title}
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed font-normal normal-case">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="btn-override px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors normal-case tracking-normal"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`btn-override px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all normal-case tracking-normal ${currentConfig.btn}`}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default ConfirmDialog;
