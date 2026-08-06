import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Ticket, Clock, CheckCircle2, ChevronRight, Tags, AlertCircle, Coins, Loader2, AlertTriangle } from 'lucide-react';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { validateCoupon, createPendingBooking, confirmPaymentAndBooking } from '../services/bookingService';
import { getMovieDetails } from '../services/movieService';
import { applyCoupon, removeCoupon, confirmBooking, clearSeats, setPendingBookingId as setPendingBookingIdInStore, setCheckoutLocked } from '../store/bookingSlice';
import { login } from '../store/authSlice';
import { fetchApi } from '../services/api';

const Checkout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { movieId, showtime, selectedSeats, status, couponApplied, pendingBookingId: storePendingBookingId } = useSelector(state => state.booking);
  const { user } = useSelector(state => state.auth);
  
  const [movie, setMovie] = useState(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes default
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePromos, setActivePromos] = useState([]);
  const [useRewards, setUseRewards] = useState(false);

  // Manage Global Navigation Guard
  useEffect(() => {
    dispatch(setCheckoutLocked(true));
    return () => dispatch(setCheckoutLocked(false));
  }, [dispatch]);

  useEffect(() => {
    fetchApi('/promotions/active')
      .then(data => setActivePromos(data))
      .catch(err => console.error("Error fetching promos:", err));
  }, []);

  // Clear any stale coupon left from a previous booking session on fresh mount
  useEffect(() => {
    if (!storePendingBookingId) {
      dispatch(removeCoupon());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeMovieId = movieId || (showtime && (showtime.movie?._id || showtime.movie || showtime.movieId));

  useEffect(() => {
    window.scrollTo(0, 0);
    // If we just confirmed the booking, do not prematurely redirect.
    if (status === 'confirmed') return;
    
    if (selectedSeats.length === 0 || !activeMovieId) {
      if (activeMovieId) navigate(`/seat-selection/${activeMovieId}`);
      else navigate('/');
      return;
    }
    
    getMovieDetails(activeMovieId).then((data) => setMovie(data)).catch(err => console.error(err));

    // Warn before leaving (Browser level)
    const handleBeforeUnload = (e) => {
      if (status !== 'confirmed') {
        e.preventDefault();
        e.returnValue = 'Your seats are locked for 10 minutes. Leaving this page will release them. Are you sure?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [movieId, activeMovieId, selectedSeats, navigate, status]);

  // Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          dispatch(clearSeats());
          alert("Session Expired: Your seats have been released.");
          dispatch(setCheckoutLocked(false));
          navigate(`/seat-selection/${movieId}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [dispatch, navigate, movieId]);

  const calculateSubtotal = () => {
    return selectedSeats.reduce((sum, seatId) => {
      const isPremium = ['F', 'G', 'H', 'I'].includes(seatId.charAt(0));
      return sum + (isPremium ? 500 : 350); // Set reasonable INR prices
    }, 0);
  };

  // handleApplyCoupon accepts optional direct code (for promo suggestion clicks)
  const handleApplyCoupon = async (codeOverride) => {
    const code = (typeof codeOverride === 'string' ? codeOverride : couponInput).trim().toUpperCase();
    if (!code) return;
    setIsValidating(true);
    setCouponError('');
    
    try {
      // Pass the current theater ID to validate localized promos
      const result = await validateCoupon(code, showtime.theater);
      if (result.valid) {
        dispatch(applyCoupon({ 
          code, 
          discount: result.discountPercent,
          flatDiscount: result.flatDiscount,
          type: result.discountPercent ? 'percentage' : 'flat'
        }));
        
        // Update pending booking if it exists
        if (pendingBookingId) {
          const discAmount = result.discountPercent ? (subtotal * (result.discountPercent / 100)) : (result.flatDiscount || 0);
          const newGrandTotal = Math.max(0, (subtotal + convenienceFee) - discAmount - membershipDiscount);
          await fetchApi(`/bookings/${pendingBookingId}`, {
            method: 'PUT',
            body: JSON.stringify({
              totalAmount: newGrandTotal,
              promoCode: code
            })
          });
        }
        
        setCouponInput('');
      } else {
        setCouponError(result.message);
      }
    } catch (e) {
      setCouponError('Error validating coupon');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveCoupon = async () => {
    dispatch(removeCoupon());
    if (pendingBookingId) {
      try {
        await fetchApi(`/bookings/${pendingBookingId}`, {
          method: 'PUT',
          body: JSON.stringify({
            totalAmount: Math.max(0, subtotal + convenienceFee - membershipDiscount),
            promoCode: null
          })
        });
      } catch (e) {
        console.error("Failed to sync coupon removal", e);
      }
    }
  };

  const subtotal = calculateSubtotal();
  const isMember = user?.isMember;
  
  // Membership Benefits: ₹0 fees, 10% discount
  const convenienceFee = isMember ? 0 : (selectedSeats.length * 45);
  const membershipDiscount = isMember ? (subtotal * 0.10) : 0;
  
  const couponDiscount = couponApplied ? (
    couponApplied.type === 'percentage' 
      ? (subtotal * (couponApplied.discount / 100)) 
      : (couponApplied.flatDiscount || 0)
  ) : 0;
  
  const grandTotal = Math.max(0, (subtotal + convenienceFee) - couponDiscount - membershipDiscount);

  const [pendingBookingId, setPendingBookingId] = useState(null);
  const [isLocking, setIsLocking] = useState(false);

  // Lock seats if not already locked
  useEffect(() => {
    const lockSeatsOnServer = async () => {
      // If we already have a pending booking from SeatSelection screen
      if (movieId && showtime.id && selectedSeats.length > 0 && !pendingBookingId && !isLocking) {
        // We use the Redux stored ID if it exists
        const storedPendingId = storePendingBookingId; // from useSelector
        
        if (storedPendingId) {
          setPendingBookingId(storedPendingId);
          return;
        }

        setIsLocking(true);
        try {
          const pendingData = {
            bookingIdString: `BK-${Math.floor(Math.random() * 90000) + 10000}`,
            showtimeId: showtime.id || showtime.showtimeId,
            seats: selectedSeats,
            totalAmount: grandTotal, // Initial estimate
            pointsUsed: 0,
            promoCode: couponApplied ? couponApplied.code : null
          };

          const res = await createPendingBooking(pendingData);
          if (res._id) {
            setPendingBookingId(res._id);
            dispatch(setPendingBookingIdInStore(res._id));
          }
        } catch (err) {
          console.error("Locking failed", err);
        } finally {
          setIsLocking(false);
        }
      }
    };

    lockSeatsOnServer();
  }, [user, movie, showtime, selectedSeats, pendingBookingId, isLocking, grandTotal, storePendingBookingId]);

  const handleCheckout = async () => {
    if (!user) {
      alert("Please Sign In first to secure your ticket.");
      return;
    }

    if (!pendingBookingId) {
      alert("Seats are not secured. Please refresh or try again.");
      return;
    }

    setIsProcessing(true);
    
    try {
      await confirmPaymentAndBooking(pendingBookingId);

      // Refresh User Points in Redux
      try {
        const updatedUser = await fetchApi('/users/me');
        dispatch(login(updatedUser));
      } catch (err) {
        console.error("Failed to sync points after booking", err);
      }

      dispatch(setCheckoutLocked(false)); // Unlock for navigation
      dispatch(confirmBooking());
      navigate('/ticket/' + pendingBookingId);
    } catch (e) {
      console.error(e);
      alert("Transaction Failed: " + (e.message || "Unknown Error"));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!movie) return <div className="min-h-screen bg-base flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const handleModifySelection = async () => {
    if (pendingBookingId) {
      try {
        await fetchApi(`/bookings/${pendingBookingId}`, { method: 'DELETE' });
      } catch (e) {
        console.error("Failed to release seats during modification", e);
      }
    }
    dispatch(setCheckoutLocked(false));
    navigate(-1);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 pb-32 font-outfit">
      <button onClick={handleModifySelection} className="inline-flex items-center text-muted hover:text-white transition-colors mb-8 cursor-pointer group">
        <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
        Modify Selection
      </button>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
        
        {/* Left Side: Summary & Movie Info */}
        <div className="md:col-span-6 space-y-8">
          <div className="bg-surface border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
             <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
               <img src={movie.backdrop} alt="" className="w-full h-full object-cover blur-sm" />
             </div>

             <div className="relative z-10 flex gap-6 mt-2">
                <img src={movie.poster} alt={movie.title} className="w-24 rounded-lg shadow-2xl border border-white/10" />
                <div className="flex flex-col justify-center">
                   <h2 className="text-2xl font-bold text-white mb-2 leading-tight">{movie.title}</h2>
                   <p className="text-sm text-white/50 mb-1">{showtime.theaterName || 'Cinema Mall'}</p>
                   <p className="text-sm text-primary font-bold">{showtime.date} • {showtime.time}</p>
                </div>
             </div>

             <div className="relative z-10 border-t border-white/10 mt-6 pt-6">
                <h3 className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">Your Selection</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedSeats.map(seatId => (
                    <div key={seatId} className="px-4 py-2 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-white shadow-inner">
                      {seatId}
                    </div>
                  ))}
                </div>
             </div>
          </div>

          {/* Seat Lock Timer */}
          <div className={`flex items-center justify-between px-6 py-4 rounded-2xl border backdrop-blur-md transition-all shadow-xl ${timeLeft < 120 ? 'bg-primary/20 border-primary/50 text-primary animate-pulse' : 'bg-white/5 border-white/10 text-white/70'}`}>
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6" />
              <div className="flex flex-col">
                <span className="text-xs font-bold tracking-widest uppercase">Seat Lock Active</span>
                <span className="text-[10px] opacity-60">Expires in:</span>
              </div>
            </div>
            <span className="font-mono font-bold text-3xl">{timeFormatted}</span>
          </div>

          {/* Membership Banner (if not member) */}
          {!user?.isMember && (
            <div className="bg-gradient-to-br from-primary/20 to-secondary/10 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
               <div className="absolute inset-0 bg-primary/10 blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
               <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                     <div className="p-3 bg-primary/20 rounded-2xl border border-primary/30">
                        <Ticket className="w-6 h-6 text-primary" />
                     </div>
                     <div>
                        <h4 className="text-white font-bold">Inner Circle Savings</h4>
                        <p className="text-xs text-muted font-medium">Save ₹{(subtotal * 0.1 + selectedSeats.length * 45).toFixed(0)} on this order</p>
                     </div>
                  </div>
                  <button 
                    onClick={() => navigate('/profile')}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-inner"
                  >
                    Unlock Member Benefits
                  </button>
               </div>
            </div>
          )}
        </div>

        {/* Right Side: Payment & Totals */}
        <div className="md:col-span-6 space-y-6 bg-surface p-6 md:p-8 rounded-3xl border border-white/5 shadow-2xl relative">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[80px] -mr-10 -mt-10 pointer-events-none"></div>
           
           <h3 className="text-xl font-bold mb-6 pb-4 border-b border-white/10 flex items-center gap-3">
             <Ticket className="w-6 h-6 text-primary" />
             Payment Summary
           </h3>

           <div className="space-y-4 pt-2">
             <div className="flex justify-between items-center text-sm font-medium">
               <span className="text-muted">Tickets Subtotal</span>
               <span className="font-bold text-white/90 font-mono italic">₹{subtotal.toFixed(2)}</span>
             </div>
             
             <div className="flex justify-between items-center text-sm font-medium">
               <span className="text-muted">Convenience Fee</span>
               {isMember ? (
                 <span className="font-black text-secondary uppercase text-[10px] tracking-widest flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4" /> Waived
                 </span>
               ) : (
                 <span className="font-bold text-white/90 font-mono italic">₹{convenienceFee.toFixed(2)}</span>
               )}
             </div>
             
             {isMember && (
                <div className="flex justify-between items-center text-sm text-primary font-bold bg-primary/5 p-3 rounded-xl border border-primary/10">
                  <span className="flex items-center gap-2 uppercase tracking-widest text-[10px] font-black italic">
                    <Ticket className="w-4 h-4" /> Member Discount (10%)
                  </span>
                  <span className="font-mono">-₹{membershipDiscount.toFixed(2)}</span>
                </div>
             )}

             {couponApplied && (
               <div className="flex justify-between items-center text-sm text-green-400 font-bold bg-green-500/5 p-3 rounded-xl border border-green-500/10 group/coupon">
                 <span className="flex items-center gap-2 uppercase tracking-wider"><Tags className="w-4 h-4" /> {couponApplied.code}</span>
                 <div className="flex items-center gap-3">
                   <span className="font-mono">-₹{couponDiscount.toFixed(2)}</span>
                   <button 
                     onClick={handleRemoveCoupon}
                     className="p-1 hover:bg-rose-500/20 text-rose-500 rounded transition-colors cursor-pointer"
                     title="Remove Coupon"
                   >
                     <AlertCircle className="w-4 h-4" />
                   </button>
                 </div>
               </div>
             )}
           </div>

           {/* Promos & Suggestions */}
           {!couponApplied && (
             <div className="pt-4 border-t border-white/5 mt-4">
               <div className="flex gap-2 relative group mb-6">
                 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors">
                   <Tags className="w-4 h-4" />
                 </div>
                 <input 
                   type="text" 
                   value={couponInput}
                   onChange={(e) => setCouponInput(e.target.value)}
                   placeholder="Enter Promo Code" 
                   className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm font-bold outline-none focus:border-primary/50 transition-all uppercase placeholder:text-white/10"
                 />
                 <Button variant="secondary" onClick={handleApplyCoupon} disabled={!couponInput || isValidating}>
                   {isValidating ? '...' : 'Apply'}
                 </Button>
               </div>
               
               {/* Suggestions List */}
               {activePromos.length > 0 && (
                 <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-muted tracking-widest pl-1">Available Offers</p>
                    <div className="grid grid-cols-1 gap-2">
                       {activePromos.map(promo => (
                          <button 
                            key={promo._id} 
                            onClick={() => handleApplyCoupon(promo.code)}
                            className="flex items-center justify-between p-3 bg-white/[0.03] hover:bg-white/5 border border-white/5 rounded-xl transition-all group/promo text-left"
                          >
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                   <Tags className="w-4 h-4" />
                                </div>
                                <div>
                                   <p className="text-xs font-bold text-white uppercase">{promo.code}</p>
                                   <p className="text-[9px] text-muted font-bold italic">
                                      {promo.type === 'percentage' ? `${promo.value}% Off` : `₹${promo.value} Off`}
                                   </p>
                                </div>
                             </div>
                             <ChevronRight className="w-4 h-4 text-white/20 group-hover/promo:translate-x-1 group-hover/promo:text-primary transition-all" />
                          </button>
                       ))}
                    </div>
                 </div>
               )}

               {couponError && <p className="text-xs text-primary mt-3 flex items-center gap-1 font-medium"><AlertCircle className="w-3 h-3" /> {couponError}</p>}
             </div>
           )}

           <div className="pt-6 border-t border-dashed border-white/10 flex flex-col mt-6">
             <div className="flex justify-between items-end mb-8">
               <div className="flex flex-col">
                 <span className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Final Payable</span>
                 <span className="text-muted text-xs">All taxes included</span>
               </div>
               <span className="text-4xl font-bold text-white font-mono">₹{grandTotal.toFixed(2)}</span>
             </div>
             
             <Button 
               size="lg" 
               className="w-full py-5 text-lg shadow-[0_20px_50px_rgba(244,63,94,0.3)] group relative overflow-hidden" 
               onClick={handleCheckout} 
               disabled={isProcessing}
             >
               {isProcessing ? (
                 <Loader2 className="w-6 h-6 animate-spin mx-auto" />
               ) : (
                 <div className="flex items-center justify-center w-full">
                    Proceed to Payment
                    <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                 </div>
               )}
             </Button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Checkout;
