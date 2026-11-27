import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ChevronLeft, MapPin, Calendar as CalendarIcon, Ticket, Star } from 'lucide-react';
import { getShowtimesByTheater } from '../services/showtimeService';
import { getTheaters } from '../services/theaterService';
import { setShowtime, startBooking } from '../store/bookingSlice';
import Button from '../components/common/Button';
import BookingSteps from '../components/common/BookingSteps';
import {
  formatLocalDate,
  getScreenForShowtime,
  evaluateBookingWindow,
} from '../utils/bookingUtils';

const isActiveForDate = (show, selectedDate) => {
  if (show.date !== selectedDate) return false;
  if (show.time) {
    return evaluateBookingWindow(show.date, show.time).canBook;
  }
  return true;
};

const getShowCapacity = (show) => {
  const screen = getScreenForShowtime(show);
  if (screen?.layout?.length > 0) {
    let count = 0;
    for (const row of screen.layout) {
      for (const cell of row) {
        if (cell.type !== 'aisle' && !cell.isReserved) count += 1;
      }
    }
    return count || 120;
  }
  if (screen?.rows && screen?.cols) return screen.rows * screen.cols;
  return 120;
};

const CinemaShowtimes = () => {
  const { theaterId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [theater, setTheater] = useState(null);
  const [moviesWithShows, setMoviesWithShows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(new Date()));
  const dateInputRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      try {
        const [data, allTheaters] = await Promise.all([
          getShowtimesByTheater(theaterId),
          getTheaters(),
        ]);

        const shows = Array.isArray(data) ? data : [];
        const matchedTheater =
          shows.find((s) => s.theater)?.theater ||
          (Array.isArray(allTheaters) ? allTheaters.find((t) => t._id === theaterId) : null);

        setTheater(matchedTheater || null);

        const grouped = {};
        shows.forEach((s) => {
          if (!s.movie) return;
          const movieId = s.movie._id;
          if (!grouped[movieId]) {
            grouped[movieId] = {
              ...s.movie,
              showtimes: [],
            };
          }
          grouped[movieId].showtimes.push(s);
        });
        setMoviesWithShows(Object.values(grouped));
      } catch (error) {
        console.error('Error loading cinema shows:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [theaterId]);

  const handleSelectTiming = (showtime) => {
    dispatch(startBooking({ movieId: showtime.movie._id }));
    dispatch(
      setShowtime({
        id: showtime._id,
        showtimeId: showtime._id,
        theater: theater._id,
        theaterId: theater._id,
        theaterName: theater.name,
        date: showtime.date,
        time: showtime.time,
        screenNumber: showtime.screenNumber || 1,
      })
    );
    navigate(`/seat-selection/${showtime.movie._id}`);
  };

  const dates = useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      list.push({
        full: formatLocalDate(d),
        day: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.getDate(),
        month: d.toLocaleDateString('en-US', { month: 'short' }),
      });
    }
    return list;
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="h-8 w-40 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--mg-surface-2)' }} />
        <div className="h-28 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--mg-surface)' }} />
        <div className="h-44 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--mg-surface)' }} />
      </div>
    );
  }

  if (!theater) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center px-6 text-center">
        <MapPin className="w-10 h-10 mb-3" style={{ color: 'var(--mg-ink-3)' }} />
        <h2 className="text-2xl font-display font-bold mb-2" style={{ color: 'var(--mg-ink)' }}>
          Cinema Not Found
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--mg-ink-2)' }}>
          This venue may have changed schedule or availability.
        </p>
        <Button onClick={() => navigate('/cinemas')}>All Cinemas</Button>
      </div>
    );
  }

  const todayStr = formatLocalDate(new Date());
  const isCustomDate = !dates.some((d) => d.full === selectedDate);

  const activeMovies = moviesWithShows.filter((movie) =>
    movie.showtimes.some((s) => isActiveForDate(s, selectedDate))
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={() => navigate('/cinemas')}
          className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer hover:opacity-80"
          style={{ color: 'var(--mg-ink-2)' }}
        >
          <ChevronLeft className="w-4 h-4" />
          All Cinemas
        </button>
        <BookingSteps currentStep={1} />
      </div>

      {/* Venue Header */}
      <div
        className="rounded-xl border p-6 sm:p-7 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{
          backgroundColor: 'var(--mg-surface)',
          borderColor: 'var(--mg-border)',
        }}
      >
        <div>
          <h1 className="text-2xl sm:text-4xl font-display font-bold tracking-tight" style={{ color: 'var(--mg-ink)' }}>
            {theater.name}
          </h1>
          <p className="text-sm flex items-center gap-1.5 mt-2" style={{ color: 'var(--mg-ink-2)' }}>
            <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--mg-accent)' }} />
            <span>{theater.location}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {String(theater.format || 'Standard 2D')
            .split(',')
            .map((fmt) => fmt.trim())
            .filter(Boolean)
            .map((fmt) => (
              <span
                key={fmt}
                className="px-3 py-1 rounded-md text-xs font-semibold border"
                style={{
                  backgroundColor: 'var(--mg-surface-2)',
                  borderColor: 'var(--mg-border)',
                  color: 'var(--mg-ink-2)',
                }}
              >
                {fmt}
              </span>
            ))}
        </div>
      </div>

      {/* Date Bar */}
      <div
        className="sticky top-16 z-30 rounded-xl border p-3 mb-8 flex items-center gap-2 overflow-x-auto hide-scrollbar backdrop-blur-md"
        style={{
          backgroundColor: 'var(--mg-nav-bg)',
          borderColor: 'var(--mg-border)',
        }}
      >
        {dates.map((d) => {
          const isSelected = selectedDate === d.full;
          return (
            <button
              key={d.full}
              type="button"
              onClick={() => setSelectedDate(d.full)}
              className="flex flex-col items-center justify-center min-w-[76px] py-2 px-3 rounded-lg border transition-colors cursor-pointer shrink-0"
              style={{
                backgroundColor: isSelected ? 'var(--mg-accent)' : 'var(--mg-surface)',
                borderColor: isSelected ? 'var(--mg-accent)' : 'var(--mg-border)',
                color: isSelected ? '#ffffff' : 'var(--mg-ink)',
              }}
            >
              <span
                className="text-[10px] font-semibold uppercase"
                style={{ opacity: isSelected ? 0.9 : 0.65 }}
              >
                {d.day}
              </span>
              <span className="text-sm font-bold">{d.date} {d.month}</span>
            </button>
          );
        })}

        <div className="relative flex-shrink-0">
          <input
            ref={dateInputRef}
            type="date"
            min={todayStr}
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="sr-only"
            aria-label="Pick custom show date"
          />
          <button
            type="button"
            onClick={() => {
              if (dateInputRef.current?.showPicker) {
                dateInputRef.current.showPicker();
              } else {
                dateInputRef.current?.click();
              }
            }}
            className="flex flex-col items-center justify-center min-w-[84px] py-2 px-3 rounded-lg border transition-colors cursor-pointer"
            style={{
              backgroundColor: isCustomDate ? 'var(--mg-accent)' : 'var(--mg-surface)',
              borderColor: isCustomDate ? 'var(--mg-accent)' : 'var(--mg-border)',
              color: isCustomDate ? '#ffffff' : 'var(--mg-ink-2)',
            }}
          >
            <CalendarIcon className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] font-bold uppercase">
              {isCustomDate ? selectedDate.slice(5) : 'More Dates'}
            </span>
          </button>
        </div>
      </div>

      {/* Movie Showtime Listings */}
      <div className="space-y-4">
        {activeMovies.length === 0 ? (
          <div
            className="text-center py-16 px-6 rounded-xl border border-dashed"
            style={{
              backgroundColor: 'var(--mg-surface)',
              borderColor: 'var(--mg-border-strong)',
            }}
          >
            <Ticket className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--mg-ink-3)' }} />
            <h3 className="text-lg font-display font-bold mb-1" style={{ color: 'var(--mg-ink)' }}>
              No Shows Scheduled
            </h3>
            <p className="text-sm" style={{ color: 'var(--mg-ink-2)' }}>
              No remaining screenings are available on <strong style={{ color: 'var(--mg-ink)' }}>{selectedDate}</strong>.
            </p>
          </div>
        ) : (
          activeMovies.map((movie) => {
            const activeShows = movie.showtimes.filter((s) =>
              isActiveForDate(s, selectedDate)
            );

            return (
              <div
                key={movie._id}
                className="rounded-xl border p-5 sm:p-6 flex flex-col md:flex-row gap-6 items-start"
                style={{
                  backgroundColor: 'var(--mg-surface)',
                  borderColor: 'var(--mg-border)',
                }}
              >
                {/* Movie Poster + Meta */}
                <div className="flex gap-4 items-start w-full md:w-1/3 shrink-0">
                  <Link
                    to={`/movie/${movie._id}`}
                    className="w-20 sm:w-24 aspect-[2/3] rounded-lg overflow-hidden shrink-0 border"
                    style={{ borderColor: 'var(--mg-border)' }}
                  >
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <div className="min-w-0">
                    <Link
                      to={`/movie/${movie._id}`}
                      className="text-lg font-display font-bold leading-snug hover:underline block"
                      style={{ color: 'var(--mg-ink)' }}
                    >
                      {movie.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs" style={{ color: 'var(--mg-ink-2)' }}>
                      {movie.genre && (
                        <span
                          className="px-2 py-0.5 rounded font-medium"
                          style={{ backgroundColor: 'var(--mg-surface-2)' }}
                        >
                          {movie.genre}
                        </span>
                      )}
                      {movie.duration && <span>{movie.duration}</span>}
                    </div>
                    {movie.rating && (
                      <div className="flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color: 'var(--mg-gold)' }}>
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{movie.rating} / 10</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timings */}
                <div className="w-full md:w-2/3 flex flex-wrap gap-3 pt-1">
                  {activeShows.map((show) => {
                    const capacity = getShowCapacity(show);
                    const isFull = Array.isArray(show.bookedSeats) && show.bookedSeats.length >= capacity;
                    return (
                      <button
                        key={show._id}
                        type="button"
                        disabled={isFull}
                        onClick={() => !isFull && handleSelectTiming(show)}
                        className="px-4 py-2.5 rounded-lg border text-left transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed hover:-translate-y-0.5"
                        style={{
                          backgroundColor: isFull ? 'var(--mg-surface-2)' : 'var(--mg-bg)',
                          borderColor: isFull ? 'var(--mg-border)' : 'var(--mg-border-strong)',
                        }}
                      >
                        <span
                          className={`block text-sm font-mono font-bold ${isFull ? 'line-through' : ''}`}
                          style={{ color: isFull ? 'var(--mg-ink-3)' : 'var(--mg-success)' }}
                        >
                          {show.time}
                        </span>
                        <span className="block text-[11px] mt-0.5" style={{ color: 'var(--mg-ink-3)' }}>
                          Screen {show.screenNumber || 1}
                          {isFull ? ' • Full' : ''}
                        </span>
                        {!isFull && evaluateBookingWindow(show.date, show.time).hasStarted && (
                          <span className="block text-[10px] font-semibold mt-0.5" style={{ color: 'var(--mg-warning)' }}>
                            Closes {evaluateBookingWindow(show.date, show.time).cutoffFormatted}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CinemaShowtimes;
