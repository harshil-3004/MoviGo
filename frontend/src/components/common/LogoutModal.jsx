import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, X } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';
import { resetBooking, setCheckoutLocked } from '../../store/bookingSlice';
import { disconnectSocket } from '../../services/chatSocket';
import { useNavigate } from 'react-router-dom';
import Button from './Button';

const LogoutModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!isOpen && !isClosing) return null;

  const handleClose = () => {
    setIsClosing(true);
    timerRef.current = setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 180);
  };

  const handleConfirm = () => {
    setIsClosing(true);
    timerRef.current = setTimeout(() => {
      onClose();
      setIsClosing(false);
      disconnectSocket();
      dispatch(setCheckoutLocked(false));
      dispatch(resetBooking());
      navigate('/', { replace: true });
      dispatch(logout());
    }, 180);
  };

  const dialog = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div
        className={`fixed inset-0 backdrop-blur-sm transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ backgroundColor: 'var(--mg-overlay)' }}
        onClick={handleClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        className={`relative w-full max-w-sm rounded-2xl overflow-hidden transition-all duration-200 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        style={{
          backgroundColor: 'var(--mg-surface)',
          border: '1px solid var(--mg-border-strong)',
          boxShadow: 'var(--mg-shadow-lg)',
          color: 'var(--mg-ink)',
        }}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--mg-accent-soft)', color: 'var(--mg-accent)' }}
            >
              <LogOut className="w-5 h-5" />
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-lg transition-colors mg-hover cursor-pointer"
              style={{ color: 'var(--mg-ink-3)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3
            id="logout-modal-title"
            className="text-lg font-bold mb-1.5 font-display"
            style={{ color: 'var(--mg-ink)' }}
          >
            Sign out of MoviGo?
          </h3>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--mg-ink-2)' }}>
            You will need to sign back in to manage bookings, rewards, and tickets.
          </p>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirm} className="flex-1">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};

export default LogoutModal;
