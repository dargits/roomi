import React, { useEffect, useState, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IoCloseOutline } from 'react-icons/io5';
import { stopAllCameraStreams } from '../../utils/qrDecoder';

export interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string | ReactNode;
  children: ReactNode;
  maxWidth?: string;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl',
  showCloseButton = true,
  closeOnBackdrop = true
}) => {
  const [mounted, setMounted] = useState<boolean>(false);
  const backdropClickRef = useRef<boolean>(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      stopAllCameraStreams();
    }
    return () => {
      document.body.style.overflow = 'unset';
      stopAllCameraStreams();
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const modalRoot = document.getElementById('modal-root') || document.body;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    backdropClickRef.current = e.target === e.currentTarget;
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (backdropClickRef.current && e.target === e.currentTarget) {
      if (closeOnBackdrop && onClose) {
        onClose();
      }
    }
    backdropClickRef.current = false;
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#1A2411]/50 backdrop-blur-xs animate-backdrop-in"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-border-grey w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden animate-modal-pop`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="px-6 py-5 border-b border-border-grey flex justify-between items-center bg-white shrink-0">
            <h2 className="text-lg font-bold text-[#1A2411] tracking-normal leading-normal">{title}</h2>
            {showCloseButton && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#606D56] hover:text-[#1A2411] hover:bg-[#F2F6ED] transition-colors cursor-pointer shrink-0 border border-transparent hover:border-border-grey"
                title="Đóng"
              >
                <IoCloseOutline size={22} strokeWidth={2} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 bg-white text-on-surface">{children}</div>
      </div>
    </div>
  );

  return createPortal(modalContent, modalRoot);
};

export default Modal;
