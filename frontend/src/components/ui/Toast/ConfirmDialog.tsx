import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  IoWarningOutline,
  IoTrashOutline,
  IoInformationCircleOutline,
  IoAlertCircleOutline,
  IoLockClosedOutline,
  IoCheckmarkCircleOutline,
  IoCloseOutline
} from 'react-icons/io5';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'error' | 'info' | 'success';
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = 'Xác nhận thao tác',
  message = '',
  confirmText = 'Đồng ý',
  cancelText = 'Hủy',
  type = 'warning',
  icon: customIcon,
  onConfirm,
  onCancel
}) => {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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

  // Determine appropriate icon dynamically if not explicitly specified
  const getIcon = () => {
    if (customIcon) return customIcon;
    const lower = (title + ' ' + message).toLowerCase();
    if (lower.includes('khóa') || lower.includes('lock')) {
      return IoLockClosedOutline;
    }
    if (
      lower.includes('xóa') ||
      lower.includes('xoa') ||
      lower.includes('delete') ||
      lower.includes('hủy liên kết') ||
      lower.includes('remove')
    ) {
      return IoTrashOutline;
    }
    if (type === 'danger' || type === 'error') {
      return IoAlertCircleOutline;
    }
    if (type === 'warning') {
      return IoWarningOutline;
    }
    if (type === 'success') {
      return IoCheckmarkCircleOutline;
    }
    return IoInformationCircleOutline;
  };

  const IconComponent = getIcon();

  const iconConfig: Record<string, { bg: string; btn: string }> = {
    danger: {
      bg: 'bg-[#FEE2E2]/70 text-error border-[#FCA5A5]/40',
      btn: 'bg-error hover:bg-red-700 text-white border-error hover:border-red-700 shadow-xs hover:shadow-sm'
    },
    error: {
      bg: 'bg-[#FEE2E2]/70 text-error border-[#FCA5A5]/40',
      btn: 'bg-error hover:bg-red-700 text-white border-error hover:border-red-700 shadow-xs hover:shadow-sm'
    },
    warning: {
      bg: 'bg-[#FEF3C7] text-amber-700 border-amber-200/80',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 hover:border-amber-700 shadow-xs hover:shadow-sm'
    },
    info: {
      bg: 'bg-secondary-container/70 text-primary border-primary/20',
      btn: 'bg-primary hover:bg-primary-hover text-white border-primary hover:border-primary-hover shadow-xs hover:shadow-sm'
    },
    success: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      btn: 'bg-primary hover:bg-primary-hover text-white border-primary hover:border-primary-hover shadow-xs hover:shadow-sm'
    }
  };

  const currentConfig = iconConfig[type] || iconConfig.warning;

  const content = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#002146]/50 backdrop-blur-xs animate-backdrop-in"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-7 transform transition-all animate-modal-pop relative border border-border-grey overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          className="btn-override absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#002146] hover:bg-slate-100 transition-colors cursor-pointer shrink-0 border border-transparent hover:border-border-grey"
          title="Đóng"
        >
          <IoCloseOutline className="w-5 h-5" strokeWidth={2} />
        </button>

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${currentConfig.bg}`}>
            <IconComponent className="w-6 h-6" />
          </div>

          {/* Details */}
          <div className="flex-1 pt-0.5 pr-4">
            <h3 className="text-lg font-bold text-[#002146] tracking-tight leading-6">
              {title}
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed font-normal normal-case">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-border-grey">
          <button
            type="button"
            onClick={onCancel}
            className="btn-override px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-border-grey shadow-2xs hover:bg-slate-100 hover:border-slate-300 active:bg-slate-200 transition-all cursor-pointer normal-case tracking-normal"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`btn-override px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all normal-case tracking-normal cursor-pointer active:scale-[0.98] ${currentConfig.btn}`}
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
