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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto overflow-x-hidden">
      {/* Backdrop with enhanced blur */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-500 animate-in fade-in"
        onClick={onClose}
      />
      
      {/* Modal Dialog with glassmorphic style */}
      <div 
        className={`relative w-full bg-base/95 border border-white/10 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden transform transition-all animate-in zoom-in-95 fade-in duration-300 ${className || 'max-w-lg'}`}
        role="dialog"
      >
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
        
        <div className="flex justify-between items-center px-8 py-6 border-b border-white/5 bg-white/[0.02]">
          <h3 className="text-sm font-black font-outfit text-white uppercase tracking-[0.25em]">{title}</h3>
          <button 
            onClick={onClose}
            className="text-muted hover:text-white transition-all p-2 rounded-full hover:bg-white/10 cursor-pointer group"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
        
        <div className="max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;

