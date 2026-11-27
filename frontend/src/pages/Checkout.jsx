import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Clock,
  CheckCircle2,
  Tags,
  AlertCircle,
  Loader2,
  CreditCard,
  Smartphone,
  Building2,
  ShieldCheck,
  X,
  Crown,
} from 'lucide-react';
import Button from '../components/common/Button';
import BookingSteps from '../components/common/BookingSteps';
import {
  validateCoupon,
  createPendingBooking,
  confirmPaymentAndBooking,
} from '../services/bookingService';
import { getMovieDetails } from '../services/movieService';
import { getShowtimeById } from '../services/showtimeService';
import {
  applyCoupon,
  removeCoupon,
  confirmBooking,
  clearSeats,
  setPendingBookingId as setPendingBookingIdInStore,
  setCheckoutLocked,
} from '../store/bookingSlice';
import { login } from '../store/authSlice';
import { fetchApi } from '../services/api';
import {
  CONVENIENCE_FEE_PER_SEAT,
  MEMBER_DISCOUNT_RATE,
  calculateSeatsSubtotal,
  isActiveMembership,
  evaluateBookingWindow,
} from '../utils/bookingUtils';

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI / QR', detail: 'GPay, PhonePe, Paytm, BHIM', icon: 'upi' },
  { id: 'card', label: 'Credit / Debit Card', detail: 'Visa, Mastercard, RuPay', icon: 'card' },
  { id: 'netbanking', label: 'Net Banking & Wallets', detail: 'All major Indian banks', icon: 'bank' },
];

