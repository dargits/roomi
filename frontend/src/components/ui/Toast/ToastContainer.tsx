import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ToastItem, { ToastData } from './ToastItem';

interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string | number) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !toasts || toasts.length === 0) return null;

  const content = (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-[380px] w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );

  return createPortal(content, document.body);
};

export default ToastContainer;
