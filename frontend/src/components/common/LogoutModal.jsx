import React, { useEffect, useState } from 'react';
import { LogOut, X, AlertTriangle } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';
import { useNavigate } from 'react-router-dom';

const LogoutModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300); // match animation duration
  };

  const handleConfirm = () => {
    handleClose();
    setTimeout(() => {
      dispatch(logout());
      navigate('/');
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 transform border border-white/10
          ${isClosing ? 'scale-95 opacity-0 translate-y-4' : 'scale-100 opacity-100 translate-y-0'}`}
        style={{ background: 'var(--color-base)' }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/10 border border-primary/20 text-primary">
              <LogOut className="w-6 h-6" />
            </div>
            <button 
              onClick={handleClose}
              className="p-2 rounded-xl text-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <h3 className="text-xl font-bold mb-2 font-outfit" style={{ color: 'var(--color-white)' }}>
            Confirm Logout
          </h3>
          <p className="text-sm text-muted mb-8 leading-relaxed">
            Are you sure you want to end your current session? You'll need to sign in again to access your account.
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button 
              onClick={handleClose}
              className="flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-colors border"
              style={{ 
                borderColor: 'var(--theme-border)', 
                color: 'var(--color-white)',
                background: 'var(--color-surface)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--theme-surface-darker)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-surface)'}
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:shadow-[0_0_20px_rgba(244,63,94,0.5)]"
            >
              Yes, Log Out
            </button>
          </div>
        </div>
        
        {/* Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
      </div>
    </div>
  );
};

export default LogoutModal;