const Checkout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    movieId,
    showtime,
    selectedSeats,
    couponApplied,
    pendingBookingId: storePendingBookingId,
  } = useSelector((state) => state.booking);
  const { user } = useSelector((state) => state.auth);

  const [movie, setMovie] = useState(null);
  const [fullShowtime, setFullShowtime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(600);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [lockError, setLockError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePromos, setActivePromos] = useState([]);
  const [localPendingId, setLocalPendingId] = useState(null);
  const [isLocking, setIsLocking] = useState(false);

  const pendingBookingId = localPendingId || storePendingBookingId;
  const sessionDeadlineRef = useRef(null);
  const justConfirmedRef = useRef(false);
  const lockAttemptedRef = useRef(false);
  const expiredHandledRef = useRef(false);

  const showDate = showtime?.date || fullShowtime?.date;
  const showTime = showtime?.time || fullShowtime?.time;
  const bookingWindow = evaluateBookingWindow(showDate, showTime);

  const activeMovieId =
    movieId || (showtime && (showtime.movie?._id || showtime.movie || showtime.movieId));
  const activeShowtimeId = showtime?.id || showtime?.showtimeId;

  useEffect(() => {
    dispatch(setCheckoutLocked(true));
    return () => dispatch(setCheckoutLocked(false));
  }, [dispatch]);

  useEffect(() => {
    fetchApi('/promotions/active')
      .then((data) => setActivePromos(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error fetching promos:', err));
  }, []);

  useEffect(() => {
    if (!storePendingBookingId) {
      dispatch(removeCoupon());
    }
  }, [dispatch, storePendingBookingId]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (justConfirmedRef.current) return;

    if (selectedSeats.length === 0 || !activeMovieId || !activeShowtimeId) {
      if (activeMovieId) navigate(`/seat-selection/${activeMovieId}`);
      else navigate('/');
      return;
    }

    getMovieDetails(activeMovieId).then(setMovie).catch((err) => console.error(err));
    getShowtimeById(activeShowtimeId).then(setFullShowtime).catch((err) => console.error(err));

    const handleBeforeUnload = (e) => {
      if (!justConfirmedRef.current) {
        e.preventDefault();
        e.returnValue =
          'Your seats are held for 10 minutes. Leaving this page will release them.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeMovieId, activeShowtimeId, selectedSeats.length, navigate]);

  const finalDeadlineMs = bookingWindow.valid
    ? bookingWindow.finalPaymentDeadline.getTime()
    : null;

  useEffect(() => {
    if (!sessionDeadlineRef.current) {
      sessionDeadlineRef.current = Date.now() + 600 * 1000;
    }
    const timer = setInterval(() => {
      const hardCap = finalDeadlineMs
        ? Math.min(sessionDeadlineRef.current, finalDeadlineMs)
        : sessionDeadlineRef.current;
      const remaining = Math.max(0, Math.ceil((hardCap - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [finalDeadlineMs]);

  useEffect(() => {
    if (timeLeft === 0 && !expiredHandledRef.current && !justConfirmedRef.current) {
      expiredHandledRef.current = true;
      if (pendingBookingId) {
        fetchApi(`/bookings/${pendingBookingId}`, { method: 'DELETE' }).catch(() => {});
      }
      dispatch(setPendingBookingIdInStore(null));
      dispatch(clearSeats());
      dispatch(setCheckoutLocked(false));
      alert('Session Expired: Your held seats have been released.');
      navigate(activeMovieId ? `/seat-selection/${activeMovieId}` : '/');
    }
  }, [timeLeft, pendingBookingId, activeMovieId, dispatch, navigate]);

  const subtotal = calculateSeatsSubtotal(selectedSeats, fullShowtime);
  const memberActive = isActiveMembership(user);

  const convenienceFee = memberActive ? 0 : selectedSeats.length * CONVENIENCE_FEE_PER_SEAT;
  const membershipDiscount = memberActive ? subtotal * MEMBER_DISCOUNT_RATE : 0;

  const couponDiscount = couponApplied
    ? couponApplied.type === 'percentage'
      ? subtotal * (couponApplied.discount / 100)
      : couponApplied.flatDiscount || 0
    : 0;

  const grandTotal = Math.max(0, subtotal + convenienceFee - couponDiscount - membershipDiscount);

  const lockSeatsOnServer = async () => {
    if (!user || !activeShowtimeId || selectedSeats.length === 0) return;
    setIsLocking(true);
    setLockError('');
    try {
      const res = await createPendingBooking({
        bookingIdString: `BK-${Math.floor(Math.random() * 900000) + 100000}`,
        showtimeId: activeShowtimeId,
        seats: selectedSeats,
        promoCode: couponApplied ? couponApplied.code : null,
      });
      if (res._id) {
        setLocalPendingId(res._id);
        dispatch(setPendingBookingIdInStore(res._id));
      }
    } catch (err) {
      console.error('Locking failed', err);
      setLockError(err.message || 'Unable to reserve selected seats.');
    } finally {
      setIsLocking(false);
    }
  };

  useEffect(() => {
    if (storePendingBookingId) return;
    if (
      !lockAttemptedRef.current &&
      user &&
      activeShowtimeId &&
      selectedSeats.length > 0 &&
      !localPendingId
    ) {
      lockAttemptedRef.current = true;
      lockSeatsOnServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storePendingBookingId, user, activeShowtimeId, selectedSeats.length]);

  const resolvedTheaterId =
    showtime?.theaterId || fullShowtime?.theater?._id || showtime?.theater;

  const handleApplyCoupon = async (codeOverride) => {
    const code = (typeof codeOverride === 'string' ? codeOverride : couponInput)
      .trim()
      .toUpperCase();
    if (!code) return;
    setIsValidating(true);
    setCouponError('');

    try {
      const result = await validateCoupon(code, resolvedTheaterId);
      if (result.valid) {
        if (pendingBookingId) {
          await fetchApi(`/bookings/${pendingBookingId}`, {
            method: 'PUT',
            body: JSON.stringify({ promoCode: code }),
          });
        }

        dispatch(
          applyCoupon({
            code,
            discount: result.discountPercent,
            flatDiscount: result.flatDiscount,
            type: result.discountPercent ? 'percentage' : 'flat',
          })
        );
        setCouponInput('');
      } else {
        setCouponError(result.message || 'Invalid promo code');
      }
    } catch (err) {
      setCouponError(err.message || 'Error validating coupon');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponError('');
    if (pendingBookingId) {
      try {
        await fetchApi(`/bookings/${pendingBookingId}`, {
          method: 'PUT',
          body: JSON.stringify({ promoCode: null }),
        });
      } catch (err) {
        console.error('Failed to sync coupon removal', err);
        setCouponError(err.message || 'Failed to remove coupon');
        return;
      }
    }
    dispatch(removeCoupon());
  };

  const handleCheckout = async () => {
    setPaymentError('');
    if (!user) {
      setPaymentError('Please sign in first to confirm your booking.');
      return;
    }

    if (!pendingBookingId) {
      setPaymentError(
        lockError || 'Your seats are not currently reserved. Retry seat lock or modify selection.'
      );
      return;
    }

    setIsProcessing(true);

    try {
      await confirmPaymentAndBooking(pendingBookingId);

      try {
        const updatedUser = await fetchApi('/users/me');
        dispatch(login(updatedUser));
      } catch (err) {
        console.error('Failed to sync points after booking', err);
      }

      justConfirmedRef.current = true;
      dispatch(setCheckoutLocked(false));
      dispatch(confirmBooking());
      navigate('/ticket/' + pendingBookingId);
    } catch (e) {
      console.error(e);
      setPaymentError(e.message || 'Payment could not be completed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleModifySelection = async () => {
    if (pendingBookingId) {
      try {
        await fetchApi(`/bookings/${pendingBookingId}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Failed to release seats during modification', e);
      }
      dispatch(setPendingBookingIdInStore(null));
      setLocalPendingId(null);
    }
    dispatch(setCheckoutLocked(false));
    navigate(activeMovieId ? `/seat-selection/${activeMovieId}` : -1);
  };

  if (!movie) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--mg-accent)' }} />
        <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>
          Preparing your booking summary...
        </p>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const isTimerUrgent = timeLeft < 120;
  const theaterDisplayName = showtime?.theaterName || fullShowtime?.theater?.name || 'Cinema Venue';

  const renderMethodIcon = (key) => {
    if (key === 'upi') return <Smartphone className="w-4 h-4" />;
    if (key === 'card') return <CreditCard className="w-4 h-4" />;
    return <Building2 className="w-4 h-4" />;
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 pb-24">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={handleModifySelection}
          className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer hover:opacity-80"
          style={{ color: 'var(--mg-ink-2)' }}
        >
          <ChevronLeft className="w-4 h-4" />
          Modify Seats
        </button>

        <div className="flex items-center gap-4">
          <BookingSteps currentStep={3} />
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold"
            style={{
              backgroundColor: isTimerUrgent ? 'var(--mg-danger-soft)' : 'var(--mg-surface)',
              borderColor: isTimerUrgent ? 'var(--mg-danger)' : 'var(--mg-border)',
              color: isTimerUrgent ? 'var(--mg-danger)' : 'var(--mg-ink)',
            }}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{timeFormatted}</span>
          </div>
        </div>
      </div>

      {/* Grace Period / Final Deadline Banner */}
      {bookingWindow.valid && bookingWindow.hasStarted && bookingWindow.canPay && (
        <div
          className="mb-6 p-4 rounded-xl border text-xs sm:text-sm font-medium flex items-center gap-2.5"
          style={{
            backgroundColor: 'var(--mg-warning-soft)',
            borderColor: 'var(--mg-warning)',
            color: 'var(--mg-warning)',
          }}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>
            Showtime has started • Complete payment before the final deadline at{' '}
            <strong className="font-mono">{bookingWindow.finalDeadlineFormatted}</strong>{' '}
            (includes 5-min payment grace period).
          </span>
        </div>
      )}

      {/* Seat Lock Alert */}
      {lockError && (
        <div
          className="mb-6 p-4 rounded-xl border text-sm font-medium flex flex-wrap items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--mg-danger-soft)',
            borderColor: 'var(--mg-danger)',
            color: 'var(--mg-danger)',
          }}
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {lockError}
          </span>
          <Button size="sm" variant="outline" onClick={lockSeatsOnServer} isLoading={isLocking}>
            Retry Seat Hold
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Details, Member Perk, Promos, Payment */}
        <div className="lg:col-span-7 space-y-6">
          {/* Movie & Show Summary */}
          <div
            className="rounded-xl border p-5 sm:p-6 flex gap-4 sm:gap-5 items-start"
            style={{
              backgroundColor: 'var(--mg-surface)',
              borderColor: 'var(--mg-border)',
            }}
          >
            <img
              src={movie.poster}
              alt={movie.title}
              className="w-20 sm:w-24 aspect-[2/3] object-cover rounded-lg border shrink-0"
              style={{ borderColor: 'var(--mg-border)' }}
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
                {movie.title}
              </h1>
              <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--mg-ink-2)' }}>
                {movie.genre} {movie.duration ? `• ${movie.duration}` : ''} • {movie.language || 'English'}
              </p>

              <div
                className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t text-xs"
                style={{ borderColor: 'var(--mg-border)' }}
              >
                <div>
                  <span className="block" style={{ color: 'var(--mg-ink-3)' }}>Cinema</span>
                  <span className="font-semibold" style={{ color: 'var(--mg-ink)' }}>
                    {theaterDisplayName}
                  </span>
                </div>
                <div>
                  <span className="block" style={{ color: 'var(--mg-ink-3)' }}>Showtime</span>
                  <span className="font-semibold" style={{ color: 'var(--mg-ink)' }}>
                    {showtime?.date} • {showtime?.time}
                  </span>
                </div>
                <div>
                  <span className="block" style={{ color: 'var(--mg-ink-3)' }}>
                    Screen {showtime?.screenNumber || fullShowtime?.screenNumber || 1} Seats
                  </span>
                  <span className="font-mono font-bold" style={{ color: 'var(--mg-accent)' }}>
                    {selectedSeats.join(', ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Inner Circle Banner */}
          {memberActive && (
            <div
              className="rounded-xl border p-4 flex items-center justify-between gap-4"
              style={{
                backgroundColor: 'var(--mg-gold-soft)',
                borderColor: 'var(--mg-gold)',
              }}
            >
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 shrink-0" style={{ color: 'var(--mg-gold)' }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--mg-ink)' }}>
                    Inner Circle Benefits Applied
                  </p>
                  <p className="text-xs" style={{ color: 'var(--mg-ink-2)' }}>
                    10% off seat total + zero convenience fees on this booking.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Promo Code Card */}
          <div
            className="rounded-xl border p-5 sm:p-6"
            style={{
              backgroundColor: 'var(--mg-surface)',
              borderColor: 'var(--mg-border)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Tags className="w-4 h-4" style={{ color: 'var(--mg-accent)' }} />
              <h2 className="text-base font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
                Promo Codes & Offers
              </h2>
            </div>

            {couponApplied ? (
              <div
                className="flex items-center justify-between px-4 py-3 rounded-lg border"
                style={{
                  backgroundColor: 'var(--mg-success-soft)',
                  borderColor: 'var(--mg-success)',
                }}
              >
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--mg-success)' }}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Code <strong className="font-mono">{couponApplied.code}</strong> applied (
                    {couponApplied.type === 'percentage'
                      ? `${couponApplied.discount}% off`
                      : `₹${couponApplied.flatDiscount} off`}
                    )
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="p-1 rounded hover:opacity-75 cursor-pointer"
                  aria-label="Remove promo code"
                  style={{ color: 'var(--mg-ink-2)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleApplyCoupon();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter promo code"
                  className="mg-input flex-1 px-3.5 py-2 rounded-lg text-sm font-mono uppercase"
                />
                <Button type="submit" variant="secondary" isLoading={isValidating} disabled={!couponInput.trim()}>
                  Apply
                </Button>
              </form>
            )}

            {couponError && (
              <p className="text-xs font-medium mt-2" style={{ color: 'var(--mg-danger)' }}>
                {couponError}
              </p>
            )}

            {activePromos.length > 0 && !couponApplied && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--mg-border)' }}>
                <p className="text-xs font-semibold mb-2.5" style={{ color: 'var(--mg-ink-2)' }}>
                  Available Offers
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activePromos.map((promo) => (
                    <button
                      key={promo._id || promo.code}
                      type="button"
                      onClick={() => handleApplyCoupon(promo.code)}
                      className="text-left p-3 rounded-lg border transition-colors cursor-pointer hover:opacity-90"
                      style={{
                        backgroundColor: 'var(--mg-surface-2)',
                        borderColor: 'var(--mg-border)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold" style={{ color: 'var(--mg-accent)' }}>
                          {promo.code}
                        </span>
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--mg-success)' }}>
                          {promo.discountPercent
                            ? `${promo.discountPercent}% OFF`
                            : `₹${promo.flatDiscount} OFF`}
                        </span>
                      </div>
                      <p className="text-[11px] mt-1 line-clamp-1" style={{ color: 'var(--mg-ink-3)' }}>
                        Tap to apply at checkout
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div
            className="rounded-xl border p-5 sm:p-6"
            style={{
              backgroundColor: 'var(--mg-surface)',
              borderColor: 'var(--mg-border)',
            }}
          >
            <h2 className="text-base font-display font-bold mb-3" style={{ color: 'var(--mg-ink)' }}>
              Payment Method
            </h2>
            <div className="space-y-2.5">
              {PAYMENT_METHODS.map((method) => {
                const selected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className="w-full flex items-center justify-between p-3.5 rounded-lg border text-left transition-colors cursor-pointer"
                    style={{
                      backgroundColor: selected ? 'var(--mg-accent-soft)' : 'var(--mg-surface-2)',
                      borderColor: selected ? 'var(--mg-accent)' : 'var(--mg-border)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span style={{ color: selected ? 'var(--mg-accent)' : 'var(--mg-ink-2)' }}>
                        {renderMethodIcon(method.icon)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--mg-ink)' }}>
                          {method.label}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--mg-ink-3)' }}>
                          {method.detail}
                        </p>
                      </div>
                    </div>
                    <span
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{
                        borderColor: selected ? 'var(--mg-accent)' : 'var(--mg-border-strong)',
                      }}
                    >
                      {selected && (
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: 'var(--mg-accent)' }}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Order Summary */}
        <div className="lg:col-span-5 lg:sticky lg:top-24">
          <div
            className="rounded-xl border p-6"
            style={{
              backgroundColor: 'var(--mg-surface)',
              borderColor: 'var(--mg-border)',
              boxShadow: 'var(--mg-shadow-sm)',
            }}
          >
            <h2 className="text-lg font-display font-bold pb-4 border-b" style={{ color: 'var(--mg-ink)', borderColor: 'var(--mg-border)' }}>
              Order Summary
            </h2>

            <div className="py-4 space-y-3 text-sm border-b" style={{ borderColor: 'var(--mg-border)' }}>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--mg-ink-2)' }}>
                  Tickets ({selectedSeats.length})
                </span>
                <span className="font-mono font-semibold" style={{ color: 'var(--mg-ink)' }}>
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--mg-ink-2)' }}>Convenience Fee</span>
                <span
                  className="font-mono font-semibold"
                  style={{ color: memberActive ? 'var(--mg-success)' : 'var(--mg-ink)' }}
                >
                  {memberActive ? '₹0.00 (Waived)' : `₹${convenienceFee.toFixed(2)}`}
                </span>
              </div>

              {memberActive && membershipDiscount > 0 && (
                <div className="flex items-center justify-between" style={{ color: 'var(--mg-gold)' }}>
                  <span>Inner Circle (10% Off)</span>
                  <span className="font-mono font-semibold">-₹{membershipDiscount.toFixed(2)}</span>
                </div>
              )}

              {couponApplied && couponDiscount > 0 && (
                <div className="flex items-center justify-between" style={{ color: 'var(--mg-success)' }}>
                  <span>Promo ({couponApplied.code})</span>
                  <span className="font-mono font-semibold">-₹{couponDiscount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="py-4 flex items-center justify-between">
              <span className="text-base font-display font-bold" style={{ color: 'var(--mg-ink)' }}>
                Total Payable
              </span>
              <span className="text-2xl font-display font-bold font-mono" style={{ color: 'var(--mg-ink)' }}>
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>

            {paymentError && (
              <div
                className="mb-4 p-3 rounded-lg border text-xs font-medium flex items-start gap-2"
                style={{
                  backgroundColor: 'var(--mg-danger-soft)',
                  borderColor: 'var(--mg-danger)',
                  color: 'var(--mg-danger)',
                }}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{paymentError}</span>
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={handleCheckout}
              isLoading={isProcessing || isLocking}
              disabled={isProcessing || isLocking || !pendingBookingId}
            >
              {isLocking
                ? 'Holding Seats...'
                : isProcessing
                  ? 'Confirming Booking...'
                  : `Pay ₹${grandTotal.toFixed(2)}`}
            </Button>

            <p
              className="mt-3 text-xs flex items-center justify-center gap-1.5"
              style={{ color: 'var(--mg-ink-3)' }}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              Instant e-ticket &amp; QR pass generated upon confirmation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
