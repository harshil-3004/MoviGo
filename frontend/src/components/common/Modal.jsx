import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, className = '' }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="fixed inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: 'var(--mg-overlay)' }}
        onClick={onClose}
      />

      <div
        className={`relative w-full rounded-2xl overflow-hidden ${className || 'max-w-lg'}`}
        style={{
          backgroundColor: 'var(--mg-surface)',
          border: '1px solid var(--mg-border-strong)',
          boxShadow: 'var(--mg-shadow-lg)',
          color: 'var(--mg-ink)',
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="flex justify-between items-center px-6 py-4 border-b"
          style={{ borderColor: 'var(--mg-border)' }}
        >
          <h3 className="text-base font-bold font-display tracking-tight" style={{ color: 'var(--mg-ink)' }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg transition-colors cursor-pointer mg-hover"
            style={{ color: 'var(--mg-ink-2)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto custom-scrollbar">
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
