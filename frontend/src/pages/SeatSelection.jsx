import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ChevronLeft, Info, ArrowRight, AlertCircle } from 'lucide-react';
import SeatGrid from '../components/booking/SeatGrid';
import { getMovieDetails } from '../services/movieService';
import { getShowtimeById } from '../services/showtimeService';
import { setShowtime, setPendingBookingId, startBooking } from '../store/bookingSlice';
import { createPendingBooking } from '../services/bookingService';
import { fetchApi } from '../services/api';
import Button from '../components/common/Button';

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
    if (!showtime.id && !showtime.showtimeId) {
      navigate(`/theaters/${id}`);
      return;
    }
    
    window.scrollTo(0, 0);
    const loadDetails = async () => {
      try {
        const [movieData, showtimeData] = await Promise.all([
          getMovieDetails(id),
          getShowtimeById(showtime.id || showtime.showtimeId)
        ]);
        setMovie(movieData);
        setFullShowtime(showtimeData);
        
        // Ensure movieId is in Redux if missing (handles refreshes)
        dispatch(startBooking({ movieId: id }));
        
        setIsLoading(false);
      } catch (err) {
        console.error("Failed loading seat selection data", err);
        setIsLoading(false);
      }
    };
    loadDetails();
  }, [id, showtime.id, showtime.showtimeId, navigate, dispatch]);

  const calculateSubtotal = () => {
    if (!fullShowtime || !fullShowtime.theater || !fullShowtime.theater.screens) {
       // Fallback mock pricing
       return selectedSeats.reduce((sum, seatId) => {
         const isPremium = ['F', 'G', 'H', 'I'].includes(seatId.charAt(0));
         return sum + (isPremium ? 20 : 15);
       }, 0);
    }
    
    const screen = fullShowtime.theater.screens.find(s => s.number === (fullShowtime.screenNumber || 1));
    if (!screen || !screen.pricing) return selectedSeats.length * 15;

    return selectedSeats.reduce((sum, seatId) => {
       const rowName = seatId.charAt(0);
       const price = screen.pricing[rowName] || 15;
       return sum + price;
    }, 0);
  };

  const subtotal = calculateSubtotal();

  const handleProceed = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/seat-selection/${id}` } });
      return;
    }

    setIsLocking(true);
    setError('');

    try {
      // Step 0: Release old booking if it exists
      if (pendingBookingId) {
        try {
          await fetchApi(`/bookings/${pendingBookingId}`, { method: 'DELETE' });
        } catch (e) {
          console.error("Failed to release old booking:", e);
        }
      }

      const pendingData = {
        bookingIdString: `BK-${Math.floor(Math.random() * 90000) + 10000}`,
        showtimeId: showtime.id || showtime.showtimeId,
        seats: selectedSeats,
        totalAmount: subtotal, // Initial estimate
        pointsUsed: 0
      };

      const res = await createPendingBooking(pendingData);
      if (res._id) {
        dispatch(setPendingBookingId(res._id));
        navigate('/checkout');
      } else {
        setError('Unable to secure seats. They might have been taken by someone else.');
      }
    } catch (err) {
      setError(err.message || 'Failed to lock seats');
    } finally {
      setIsLocking(false);
    }
  };

  if (isLoading || !movie) {
    return <div className="min-h-screen flex items-center justify-center pt-20"><div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div></div>;
  }

  return (
    <div className="w-full relative min-h-screen flex flex-col pb-32">
      <div className="bg-surface/80 backdrop-blur-xl border-b border-white/10 sticky top-[72px] z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <button onClick={() => navigate(-1)} className="inline-flex items-center text-muted hover:text-white transition-colors text-sm mb-2">
                <ChevronLeft className="w-4 h-4 mr-1" /> Change Theater
              </button>
              <h1 className="text-2xl font-bold font-outfit text-white">{movie.title}</h1>
              <p className="text-sm text-primary flex items-center gap-1 font-semibold mt-1">
                {showtime.theater} <span className="text-muted ml-2 font-normal">| {showtime.date} @ {showtime.time}</span>
                {fullShowtime && <span className="ml-2 bg-white/5 px-2 py-0.5 rounded text-[10px] text-white/40 uppercase">Screen {fullShowtime.screenNumber}</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow w-full max-w-5xl mx-auto px-4 mt-8 flex flex-col items-center justify-center relative z-10">
        <div className="py-2 px-6 bg-surface/50 rounded-full border border-white/5 backdrop-blur-md mb-8 flex items-center gap-2 text-sm text-white/70">
           <Info className="w-4 h-4 text-secondary" />
           Select your seats to proceed
        </div>
        
        <div className="w-full max-w-full overflow-hidden">
          <SeatGrid fullShowtime={fullShowtime} />
        </div>
      </div>

      {selectedSeats.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
             <div>
               <p className="text-sm text-muted">{selectedSeats.length} {selectedSeats.length === 1 ? 'Ticket' : 'Tickets'} Selected</p>
               <p className="text-2xl font-bold font-mono">₹{subtotal.toFixed(2)}</p>
             </div>
             <Button 
               size="lg" 
               className="px-8 shadow-[0_0_20px_rgba(244,63,94,0.4)]" 
               onClick={handleProceed}
               disabled={isLocking}
             >
               {isLocking ? 'Securing Seats...' : 'Proceed to Checkout'} <ArrowRight className="w-5 h-5 ml-2" />
             </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatSelection;
