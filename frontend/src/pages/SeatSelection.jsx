import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ChevronLeft, ArrowRight, AlertCircle, X, Armchair } from 'lucide-react';
import SeatGrid from '../components/booking/SeatGrid';
import BookingSteps from '../components/common/BookingSteps';
import { getMovieDetails } from '../services/movieService';
import { getShowtimeById } from '../services/showtimeService';
import { setPendingBookingId, startBooking, clearSeats } from '../store/bookingSlice';
import { createPendingBooking } from '../services/bookingService';
import { fetchApi } from '../services/api';
import Button from '../components/common/Button';
import { calculateSeatsSubtotal, evaluateBookingWindow } from '../utils/bookingUtils';

const SeatSelection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showtime, selectedSeats, pendingBookingId } = useSelector((state) => state.booking);
  const { user } = useSelector((state) => state.auth);

  const [movie, setMovie] = useState(null);
  const [fullShowtime, setFullShowtime] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocking, setIsLocking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const showtimeId = showtime?.id || showtime?.showtimeId;
    if (!showtimeId) {
      navigate(`/theaters/${id}`);
      return;
    }

    window.scrollTo(0, 0);
    const loadDetails = async () => {
      try {
        const [movieData, showtimeData] = await Promise.all([
          getMovieDetails(id),
          getShowtimeById(showtimeId),
        ]);
        setMovie(movieData);
        setFullShowtime(showtimeData);
        dispatch(startBooking({ movieId: id }));
      } catch (err) {
        console.error('Failed loading seat selection data', err);
        setError('Unable to load seat layout. Please try selecting a showtime again.');
      } finally {
        setIsLoading(false);
      }
    };
    loadDetails();
  }, [id, showtime?.id, showtime?.showtimeId, navigate, dispatch]);

  const subtotal = calculateSeatsSubtotal(selectedSeats, fullShowtime);

  const bookingWindow = evaluateBookingWindow(
    showtime?.date || fullShowtime?.date,
    showtime?.time || fullShowtime?.time
  );

  const handleProceed = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/seat-selection/${id}` } });
      return;
    }

    const liveWindow = evaluateBookingWindow(
      showtime?.date || fullShowtime?.date,
      showtime?.time || fullShowtime?.time
    );
    if (liveWindow.valid && !liveWindow.canBook) {
      setError(
        `Booking closed 45 minutes after showtime (${liveWindow.cutoffFormatted}). Please choose another showtime.`
      );
      return;
    }

    setIsLocking(true);
    setError('');

    try {
      if (pendingBookingId) {
        try {
          await fetchApi(`/bookings/${pendingBookingId}`, { method: 'DELETE' });
        } catch (e) {
          console.error('Failed to release old booking:', e);
        }
        dispatch(setPendingBookingId(null));
      }

      const pendingData = {
        bookingIdString: `BK-${Math.floor(Math.random() * 900000) + 100000}`,
        showtimeId: showtime.id || showtime.showtimeId,
        seats: selectedSeats,
      };

      const res = await createPendingBooking(pendingData);
      if (res._id) {
        dispatch(setPendingBookingId(res._id));
        navigate('/checkout');
      } else {
        setError('Unable to reserve those seats. They may have just been booked.');
      }
    } catch (err) {
      setError(err.message || 'Failed to lock selected seats');
      const showtimeId = showtime.id || showtime.showtimeId;
      if (showtimeId) {
        getShowtimeById(showtimeId).then(setFullShowtime).catch(() => {});
      }
    } finally {
      setIsLocking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <div className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--mg-surface)' }} />
        <div className="h-96 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--mg-surface)' }} />
      </div>
    );
  }

  if (!movie || !fullShowtime) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center px-6 text-center">
        <Armchair className="w-10 h-10 mb-3" style={{ color: 'var(--mg-ink-3)' }} />
        <h2 className="text-2xl font-display font-bold mb-2" style={{ color: 'var(--mg-ink)' }}>
          {error || 'Showtime Not Found'}
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--mg-ink-2)' }}>
          Please choose a screening to view available seats.
        </p>
        <Button onClick={() => navigate(`/theaters/${id}`)}>Select Showtime</Button>
      </div>
    );
  }

  const theaterDisplayName = showtime.theaterName || fullShowtime?.theater?.name || showtime.theater;

  return (
    <div className="w-full min-h-screen flex flex-col pb-32">
      {/* Sub-Header */}
      <div
        className="sticky top-16 z-30 border-b backdrop-blur-md"
        style={{
          backgroundColor: 'var(--mg-nav-bg)',
          borderColor: 'var(--mg-border)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 text-xs font-medium mb-1 cursor-pointer hover:opacity-80"
              style={{ color: 'var(--mg-ink-2)' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Change Showtime
            </button>
            <h1 className="text-lg sm:text-xl font-display font-bold leading-tight" style={{ color: 'var(--mg-ink)' }}>
              {movie.title}
            </h1>
            <p className="text-xs sm:text-sm mt-0.5 flex flex-wrap items-center gap-2" style={{ color: 'var(--mg-ink-2)' }}>
              <span className="font-semibold" style={{ color: 'var(--mg-ink)' }}>{theaterDisplayName}</span>
              <span>•</span>
              <span>{showtime.date}</span>
              <span>•</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--mg-accent)' }}>{showtime.time}</span>
              <span
                className="px-2 py-0.5 rounded text-[11px] font-semibold"
                style={{ backgroundColor: 'var(--mg-surface-2)', color: 'var(--mg-ink-2)' }}
              >
                Screen {fullShowtime.screenNumber || 1}
              </span>
            </p>
          </div>
          <BookingSteps currentStep={2} />
        </div>
      </div>

      {/* Main Arena */}
      <div className="flex-grow w-full max-w-5xl mx-auto px-4 sm:px-6 pt-8 flex flex-col items-center">
        {bookingWindow.valid && bookingWindow.hasStarted && (
          <div
            className="mb-5 w-full max-w-2xl px-4 py-3 rounded-xl border text-xs sm:text-sm font-medium text-center"
            style={{
              backgroundColor: bookingWindow.canBook ? 'var(--mg-warning-soft)' : 'var(--mg-danger-soft)',
              borderColor: bookingWindow.canBook ? 'var(--mg-warning)' : 'var(--mg-danger)',
              color: bookingWindow.canBook ? 'var(--mg-warning)' : 'var(--mg-danger)',
            }}
          >
            {bookingWindow.canBook
              ? `Show has started • Bookings remain open until ${bookingWindow.cutoffFormatted} (payment grace until ${bookingWindow.finalDeadlineFormatted}).`
              : `Booking closed at ${bookingWindow.cutoffFormatted} (45 minutes after showtime).`}
          </div>
        )}

        {error && (
          <div
            className="mb-6 w-full max-w-2xl px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between gap-3"
            style={{
              backgroundColor: 'var(--mg-danger-soft)',
              borderColor: 'var(--mg-danger)',
              color: 'var(--mg-danger)',
            }}
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </span>
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Dismiss alert"
              className="p-1 rounded hover:opacity-75 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div
          className="w-full rounded-2xl border p-4 sm:p-8"
          style={{
            backgroundColor: 'var(--mg-surface)',
            borderColor: 'var(--mg-border)',
          }}
        >
          <SeatGrid fullShowtime={fullShowtime} />
        </div>
      </div>

      {/* Bottom Sticky Seat Bar */}
      {selectedSeats.length > 0 && (
        <div
          className="fixed bottom-0 inset-x-0 z-40 border-t"
          style={{
            backgroundColor: 'var(--mg-surface)',
            borderColor: 'var(--mg-border-strong)',
            boxShadow: 'var(--mg-shadow-lg)',
          }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--mg-ink-2)' }}>
                <span>
                  {selectedSeats.length} {selectedSeats.length === 1 ? 'Seat' : 'Seats'}
                </span>
                <span>•</span>
                <span className="font-mono font-semibold truncate max-w-[200px] sm:max-w-md" style={{ color: 'var(--mg-ink)' }}>
                  {selectedSeats.join(', ')}
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-display font-bold font-mono" style={{ color: 'var(--mg-ink)' }}>
                ₹{subtotal.toFixed(2)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => dispatch(clearSeats())}
                className="text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer hover:underline"
                style={{ color: 'var(--mg-ink-2)' }}
              >
                Clear
              </button>
              <Button
                size="lg"
                onClick={handleProceed}
                isLoading={isLocking}
                disabled={bookingWindow.valid && !bookingWindow.canBook}
              >
                Continue to Checkout
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatSelection;
