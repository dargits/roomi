import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ToastItem from './ToastItem';

const ToastContainer = ({ toasts, onClose }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !toasts || toasts.length === 0) return null;

  const content = (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );

  return createPortal(content, document.body);
};

export default ToastContainer;
