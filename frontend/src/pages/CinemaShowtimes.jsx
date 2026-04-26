import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ChevronLeft, MapPin, Clock, Info, Calendar as CalendarIcon, Ticket } from 'lucide-react';
import { getShowtimesByTheater } from '../services/showtimeService';
import { setShowtime, startBooking } from '../store/bookingSlice';
import Button from '../components/common/Button';

const CinemaShowtimes = () => {
  const { theaterId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [theater, setTheater] = useState(null);
  const [moviesWithShows, setMoviesWithShows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      try {
        const data = await getShowtimesByTheater(theaterId);
        
        if (data.length > 0) {
          setTheater(data[0].theater);
          
          // Group by movie
          const grouped = {};
          data.forEach(s => {
            const movieId = s.movie._id;
            if (!grouped[movieId]) {
              grouped[movieId] = {
                ...s.movie,
                showtimes: []
              };
            }
            grouped[movieId].showtimes.push(s);
          });
          
          setMoviesWithShows(Object.values(grouped));
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading cinema shows:", error);
        setIsLoading(false);
      }
    };
    fetchData();
  }, [theaterId]);

  const handleSelectTiming = (showtime) => {
    // 1. Set Movie Context
    dispatch(startBooking({ movieId: showtime.movie._id }));
    
    // 2. Set Showtime Context
    dispatch(setShowtime({
      showtimeId: showtime._id,
      theater: theater._id, // Store ID for validation
      theaterName: theater.name, // Store Name for UI
      date: showtime.date,
      time: showtime.time,
      id: showtime._id
    }));
    
    navigate(`/seat-selection/${showtime.movie._id}`);
  };

  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      dates.push({
        full: d.toISOString().split('T')[0],
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.getDate(),
        month: d.toLocaleDateString('en-US', { month: 'short' })
      });
    }
    return dates;
  };

  const availableDates = generateDates();

  const dateInputRef = React.useRef(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
        <p className="text-muted font-outfit">Syncing Cinema Schedule...</p>
      </div>
    );
  }

  if (!theater) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 px-6">
        <h2 className="text-3xl font-bold font-outfit mb-4">No data found for this cinema</h2>
        <Button onClick={() => navigate('/cinemas')}>Back to All Cinemas</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <button onClick={() => navigate(-1)} className="inline-flex items-center text-muted hover:text-white transition-colors mb-8 group cursor-pointer">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mr-3 group-hover:bg-primary transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </div>
        <span className="font-bold uppercase tracking-widest text-xs">Back</span>
      </button>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div>
          <div className="flex items-center gap-4 mb-4">
             <span className="bg-primary/20 text-primary border border-primary/30 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
               {theater.format}
             </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold font-outfit text-white mb-4">
            {theater.name}
          </h1>
          <div className="flex items-center text-muted gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="text-lg">{theater.location}</span>
          </div>
        </div>

        {/* Global Date Selector */}
        <div className="flex items-center gap-4">
          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
            {availableDates.map((dateObj) => (
              <button
                key={dateObj.full}
                onClick={() => setSelectedDate(dateObj.full)}
                className={`flex flex-col items-center min-w-[80px] p-4 rounded-2xl transition-all border ${
                  selectedDate === dateObj.full
                  ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105'
                  : 'bg-surface/50 border-white/5 text-muted hover:border-white/20'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-tighter mb-1 opacity-60">{dateObj.day}</span>
                <span className="text-xl font-black font-mono leading-none mb-1">{dateObj.date}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{dateObj.month}</span>
              </button>
            ))}
          </div>
          
          <div className="relative group">
            <input 
              type="date" 
              ref={dateInputRef}
              className="absolute inset-0 opacity-0 pointer-events-none" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <button 
              onClick={() => dateInputRef.current.showPicker()}
              className="p-5 bg-surface/50 border border-white/5 rounded-2xl text-muted group-hover:border-primary group-hover:text-primary transition-all flex flex-col items-center justify-center min-w-[80px]"
            >
               <CalendarIcon className="w-5 h-5 mb-1" />
               <span className="text-[10px] font-black uppercase tracking-widest">More</span>
            </button>
          </div>
        </div>
      </div>

      {/* Movies Grid */}
      <div className="space-y-12">
        {moviesWithShows.length === 0 ? (
          <div className="text-center py-32 bg-surface/20 rounded-[2.5rem] border border-white/5">
             <Ticket className="w-16 h-16 text-white/10 mx-auto mb-6" />
             <h3 className="text-2xl font-bold text-white mb-2">No active shows found</h3>
             <p className="text-muted max-w-sm mx-auto">This theater doesn't have any scheduled screenings at the moment.</p>
          </div>
        ) : (
          moviesWithShows.map(movie => (
            <div key={movie._id} className="bg-surface/30 border border-white/5 rounded-[2.5rem] p-8 flex flex-col lg:flex-row gap-10 hover:bg-surface/50 transition-all border-glow group">
              {/* Movie Poster & Basic Info */}
              <div className="lg:w-1/4">
                <div className="aspect-[2/3] rounded-2xl overflow-hidden mb-6 border border-white/10 shadow-2xl skew-x-1 group-hover:skew-x-0 transition-transform duration-700">
                  <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
                </div>
                <h3 className="text-2xl font-bold font-outfit text-white mb-2">{movie.title}</h3>
                <p className="text-sm text-muted mb-4">{movie.genre} • {movie.duration}</p>
              </div>

              {/* Showtimes */}
              <div className="lg:w-3/4">
                 <div className="flex items-center gap-2 mb-6 text-primary font-black text-xs uppercase tracking-widest">
                    <Clock className="w-4 h-4" /> Available Screenings
                 </div>

                 <div className="flex flex-wrap gap-4">
                    {movie.showtimes.filter(s => {
                      if (s.date !== selectedDate) return false;
                      // For today, hide shows whose time has already passed
                      const todayStr = new Date().toISOString().split('T')[0];
                      if (s.date === todayStr && s.time) {
                        const now = new Date();
                        const nowMinutes = now.getHours() * 60 + now.getMinutes();
                        let showMinutes = 0;
                        if (/AM|PM/i.test(s.time)) {
                          const [time, period] = s.time.split(' ');
                          let [h, m] = time.split(':').map(Number);
                          if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
                          if (period.toUpperCase() === 'AM' && h === 12) h = 0;
                          showMinutes = h * 60 + (m || 0);
                        } else {
                          const [h, m] = s.time.split(':').map(Number);
                          showMinutes = h * 60 + (m || 0);
                        }
                        if (nowMinutes > showMinutes) return false;
                      }
                      return true;
                    }).map(show => (
                      <button
                        key={show._id}
                        onClick={() => handleSelectTiming(show)}
                        className="px-8 py-4 bg-white/5 border border-white/10 hover:border-primary hover:bg-primary/10 rounded-2xl text-white transition-all group/time relative overflow-hidden flex flex-col items-center min-w-[120px]"
                      >
                         <span className="text-xl font-bold text-green-400 group-hover/time:text-primary transition-colors">{show.time}</span>
                         <span className="text-[10px] font-black uppercase opacity-40 mt-1 tracking-widest">{theater.format}</span>
                         <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/time:opacity-100 transition-opacity"></div>
                      </button>
                    ))}
                 </div>

                 {(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const activeShows = movie.showtimes.filter(s => {
                      if (s.date !== selectedDate) return false;
                      if (s.date === todayStr && s.time) {
                        const now = new Date();
                        const nowMin = now.getHours() * 60 + now.getMinutes();
                        let sMin = 0;
                        if (/AM|PM/i.test(s.time)) {
                          const [t, p] = s.time.split(' ');
                          let [h, m] = t.split(':').map(Number);
                          if (p.toUpperCase() === 'PM' && h !== 12) h += 12;
                          if (p.toUpperCase() === 'AM' && h === 12) h = 0;
                          sMin = h * 60 + (m || 0);
                        } else {
                          const [h, m] = s.time.split(':').map(Number);
                          sMin = h * 60 + (m || 0);
                        }
                        if (nowMin > sMin) return false;
                      }
                      return true;
                    });
                    return activeShows.length === 0 ? (
                      <p className="text-muted italic">No active screenings for the selected date.</p>
                    ) : null;
                  })()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CinemaShowtimes;
