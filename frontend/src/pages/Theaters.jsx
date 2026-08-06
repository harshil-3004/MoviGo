import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Info, Clock } from 'lucide-react';
import { getMovieDetails } from '../services/movieService';
import { getShowtimesByMovie } from '../services/showtimeService';
import { setShowtime, startBooking } from '../store/bookingSlice';

// Helper to format date to YYYY-MM-DD
const formatDateToISO = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Helper to get descriptive date string
const getDescriptiveDate = (date) => {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const targetDate = new Date(date);
  
  if (formatDateToISO(today) === formatDateToISO(targetDate)) return 'Today';
  if (formatDateToISO(tomorrow) === formatDateToISO(targetDate)) return 'Tomorrow';
  
  return targetDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
};

const Theaters = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [movie, setMovie] = useState(null);
  const [allShowtimes, setAllShowtimes] = useState([]);
  const [selectedDate, setSelectedDate] = useState('Today');
  const [isLoading, setIsLoading] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  // Generate initial dates (Today, Tomorrow, and 3 more)
  const initialDates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    initialDates.push({
      iso: formatDateToISO(d),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
    });
  }
  const [availableDates, setAvailableDates] = useState(initialDates);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      try {
        const [movieData, showtimeData] = await Promise.all([
          getMovieDetails(id),
          getShowtimesByMovie(id)
        ]);
        
        setMovie(movieData);
        // Only set real showtimes — no dummy fallback
        setAllShowtimes(showtimeData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading theater data:", error);
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const getCalendarDays = () => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const blanks = Array.from({length: firstDay}).map((_, i) => `blank-${i}`);
    const days = Array.from({length: daysInMonth}).map((_, i) => {
      const d = new Date(year, month, i + 1);
      return {
        number: i + 1,
        iso: formatDateToISO(d),
        label: getDescriptiveDate(d)
      };
    });
    return { blanks, days, monthYearRow: currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' }) };
  };

  const { blanks, days, monthYearRow } = getCalendarDays();
  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const handlePrevMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));

  const getSelectedISO = () => {
    const found = availableDates.find(d => d.label === selectedDate);
    if (found) return found.iso;
    return formatDateToISO(new Date()); 
  };

  const filteredShowtimes = () => {
    const targetISO = getSelectedISO();
    // Group by theater
    const grouped = {};
    allShowtimes.filter(s => s.date === targetISO).forEach(s => {
      const theaterName = s.theater.name;
      if (!grouped[theaterName]) {
        grouped[theaterName] = {
          name: theaterName,
          location: s.theater.location,
          format: s.theater.format,
          shows: []
        };
      }
      grouped[theaterName].shows.push(s);
    });
    return Object.values(grouped);
  };

  const handleSelectTiming = (showtime) => {
    dispatch(startBooking({ movieId: id }));
    dispatch(setShowtime({
      showtimeId: showtime._id,
      theater: showtime.theater.name,
      date: selectedDate,
      time: showtime.time,
      id: showtime._id // Added full ID reference
    }));
    navigate(`/seat-selection/${id}`);
  };

  if (isLoading || !movie) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
        <p className="text-muted font-outfit">Loading Theaters & Showtimes...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-32">
      {/* Header */}
      <button onClick={() => navigate(-1)} className="inline-flex items-center text-muted hover:text-white transition-colors mb-6 cursor-pointer group">
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mr-2 group-hover:bg-primary transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </div>
        <span className="font-medium">Back to Movie</span>
      </button>

      <div className="mb-10">
        <h1 className="text-4xl md:text-6xl font-bold font-outfit mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
          {movie.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4">
           <span className="font-bold inline-block bg-primary/20 border border-primary/30 px-4 py-1.5 rounded-full text-xs text-primary shadow-lg shadow-primary/10">
             Step 01: Select Theater
           </span>
           <div className="flex items-center gap-2 text-muted text-sm bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
             <Info className="w-4 h-4 text-primary" />
             <span>English • {movie.genre}</span>
           </div>
        </div>
      </div>

      {/* Date Selector */}
      <div className="bg-surface/50 border border-white/10 rounded-[2rem] p-4 mb-10 sticky top-24 z-30 backdrop-blur-2xl shadow-2xl">
        
        {/* Custom Calendar Popup */}
        {isCalendarOpen && (
          <div className="absolute top-[85px] left-4 w-80 bg-base/95 backdrop-blur-3xl border border-white/20 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.9)] p-6 z-50 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center justify-between mb-6">
              <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white border border-white/5"><ChevronLeft className="w-4 h-4" /></button>
              <div className="text-white font-bold text-sm tracking-widest uppercase">{monthYearRow}</div>
              <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white border border-white/5"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center mb-4">
              {weekdays.map(d => <div key={d} className="text-[10px] uppercase font-black text-white/20">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2 text-center">
              {blanks.map(b => <div key={b}></div>)}
              {days.map(dayInfo => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dayDate = new Date(dayInfo.iso);
                const isPast = dayDate < today;
                return (
                <button
                  key={dayInfo.number}
                  disabled={isPast}
                  onClick={() => {
                    if (isPast) return;
                    // Reset availableDates back to initial 5 days + the new pick
                    const baseInitial = [];
                    for (let i = 0; i < 5; i++) {
                      const d = new Date();
                      d.setDate(d.getDate() + i);
                      baseInitial.push({
                        iso: formatDateToISO(d),
                        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
                      });
                    }
                    const alreadyInBase = baseInitial.find(d => d.iso === dayInfo.iso);
                    if (!alreadyInBase) {
                      setAvailableDates([...baseInitial, { iso: dayInfo.iso, label: dayInfo.label }]);
                    } else {
                      setAvailableDates(baseInitial);
                    }
                    setSelectedDate(dayInfo.label);
                    setIsCalendarOpen(false);
                  }}
                  className={`w-9 h-9 rounded-xl text-xs font-bold mx-auto flex items-center justify-center transition-all ${
                     isPast
                     ? 'text-white/15 cursor-not-allowed'
                     : getSelectedISO() === dayInfo.iso 
                     ? 'bg-primary text-white shadow-[0_0_20px_rgba(244,63,94,0.6)] scale-110' 
                     : 'text-white/60 hover:bg-white/10 hover:text-white border border-transparent'
                  }`}
                >
                  {dayInfo.number}
                </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
          <button 
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className={`flex-shrink-0 flex items-center justify-center w-14 h-12 rounded-2xl border transition-all cursor-pointer ${
              isCalendarOpen ? 'bg-primary border-primary text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'bg-primary/5 hover:bg-primary/20 border-primary/20 text-primary'
            }`}
          >
            <CalendarIcon className="w-5 h-5 pointer-events-none" />
          </button>
          
          {availableDates.map(date => (
            <button 
              key={date.iso}
              onClick={() => setSelectedDate(date.label)}
              className={`flex-shrink-0 px-8 py-3 rounded-2xl text-sm font-bold transition-all duration-500 border ${
                selectedDate === date.label 
                ? 'bg-primary border-primary text-white shadow-[0_0_25px_rgba(244,63,94,0.3)]' 
                : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white border-white/5'
              }`}
            >
              <span className="block text-[10px] uppercase tracking-tighter opacity-60 mb-0.5">{date.iso.split('-')[2]} {new Date(date.iso).toLocaleString('default', { month: 'short' })}</span>
              {date.label}
            </button>
          ))}
        </div>
      </div>

      {/* Theaters List */}
      <div className="space-y-8 min-h-[400px]">
        {filteredShowtimes().length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-surface/20 rounded-[2.5rem] border border-dashed border-white/10 backdrop-blur-sm">
             <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <Clock className="w-10 h-10 text-muted" />
             </div>
             <h3 className="text-2xl font-bold text-white mb-2 font-outfit">Currently No Shows Available</h3>
             <p className="text-muted text-center max-w-sm px-4">There are no showtimes scheduled for <span className="text-white font-semibold">{selectedDate}</span>. Please try a different date or check back later.</p>
          </div>
        ) : filteredShowtimes().map((theater) => (
          <div key={theater.name} className="bg-surface/30 border border-white/5 rounded-[2.5rem] p-8 transition-all hover:bg-surface/50 hover:border-white/10 group">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
              
              <div className="md:w-1/3">
                <h3 className="text-2xl font-bold font-outfit text-white mb-3 group-hover:text-primary transition-colors">
                  {theater.name}
                </h3>
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary"/> {theater.location}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {theater.format?.split(',').map(f => (
                       <span key={f} className="inline-block bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/60">
                        {f.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="md:w-2/3">
                <div className="flex flex-wrap gap-4">
                  {theater.shows.map((show) => {
                    const isFull = show.bookedSeats && show.bookedSeats.length > 50; // Mock full logic
                    return (
                      <button
                        key={show._id}
                        onClick={() => !isFull && handleSelectTiming(show)}
                        disabled={isFull}
                        className={`relative group/time px-6 py-4 rounded-2xl border text-sm font-bold transition-all ${
                          isFull 
                          ? 'bg-black/20 border-white/5 text-white/20 cursor-not-allowed' 
                          : 'bg-white/5 border-white/20 text-green-400 hover:border-green-500 hover:bg-green-500/10 hover:text-green-300 cursor-pointer hover:scale-105 active:scale-95 shadow-lg shadow-black/20'
                        }`}
                      >
                        <span className={`block text-base ${isFull ? 'line-through' : ''}`}>{show.time}</span>
                        <span className="text-[10px] uppercase opacity-60 font-medium">{show.theater.format || '2D'}</span>
                        
                        {isFull && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Full</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Theaters;
