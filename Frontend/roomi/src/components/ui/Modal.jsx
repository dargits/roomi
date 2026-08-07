import React from 'react';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * Reusable Modal component
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {string} props.title
 * @param {React.ElementType} [props.icon]
 * @param {string} [props.iconColor]
 * @param {() => void} props.onClose
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.footer]
 * @param {string} [props.maxWidth='500px']
 */
export default function Modal({ 
  isOpen, 
  title, 
  icon: Icon,
  iconColor = 'var(--text-primary)',
  onClose, 
  children, 
  footer,
  maxWidth = '500px'
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 style={{ fontSize: '17px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            {Icon && <Icon size={18} style={{ color: iconColor }} />}
            {title}
          </h2>
          <button onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>
        
        <div className="modal-body">
          {children}
        </div>
        
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
