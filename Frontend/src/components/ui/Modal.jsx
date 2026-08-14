import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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

  const modalRoot = document.getElementById('modal-root') || document.body;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className={`bg-surface rounded-xl shadow-xl w-full ${maxWidth} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="p-6 border-b border-border-grey flex justify-between items-center bg-surface-container-lowest shrink-0 rounded-t-xl">
            <h2 className="font-headline-md text-on-surface">{title}</h2>
            <button 
              type="button"
              onClick={onClose} 
              className="text-on-surface-variant hover:text-error hover:bg-error/10 p-1.5 rounded-md transition-colors"
              title="Đóng"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, modalRoot);
};

export default Modal;
